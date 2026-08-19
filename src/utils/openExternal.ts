import { invoke } from '@tauri-apps/api/core';

/**
 * 在系统默认浏览器中安全打开外部网页链接
 */
export async function openExternalUrl(url: string): Promise<void> {
  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    console.warn('Blocked invalid external url scheme:', url);
    return;
  }
  try {
    await invoke('open_external_url', { url: cleanUrl });
  } catch (err) {
    console.error('Failed to open external url:', err);
  }
}

