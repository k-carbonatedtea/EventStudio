import { useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  EventNode,
  EntryPointNode,
  AnimatedEdge,
  FlowAnimationContext,
} from './components/FlowNodes';
import { FpsCounter } from './components/FpsCounter';
import { getLayoutedElements } from './utils/flowLayout';
import { useFlowBuilder } from './hooks/useFlowBuilder';

const nodeTypes = {
  eventNode: EventNode,
  entryPointNode: EntryPointNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

interface FlowMapProps {
  evflData: any;
  focusNodeId?: string | null;
  expandAllParams?: boolean;
  showFlowAnimation?: boolean;
  messageDict?: Record<string, string>;
  blinkingNodeId?: string | null;
  onNodeSelect: (node: any) => void;
  onNodeDoubleClick?: (node: any) => void;
  onNodeContextMenu: (node: any, e: React.MouseEvent) => void;
  onPaneContextMenu: (e: any) => void;
  onEdgeDrop: (e: any, sourceNodeId: string) => void;
  onEdgeConnect: (sourceNodeId: string, targetNodeId: string) => void;
  onEdgesDelete?: (edges: any[]) => void;
  onEdgeContextMenu?: (edge: any, e: React.MouseEvent) => void;
  onPaneClick?: () => void;
  knifeMode?: boolean;
  onRenameEntryPoint?: (epId: string, newName: string) => void;
}

export default function FlowMap({
  evflData,
  focusNodeId,
  expandAllParams,
  showFlowAnimation = true,
  messageDict,
  blinkingNodeId,
  onNodeSelect,
  onNodeDoubleClick,
  onNodeContextMenu,
  onPaneContextMenu,
  onEdgeDrop,
  onEdgeConnect,
  onEdgesDelete,
  onEdgeContextMenu,
  onPaneClick,
  knifeMode,
  onRenameEntryPoint,
}: FlowMapProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  const currentFlowName = useRef<string | null>(null);
  const dragSource = useRef<string | null>(null);
  const lastInteractionPos = useRef<{ x: number; y: number } | null>(null);
  const prevExpandAllParams = useRef<boolean | undefined>(undefined);
  const prevFocusNodeId = useRef<string | null | undefined>(undefined);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const {
    initialNodes,
    initialEdges,
    currentFlowName: newFlowName,
  } = useFlowBuilder({
    evflData,
    focusNodeId,
    expandAllParams,
    messageDict,
    blinkingNodeId,
    onNodeSelect,
    onNodeDoubleClick,
    onNodeContextMenu,
    onRenameEntryPoint,
  });

  // 处理布局和位置持久化
  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      currentFlowName.current = null;
      return;
    }

    const isNewFile = currentFlowName.current !== newFlowName;
    currentFlowName.current = newFlowName;

    const isExpandChanged =
      prevExpandAllParams.current !== undefined && prevExpandAllParams.current !== expandAllParams;
    prevExpandAllParams.current = expandAllParams;

    const isFocusChanged =
      prevFocusNodeId.current !== undefined && prevFocusNodeId.current !== focusNodeId;
    prevFocusNodeId.current = focusNodeId;

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
    );

    setNodes((prevNodes) => {
      if (isNewFile || prevNodes.length === 0 || isExpandChanged || isFocusChanged) {
        return layoutedNodes;
      }

      const prevPositions = new Map<string, { x: number; y: number }>();
      prevNodes.forEach((n) => {
        const key = n.data?.name ? `name-${n.data.name}` : `id-${n.id}`;
        prevPositions.set(key, { ...n.position });
        prevPositions.set(`id-${n.id}`, { ...n.position });
      });

      // 1. 查找新增的普通事件节点并进行智能定位
      const newEventNodes = layoutedNodes.filter((node) => {
        const key = node.data?.name ? `name-${node.data.name}` : `id-${node.id}`;
        return node.type !== 'entryPointNode' && !prevPositions.has(key);
      });

      newEventNodes.forEach((newNode) => {
        const newKey = newNode.data?.name ? `name-${newNode.data.name}` : `id-${newNode.id}`;
        const idKey = `id-${newNode.id}`;

        // 优先使用拖放或空白处右键指定的交互坐标（顶部居中对齐到鼠标位置）
        if (lastInteractionPos.current) {
          const pos = lastInteractionPos.current;
          lastInteractionPos.current = null;
          const nodeWidth = newNode.type === 'entryPointNode' ? 150 : 220;
          const targetPos = { x: Math.round(pos.x - nodeWidth / 2), y: Math.round(pos.y) };
          prevPositions.set(newKey, targetPos);
          prevPositions.set(idKey, targetPos);
          return;
        }

        const incomingEdge = layoutedEdges.find(
          (e) => e.target === newNode.id && !e.source.startsWith('ep-'),
        );
        const outgoingEdge = layoutedEdges.find((e) => e.source === newNode.id);

        if (incomingEdge && outgoingEdge) {
          // 在已有流程连线中间插入（例如“在上方插入”或者“在下方插入”到中间）
          const targetNode = layoutedNodes.find((n) => n.id === outgoingEdge.target);
          if (targetNode) {
            const targetKey = targetNode.data?.name
              ? `name-${targetNode.data.name}`
              : `id-${targetNode.id}`;
            const targetPos =
              prevPositions.get(targetKey) || prevPositions.get(`id-${targetNode.id}`);
            if (targetPos) {
              const insertY = targetPos.y;
              const shiftDistance = 180;
              // 将处于插入位置及下方的所有下游节点整体平移下移，腾出空间
              prevPositions.forEach((pos) => {
                if (pos.y >= insertY - 10) {
                  pos.y += shiftDistance;
                }
              });
              prevPositions.set(newKey, { x: targetPos.x, y: insertY });
              prevPositions.set(idKey, { x: targetPos.x, y: insertY });
            }
          }
        } else if (incomingEdge && !outgoingEdge) {
          // 在叶子节点下方插入新节点（通过右键节点菜单“添加子节点”）
          const srcNode = layoutedNodes.find((n) => n.id === incomingEdge.source);
          if (srcNode) {
            const srcKey = srcNode.data?.name ? `name-${srcNode.data.name}` : `id-${srcNode.id}`;
            const srcPos = prevPositions.get(srcKey) || prevPositions.get(`id-${srcNode.id}`);
            if (srcPos) {
              const newY = srcPos.y + 180;
              prevPositions.forEach((pos) => {
                if (pos.y >= newY - 10 && Math.abs(pos.x - srcPos.x) < 200) {
                  pos.y += 180;
                }
              });
              prevPositions.set(newKey, { x: srcPos.x, y: newY });
              prevPositions.set(idKey, { x: srcPos.x, y: newY });
            }
          }
        } else if (!incomingEdge && outgoingEdge) {
          // 在根节点上方插入新父节点（通过右键节点菜单“添加父节点”）
          const targetNode = layoutedNodes.find((n) => n.id === outgoingEdge.target);
          if (targetNode) {
            const targetKey = targetNode.data?.name
              ? `name-${targetNode.data.name}`
              : `id-${targetNode.id}`;
            const targetPos =
              prevPositions.get(targetKey) || prevPositions.get(`id-${targetNode.id}`);
            if (targetPos) {
              const insertY = targetPos.y;
              prevPositions.forEach((pos) => {
                if (pos.y >= insertY - 10) {
                  pos.y += 180;
                }
              });
              prevPositions.set(newKey, { x: targetPos.x, y: insertY });
              prevPositions.set(idKey, { x: targetPos.x, y: insertY });
            }
          }
        }
      });

      // 2. 映射每个节点的最终渲染位置
      return layoutedNodes.map((node) => {
        const key = node.data?.name ? `name-${node.data.name}` : `id-${node.id}`;

        if (prevPositions.has(key)) return { ...node, position: prevPositions.get(key) };
        if (prevPositions.has(`id-${node.id}`))
          return { ...node, position: prevPositions.get(`id-${node.id}`) };

        // 特别处理新增入口点节点 (entryPointNode) 的定位：始终保持在子节点正上方居中
        if (node.type === 'entryPointNode') {
          const edgeToTarget = layoutedEdges.find((e) => e.source === node.id);
          if (edgeToTarget) {
            const targetNode = layoutedNodes.find((n) => n.id === edgeToTarget.target);
            if (targetNode) {
              const targetKey = targetNode.data?.name
                ? `name-${targetNode.data.name}`
                : `id-${targetNode.id}`;
              const targetPos =
                prevPositions.get(targetKey) ||
                prevPositions.get(`id-${targetNode.id}`) ||
                targetNode.position;
              if (targetPos) {
                const epsToTarget = layoutedEdges.filter(
                  (e) => e.target === targetNode.id && e.source.startsWith('ep-'),
                );
                const epIdx = epsToTarget.findIndex((e) => e.source === node.id);
                const totalEps = epsToTarget.length;
                const offsetX = totalEps > 1 ? (epIdx - (totalEps - 1) / 2) * 160 : 0;
                return {
                  ...node,
                  position: { x: targetPos.x + 35 + offsetX, y: targetPos.y - 70 },
                };
              }
            }
          }
        }

        // 如果用户在空白区域右键或拖放连线新建了独立节点，使用精确的鼠标交互坐标
        if (lastInteractionPos.current) {
          const pos = lastInteractionPos.current;
          lastInteractionPos.current = null;
          const nodeWidth = node.type === 'entryPointNode' ? 150 : 220;
          return {
            ...node,
            position: { x: Math.round(pos.x - nodeWidth / 2), y: Math.round(pos.y) },
          };
        }

        // 为普通新建独立节点寻找邻居位置
        const connectedEdges = layoutedEdges.filter(
          (e) => e.source === node.id || e.target === node.id,
        );
        for (const edge of connectedEdges) {
          const neighborId = edge.source === node.id ? edge.target : edge.source;
          const neighborNode = layoutedNodes.find((n) => n.id === neighborId);
          if (neighborNode) {
            const neighborKey = neighborNode.data?.name
              ? `name-${neighborNode.data.name}`
              : `id-${neighborNode.id}`;
            const neighborPos =
              prevPositions.get(neighborKey) || prevPositions.get(`id-${neighborNode.id}`);
            if (neighborPos) {
              if (edge.source === node.id) {
                return { ...node, position: { x: neighborPos.x, y: neighborPos.y - 180 } };
              } else {
                return { ...node, position: { x: neighborPos.x, y: neighborPos.y + 180 } };
              }
            }
          }
        }
        return node;
      });
    });
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges, newFlowName, expandAllParams]);

  useEffect(() => {
    if (rfInstance && newFlowName) {
      setTimeout(() => {
        rfInstance.fitView({ padding: 0.1, duration: 500 });
      }, 50);
    }
  }, [newFlowName, rfInstance]);

  return (
    <div className="react-flow-wrapper">
      <FlowAnimationContext.Provider value={showFlowAnimation}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onEdgeClick={(_e, edge) => {
            if (knifeMode && onEdgesDelete) onEdgesDelete([edge]);
          }}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            if (onEdgeContextMenu) onEdgeContextMenu(edge, e);
          }}
          onPaneClick={() => {
            lastInteractionPos.current = null;
            if (onPaneClick) onPaneClick();
          }}
          onNodeDoubleClick={(_e, node) => {
            if (onNodeDoubleClick) onNodeDoubleClick(node);
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            lastInteractionPos.current = null; // 清除之前的 pane 遗留坐标
            onNodeContextMenu(node, e);
          }}
          onPaneContextMenu={(e) => {
            e.preventDefault();
            if (rfInstance) {
              lastInteractionPos.current = rfInstance.screenToFlowPosition({
                x: e.clientX,
                y: e.clientY,
              });
            }
            onPaneContextMenu(e);
          }}
          onConnectStart={(_event, params) => {
            dragSource.current = params.nodeId;
          }}
          onConnect={(params) => {
            if (params.source && params.target) onEdgeConnect(params.source, params.target);
          }}
          onConnectEnd={(event) => {
            const targetIsNodeOrHandle = (event.target as Element)?.closest?.(
              '.react-flow__handle, .react-flow__node',
            );
            if (!targetIsNodeOrHandle && dragSource.current) {
              if (rfInstance) {
                let clientX = 0,
                  clientY = 0;
                if (event instanceof MouseEvent) {
                  clientX = event.clientX;
                  clientY = event.clientY;
                } else if (window.TouchEvent && event instanceof TouchEvent) {
                  clientX = event.changedTouches[0].clientX;
                  clientY = event.changedTouches[0].clientY;
                }
                lastInteractionPos.current = rfInstance.screenToFlowPosition({
                  x: clientX,
                  y: clientY,
                });
              }
              onEdgeDrop(event, dragSource.current);
            }
            dragSource.current = null;
          }}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onlyRenderVisibleElements={true}
          elevateNodesOnSelect={false}
          fitView
          minZoom={0.05}
          maxZoom={2}
        >
          <Background color="#383838" gap={16} />
          <Controls>
            <FpsCounter />
          </Controls>
        </ReactFlow>
      </FlowAnimationContext.Provider>
    </div>
  );
}
