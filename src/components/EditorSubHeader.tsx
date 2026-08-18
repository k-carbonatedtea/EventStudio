import { useState, useEffect, useRef } from 'react';
import {
  FileCode2,
  Edit3,
  Check,
  X,
  RotateCcw,
  RotateCw,
  History,
  Save,
  Clock,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '../i18n';

interface EditorSubHeaderProps {
  filePath: string | null;
  evflData: any | null;
  history: any[];
  historyIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToHistory: (index: number) => void;
  onDeleteHistoryStep?: (index: number) => void;
  onClearHistorySteps?: () => void;
  onDiscard: () => void;
  onSave: () => void;
  onRenameFlowchart: (newName: string) => Promise<void> | void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

// 流程图子顶部栏组件：展示真实事件名、修改与保存、时间轴历史步骤回溯与删除管理
export default function EditorSubHeader({
  filePath,
  evflData,
  history,
  historyIndex,
  onUndo,
  onRedo,
  onJumpToHistory,
  onDeleteHistoryStep,
  onClearHistorySteps,
  onDiscard,
  onSave,
  onRenameFlowchart,
  showToast,
}: EditorSubHeaderProps) {
  const { t, locale } = useTranslation();

  // 当前真实的事件名称
  const currentEventName =
    evflData?.flowchart?.name ||
    evflData?.name ||
    (filePath
      ? filePath
          .split(/[/\\]/)
          .pop()
          ?.replace(/\.bfevfl$/i, '')
      : '') ||
    t('subHeader.unnamedEventFlow');

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentEventName);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 当外部事件名更新时同步
  useEffect(() => {
    setTempName(currentEventName);
  }, [currentEventName]);

  // 点击外部关闭时间轴下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timelineRef.current && !timelineRef.current.contains(e.target as Node)) {
        setIsTimelineOpen(false);
      }
    };
    if (isTimelineOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimelineOpen]);

  // 提交名称修改
  const handleConfirmName = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      showToast(locale === 'zh' ? '事件名称不能为空' : 'Event name cannot be empty', 'error');
      setTempName(currentEventName);
      setIsEditingName(false);
      return;
    }
    if (trimmed !== currentEventName) {
      await onRenameFlowchart(trimmed);
      showToast(
        locale === 'zh' ? `已重命名事件流为: ${trimmed}` : `Renamed flowchart to: ${trimmed}`,
        'success',
      );
    }
    setIsEditingName(false);
  };

  const totalSteps = Math.max(history.length, 1);
  const currentStep = historyIndex >= 0 ? historyIndex + 1 : 1;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasModifications = historyIndex > 0;

  return (
    <div className="editor-sub-topbar">
      {/* 左侧：真实事件名称与内联修改 */}
      <div className="sub-topbar-left">
        <div className="event-badge">
          <FileCode2 size={15} className="badge-icon" />
          <span className="badge-label">{t('subHeader.eventFlow')}:</span>
        </div>

        {isEditingName ? (
          <div className="sub-topbar-edit-box">
            <input
              ref={inputRef}
              type="text"
              className="sub-topbar-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmName();
                if (e.key === 'Escape') {
                  setTempName(currentEventName);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              placeholder={locale === 'zh' ? '输入事件流名称...' : 'Enter flowchart name...'}
            />
            <button
              className="sub-topbar-icon-btn confirm"
              onClick={handleConfirmName}
              title={locale === 'zh' ? '确认修改 (Enter)' : 'Confirm (Enter)'}
            >
              <Check size={14} />
            </button>
            <button
              className="sub-topbar-icon-btn cancel"
              onClick={() => {
                setTempName(currentEventName);
                setIsEditingName(false);
              }}
              title={locale === 'zh' ? '取消修改 (Esc)' : 'Cancel (Esc)'}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            className="sub-topbar-name-wrapper"
            onClick={() => setIsEditingName(true)}
            title={t('subHeader.renamePrompt')}
          >
            <span className="sub-topbar-name">{currentEventName}</span>
            <Edit3 size={13} className="name-edit-icon" />
          </div>
        )}
      </div>

      {/* 右侧：时间轴撤回步骤与保存/取消操作 */}
      <div className="sub-topbar-right">
        {/* 历史步骤时间轴控件 */}
        <div className="timeline-control-group" ref={timelineRef}>
          <button
            className={`sub-topbar-action-btn ${!canUndo ? 'disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo}
            title={locale === 'zh' ? '撤销 (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
          >
            <RotateCcw size={13} />
          </button>

          {/* 步骤胶囊 & 时间轴下拉触发 */}
          <button
            className={`timeline-step-badge ${isTimelineOpen ? 'active' : ''}`}
            onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            title={locale === 'zh' ? '点击展开操作时间轴步骤' : 'Click to view timeline history'}
          >
            <History size={13} className="step-icon" />
            <span className="step-text">
              {t('subHeader.stepInfo', { current: currentStep, total: totalSteps })}
            </span>
            <ChevronDown size={12} className={`chevron-icon ${isTimelineOpen ? 'rotate' : ''}`} />
          </button>

          <button
            className={`sub-topbar-action-btn ${!canRedo ? 'disabled' : ''}`}
            onClick={onRedo}
            disabled={!canRedo}
            title={locale === 'zh' ? '重做 (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
          >
            <RotateCw size={13} />
          </button>

          {/* 浮动时间轴步骤列表 */}
          {isTimelineOpen && (
            <div className="timeline-dropdown-menu">
              <div className="timeline-dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} />
                  <span>{t('timeline.historyTitle', { count: history.length })}</span>
                </div>
                {history.length > 1 && (
                  <button
                    className="timeline-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t('timeline.clearConfirm'))) {
                        onClearHistorySteps?.();
                        showToast(t('timeline.clearSuccess'), 'info');
                      }
                    }}
                    title={t('timeline.clearBtn')}
                  >
                    <Trash2 size={11} />
                    <span>{t('timeline.clearBtn')}</span>
                  </button>
                )}
              </div>
              <div className="timeline-dropdown-list">
                {history.map((item, idx) => {
                  const isCurrent = idx === historyIndex;
                  const isPast = idx < historyIndex;

                  // 动态本地化历史步骤标题与描述
                  let title = item?.title || '';
                  let detail = item?.detail || '';

                  if (idx === 0 || title === '初始文件状态' || title === 'Initial File State') {
                    title = t('timeline.initialState');
                  } else if (title.startsWith('创建') || title.startsWith('Create ')) {
                    const nodeType = title
                      .replace(/^(创建|Create\s+)/, '')
                      .replace(/\s*(节点)?$/, '');
                    title = t('timeline.createNode', { type: nodeType });
                  } else if (title.startsWith('连接节点:') || title.startsWith('Connect nodes:')) {
                    const match = title.match(/:\s*(.*?)\s*→\s*(.*)/);
                    if (match) {
                      title = t('timeline.linkNodes', { src: match[1], dst: match[2] });
                    }
                  } else if (
                    title.startsWith('删除节点连线') ||
                    title.startsWith('Delete connection line')
                  ) {
                    title = t('timeline.deleteEdges');
                  } else if (
                    title.startsWith('重命名入口点:') ||
                    title.startsWith('Rename entry point:')
                  ) {
                    const epName = title.replace(/^(重命名入口点:|Rename entry point:)\s*/, '');
                    title = t('timeline.renameEntryPoint', { name: epName });
                  } else if (title === '添加入口点' || title === 'Add Entry Point') {
                    title = t('timeline.addEntryPoint');
                  } else if (title === '移除入口点' || title === 'Remove Entry Point') {
                    title = t('timeline.removeEntryPoint');
                  } else if (title === '在上方插入新事件' || title === 'Insert Parent Event') {
                    title = t('timeline.insertParent');
                  } else if (title === '在下方插入新事件' || title === 'Insert Child Event') {
                    title = t('timeline.insertChild');
                  } else if (title === '取消子节点链接' || title === 'Unlink Child') {
                    title = t('timeline.unlinkChild');
                  } else if (title.startsWith('移除事件:') || title.startsWith('Remove event:')) {
                    const evName = title.replace(/^(移除事件:|Remove event:)\s*/, '');
                    title = t('timeline.removeEvent', { node: evName });
                  } else if (title.startsWith('修改节点:') || title.startsWith('Modify node:')) {
                    const nodeName = title.replace(/^(修改节点:|Modify node:)\s*/, '');
                    title = t('timeline.modifyNode', { name: nodeName });
                  } else if (
                    title.startsWith('重命名流程图:') ||
                    title.startsWith('Rename flowchart:')
                  ) {
                    const flowName = title.replace(/^(重命名流程图:|Rename flowchart:)\s*/, '');
                    title = t('timeline.renameFlowchart', { name: flowName });
                  } else if (title === '新建事件流' || title === 'New Event Flow') {
                    title = t('timeline.newFlow');
                  } else if (!title) {
                    title = t('timeline.stepInfo', { step: idx });
                  }

                  if (
                    detail.endsWith('加载完成') ||
                    detail.endsWith('loaded successfully') ||
                    detail.endsWith('Loaded')
                  ) {
                    const base = detail.replace(/\s*(加载完成|loaded successfully|Loaded)$/, '');
                    detail = t('timeline.loadedDetail', { name: base || 'File' });
                  } else if (
                    detail === '空白流程图已创建' ||
                    detail === 'Blank flowchart created'
                  ) {
                    detail = t('timeline.blankFlowDetail');
                  } else if (detail === '独立节点' || detail === 'Standalone node') {
                    detail = t('timeline.standaloneNode');
                  } else if (
                    detail.startsWith('连接自节点 #') ||
                    detail.startsWith('Connected from node #')
                  ) {
                    const id = detail.replace(/^(连接自节点 #|Connected from node #)/, '');
                    detail = t('timeline.connectedFrom', { id });
                  } else if (detail === '建立流程连线' || detail === 'Establish flow connection') {
                    detail = t('timeline.linkDetail');
                  } else if (detail.startsWith('已断开 ') || detail.startsWith('Disconnected ')) {
                    const countMatch = detail.match(/\d+/);
                    detail = t('timeline.deleteEdgesDetail', {
                      count: countMatch ? countMatch[0] : '1',
                    });
                  } else if (detail.startsWith('指向节点 ') || detail.startsWith('Target node ')) {
                    const n = detail.replace(/^(指向节点 |Target node )/, '');
                    detail = t('timeline.addEntryPointDetail', { node: n });
                  } else if (detail.startsWith('前置于 ') || detail.startsWith('Before ')) {
                    const n = detail.replace(/^(前置于 |Before )/, '');
                    detail = t('timeline.insertParentDetail', { node: n });
                  } else if (detail.startsWith('后置于 ') || detail.startsWith('After ')) {
                    const n = detail.replace(/^(后置于 |After )/, '');
                    detail = t('timeline.insertChildDetail', { node: n });
                  } else if (detail.startsWith('断开 ') && detail.endsWith(' 的后续连接')) {
                    const n = detail.replace(/^断开\s*/, '').replace(/\s*的后续连接$/, '');
                    detail = t('timeline.unlinkChildDetail', { node: n });
                  } else if (detail === '删除事件节点' || detail === 'Delete event node') {
                    detail = t('timeline.removeEventDetail');
                  } else if (detail.startsWith('更新 ') && detail.endsWith(' 节点属性/参数')) {
                    const type = detail.replace(/^更新\s*/, '').replace(/\s*节点属性\/参数$/, '');
                    detail = t('timeline.updateNodeDetail', { type });
                  } else if (
                    detail === '同步内部 Flowchart 标识' ||
                    detail === 'Synchronize flowchart identifier'
                  ) {
                    detail = t('timeline.syncFlowchartDetail');
                  } else if (!detail) {
                    detail =
                      idx === 0
                        ? t('timeline.loadedDetail', { name: 'File' })
                        : t('timeline.updateNodeDetail', { type: 'Node' });
                  }

                  const time = item?.time || '';

                  return (
                    <div
                      key={idx}
                      className={`timeline-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
                      onClick={() => {
                        onJumpToHistory(idx);
                        setIsTimelineOpen(false);
                      }}
                      title={t('timeline.jumpTooltip', { title })}
                    >
                      <div className="timeline-dot-wrapper">
                        <div className={`timeline-dot ${isCurrent ? 'current-dot' : ''}`} />
                        {idx < history.length - 1 && <div className="timeline-line" />}
                      </div>
                      <div className="timeline-item-content">
                        <div className="timeline-step-title">
                          <span className="step-title-text">{title}</span>
                          {isCurrent && (
                            <span className="current-tag">{t('timeline.currentTag')}</span>
                          )}
                        </div>
                        <div className="timeline-step-sub">
                          <span className="step-detail-text">{detail}</span>
                          {time && <span className="step-time-text">{time}</span>}
                        </div>
                      </div>
                      {history.length > 1 && idx > 0 && (
                        <button
                          className="timeline-item-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistoryStep?.(idx);
                            showToast(t('timeline.deleteStepSuccess', { step: idx }), 'info');
                          }}
                          title={t('timeline.deleteStepTooltip', { step: idx })}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sub-topbar-divider" />

        {/* 取消 / 重置按钮 */}
        <button
          className={`sub-topbar-btn secondary ${!hasModifications ? 'disabled' : ''}`}
          onClick={() => {
            const confirmMsg =
              locale === 'zh'
                ? '确定要取消并放弃所有未保存修改吗？'
                : 'Are you sure you want to discard all unsaved changes?';
            if (hasModifications && confirm(confirmMsg)) {
              onDiscard();
              showToast(t('subHeader.discardSuccess'), 'info');
            }
          }}
          disabled={!hasModifications}
          title={locale === 'zh' ? '放弃所有修改并重置到初始状态' : 'Discard all changes'}
        >
          <RotateCcw size={13} style={{ marginRight: 4 }} />
          {t('subHeader.discard')}
        </button>

        {/* 保存按钮 */}
        <button
          className="sub-topbar-btn primary"
          onClick={onSave}
          title={locale === 'zh' ? '保存当前修改 (Ctrl+S)' : 'Save current changes (Ctrl+S)'}
        >
          <Save size={14} style={{ marginRight: 5 }} />
          {t('subHeader.save')}
        </button>
      </div>
    </div>
  );
}
