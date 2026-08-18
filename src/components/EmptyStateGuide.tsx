import React, { useState } from 'react';
import {
  FolderOpen,
  FolderTree,
  FilePlus,
  Sparkles,
  UploadCloud,
  FileCode2,
  BookOpen,
  Clock,
  Zap,
  Trash2,
  Package,
  MessageSquare,
  FileText,
  FolderSearch,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { RecentProjectItem, ProjectType } from '../types/recentProject';

interface EmptyStateGuideProps {
  modFolderPath?: string | null;
  onOpen: () => void;
  onOpenModFolder: () => void;
  onNew: () => void;
  onOpenHelp?: () => void;
  recentProjects?: RecentProjectItem[];
  onOpenRecent?: (item: RecentProjectItem) => void;
  onRemoveRecent?: (path: string) => void;
  onClearRecent?: () => void;
}

// 根据类型获取图标组件
const getProjectIcon = (type: ProjectType) => {
  switch (type) {
    case 'mod':
      return <FolderTree size={18} />;
    case 'sbeventpack':
    case 'pack':
      return <Package size={18} />;
    case 'bfevfl':
      return <FileCode2 size={18} />;
    case 'msbt':
      return <MessageSquare size={18} />;
    case 'yaml':
    case 'other':
    default:
      return <FileText size={18} />;
  }
};

/**
 * 空状态与欢迎引导组件
 * 当未打开任何流程图文件或仅加载了 Mod 文件夹但未选择文件时显示
 */
export const EmptyStateGuide: React.FC<EmptyStateGuideProps> = ({
  modFolderPath,
  onOpen,
  onOpenModFolder,
  onNew,
  onOpenHelp,
  recentProjects = [],
  onOpenRecent,
  onRemoveRecent,
  onClearRecent,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'quick' | 'recent'>(() => {
    return recentProjects && recentProjects.length > 0 ? 'recent' : 'quick';
  });

  // 如果已打开 Mod 文件夹但尚未选择具体文件
  if (modFolderPath) {
    const folderName = modFolderPath.split(/[/\\]/).pop() || modFolderPath;
    return (
      <div className="empty-state-container">
        <div className="empty-state-card glass-panel">
          <div className="empty-state-icon-wrapper mod-loaded">
            <FolderTree size={40} className="empty-state-icon text-cyan" />
          </div>

          <h2 className="empty-state-title">{t('empty.modLoadedTitle')}</h2>
          <p className="empty-state-subtitle">
            {t('empty.modLoadedSubtitle')}
            <span className="empty-state-highlight">{folderName}</span>
          </p>

          <div className="empty-state-hint-box">
            <Sparkles size={16} className="hint-icon text-amber" />
            <span>{t('empty.modHint')}</span>
          </div>

          <div className="empty-state-actions">
            <button className="empty-btn primary" onClick={onNew}>
              <FilePlus size={16} />
              <span>{t('empty.newFileInMod')}</span>
              <span className="btn-shortcut">Ctrl+N</span>
            </button>

            <button className="empty-btn secondary" onClick={onOpen}>
              <FolderOpen size={16} />
              <span>{t('empty.openOtherFile')}</span>
              <span className="btn-shortcut">Ctrl+O</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 默认初始未打开任何文件或目录的状态
  return (
    <div className="empty-state-container">
      <div className="empty-state-card glass-panel">
        {/* 顶部图标与标题 */}
        <div className="empty-state-header">
          <div className="empty-state-icon-wrapper main-logo">
            <FileCode2 size={44} className="empty-state-icon text-blue" />
          </div>
          <h2 className="empty-state-title">{t('empty.title')}</h2>
          <p className="empty-state-subtitle">{t('empty.subtitle')}</p>
        </div>

        {/* 快速开始 / 最近项目 分段切换标签栏 */}
        <div className="empty-state-segment-tabs">
          <button
            className={`empty-segment-btn ${activeTab === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick')}
          >
            <Zap size={14} />
            <span>{t('empty.quickStartTab')}</span>
          </button>

          <button
            className={`empty-segment-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <Clock size={14} />
            <span>{t('empty.recentProjectsTab')}</span>
            {recentProjects.length > 0 && (
              <span className="empty-segment-badge">{recentProjects.length}</span>
            )}
          </button>
        </div>

        {/* 快速操作区 */}
        {activeTab === 'quick' ? (
          <div className="empty-state-actions-grid">
            <button className="empty-action-card" onClick={onOpen}>
              <div className="action-card-icon bg-blue">
                <FolderOpen size={20} />
              </div>
              <div className="action-card-info">
                <div className="action-card-title">{t('empty.openFile')}</div>
                <div className="action-card-desc">{t('empty.openFileDesc')}</div>
              </div>
              <span className="action-card-shortcut">Ctrl+O</span>
            </button>

            <button className="empty-action-card" onClick={onOpenModFolder}>
              <div className="action-card-icon bg-cyan">
                <FolderTree size={20} />
              </div>
              <div className="action-card-info">
                <div className="action-card-title">{t('empty.openMod')}</div>
                <div className="action-card-desc">{t('empty.openModDesc')}</div>
              </div>
            </button>

            <button className="empty-action-card" onClick={onNew}>
              <div className="action-card-icon bg-emerald">
                <FilePlus size={20} />
              </div>
              <div className="action-card-info">
                <div className="action-card-title">{t('empty.newFlow')}</div>
                <div className="action-card-desc">{t('empty.newFlowDesc')}</div>
              </div>
              <span className="action-card-shortcut">Ctrl+N</span>
            </button>
          </div>
        ) : (
          /* 最近打开项目列表区 */
          <div className="recent-projects-container">
            {recentProjects.length === 0 ? (
              <div className="recent-list-empty">
                <FolderSearch size={36} style={{ opacity: 0.5 }} />
                <span>{t('empty.noRecentProjects')}</span>
                <button className="empty-btn secondary" style={{ marginTop: 8 }} onClick={onOpen}>
                  <FolderOpen size={14} />
                  <span>{t('empty.openFile')}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="recent-projects-list">
                  {recentProjects.map((item) => (
                    <div
                      key={item.id || item.path}
                      className="recent-project-item"
                      onClick={() => onOpenRecent && onOpenRecent(item)}
                      title={item.path}
                    >
                      <div className={`recent-item-icon-wrapper ${item.type}`}>
                        {getProjectIcon(item.type)}
                      </div>

                      <div className="recent-item-main">
                        <div className="recent-item-header">
                          <span className="recent-item-name">{item.name}</span>
                          <span className={`recent-type-tag ${item.type}`}>{item.type}</span>
                        </div>
                        <span className="recent-item-path">{item.path}</span>
                      </div>

                      <div className="recent-item-actions" onClick={(e) => e.stopPropagation()}>
                        {onRemoveRecent && (
                          <button
                            className="recent-icon-btn delete"
                            title={t('empty.removeRecentTooltip')}
                            onClick={() => onRemoveRecent(item.path)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="recent-footer-bar">
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {recentProjects.length} {t('empty.recentProjectsTab')}
                  </span>
                  {onClearRecent && (
                    <button
                      className="recent-clear-btn"
                      onClick={() => {
                        if (confirm(t('empty.clearRecentConfirm'))) {
                          onClearRecent();
                        }
                      }}
                    >
                      <Trash2 size={12} />
                      <span>{t('empty.clearRecent')}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 拖拽提示区域 */}
        <div className="empty-state-drag-hint">
          <UploadCloud size={18} className="text-muted" />
          <span>{t('empty.dragHint')}</span>
        </div>

        {/* 底部快捷键与帮助 */}
        <div className="empty-state-footer">
          {onOpenHelp && (
            <button className="empty-help-link" onClick={onOpenHelp}>
              <BookOpen size={14} />
              <span>{t('empty.viewGuide')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptyStateGuide;
