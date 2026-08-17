import { useState, useEffect } from "react";

import { invoke } from "@tauri-apps/api/core";

// 文件拖拽处理 Hook，用于监听 Tauri 窗口与 Web 端的拖拽事件
export function useFileDragDrop(
  openFileByPath: (path: string) => Promise<void>,
  openModFolderByPath: (path: string) => Promise<void>,
  showToast: (text: string, type: 'success' | 'error' | 'info') => void
) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const handleFileOpen = async (path: string) => {
      try {
        const isDir = await invoke<boolean>("is_directory", { path });
        if (isDir) {
          showToast(`正在加载 Mod 文件夹...`, 'info');
          try {
            await openModFolderByPath(path);
            showToast(`已成功打开 Mod 文件夹`, 'success');
          } catch (err: any) {
            showToast(`加载文件夹失败: ${err?.message || err}`, 'error');
          }
          return;
        }
      } catch (err) {
        console.error("Failed to check if path is directory", err);
      }

      const fileName = path.split(/[\/\\]/).pop() || path;
      // We removed the hardcoded validExts check, relying on backend to reject unsupported files
      showToast(`正在打开文件: ${fileName}...`, 'info');
      try {
        await openFileByPath(path);
        showToast(`已成功打开文件: ${fileName}`, 'success');
      } catch (err: any) {
        showToast(`打开文件失败: ${err?.message || err}`, 'error');
      }
    };

    const setupDragDrop = async () => {
      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            setIsDraggingFile(true);
          } else if (event.payload.type === 'leave') {
            setIsDraggingFile(false);
          } else if (event.payload.type === 'drop') {
            setIsDraggingFile(false);
            if (event.payload.paths && event.payload.paths.length > 0) {
              handleFileOpen(event.payload.paths[0]);
            }
          }
        });
      } catch (err) {
        console.error("Failed to setup drag drop listener:", err);
      }
    };

    setupDragDrop();

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingFile(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [openFileByPath, showToast]);

  return { isDraggingFile };
}
