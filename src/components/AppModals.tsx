import { lazy, Suspense } from 'react';
import { Trash2 } from 'lucide-react';
import ContextMenu from '../ContextMenu';
import PaneContextMenu from '../PaneContextMenu';
import RenameFlowchartModal from './RenameFlowchartModal';
import RenameEntryPointModal from './RenameEntryPointModal';
import NewFileModal from './NewFileModal';
import RenameFileModal from './RenameFileModal';
import FileContextMenu from './FileContextMenu';
import { FileNode } from '../types/fileTree';
import { GamePathSettings } from '../types/settings';

// 懒加载大型模态框
const NodeEditorModal = lazy(() => import('../NodeEditorModal'));
const SwitchEditorModal = lazy(() => import('../SwitchEditorModal'));
const ForkEditorModal = lazy(() => import('../ForkEditorModal'));
const GameSettingsModal = lazy(() => import('./GameSettingsModal'));
const AboutModal = lazy(() => import('./AboutModal'));
const HelpModal = lazy(() => import('./HelpModal'));

interface AppModalsProps {
  // 全局设置与辅助弹窗
  isSettingsModalOpen: boolean;
  gameSettings: GamePathSettings;
  setIsSettingsModalOpen: (open: boolean) => void;
  saveGameSettings: (settings: GamePathSettings) => Promise<void> | void;
  pickFolder: (title?: string) => Promise<string | null>;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  isAboutModalOpen: boolean;
  setIsAboutModalOpen: (open: boolean) => void;

  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;

  // 流程图与文件弹窗
  isRenameFlowchartModalOpen: boolean;
  flowchartName: string;
  setIsRenameFlowchartModalOpen: (open: boolean) => void;
  onConfirmRenameFlowchart: (newName: string) => void;

  // 入口点重命名弹窗
  editingEntryPoint: { id: string; name: string } | null;
  setEditingEntryPoint: (ep: { id: string; name: string } | null) => void;
  onConfirmRenameEntryPoint: (epId: string, newName: string) => void;

  newFileModal: { isOpen: boolean; targetDir: string };
  setNewFileModal: (state: { isOpen: boolean; targetDir: string }) => void;
  onConfirmCreateFile: (fileName: string) => void;

  renameFileModal: { isOpen: boolean; fileNode: FileNode | null };
  setRenameFileModal: (state: { isOpen: boolean; fileNode: FileNode | null }) => void;
  onConfirmRenameFile: (oldPath: string, newName: string) => void;

  fileContextMenu: { visible: boolean; x: number; y: number; node: FileNode | null };
  setFileContextMenu: (state: {
    visible: boolean;
    x: number;
    y: number;
    node: FileNode | null;
  }) => void;
  onOpenFileAsJson?: (path: string) => void;
  onDeleteFile: (node: FileNode) => void;

  // 节点编辑弹窗与上下文菜单
  editingNode: any | null;
  setEditingNode: (node: any | null) => void;
  editingSwitchNode: any | null;
  setEditingSwitchNode: (node: any | null) => void;
  editingForkNode: any | null;
  setEditingForkNode: (node: any | null) => void;
  actors: any[];
  events: any[];
  onUpdateNode: (data: any) => void;

  paneContextMenu: { visible: boolean; x: number; y: number; sourceNodeId: string | null };
  setPaneContextMenu: (state: {
    visible: boolean;
    x: number;
    y: number;
    sourceNodeId: string | null;
  }) => void;
  focusNodeId: string | null;
  onHandleCreateNewNode: (actionType: string, sourceNodeId: string | null) => void;

  contextMenu: { visible: boolean; x: number; y: number; node: any | null };
  setContextMenu: (state: { visible: boolean; x: number; y: number; node: any | null }) => void;
  onNodeAction: (actionName: string, node: any) => void;

  edgeContextMenu: { visible: boolean; x: number; y: number; edge: any };
  setEdgeContextMenu: (state: { visible: boolean; x: number; y: number; edge: any }) => void;
  onEdgesDelete: (edges: any[]) => void;
}

