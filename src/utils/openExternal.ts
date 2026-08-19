import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

// 在默认浏览器中安全打开外部链接（支持 Rust 原生与前端多重保底）
export async function openExternalUrl(url: string): Promise<void> {
  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    console.warn('Blocked invalid external url scheme:', url);
    return;
  }
  // 1. 优先调用后端 Rust 命令直接调用系统默认浏览器打开
  try {
    await invoke('open_external_url', { url: cleanUrl });
    return;
  } catch (err) {
    console.warn('Native open_external_url failed, trying plugin-opener:', err);
  }

  // 2. 备选尝试 @tauri-apps/plugin-opener
  try {
    await openUrl(cleanUrl);
    return;
  } catch (err) {
    console.warn('plugin-opener openUrl failed, trying fallback:', err);
  }

  // 3. 兜底方案：动态创建 a 标签触发点击
  try {
    const link = document.createElement('a');
    link.href = cleanUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    window.open(cleanUrl, '_blank');
  }
}
