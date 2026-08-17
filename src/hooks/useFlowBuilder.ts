import { useMemo } from 'react';
import { MarkerType } from '@xyflow/react';
import { resolveMessageText } from '../components/FlowNodes';

interface BuildFlowParams {
  evflData: any;
  focusNodeId?: string | null;
  expandAllParams?: boolean;
  messageDict?: Record<string, string>;
  blinkingNodeId?: string | null;
  onNodeSelect: (node: any) => void;
  onNodeDoubleClick?: (node: any) => void;
  onNodeContextMenu: (node: any, e: React.MouseEvent) => void;
  onRenameEntryPoint?: (epId: string, newName: string) => void;
}

// 创建入口点节点
const createEntryPointNode = (
  ep: any,
  index: number,
  blinkingNodeId?: string | null,
  onRename?: (id: string, newName: string) => void,
  onDoubleClick?: (data: any) => void
) => {
  const epId = `ep-${index}`;
  return {
    id: epId,
    type: 'entryPointNode',
    data: {
      id: epId,
      name: ep.name,
      isBlinking: blinkingNodeId === epId,
      onRename: onRename,
      onDoubleClick: onDoubleClick
    },
    position: { x: 0, y: 0 }
  };
};

// 检查节点合法性
const isNodeInvalid = (i: number, typeKey: string, eventData: any, joinNodeIds: Set<number>, forkNodesTargetingJoin: Map<number, number[]>) => {
  if (typeKey === 'Join') {
    return !forkNodesTargetingJoin.has(i) || forkNodesTargetingJoin.get(i)!.length === 0;
  } else if (typeKey === 'Fork') {
    const joinIdx = eventData.join?.idx;
    if (joinIdx === undefined || joinIdx === 65535) return true;
    return !joinNodeIds.has(joinIdx);
  }
  return false;
};

// 获取节点标签
const getNodeLabel = (typeKey: string, eventData: any, actors: any[]) => {
  if (typeKey === 'Action') {
    const actor = actors[eventData.actor?.idx];
    return `${actor?.identifier?.name || "UnknownActor"} :: ${actor?.actions?.[eventData.actor_action?.idx] || "UnknownAction"}`;
  } else if (typeKey === 'Switch') {
    const actor = actors[eventData.actor?.idx];
    return `${actor?.identifier?.name || "UnknownActor"} :: ${actor?.queries?.[eventData.actor_query?.idx] || "UnknownQuery"}`;
  } else if (typeKey === 'SubFlow') {
    return `${eventData.res_flowchart_name} :: ${eventData.entry_point_name}`;
  } else if (typeKey === 'Fork') {
    return `Forks: ${eventData.forks?.length || 0}`;
  } else if (typeKey === 'Join') {
    return "Wait for parallel join";
  }
  return "";
};

// 提取节点中绑定的 MessageId 对应文本
const getEventMessageText = (eventData: any, messageDict?: Record<string, string>): string | undefined => {
  if (!messageDict || !eventData) return undefined;
  const paramsData = eventData?.params?.data;
  if (!paramsData) return undefined;
  for (const [k, v] of Object.entries(paramsData)) {
    if (k.toLowerCase() === 'messageid' || k.toLowerCase() === 'message_id' || k.toLowerCase() === 'msgid') {
      const paramType = typeof v === 'object' && v !== null ? Object.keys(v)[0] : '';
      const rawVal = typeof v === 'object' && v !== null ? (v as any)[paramType] : v;
      const text = resolveMessageText(rawVal, messageDict);
      if (text) return text;
    }
  }
  return undefined;
};

// 创建事件节点
const createEventNode = (
  i: number, 
  ev: any, 
  typeKey: string, 
  eventData: any, 
  initialNodes: any[],
  actors: any[],
  joinNodeIds: Set<number>, 
  forkNodesTargetingJoin: Map<number, number[]>,
  params: BuildFlowParams
) => {
  if (initialNodes.some(n => n.id === i.toString())) return;
  const label = getNodeLabel(typeKey, eventData, actors);
  const messageText = getEventMessageText(eventData, params.messageDict);

  initialNodes.push({
    id: i.toString(),
    type: 'eventNode',
    data: {
      id: i.toString(),
      name: ev.name,
      type: typeKey,
      label: label,
      originalData: ev.data,
      expandParams: params.expandAllParams || false,
      messageDict: params.messageDict,
      messageText: messageText,
      isWarning: isNodeInvalid(i, typeKey, eventData, joinNodeIds, forkNodesTargetingJoin),
      isBlinking: params.blinkingNodeId === i.toString(),
      onSelect: params.onNodeSelect,
      onDoubleClick: params.onNodeDoubleClick,
      onContextMenu: params.onNodeContextMenu
    },
    position: { x: 0, y: 0 },
  });
};

