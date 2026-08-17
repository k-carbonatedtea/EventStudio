import {
  createNewNode,
  linkNodes,
  deleteEdges,
  addEntryPoint,
  removeEntryPoint,
  renameEntryPoint,
  addNewParent,
  addNewChild,
  unlinkChild,
  removeEvent,
} from "../utils/evflOperations";

interface UseFlowOperationsParams {
  evflData: any;
  pushToHistory: (newData: any, title?: string, detail?: string) => void;
  setFocusNodeId: (id: string | null) => void;
  setBlinkingNodeId: (id: string | null) => void;
  setEditingSwitchNode: (node: any) => void;
  setEditingForkNode: (node: any) => void;
  setEditingEntryPoint?: (ep: { id: string; name: string } | null) => void;
}

// 流程图节点增删改查及上下文操作自定义 Hook
export function useFlowOperations({
  evflData,
  pushToHistory,
  setFocusNodeId,
  setBlinkingNodeId,
  setEditingSwitchNode,
  setEditingForkNode,
  setEditingEntryPoint,
}: UseFlowOperationsParams) {
  // 创建新节点
  const handleCreateNewNode = (actionType: string, sourceNodeId: string | null) => {
    if (actionType === "restore_view") {
      setFocusNodeId(null);
      return;
    }
    const newData = createNewNode(evflData, actionType, sourceNodeId);
    if (newData) {
      const typeLabels: Record<string, string> = {
        Action: "动作节点 (Action)",
        Switch: "条件分支 (Switch)",
        Fork: "并行分支 (Fork)",
        Join: "汇合节点 (Join)",
        SubFlow: "子流程节点 (SubFlow)",
      };
      const label = typeLabels[actionType] || `${actionType} 节点`;
      const detail = sourceNodeId ? `连接自节点 #${sourceNodeId}` : "独立节点";
      pushToHistory(newData, `创建${label}`, detail);
    }
  };

  // 链接节点
  const handleLinkNodes = (sourceNodeId: string, targetNodeId: string) => {
    const targetEvent = evflData?.flowchart?.events?.[parseInt(targetNodeId)];
    if (targetEvent && Object.keys(targetEvent.data)[0] === "Join") {
      setBlinkingNodeId(sourceNodeId);
      setTimeout(() => setBlinkingNodeId(null), 1500);
      return;
    }
    const newData = linkNodes(evflData, sourceNodeId, targetNodeId);
    if (newData) {
      const srcName = evflData?.flowchart?.events?.[parseInt(sourceNodeId)]?.name || `#${sourceNodeId}`;
      const dstName = evflData?.flowchart?.events?.[parseInt(targetNodeId)]?.name || `#${targetNodeId}`;
      pushToHistory(newData, `连接节点: ${srcName} → ${dstName}`, "建立流程连线");
    }
  };

  // 删除连线
  const handleEdgesDelete = (edges: any[]) => {
    const { newEvflData, modified } = deleteEdges(evflData, edges);
    if (modified) {
      pushToHistory(newEvflData, `删除节点连线`, `已断开 ${edges.length} 条连接`);
    }
  };

  // 重命名入口点
  const handleRenameEntryPoint = (epId: string, newName: string) => {
    const newData = renameEntryPoint(evflData, epId, newName);
    if (newData) {
      pushToHistory(newData, `重命名入口点: ${newName}`, `入口点 ${epId}`);
    }
  };

  // 节点右键菜单动作分发
  const handleNodeAction = (actionName: string, node: any) => {
    const nodeLabel = node.data?.name || `#${node.id}`;
    switch (actionName) {
      case "Edit cases...":
        setEditingSwitchNode(node.data);
        break;
      case "Edit branches...":
        setEditingForkNode(node.data);
        break;
      case "Add entry point here...": {
        const newData = addEntryPoint(evflData, node.id);
        if (newData) pushToHistory(newData, "添加入口点", `指向节点 ${nodeLabel}`);
        break;
      }
      case "Rename entry point...": {
        const epIndex = parseInt(String(node.id).replace('ep-', ''));
        const currentEp = evflData?.flowchart?.entry_points?.[epIndex];
        if (setEditingEntryPoint) {
          setEditingEntryPoint({ id: node.id, name: currentEp?.name || node.data?.name || '' });
        }
        break;
      }
      case "Remove entry point": {
        const newData = removeEntryPoint(evflData, node.id);
        if (newData) pushToHistory(newData, "移除入口点", `入口点 ${nodeLabel}`);
        break;
      }
      case "Add new parent...": {
        const newData = addNewParent(evflData, node.id);
        if (newData) pushToHistory(newData, "在上方插入新事件", `前置于 ${nodeLabel}`);
        break;
      }
      case "Add new child...": {
        const newData = addNewChild(evflData, node.id);
        if (newData) pushToHistory(newData, "在下方插入新事件", `后置于 ${nodeLabel}`);
        break;
      }
      case "Unlink child": {
        const newData = unlinkChild(evflData, node.id);
        if (newData) pushToHistory(newData, "取消子节点链接", `断开 ${nodeLabel} 的后续连接`);
        break;
      }
      case "Remove event": {
        const newData = removeEvent(evflData, node.id);
        if (newData) pushToHistory(newData, `移除事件: ${nodeLabel}`, "删除事件节点");
        break;
      }
      case "Show only connected events":
        setFocusNodeId(node.id);
        break;
    }
  };

  return {
    handleCreateNewNode,
    handleLinkNodes,
    handleEdgesDelete,
    handleRenameEntryPoint,
    handleNodeAction,
  };
}
