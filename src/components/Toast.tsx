import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

/**
 * 消息提示 Notify 组件
 */
export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={18} className="toast-icon toast-icon-success" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon toast-icon-error" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon toast-icon-info" />;
    }
  };

  return (
    <div className={`toast-container toast-${toast.type}`}>
      {getIcon()}
      <span className="toast-text">{toast.text}</span>
      <button className="toast-close-btn" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
