import { useEffect } from 'react';

interface AppShortcutsParams {
  onOpen?: () => void;
  onNew?: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onReloadGraph: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleKnifeMode: () => void;
  onToggleExpandParams: () => void;
  onSwitchTab?: (tab: 'flowchart' | 'actors' | 'events' | 'json') => void;
  onEscape?: () => void;
}

// 键盘全局快捷键监听自定义 Hook
export function useAppShortcuts({
  onOpen,
  onNew,
  onOpenHelp,
  onOpenSettings,
  onReloadGraph,
  onSave,
  onSaveAs,
  onUndo,
  onRedo,
  onToggleKnifeMode,
  onToggleExpandParams,
  onSwitchTab,
  onEscape,
}: AppShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      // 1. F1 帮助说明
      if (e.key === 'F1') {
        e.preventDefault();
        onOpenHelp();
        return;
      }

      // 2. Escape 取消 / 关闭浮窗
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      // 3. Ctrl + O 打开文件
      if (isCtrl && !e.shiftKey && keyLower === 'o') {
        e.preventDefault();
        onOpen?.();
        return;
      }

      // 4. Ctrl + N 新建空白事件流
      if (isCtrl && !e.shiftKey && keyLower === 'n') {
        e.preventDefault();
        onNew?.();
        return;
      }

      // 5. Ctrl + , 设置偏好
      if (isCtrl && (e.key === ',' || e.key === '，')) {
        e.preventDefault();
        onOpenSettings();
        return;
      }

      // 6. Ctrl + Shift + R 重新排版与刷新图表
      if (isCtrl && e.shiftKey && keyLower === 'r') {
        e.preventDefault();
        onReloadGraph();
        return;
      }

      // 7. Ctrl + S / Ctrl + Shift + S 保存与另存为
      if (isCtrl && keyLower === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          onSaveAs();
        } else {
          onSave();
        }
        return;
      }

      // 8. Ctrl + Z 撤销与 Ctrl + Y / Ctrl + Shift + Z 重做
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          (activeElement as HTMLElement).isContentEditable ||
          activeElement.closest('.monaco-editor') !== null);

      if (!isInput) {
        if (isCtrl && !e.shiftKey && keyLower === 'z') {
          e.preventDefault();
          onUndo?.();
          return;
        }

        if (isCtrl && (keyLower === 'y' || (e.shiftKey && keyLower === 'z'))) {
          e.preventDefault();
          onRedo?.();
          return;
        }

        // 9. 单键快捷键（仅在非输入焦点下触发）
        if (!isCtrl && !e.altKey) {
          if (keyLower === 'k') {
            e.preventDefault();
            onToggleKnifeMode();
          } else if (keyLower === 'c') {
            e.preventDefault();
            onToggleExpandParams();
          } else if (keyLower === 'f') {
            onSwitchTab?.('flowchart');
          } else if (keyLower === 'a') {
            onSwitchTab?.('actors');
          } else if (keyLower === 'e') {
            onSwitchTab?.('events');
          } else if (keyLower === 'j') {
            onSwitchTab?.('json');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onOpen,
    onNew,
    onOpenHelp,
    onOpenSettings,
    onReloadGraph,
    onSave,
    onSaveAs,
    onUndo,
    onRedo,
    onToggleKnifeMode,
    onToggleExpandParams,
    onSwitchTab,
    onEscape,
  ]);
}
