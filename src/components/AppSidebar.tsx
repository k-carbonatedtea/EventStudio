import { FilePlus, RotateCw } from 'lucide-react';
import FileTree from './FileTree';
import { FileNode } from '../types/fileTree';
import { useTranslation } from '../i18n';

interface AppSidebarProps {
  modFolderPath: string | null;
  filePath: string | null;
  sidebarWidth: number;
  isResizingSidebar: boolean;
  setIsResizingSidebar: (resizing: boolean) => void;
  modFolderTree: FileNode[];
  openFileByPath: (path: string) => void;
  onNewFileClick: () => void;
  onRefreshClick: () => void;
  onContextMenu: (node: FileNode, e: React.MouseEvent) => void;
}

// 侧边栏文件导航及树形视图组件
export default function AppSidebar({
  modFolderPath,
  filePath,
  sidebarWidth,
  isResizingSidebar,
  setIsResizingSidebar,
  modFolderTree,
  openFileByPath,
  onNewFileClick,
  onRefreshClick,
  onContextMenu,
}: AppSidebarProps) {
  const { t } = useTranslation();

  if (modFolderTree.length === 0 && !filePath) {
    return null;
  }

  const title = modFolderPath ? modFolderPath.split(/[/\\]/).pop() : 'Local File';

  return (
    <>
      <div className="pack-sidebar" style={{ width: sidebarWidth, minWidth: 150, flexShrink: 0 }}>
        <div className="pack-sidebar-header">
          <span
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={modFolderPath || filePath || ''}
          >
            {title}
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              className="sidebar-tool-btn"
              title={t('sidebar.newFile')}
              onClick={onNewFileClick}
            >
              <FilePlus size={14} />
            </button>
            <button
              className="sidebar-tool-btn"
              title={t('sidebar.refresh')}
              onClick={onRefreshClick}
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        <div className="pack-sidebar-list">
          {modFolderTree.length > 0 ? (
            <FileTree
              nodes={modFolderTree}
              selectedPath={filePath}
              onFileSelect={openFileByPath}
              onContextMenu={onContextMenu}
            />
          ) : filePath ? (
            <div key={filePath} className="pack-sidebar-item active">
              {filePath.split(/[/\\]/).pop()}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={`sidebar-resizer ${isResizingSidebar ? 'resizing' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizingSidebar(true);
        }}
      />
    </>
  );
}
