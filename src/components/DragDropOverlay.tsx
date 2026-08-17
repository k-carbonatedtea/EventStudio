import React from 'react';
import { UploadCloud } from 'lucide-react';

interface DragDropOverlayProps {
  isDragging: boolean;
}

/**
 * 文件拖拽高亮提示蒙版组件
 */
export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ isDragging }) => {
  if (!isDragging) return null;

  return (
    <div className="drag-drop-overlay">
      <div className="drag-drop-card">
        <div className="drag-drop-icon-container">
          <UploadCloud size={56} className="drag-drop-icon" />
        </div>
        <h2 className="drag-drop-title">释放鼠标以打开文件或项目</h2>
        <p className="drag-drop-desc">
          支持 <span className="drag-drop-highlight">.bfevfl, .sbeventpack, .msbt, SARC, AAMP, BYML</span> 格式文件，以及<span className="drag-drop-highlight">包含这些文件的 Mod 文件夹</span>
        </p>
      </div>
    </div>
  );
};

export default DragDropOverlay;