// 统一管理所有弹窗和右键菜单的容器组件
export default function AppModals({
  isSettingsModalOpen,
  gameSettings,
  setIsSettingsModalOpen,
  saveGameSettings,
  pickFolder,
  showToast,
  isAboutModalOpen,
  setIsAboutModalOpen,
  isHelpModalOpen,
  setIsHelpModalOpen,
  isRenameFlowchartModalOpen,
  flowchartName,
  setIsRenameFlowchartModalOpen,
  onConfirmRenameFlowchart,
  editingEntryPoint,
  setEditingEntryPoint,
  onConfirmRenameEntryPoint,
  newFileModal,
  setNewFileModal,
  onConfirmCreateFile,
  renameFileModal,
  setRenameFileModal,
  onConfirmRenameFile,
  fileContextMenu,
  setFileContextMenu,
  onOpenFileAsJson,
  onDeleteFile,
  editingNode,
  setEditingNode,
  editingSwitchNode,
  setEditingSwitchNode,
  editingForkNode,
  setEditingForkNode,
  actors,
  events,
  onUpdateNode,
  paneContextMenu,
  setPaneContextMenu,
  focusNodeId,
  onHandleCreateNewNode,
  contextMenu,
  setContextMenu,
  onNodeAction,
  edgeContextMenu,
  setEdgeContextMenu,
  onEdgesDelete,
}: AppModalsProps) {
  return (
    <>
      {/* 节点与画布上下文菜单 */}
      {paneContextMenu.visible && (
        <PaneContextMenu
          x={paneContextMenu.x}
          y={paneContextMenu.y}
          sourceNodeId={paneContextMenu.sourceNodeId}
          isFocused={!!focusNodeId}
          onClose={() => setPaneContextMenu({ ...paneContextMenu, visible: false })}
          onAction={onHandleCreateNewNode}
        />
      )}

      {edgeContextMenu.visible && edgeContextMenu.edge && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: edgeContextMenu.y,
            left: edgeContextMenu.x,
            zIndex: 1000,
          }}
        >
          <div
            className="context-menu-item"
            style={{ color: '#ef4444' }}
            onClick={() => {
              onEdgesDelete([edgeContextMenu.edge]);
              setEdgeContextMenu({ ...edgeContextMenu, visible: false });
            }}
          >
            <Trash2 size={14} style={{ marginRight: '6px' }} /> 切断连线
          </div>
        </div>
      )}

      {contextMenu.visible && contextMenu.node && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
          onEditEvent={setEditingNode}
          onAction={onNodeAction}
        />
      )}

      {/* 节点编辑弹窗 */}
      <Suspense fallback={null}>
        {editingNode && (
          <NodeEditorModal
            node={editingNode}
            actors={actors}
            onSave={(data) => {
              onUpdateNode(data);
              setEditingNode(null);
            }}
            onCancel={() => setEditingNode(null)}
          />
        )}

        {editingSwitchNode && (
          <SwitchEditorModal
            node={editingSwitchNode}
            events={events}
            actors={actors}
            onSave={(data) => {
              onUpdateNode(data);
              setEditingSwitchNode(null);
            }}
            onCancel={() => setEditingSwitchNode(null)}
          />
        )}

        {editingForkNode && (
          <ForkEditorModal
            node={editingForkNode}
            events={events}
            actors={actors}
            onSave={(data) => {
              onUpdateNode(data);
              setEditingForkNode(null);
            }}
            onCancel={() => setEditingForkNode(null)}
          />
        )}

        {/* 偏好设置、关于与帮助弹窗 */}
        {isSettingsModalOpen && (
          <GameSettingsModal
            isOpen={isSettingsModalOpen}
            initialSettings={gameSettings}
            onClose={() => setIsSettingsModalOpen(false)}
            onSave={saveGameSettings}
            onPickFolder={pickFolder}
            onShowToast={showToast}
          />
        )}

        {isAboutModalOpen && (
          <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        )}

        {isHelpModalOpen && (
          <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        )}
      </Suspense>

      {/* 流程图重命名弹窗 */}
      <RenameFlowchartModal
        isOpen={isRenameFlowchartModalOpen}
        currentName={flowchartName}
        onClose={() => setIsRenameFlowchartModalOpen(false)}
        onConfirm={onConfirmRenameFlowchart}
      />

      {/* 入口点重命名/编辑弹窗 */}
      <RenameEntryPointModal
        isOpen={!!editingEntryPoint}
        entryPoint={editingEntryPoint}
        onClose={() => setEditingEntryPoint(null)}
        onConfirm={onConfirmRenameEntryPoint}
      />

      {/* 新建 .bfevfl 文件弹窗 */}
      <NewFileModal
        isOpen={newFileModal.isOpen}
        targetDir={newFileModal.targetDir}
        onClose={() => setNewFileModal({ isOpen: false, targetDir: '' })}
        onConfirm={onConfirmCreateFile}
      />

      {/* 重命名文件弹窗 */}
      <RenameFileModal
        isOpen={renameFileModal.isOpen}
        fileNode={renameFileModal.fileNode}
        onClose={() => setRenameFileModal({ isOpen: false, fileNode: null })}
        onConfirm={onConfirmRenameFile}
      />

      {/* 侧边栏文件右键菜单 */}
      {fileContextMenu.visible && fileContextMenu.node && (
        <FileContextMenu
          x={fileContextMenu.x}
          y={fileContextMenu.y}
          node={fileContextMenu.node}
          onClose={() => setFileContextMenu({ ...fileContextMenu, visible: false })}
          onOpenFileAsJson={onOpenFileAsJson}
          onNewFile={(targetDir) => {
            setNewFileModal({ isOpen: true, targetDir });
          }}
          onRenameFile={(node) => {
            setRenameFileModal({ isOpen: true, fileNode: node });
          }}
          onDeleteFile={onDeleteFile}
        />
      )}
    </>
  );
}