// 处理普通下一步连接
const handleNext = (nid: number, nextIdx: number | undefined, joinStack: number[], queue: number[], initialEdges: any[]) => {
  if (nextIdx === 65535 || nextIdx === undefined) {
    if (joinStack.length > 0) {
      initialEdges.push({
        id: `e-virtual-${nid}-${joinStack[joinStack.length - 1]}`,
        source: nid.toString(),
        target: joinStack[joinStack.length - 1].toString(),
        type: 'animated',
        style: { strokeDasharray: '5,5', stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      });
    }
    return;
  }
  
  initialEdges.push({
    id: `e-${nid}-${nextIdx}`,
    source: nid.toString(),
    target: nextIdx.toString(),
    type: 'animated',
    markerEnd: { type: MarkerType.ArrowClosed },
  });
  queue.push(nextIdx);
};

// 根据 EVFL 数据构建 React Flow 的节点和连线数组
export function useFlowBuilder(params: BuildFlowParams) {
  const { evflData, focusNodeId, expandAllParams, messageDict, blinkingNodeId, onNodeSelect, onNodeContextMenu } = params;

  const result = useMemo(() => {
    if (!evflData || !evflData.flowchart || !evflData.flowchart.events) {
      return { initialNodes: [], initialEdges: [], currentFlowName: null };
    }

    const flowchart = evflData.flowchart;
    const events = flowchart.events;
    const actors = flowchart.actors || [];
    const entryPoints = flowchart.entry_points || [];
    
    // 验证 Fork/Join 规则
    const joinNodeIds = new Set<number>();
    const forkNodesTargetingJoin = new Map<number, number[]>(); // joinIdx -> forkIdx[]

    events.forEach((ev: any, i: number) => {
      if (!ev || !ev.data) return;
      const typeKey = Object.keys(ev.data)[0];
      if (typeKey === 'Join') {
        joinNodeIds.add(i);
      } else if (typeKey === 'Fork') {
        const joinIdx = ev.data['Fork']?.join?.idx;
        if (joinIdx !== undefined && joinIdx !== 65535) {
          if (!forkNodesTargetingJoin.has(joinIdx)) {
            forkNodesTargetingJoin.set(joinIdx, []);
          }
          forkNodesTargetingJoin.get(joinIdx)!.push(i);
        }
      }
    });

    const initialNodes: any[] = [];
    const initialEdges: any[] = [];
    const visited = new Set<number>();

    // 处理 EntryPoint
    if (!focusNodeId) {
      entryPoints.forEach((ep: any, index: number) => {
        initialNodes.push(createEntryPointNode(ep, index, blinkingNodeId, params.onRenameEntryPoint, params.onNodeDoubleClick));
      });
    }

    // 广度优先遍历节点图
    const traverse = (startIdx: number, initialJoinStack: number[]) => {
      const queue = [startIdx];
      const joinStack = [...initialJoinStack];
      
      while (queue.length > 0) {
        const i = queue.shift()!;
        if (visited.has(i)) continue;
        visited.add(i);
        
        const ev = events[i];
        if (!ev) continue;
        const typeKey = Object.keys(ev.data)[0];
        const eventData = ev.data[typeKey];
        
        createEventNode(i, ev, typeKey, eventData, initialNodes, actors, joinNodeIds, forkNodesTargetingJoin, params);
        
        if (typeKey === 'Action' || typeKey === 'SubFlow') {
          handleNext(i, eventData.nxt?.idx, joinStack, queue, initialEdges);
        } else if (typeKey === 'Switch') {
          let caseCount = 0;
          let hasCase0 = false;
          let hasCase1 = false;
          
          if (eventData.cases) {
            Object.entries(eventData.cases).forEach(([caseValue, c]: [string, any]) => {
              if (c.idx !== 65535) {
                caseCount++;
                if (caseValue === "0") hasCase0 = true;
                if (caseValue === "1") hasCase1 = true;
                initialEdges.push({
                  id: `e-${i}-case${caseValue}-${c.idx}`,
                  source: i.toString(),
                  target: c.idx.toString(),
                  label: `Case ${caseValue}`,
                  type: 'animated',
                  markerEnd: { type: MarkerType.ArrowClosed },
                });
                traverse(c.idx, joinStack);
              }
            });
          }
          // 虚拟合并连线
          if (joinStack.length > 0 && !(caseCount === 2 && hasCase0 && hasCase1)) {
            initialEdges.push({
              id: `e-virtual-${i}-${joinStack[joinStack.length - 1]}`,
              source: i.toString(),
              target: joinStack[joinStack.length - 1].toString(),
              type: 'animated',
              style: { strokeDasharray: '5,5', stroke: '#94a3b8', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
            });
          }
        } else if (typeKey === 'Fork') {
          if (eventData.join?.idx !== 65535 && eventData.join?.idx !== undefined) {
            joinStack.push(eventData.join.idx);
            if (eventData.forks) {
              eventData.forks.forEach((f: any, forkIndex: number) => {
                if (f.idx !== 65535) {
                  initialEdges.push({
                    id: `e-${i}-fork${forkIndex}-${f.idx}`,
                    source: i.toString(),
                    target: f.idx.toString(),
                    label: `Fork ${forkIndex}`,
                    type: 'animated',
                    markerEnd: { type: MarkerType.ArrowClosed },
                  });
                  traverse(f.idx, joinStack);
                }
              });
            }
            queue.push(eventData.join.idx);
          }
        } else if (typeKey === 'Join') {
          joinStack.pop();
          handleNext(i, eventData.nxt?.idx, joinStack, queue, initialEdges);
        }
      }
    };

    // 执行遍历逻辑
    if (focusNodeId) {
      if (focusNodeId.startsWith('ep-')) {
        const epIndex = parseInt(focusNodeId.replace('ep-', ''));
        const ep = entryPoints[epIndex];
        initialNodes.push(createEntryPointNode(ep, epIndex, blinkingNodeId, params.onRenameEntryPoint, params.onNodeDoubleClick));
        if (ep.main_event && ep.main_event.idx !== 65535) {
          initialEdges.push({
            id: `e-${focusNodeId}-${ep.main_event.idx}`,
            source: focusNodeId,
            target: ep.main_event.idx.toString(),
            type: 'animated',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            style: { stroke: '#10b981', strokeWidth: 2 }
          });
          traverse(ep.main_event.idx, []);
        }
      } else {
        // Build undirected graph to find the connected component
        const adj = new Map<number, Set<number>>();
        const addEdge = (u: number, v: number) => {
          if (!adj.has(u)) adj.set(u, new Set());
          if (!adj.has(v)) adj.set(v, new Set());
          adj.get(u)!.add(v);
          adj.get(v)!.add(u);
        };

        events.forEach((ev: any, i: number) => {
          if (!ev || !ev.data) return;
          const typeKey = Object.keys(ev.data)[0];
          const eventData = ev.data[typeKey];
          
          if (typeKey === 'Action' || typeKey === 'SubFlow') {
            if (eventData.nxt?.idx !== undefined && eventData.nxt?.idx !== 65535) {
              addEdge(i, eventData.nxt.idx);
            }
          } else if (typeKey === 'Switch') {
            if (eventData.cases) {
              Object.values(eventData.cases).forEach((c: any) => {
                if (c.idx !== 65535) addEdge(i, c.idx);
              });
            }
          } else if (typeKey === 'Fork') {
            if (eventData.forks) {
              eventData.forks.forEach((f: any) => {
                if (f.idx !== 65535) addEdge(i, f.idx);
              });
            }
            if (eventData.join?.idx !== undefined && eventData.join?.idx !== 65535) {
              addEdge(i, eventData.join.idx);
            }
          }
        });

        const targetComponent = new Set<number>();
        const startNode = parseInt(focusNodeId);
        const compQueue = [startNode];
        targetComponent.add(startNode);
        
        while (compQueue.length > 0) {
          const curr = compQueue.shift()!;
          if (adj.has(curr)) {
            adj.get(curr)!.forEach(neighbor => {
              if (!targetComponent.has(neighbor)) {
                targetComponent.add(neighbor);
                compQueue.push(neighbor);
              }
            });
          }
        }

        // Find all entry points that point to this component
        entryPoints.forEach((ep: any, index: number) => {
          if (ep.main_event && ep.main_event.idx !== 65535 && targetComponent.has(ep.main_event.idx)) {
            const epId = `ep-${index}`;
            initialNodes.push(createEntryPointNode(ep, index, blinkingNodeId, params.onRenameEntryPoint, params.onNodeDoubleClick));
            initialEdges.push({
              id: `e-${epId}-${ep.main_event.idx}`,
              source: epId,
              target: ep.main_event.idx.toString(),
              type: 'animated',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
              style: { stroke: '#10b981', strokeWidth: 2 }
            });
            traverse(ep.main_event.idx, []);
          }
        });

        // Traverse all nodes in the component to ensure disconnected fragments are included
        targetComponent.forEach(nodeIdx => {
          if (!visited.has(nodeIdx)) {
            traverse(nodeIdx, []);
          }
        });
      }
    } else {
      entryPoints.forEach((ep: any, index: number) => {
        const epId = `ep-${index}`;
        if (ep.main_event && ep.main_event.idx !== 65535) {
          initialEdges.push({
            id: `e-${epId}-${ep.main_event.idx}`,
            source: epId,
            target: ep.main_event.idx.toString(),
            type: 'animated',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            style: { stroke: '#10b981', strokeWidth: 2 }
          });
          traverse(ep.main_event.idx, []);
        }
      });

      // 添加未被连接的游离节点
      events.forEach((_: any, i: number) => {
        if (!visited.has(i)) {
          traverse(i, []);
        }
      });
    }

    return { initialNodes, initialEdges, currentFlowName: flowchart.name };
  }, [evflData, focusNodeId, expandAllParams, messageDict, blinkingNodeId, onNodeSelect, onNodeContextMenu, params.onRenameEntryPoint]);

  return result;
}
