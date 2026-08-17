import { useEffect, useRef } from 'react';
import { useTranslation } from './i18n';

interface ContextMenuProps {
  x: number;
  y: number;
  node: any;
  onClose: () => void;
  onEditEvent: (node: any) => void;
  onAction: (actionName: string, node: any) => void;
}

export default function ContextMenu({ x, y, node, onClose, onEditEvent, onAction }: ContextMenuProps) {
  const { t, locale } = useTranslation();
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

  if (!node) return null;

  const isEntryPoint = node.type === 'entryPointNode';
  const nodeType = isEntryPoint ? 'entry_point' : node.data?.type?.toLowerCase(); // action, switch, fork, join, subflow
  
  const triggerAction = (actionName: string) => {
    onAction(actionName, node);
    onClose();
  };

  return (
    <div 
      className="context-menu" 
      style={{ top: y, left: x }} 
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!isEntryPoint && (
        <>
          {nodeType !== 'fork' && nodeType !== 'join' && (
            <div className="menu-item" onClick={() => { onEditEvent(node.data); onClose(); }}>
              {locale === 'zh' ? '编辑事件...' : 'Edit Event...'}
            </div>
          )}
          {nodeType === 'switch' && (
            <div className="menu-item" onClick={() => triggerAction('Edit cases...')}>
              {locale === 'zh' ? '编辑分支...' : 'Edit Cases...'}
            </div>
          )}
          {nodeType === 'fork' && (
            <div className="menu-item" onClick={() => triggerAction('Edit branches...')}>
              {locale === 'zh' ? '编辑分支...' : 'Edit Branches...'}
            </div>
          )}
          
          {nodeType !== 'join' && <div className="menu-separator"></div>}

          <div className="menu-item" onClick={() => triggerAction('Add entry point here...')}>
            {t('contextMenu.addEntryPointHere')}...
          </div>
          
          <div className="menu-separator"></div>

          {nodeType !== 'join' && (
            <div className="menu-item" onClick={() => triggerAction('Add new parent...')}>
              {t('contextMenu.addParent')}...
            </div>
          )}

          {(nodeType === 'action' || nodeType === 'subflow' || nodeType === 'join') && (
            <>
              <div className="menu-item" onClick={() => triggerAction('Add new child...')}>
                {t('contextMenu.addChild')}...
              </div>
              <div className="menu-item" onClick={() => triggerAction('Unlink child')}>
                {locale === 'zh' ? '取消子节点链接' : 'Unlink Child Node'}
              </div>
            </>
          )}

          <div className="menu-separator"></div>
          
          <div className="menu-item" onClick={() => triggerAction('Remove event')}>
            {t('contextMenu.deleteNode')}
          </div>
        </>
      )}

      {isEntryPoint && (
        <>
          <div className="menu-item" onClick={() => triggerAction('Rename entry point...')}>
            {locale === 'zh' ? '重命名入口点...' : 'Rename Entry Point...'}
          </div>
          <div className="menu-item" onClick={() => triggerAction('Remove entry point')}>
            {locale === 'zh' ? '移除入口点' : 'Delete Entry Point'}
          </div>
        </>
      )}

      <div className="menu-separator"></div>
      
      <div className="menu-item" onClick={() => triggerAction('Show only connected events')}>
        {locale === 'zh' ? '仅显示关联事件' : 'Focus Connected Events'}
      </div>
    </div>
  );
}
