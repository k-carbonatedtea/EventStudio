import { Position } from '@xyflow/react';
import dagre from 'dagre';

// 布局结果缓存结构
let lastLayoutKey = '';
let lastLayoutResult: { nodes: any[]; edges: any[] } | null = null;

// 生成拓扑签名（用于快速判断图结构是否发生改变）
function getTopologyKey(nodes: any[], edges: any[], direction: string): string {
  const nodeParts = nodes.map((n) => `${n.id}:${n.type}:${n.data?.expandParams ? 1 : 0}`);
  const edgeParts = edges.map((e) => `${e.source}->${e.target}`);
  return `${direction}_n[${nodeParts.join(',')}]_e[${edgeParts.join(',')}]`;
}

// 根据节点连接关系将节点分组并使用 dagre 算法布局
export const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 1. 检查拓扑缓存
  const currentKey = getTopologyKey(nodes, edges, direction);
  if (currentKey === lastLayoutKey && lastLayoutResult) {
    // 拓扑结构未改变，仅同步更新最新数据并复用计算好的坐标
    const posMap = new Map<string, { x: number; y: number }>();
    lastLayoutResult.nodes.forEach((n) => posMap.set(n.id, n.position));

    const updatedNodes = nodes.map((n) => ({
      ...n,
      position: posMap.get(n.id) || n.position,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
    }));
    return { nodes: updatedNodes, edges };
  }

  const isHorizontal = direction === 'LR';

  // 将节点划分到独立的连通子图 (Connected Components) 中
  const adjacencyList = new Map<string, string[]>();
  const nodeMap = new Map<string, any>();

  nodes.forEach((n) => {
    adjacencyList.set(n.id, []);
    nodeMap.set(n.id, n);
  });

  edges.forEach((e) => {
    if (adjacencyList.has(e.source) && adjacencyList.has(e.target)) {
      // 作为无向图处理来找到连通分量
      adjacencyList.get(e.source)!.push(e.target);
      adjacencyList.get(e.target)!.push(e.source);
    }
  });

  const visited = new Set<string>();
  const components: { nodes: any[]; edges: any[] }[] = [];

  // BFS 遍历寻找连通分量
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      const compNodes: any[] = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const currId = queue.shift()!;
        compNodes.push(nodeMap.get(currId));

        adjacencyList.get(currId)!.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      const compNodeIds = new Set(compNodes.map((n) => n.id));
      const compEdges = edges.filter((e) => compNodeIds.has(e.source) && compNodeIds.has(e.target));
      components.push({ nodes: compNodes, edges: compEdges });
    }
  });

  const COMPONENT_SPACING = 200; // 每组节点(独立流)之间的水平间距
  let currentXOffset = 0;
  const newNodes: any[] = [];

  // 对每个独立的组单独进行布局
  components.forEach((comp) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: 120,
      ranksep: 180,
    });

    comp.nodes.forEach((node) => {
      let width = node.type === 'entryPointNode' ? 150 : 220;
      let height = node.type === 'entryPointNode' ? 40 : 120;

      // 动态计算节点的高宽
      if (node.type === 'eventNode') {
        let maxTextLen = Math.max(node.data.name?.length || 0, node.data.label?.length || 0);
        if (node.data?.expandParams && node.data?.originalData?.[node.data.type]?.params?.data) {
          const paramCount = Object.keys(node.data.originalData[node.data.type].params.data).length;
          if (paramCount > 0) {
            height = 130 + 25 * paramCount;
            Object.entries(node.data.originalData[node.data.type].params.data).forEach(
              ([key, valObj]: [string, any]) => {
                const val = String(valObj[Object.keys(valObj)[0]]);
                maxTextLen = Math.max(maxTextLen, key.length + val.length + 5);
              },
            );
          }
        }
        width = Math.max(220, Math.min(500, maxTextLen * 7 + 40));
      }

      dagreGraph.setNode(node.id, { width, height });
    });

    comp.edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // 计算当前子图的宽度（包围盒）
    let minX = Infinity,
      maxX = -Infinity;
    comp.nodes.forEach((node) => {
      const pos = dagreGraph.node(node.id);
      const width = node.type === 'entryPointNode' ? 150 : 220;
      minX = Math.min(minX, pos.x - width / 2);
      maxX = Math.max(maxX, pos.x + width / 2);
    });

    if (minX === Infinity) {
      minX = 0;
      maxX = 0;
    }

    // 计算位移，使得每个子图平移到 currentXOffset 位置
    const shiftX = currentXOffset - minX;

    comp.nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const width = node.type === 'entryPointNode' ? 150 : 220;
      const height = node.type === 'entryPointNode' ? 40 : 120;

      newNodes.push({
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: {
          x: nodeWithPosition.x - width / 2 + shiftX,
          y: nodeWithPosition.y - height / 2,
        },
      });
    });

    // 更新下一个子图的起始X坐标
    currentXOffset += maxX - minX + COMPONENT_SPACING;
  });

  const result = { nodes: newNodes, edges };
  lastLayoutKey = currentKey;
  lastLayoutResult = result;

  return result;
};
