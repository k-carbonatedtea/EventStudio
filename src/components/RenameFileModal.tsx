import { useState, useEffect, useRef } from 'react';
import { Edit2, X, Check } from 'lucide-react';
import { FileNode } from '../types/fileTree';
import { useTranslation } from '../i18n';

interface RenameFileModalProps {
  isOpen: boolean;
  fileNode: FileNode | null;
  onClose: () => void;
  onConfirm: (oldPath: string, newName: string) => void;
}

// 重命名文件弹窗组件
export default function RenameFileModal({
  isOpen,
  fileNode,
  onClose,
  onConfirm,
}: RenameFileModalProps) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && fileNode) {
      setFileName(fileNode.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, fileNode]);

  if (!isOpen || !fileNode) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fileName.trim();
    if (!trimmed || trimmed === fileNode.name) return;
    onConfirm(fileNode.path, trimmed);
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
            <Edit2 size={18} className="modal-header-icon" />
            <h3>{t('modals.renameFile.title')}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 20px' }}>
            <div className="settings-field">
              <label>
                <span>{t('modals.renameFile.originalFileName')}</span>
                <span className="field-desc">{fileNode.name}</span>
              </label>
            </div>

            <div className="settings-field" style={{ marginTop: '12px' }}>
              <label>
                <span>{t('modals.renameFile.label')}</span>
                <span className="field-desc">
                  {t('modals.renameFile.includeExtension')}
                </span>
              </label>
              <div className="path-input-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={t('modals.renameFile.placeholder')}
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!fileName.trim() || fileName.trim() === fileNode.name}
            >
              <Check size={14} style={{ marginRight: 4 }} /> {t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
