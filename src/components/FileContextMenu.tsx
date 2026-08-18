import { useEffect, useRef } from 'react';
import { FilePlus, Edit2, Trash2, Code } from 'lucide-react';
import { FileNode } from '../types/fileTree';
import { getParentDir } from '../utils/fileLoader';
import { useTranslation } from '../i18n';

interface FileContextMenuProps {
  x: number;
  y: number;
  node: FileNode | null;
  onClose: () => void;
  onOpenFileAsJson?: (path: string) => void;
  onNewFile?: (targetDir: string) => void;
  onRenameFile?: (node: FileNode) => void;
  onDeleteFile?: (node: FileNode) => void;
}

// 侧边栏文件树右键上下文菜单组件
export default function FileContextMenu({
  x,
  y,
  node,
  onClose,
  onOpenFileAsJson,
  onNewFile,
  onRenameFile,
  onDeleteFile,
}: FileContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  if (!node) return null;

  const isFolder = node.is_dir || node.is_sarc;
  const targetDir = isFolder ? node.path : getParentDir(node.path);

  return (
    <div
      className="context-menu"
      style={{ top: y, left: x, position: 'fixed', zIndex: 1000 }}
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!isFolder && node.name.toLowerCase().endsWith('.bfevfl') && onOpenFileAsJson && (
        <div
          className="menu-item"
          onClick={() => {
            onOpenFileAsJson(node.path);
            onClose();
          }}
        >
          <Code size={14} style={{ marginRight: 6 }} /> {t('sidebar.openAsJson')}
        </div>
      )}

      {onNewFile && (
        <div
          className="menu-item"
          onClick={() => {
            onNewFile(targetDir || node.path);
            onClose();
          }}
        >
          <FilePlus size={14} style={{ marginRight: 6 }} /> {t('sidebar.newFile')}...
        </div>
      )}

      {!isFolder && onRenameFile && (
        <div
          className="menu-item"
          onClick={() => {
            onRenameFile(node);
            onClose();
          }}
        >
          <Edit2 size={14} style={{ marginRight: 6 }} /> {t('sidebar.rename')}...
        </div>
      )}

      {!isFolder && onDeleteFile && (
        <>
          <div className="menu-separator"></div>
          <div
            className="menu-item"
            style={{ color: '#ef4444' }}
            onClick={() => {
              onDeleteFile(node);
              onClose();
            }}
          >
            <Trash2 size={14} style={{ marginRight: 6 }} /> {t('sidebar.delete')}
          </div>
        </>
      )}
    </div>
  );
}
