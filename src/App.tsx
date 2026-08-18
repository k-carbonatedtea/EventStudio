import { useState, useEffect, lazy, Suspense } from 'react';
import { invoke } from '@tauri-apps/api/core';
import FlowMap from './FlowMap';
import MenuBar from './components/MenuBar';
import EmptyStateGuide from './components/EmptyStateGuide';
import DragDropOverlay from './components/DragDropOverlay';
import Toast, { ToastMessage } from './components/Toast';
import AppSidebar from './components/AppSidebar';
import EditorSubHeader from './components/EditorSubHeader';
import { FileNode } from './types/fileTree';
import { useEvflData } from './hooks/useEvflData';
import { useFileDragDrop } from './hooks/useFileDragDrop';
import { useGameSettings } from './hooks/useGameSettings';
import { useMessageDict } from './hooks/useMessageDict';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useSidebarResize } from './hooks/useSidebarResize';
import { useFlowOperations } from './hooks/useFlowOperations';
import { useAppModalsState } from './hooks/useAppModalsState';
import { useRecentProjects } from './hooks/useRecentProjects';
import { getParentDir } from './utils/fileLoader';
import { useTranslation } from './i18n';
import './index.css';

// 懒加载重型编辑器与非核心工作区
const ActorManager = lazy(() => import('./ActorManager'));
const EventManager = lazy(() => import('./EventManager'));
const MsbtEditor = lazy(() => import('./components/MsbtEditor'));
const YamlEditor = lazy(() => import('./components/YamlEditor'));
const AppModals = lazy(() => import('./components/AppModals'));

