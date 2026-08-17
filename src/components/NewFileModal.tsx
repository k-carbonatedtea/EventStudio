import { useState, useEffect, useRef } from "react";
import { FilePlus, X, Check } from "lucide-react";
import { useTranslation } from "../i18n";

interface NewFileModalProps {
  isOpen: boolean;
  targetDir: string;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
}

// 新建 .bfevfl 事件流文件弹窗组件
export default function NewFileModal({
  isOpen,
  targetDir,
  onClose,
  onConfirm,
}: NewFileModalProps) {
  const { t, locale } = useTranslation();
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFileName("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = fileName.trim();
    if (!name) return;
    if (!name.toLowerCase().endsWith(".bfevfl")) {
      name += ".bfevfl";
    }
    onConfirm(name);
    onClose();
  };

  const displayDir = targetDir.startsWith("SARC:")
    ? targetDir.replace("SARC:", "")
    : targetDir;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: "460px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FilePlus size={18} className="modal-header-icon" />
            <h3>{t('modals.newFile.title')}</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: "16px 20px" }}>
            <div className="settings-field">
              <label>
                <span>{locale === 'zh' ? '目标存储路径' : 'Target Directory'}</span>
                <span className="field-desc" style={{ wordBreak: "break-all" }}>
                  {displayDir || (locale === 'zh' ? "当前根目录" : "Current root directory")}
                </span>
              </label>
            </div>

            <div className="settings-field" style={{ marginTop: "12px" }}>
              <label>
                <span>{t('modals.newFile.label')}</span>
                <span className="field-desc">
                  {locale === 'zh' ? '支持输入名称如 Demo001_0 或 Demo001_0.bfevfl' : 'e.g. Demo001_0 or Demo001_0.bfevfl'}
                </span>
              </label>
              <div className="path-input-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={t('modals.newFile.placeholder')}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!fileName.trim()}>
              <Check size={14} style={{ marginRight: 4 }} /> {t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
