import { useState } from 'react';
import { FileNode } from '../types/fileTree';

// 管理全局弹窗与上下文菜单状态的自定义 Hook
export function useAppModalsState() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isRenameFlowchartModalOpen, setIsRenameFlowchartModalOpen] = useState(false);

  const [newFileModal, setNewFileModal] = useState<{ isOpen: boolean; targetDir: string }>({
    isOpen: false,
    targetDir: '',
  });
  const [renameFileModal, setRenameFileModal] = useState<{
    isOpen: boolean;
    fileNode: FileNode | null;
  }>({ isOpen: false, fileNode: null });
  const [fileContextMenu, setFileContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: FileNode | null;
  }>({ visible: false, x: 0, y: 0, node: null });

  const [editingNode, setEditingNode] = useState<any | null>(null);
  const [editingSwitchNode, setEditingSwitchNode] = useState<any | null>(null);
  const [editingForkNode, setEditingForkNode] = useState<any | null>(null);
  const [editingEntryPoint, setEditingEntryPoint] = useState<{ id: string; name: string } | null>(
    null,
  );

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: any | null;
  }>({ visible: false, x: 0, y: 0, node: null });
  const [paneContextMenu, setPaneContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sourceNodeId: string | null;
  }>({ visible: false, x: 0, y: 0, sourceNodeId: null });
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    edge: any;
  }>({ visible: false, x: 0, y: 0, edge: null });

  // 关闭所有弹出上下文菜单
  const closeAllMenus = () => {
    setContextMenu((c) => ({ ...c, visible: false }));
    setPaneContextMenu((p) => ({ ...p, visible: false }));
    setEdgeContextMenu((e) => ({ ...e, visible: false }));
    setFileContextMenu((f) => ({ ...f, visible: false }));
  };

  return {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isAboutModalOpen,
    setIsAboutModalOpen,
    isHelpModalOpen,
    setIsHelpModalOpen,
    isRenameFlowchartModalOpen,
    setIsRenameFlowchartModalOpen,
    newFileModal,
    setNewFileModal,
    renameFileModal,
    setRenameFileModal,
    fileContextMenu,
    setFileContextMenu,
    editingNode,
    setEditingNode,
    editingSwitchNode,
    setEditingSwitchNode,
    editingForkNode,
    setEditingForkNode,
    editingEntryPoint,
    setEditingEntryPoint,
    contextMenu,
    setContextMenu,
    paneContextMenu,
    setPaneContextMenu,
    edgeContextMenu,
    setEdgeContextMenu,
    closeAllMenus,
  };
}
