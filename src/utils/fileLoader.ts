import { invoke } from '@tauri-apps/api/core';

// 自动保存历史快照到文件稳定唯一的缓存目录
export async function performAutoSave(
  currentPath: string | null,
  stepIdx: number,
  title: string,
  detail: string,
  time: string,
  newData: any,
) {
  if (!currentPath) return;

  try {
    await invoke('auto_save_step', {
      filePath: currentPath,
      stepIdx,
      title: title || `步骤 ${stepIdx + 1}`,
      detail: detail || '',
      time: time || new Date().toLocaleTimeString(),
      jsonData: JSON.stringify(newData),
    });
  } catch (err) {
    console.error('Auto-save failed', err);
  }
}

// 加载文件解析结果接口
export interface LoadResult {
  filePath: string;
  evflData: any | null;
  yamlData: { yaml: string; type: string; be: boolean } | null;
}

// 加载与解析不同格式的游戏文件（支持以 JSON 方式直接编辑 BFEVFL）
export async function loadFileContent(
  path: string,
  fileName: string,
  isFromPack: boolean,
  asJson: boolean = false,
): Promise<LoadResult> {
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // 1. MSBT 文件
  if (ext === 'msbt') {
    if (!isFromPack) localStorage.setItem('lastOpenedFile', path);
    return { filePath: path, evflData: null, yamlData: null };
  }

  // 2. 以 JSON 文本方式强制编辑 BFEVFL 或 .json 文件
  if (asJson || ext === 'json') {
    const jsonStr = await invoke<string>('load_evfl', { path });
    let prettyJson = jsonStr;
    try {
      prettyJson = JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch (_) {}
    if (!isFromPack) localStorage.setItem('lastOpenedFile', path);
    return {
      filePath: path,
      evflData: null,
      yamlData: { yaml: prettyJson, type: 'bfevfl', be: false },
    };
  }

  // 3. EVFL 明确后缀（默认图形化流程图）
  if (ext === 'bfevfl') {
    const jsonStr = await invoke<string>('load_evfl', { path });
    const data = JSON.parse(jsonStr);
    if (!isFromPack) localStorage.setItem('lastOpenedFile', path);

    return { filePath: path, evflData: data, yamlData: null };
  }

  // 3. YAML / AAMP / BYML 格式
  try {
    const yamlRes = await invoke<any>('load_yaml', { path });
    if (!isFromPack) localStorage.setItem('lastOpenedFile', path);
    return { filePath: path, evflData: null, yamlData: yamlRes };
  } catch (e) {
    // 尝试作为 EVFL 回退读取
    try {
      const jsonStr = await invoke<string>('load_evfl', { path });
      const data = JSON.parse(jsonStr);
      if (!isFromPack) localStorage.setItem('lastOpenedFile', path);

      return { filePath: path, evflData: data, yamlData: null };
    } catch (evflErr) {
      throw new Error('ERR_UNSUPPORTED_FORMAT');
    }
  }
}

// 获取文件所在的父目录路径（兼容物理路径与 SARC 虚拟路径）
export function getParentDir(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('SARC:')) {
    const lastSlash = filePath.lastIndexOf('/');
    const dblSlash = filePath.lastIndexOf('//');
    if (lastSlash > dblSlash + 1) {
      return filePath.substring(0, lastSlash);
    } else if (dblSlash !== -1) {
      return filePath.substring(0, dblSlash);
    }
    return filePath;
  }
  return filePath.replace(/[/\\][^/\\]+$/, '');
}
