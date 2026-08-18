import { useState, useEffect, useRef } from 'react';
import { Edit3, X, Check } from 'lucide-react';
import { useTranslation } from '../i18n';

interface RenameFlowchartModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

// 重命名流程图弹窗组件
export default function RenameFlowchartModal({
  isOpen,
  currentName,
  onClose,
  onConfirm,
}: RenameFlowchartModalProps) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState(currentName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '420px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={18} className="modal-header-icon" />
            <h3>{t('modals.renameFc.title')}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 20px' }}>
            <div className="settings-field">
              <label>
                <span>{t('modals.renameFc.label')}</span>
                <span className="field-desc">
                  {locale === 'zh'
                    ? '修改当前 EventFlow 中的流程图内部标识名称'
                    : 'Internal identifier name for this flowchart'}
                </span>
              </label>
              <div className="path-input-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('modals.renameFc.placeholder')}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              <Check size={14} style={{ marginRight: 4 }} /> {t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