function App() {
  const { t } = useTranslation();
  const { recentProjects, addRecent, removeRecent, clearAllRecents } = useRecentProjects();
  const {
    filePath,
    evflData,
    setEvflData,
    yamlData,
    modFolderPath,
    modFolderTree,
    history,
    historyIndex,
    pushToHistory,
    handleOpen,
    handleOpenModFolder,
    openFileByPath,
    openModFolderByPath,
    refreshModFolder,
    createBfevflFile,
    deleteFile,
    renameFile,
    handleSave,
    handleUndo,
    handleRedo,
    jumpToHistory,
    deleteHistoryStep,
    clearHistorySteps,
    handleDiscard,
    handleUpdateNode,
    handleNew,
    handleSaveAs,
    renameFlowchart,
  } = useEvflData(addRecent);

  // 游戏根目录与双平台配置
  const { settings: gameSettings, saveSettings: saveGameSettings, pickFolder } = useGameSettings();
  const { messageDict } = useMessageDict(gameSettings, modFolderPath);

  // 全局弹窗与菜单状态
  const modalsState = useAppModalsState();
  const {
    setIsSettingsModalOpen,
    setIsAboutModalOpen,
    setIsHelpModalOpen,
    setIsRenameFlowchartModalOpen,
    newFileModal,
    setNewFileModal,
    setFileContextMenu,
    setEditingNode,
    setEditingSwitchNode,
    setEditingForkNode,
    setEditingEntryPoint,
    setContextMenu,
    setPaneContextMenu,
    setEdgeContextMenu,
    closeAllMenus,
  } = modalsState;

  const [blinkingNodeId, setBlinkingNodeId] = useState<string | null>(null);
  const [knifeMode, setKnifeMode] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'flowchart' | 'actors' | 'events' | 'json'>(
    'flowchart',
  );

  // 侧边栏宽度及拖拽状态
  const { sidebarWidth, isResizingSidebar, setIsResizingSidebar } = useSidebarResize(250);

  // 节点完整内容展开与图表刷新
  const [expandAllParams, setExpandAllParams] = useState<boolean>(
    () => localStorage.getItem('expandAllParams') === 'true',
  );
  const [showFlowAnimation, setShowFlowAnimation] = useState<boolean>(() => {
    const stored = localStorage.getItem('showFlowAnimation');
    return stored !== null ? stored === 'true' : true;
  });
  const [graphKey, setGraphKey] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ id: Date.now().toString(), text, type });
  };

  const toggleExpandParams = () => {
    setExpandAllParams((prev) => {
      const next = !prev;
      localStorage.setItem('expandAllParams', String(next));
      showToast(next ? '已开启节点内容完整显示' : '已关闭节点内容完整显示', 'info');
      return next;
    });
  };

  const toggleFlowAnimation = () => {
    setShowFlowAnimation((prev) => {
      const next = !prev;
      localStorage.setItem('showFlowAnimation', String(next));
      showToast(next ? '已开启流动小球' : '已关闭流动小球', 'info');
      return next;
    });
  };

  const handleReloadGraph = () => {
    setGraphKey((prev) => prev + 1);
    showToast('流程图已重新加载', 'info');
  };

  // 监听文件拖拽事件
  const { isDraggingFile } = useFileDragDrop(openFileByPath, openModFolderByPath, showToast);

  // 新建事件流处理
  const handleCreateNewFlow = async () => {
    setActiveTab('flowchart');
    await handleNew();
  };

  // 键盘全局快捷键监听
  useAppShortcuts({
    onOpen: handleOpen,
    onNew: handleCreateNewFlow,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onOpenHelp: () => setIsHelpModalOpen(true),
    onOpenSettings: () => setIsSettingsModalOpen(true),
    onReloadGraph: handleReloadGraph,
    onToggleKnifeMode: () => setKnifeMode((prev) => !prev),
    onToggleExpandParams: toggleExpandParams,
    onSwitchTab: (tab) => setActiveTab(tab),
    onEscape: closeAllMenus,
  });

  // 禁用默认右键菜单
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 流程图节点增删改及动作分发
  const {
    handleCreateNewNode,
    handleLinkNodes,
    handleEdgesDelete,
    handleRenameEntryPoint,
    handleNodeAction,
  } = useFlowOperations({
    evflData,
    pushToHistory,
    setFocusNodeId,
    setBlinkingNodeId,
    setEditingSwitchNode,
    setEditingForkNode,
    setEditingEntryPoint,
  });

  // 节点双击直接进入编辑
  const handleNodeDoubleClick = (target: any) => {
    if (!target) return;
    closeAllMenus();
    const nodeData = target.data ? target.data : target;
    const typeKey =
      nodeData.type ||
      (target.type === 'entryPointNode' ? 'EntryPoint' : '') ||
      (nodeData.originalData ? Object.keys(nodeData.originalData)[0] : '') ||
      '';

    if (
      typeKey === 'EntryPoint' ||
      target.type === 'entryPointNode' ||
      String(nodeData.id).startsWith('ep-')
    ) {
      const epIndex = parseInt(String(nodeData.id || target.id).replace('ep-', ''));
      const ep = evflData?.flowchart?.entry_points?.[epIndex];
      setEditingEntryPoint({ id: nodeData.id || target.id, name: ep?.name || nodeData.name || '' });
    } else if (typeKey === 'Switch') {
      setEditingSwitchNode(nodeData);
    } else if (typeKey === 'Fork') {
      setEditingForkNode(nodeData);
    } else if (
      typeKey === 'Action' ||
      typeKey === 'SubFlow' ||
      typeKey === 'Join' ||
      target.type === 'eventNode' ||
      nodeData.originalData
    ) {
      setEditingNode(nodeData);
    }
  };

  // 流程图重命名确认
  const handleConfirmRenameFlowchart = async (newName: string) => {
    renameFlowchart(newName);
    if (filePath) {
      const oldFileName = filePath.split(/[/\\]/).pop() || '';
      const oldBase = oldFileName.replace(/\.bfevfl$/i, '');
      if (oldBase && oldBase !== newName && oldFileName.toLowerCase().endsWith('.bfevfl')) {
        try {
          await renameFile(filePath, `${newName}.bfevfl`);
        } catch (e) {
          console.warn('Auto rename file warning:', e);
        }
      }
    }
    showToast(`流程图名称已修改为: ${newName}`, 'success');
  };

  // 新建文件确认
  const handleConfirmCreateFile = async (fileName: string) => {
    try {
      const target =
        newFileModal.targetDir || (filePath ? getParentDir(filePath) : modFolderPath || '');
      await createBfevflFile(target, fileName);
      showToast(`已创建事件流文件: ${fileName}`, 'success');
    } catch (err) {
      showToast(`创建文件失败: ${err}`, 'error');
    }
  };

  // 删除文件与重命名确认
  const handleConfirmDeleteFile = async (node: FileNode) => {
    if (confirm(`确定要删除文件 "${node.name}" 吗？此操作无法撤销。`)) {
      try {
        await deleteFile(node.path);
        showToast(`已删除文件: ${node.name}`, 'success');
      } catch (err) {
        showToast(`删除文件失败: ${err}`, 'error');
      }
    }
  };

  const handleConfirmRenameFile = async (oldPath: string, newName: string) => {
    try {
      await renameFile(oldPath, newName);
      showToast(`已重命名文件为: ${newName}`, 'success');
    } catch (err) {
      showToast(`重命名文件失败: ${err}`, 'error');
    }
  };

  // 目录打开处理
  const handleOpenSettingsDir = async () => {
    try {
      await invoke('open_settings_dir');
    } catch (err) {
      showToast(`打开设置目录失败: ${err}`, 'error');
    }
  };

  const handleOpenProjectDir = async () => {
    try {
      let targetPath = modFolderPath || filePath;
      if (!targetPath) {
        const plat = gameSettings.currentPlatform;
        targetPath =
          plat === 'wiiu'
            ? gameSettings.wiiu.exportDir || gameSettings.wiiu.gameDir
            : gameSettings.switch.exportDir || gameSettings.switch.gameDir;
      }
      if (!targetPath) {
        showToast(t('menu.noProjectOpen'), 'info');
        return;
      }
      await invoke('open_path_in_explorer', { path: targetPath });
    } catch (err) {
      showToast(`打开项目储存目录失败: ${err}`, 'error');
    }
  };

  // 导出角色定义为 JSON
  const handleExportActorDefs = async () => {
    if (!evflData) return;
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await save({
        filters: [{ name: 'JSON Definitions', extensions: ['json'] }],
        defaultPath: 'actor_definitions.json',
      });
      if (selectedPath) {
        await invoke('export_actor_definitions_json', {
          evflJson: JSON.stringify(evflData),
          exportPath: selectedPath,
        });
        showToast(t('autofill.exportDefsSuccess'), 'success');
      }
    } catch (err) {
      showToast(`${t('autofill.exportDefsFailed')}: ${err}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <MenuBar
        onNew={handleCreateNewFlow}
        onOpen={handleOpen}
        onOpenModFolder={handleOpenModFolder}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportActorDefs={handleExportActorDefs}
        onRename={() => setIsRenameFlowchartModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSettingsDir={handleOpenSettingsDir}
        onOpenProjectDir={handleOpenProjectDir}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        expandAllParams={expandAllParams}
        onToggleExpandParams={toggleExpandParams}
        showFlowAnimation={showFlowAnimation}
        onToggleFlowAnimation={toggleFlowAnimation}
        onReloadGraph={handleReloadGraph}
        modFolderPath={modFolderPath}
        filePath={filePath}
        evflData={evflData}
        currentPlatform={gameSettings.currentPlatform}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <AppSidebar
          modFolderPath={modFolderPath}
          filePath={filePath}
          sidebarWidth={sidebarWidth}
          isResizingSidebar={isResizingSidebar}
          setIsResizingSidebar={setIsResizingSidebar}
          modFolderTree={modFolderTree}
          openFileByPath={openFileByPath}
          onNewFileClick={() =>
            setNewFileModal({
              isOpen: true,
              targetDir: filePath ? getParentDir(filePath) : modFolderPath || '',
            })
          }
          onRefreshClick={refreshModFolder}
          onContextMenu={(node, e) =>
            setFileContextMenu({ visible: true, x: e.clientX, y: e.clientY, node })
          }
        />

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={null}>
            {filePath?.toLowerCase().endsWith('.msbt') ? (
              <MsbtEditor filePath={filePath} />
            ) : yamlData ? (
              <YamlEditor filePath={filePath!} initialData={yamlData} />
            ) : !evflData ? (
              <EmptyStateGuide
                modFolderPath={modFolderPath}
                onOpen={handleOpen}
                onOpenModFolder={handleOpenModFolder}
                onNew={handleCreateNewFlow}
                onOpenHelp={() => setIsHelpModalOpen(true)}
                recentProjects={recentProjects}
                onOpenRecent={(item) => {
                  if (item.type === 'mod') {
                    openModFolderByPath(item.path);
                  } else {
                    openFileByPath(item.path);
                  }
                }}
                onRemoveRecent={removeRecent}
                onClearRecent={clearAllRecents}
              />
            ) : (
              <>
                {/* 子顶部栏：展示真实事件名、修改与保存、时间轴步骤 */}
                <EditorSubHeader
                  filePath={filePath}
                  evflData={evflData}
                  history={history}
                  historyIndex={historyIndex}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onJumpToHistory={jumpToHistory}
                  onDeleteHistoryStep={deleteHistoryStep}
                  onClearHistorySteps={clearHistorySteps}
                  onDiscard={handleDiscard}
                  onSave={handleSave}
                  onRenameFlowchart={handleConfirmRenameFlowchart}
                  showToast={showToast}
                />

                {/* 流程图工作区 */}
                <div
                  className={`workspace ${knifeMode ? 'knife-mode' : ''}`}
                  style={{ display: activeTab === 'flowchart' ? 'flex' : 'none' }}
                >
                  <FlowMap
                    key={graphKey}
                    evflData={evflData}
                    focusNodeId={focusNodeId}
                    expandAllParams={expandAllParams}
                    showFlowAnimation={showFlowAnimation}
                    messageDict={messageDict}
                    blinkingNodeId={blinkingNodeId}
                    knifeMode={knifeMode}
                    onNodeSelect={closeAllMenus}
                    onNodeDoubleClick={handleNodeDoubleClick}
                    onNodeContextMenu={(node, e) => {
                      closeAllMenus();
                      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, node });
                    }}
                    onPaneContextMenu={(e) => {
                      closeAllMenus();
                      setPaneContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        sourceNodeId: null,
                      });
                    }}
                    onEdgeContextMenu={(edge, e) => {
                      closeAllMenus();
                      setEdgeContextMenu({ visible: true, x: e.clientX, y: e.clientY, edge });
                    }}
                    onEdgeDrop={(e, sourceNodeId) => {
                      const clientX =
                        e instanceof MouseEvent
                          ? e.clientX
                          : window.TouchEvent && e instanceof TouchEvent
                            ? e.changedTouches[0].clientX
                            : 0;
                      const clientY =
                        e instanceof MouseEvent
                          ? e.clientY
                          : window.TouchEvent && e instanceof TouchEvent
                            ? e.changedTouches[0].clientY
                            : 0;
                      closeAllMenus();
                      setPaneContextMenu({ visible: true, x: clientX, y: clientY, sourceNodeId });
                    }}
                    onEdgeConnect={handleLinkNodes}
                    onEdgesDelete={handleEdgesDelete}
                    onPaneClick={closeAllMenus}
                    onRenameEntryPoint={handleRenameEntryPoint}
                  />
                </div>

                {/* 角色管理工作区 */}
                <div
                  className="workspace"
                  style={{ display: activeTab === 'actors' ? 'flex' : 'none' }}
                >
                  <ActorManager
                    evflData={evflData}
                    onUpdateEvflData={(data: any, title?: string, detail?: string) =>
                      pushToHistory(data, title, detail)
                    }
                  />
                </div>

                {/* 事件管理工作区 */}
                <div
                  className="workspace"
                  style={{ display: activeTab === 'events' ? 'flex' : 'none' }}
                >
                  <EventManager
                    evflData={evflData}
                    onUpdateEvflData={(data: any, title?: string, detail?: string) =>
                      pushToHistory(data, title, detail)
                    }
                    onEditNode={(node: any) => {
                      setEditingNode(node);
                      setActiveTab('flowchart');
                    }}
                    onEditSwitchNode={(node: any) => {
                      setEditingSwitchNode(node);
                      setActiveTab('flowchart');
                    }}
                    onEditForkNode={(node: any) => {
                      setEditingForkNode(node);
                      setActiveTab('flowchart');
                    }}
                  />
                </div>

                {/* JSON 源码编辑工作区 */}
                <div
                  className="workspace"
                  style={{ display: activeTab === 'json' ? 'flex' : 'none' }}
                >
                  <YamlEditor
                    filePath={filePath!}
                    initialData={{
                      yaml: JSON.stringify(evflData, null, 2),
                      type: 'bfevfl',
                      be: false,
                    }}
                    onSaveSuccess={(newJson) => {
                      try {
                        const parsed = JSON.parse(newJson);
                        setEvflData(parsed);
                        pushToHistory(parsed, '直接编辑 JSON 源码', '更新整个流程图数据');
                      } catch (_) {}
                    }}
                  />
                </div>

                {/* 底部选项卡容器 */}
                <div className="tabs-container">
                  <button
                    className={`tab-btn ${activeTab === 'flowchart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('flowchart')}
                  >
                    {t('tabs.flowchart')}
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'actors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('actors')}
                  >
                    {t('tabs.actors')}
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                  >
                    {t('tabs.events')}
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                    onClick={() => setActiveTab('json')}
                  >
                    {t('tabs.json')}
                  </button>
                </div>
              </>
            )}
          </Suspense>
        </div>
      </div>

      {/* 全局弹窗与上下文菜单（确保在所有界面下均可正常弹出） */}
      <Suspense fallback={null}>
        <AppModals
          {...modalsState}
          gameSettings={gameSettings}
          saveGameSettings={saveGameSettings}
          pickFolder={pickFolder}
          showToast={showToast}
          flowchartName={evflData?.flowchart?.name || 'Flowchart'}
          onConfirmRenameFlowchart={handleConfirmRenameFlowchart}
          onConfirmRenameEntryPoint={handleRenameEntryPoint}
          onConfirmCreateFile={handleConfirmCreateFile}
          onConfirmRenameFile={handleConfirmRenameFile}
          onOpenFileAsJson={(p) => openFileByPath(p, true)}
          onDeleteFile={handleConfirmDeleteFile}
          actors={evflData?.flowchart?.actors || []}
          events={evflData?.flowchart?.events || []}
          onUpdateNode={handleUpdateNode}
          focusNodeId={focusNodeId}
          onHandleCreateNewNode={handleCreateNewNode}
          onNodeAction={handleNodeAction}
          onEdgesDelete={handleEdgesDelete}
        />
      </Suspense>

      {/* 刀切模式指示器 */}
      {knifeMode && <div className="knife-mode-indicator">{t('knifeMode.indicator')}</div>}

      {/* 拖拽提示遮罩与消息 Toast */}
      <DragDropOverlay isDragging={isDraggingFile} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
