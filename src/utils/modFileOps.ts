import { invoke } from '@tauri-apps/api/core';
import { FileNode } from '../types/fileTree';

// 判断是否为 SARC 归档包格式
export function isSarcPackage(path: string): boolean {
  if (!path) return false;
  const lower = path.toLowerCase();
  return ['.sbeventpack', '.pack', '.sarc', '.ssarc', '.sbactorpack', '.spack'].some((ext) =>
    lower.endsWith(ext),
  );
}

// 加载模组目录或 SARC 归档包的文件树结构
export async function loadFolderOrPackTree(path: string): Promise<FileNode[]> {
  if (isSarcPackage(path)) {
    return await invoke<FileNode[]>('load_sbeventpack', { path });
  }
  return await invoke<FileNode[]>('read_mod_directory', { path });
}

// 在模组或包内创建新的 .bfevfl 文件
export async function invokeCreateBfevfl(targetDir: string, fileName: string): Promise<string> {
  return await invoke<string>('create_bfevfl_file', {
    dirOrPackPath: targetDir,
    fileName,
  });
}

// 删除指定路径的文件（支持物理路径与 SARC 虚拟路径）
export async function invokeDeleteFile(pathToDelete: string): Promise<void> {
  await invoke('delete_file_by_path', { path: pathToDelete });
}

// 重命名指定路径的文件（支持物理路径与 SARC 虚拟路径）
export async function invokeRenameFile(oldPath: string, newName: string): Promise<string> {
  return await invoke<string>('rename_file_by_path', {
    oldPath,
    newName,
  });
}

// 更新并同步流程图内部名称标识
export function updateFlowchartName(evflData: any, newName: string): any {
  const trimmed = newName.trim();
  if (!trimmed || !evflData) return null;
  const newEvflData = structuredClone(evflData);
  newEvflData.name = trimmed;
  if (!newEvflData.flowchart) {
    newEvflData.flowchart = { name: trimmed, actors: [], events: [], entry_points: [] };
  } else {
    newEvflData.flowchart.name = trimmed;
  }
  return newEvflData;
}
