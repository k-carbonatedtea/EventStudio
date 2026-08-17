import { useState, useEffect, useRef } from "react";
import { LogIn, X, Check } from "lucide-react";
import { useTranslation } from "../i18n";

interface RenameEntryPointModalProps {
  isOpen: boolean;
  entryPoint: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: (epId: string, newName: string) => void;
}

// 重命名/编辑入口点弹窗组件
export default function RenameEntryPointModal({
  isOpen,
  entryPoint,
  onClose,
  onConfirm,
}: RenameEntryPointModalProps) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && entryPoint) {
      setName(entryPoint.name || "");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, entryPoint]);

  if (!isOpen || !entryPoint) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(entryPoint.id, trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: "420px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LogIn size={18} className="modal-header-icon" style={{ color: "#10b981" }} />
            <h3>{t('modals.renameEp.title')}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: "16px 20px" }}>
            <div className="settings-field">
              <label>
                <span>{t('modals.renameEp.label')}</span>
                <span className="field-desc">
                  {locale === 'zh' ? '设置流程图中该入口点的唯一标识名称' : 'Unique identifier name for this entry point'}
                </span>
              </label>
              <div className="path-input-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('modals.renameEp.placeholder')}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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
