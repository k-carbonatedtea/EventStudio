import { useEffect, useRef } from 'react';
import { useTranslation } from './i18n';

interface PaneContextMenuProps {
  x: number;
  y: number;
  sourceNodeId?: string | null;
  isFocused?: boolean;
  onClose: () => void;
  onAction: (actionName: string, sourceNodeId: string | null) => void;
}

export default function PaneContextMenu({ x, y, sourceNodeId, isFocused, onClose, onAction }: PaneContextMenuProps) {
  const { locale } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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

  const triggerAction = (actionName: string) => {
    onAction(actionName, sourceNodeId || null);
    onClose();
  };

  return (
    <div 
      className="context-menu" 
      style={{ top: y, left: x }} 
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="menu-item" onClick={() => triggerAction('action')}>
        {locale === 'zh' ? '添加动作 (Action)' : 'Add Action Node'}
      </div>
      <div className="menu-item" onClick={() => triggerAction('switch')}>
        {locale === 'zh' ? '添加条件 (Switch)' : 'Add Switch Node'}
      </div>
      <div className="menu-item" onClick={() => triggerAction('fork')}>
        {locale === 'zh' ? '添加分支 (Fork)' : 'Add Fork Node'}
      </div>
      <div className="menu-item" onClick={() => triggerAction('join')}>
        {locale === 'zh' ? '添加汇合 (Join)' : 'Add Join Node'}
      </div>
      <div className="menu-item" onClick={() => triggerAction('sub_flow')}>
        {locale === 'zh' ? '添加子流程 (SubFlow)' : 'Add SubFlow Node'}
      </div>
      <div className="menu-separator"></div>
      <div className="menu-item" onClick={() => triggerAction('entry')}>
        {locale === 'zh' ? '添加入口点 (Entry)' : 'Add Entry Point'}
      </div>
      {isFocused && (
        <>
          <div className="menu-separator"></div>
          <div className="menu-item" onClick={() => triggerAction('restore_view')}>
            {locale === 'zh' ? '恢复显示所有事件' : 'Show All Events'}
          </div>
        </>
      )}
    </div>
  );
}
