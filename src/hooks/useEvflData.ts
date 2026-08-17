import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "../i18n";
import { FileNode } from "../types/fileTree";
import { performAutoSave, loadFileContent } from "../utils/fileLoader";
import {
  isSarcPackage,
  loadFolderOrPackTree,
  invokeCreateBfevfl,
  invokeDeleteFile,
  invokeRenameFile,
  updateFlowchartName,
} from "../utils/modFileOps";

export interface HistoryItem {
  data: any;
  title: string;
  detail?: string;
  time: string;
}

// 主编辑状态管理与历史时间轴 Hook
export function useEvflData(onFileOpened?: (path: string, isMod?: boolean) => void) {
  const { t } = useTranslation();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [evflData, setEvflData] = useState<any>(null);
  const [yamlData, setYamlData] = useState<{ yaml: string; type: string; be: boolean } | null>(null);
  
  // Mod Folder 状态
  const [modFolderPath, setModFolderPath] = useState<string | null>(null);
  const [modFolderTree, setModFolderTree] = useState<FileNode[]>([]);
  
  // 历史记录状态
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // 存入历史记录
  const pushToHistory = async (
    newData: any,
    title: string = "修改节点/参数",
    detail: string = "",
    currentPath: string | null = filePath
  ) => {
    const newHistory = history.slice(0, historyIndex + 1);
    const nowTime = new Date().toLocaleTimeString();
    const item: HistoryItem = { data: newData, title, detail, time: nowTime };
    newHistory.push(item);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setEvflData(newData);
    
    await performAutoSave(currentPath, newHistory.length - 1, title, detail, nowTime, newData);
  };

  // 通过路径打开文件或包（支持以 JSON 源码方式编辑）
  const openFileByPath = async (path: string, asJson: boolean = false) => {
    try {
      if (isSarcPackage(path)) {
        setModFolderPath(path);
        localStorage.setItem("lastOpenedFile", path);
        const tree = await loadFolderOrPackTree(path);
        setModFolderTree(tree);
        setEvflData(null);
        setYamlData(null);
        setFilePath(null);
        onFileOpened?.(path, false);
        return;
      }

      const fileName = path.split(/[/\\]/).pop() || "unknown";
      const result = await loadFileContent(path, fileName, false, asJson);
      setFilePath(result.filePath);
      setYamlData(result.yamlData);

      if (result.evflData) {
        let loadedHistory: { steps: HistoryItem[]; current_index: number } | null = null;
        try {
          loadedHistory = await invoke("load_file_history", { filePath: path });
        } catch (e) {
          console.warn("Failed to load history for file", e);
        }

        if (loadedHistory && loadedHistory.steps && loadedHistory.steps.length > 0) {
          setHistory(loadedHistory.steps);
          const validIdx = loadedHistory.current_index < loadedHistory.steps.length 
            ? loadedHistory.current_index 
            : loadedHistory.steps.length - 1;
          setHistoryIndex(validIdx);
          setEvflData(loadedHistory.steps[validIdx].data || result.evflData);
        } else {
          const initialTime = new Date().toLocaleTimeString();
          const initialHistory = [{
            data: result.evflData,
            title: "初始文件状态",
            detail: `${result.evflData?.flowchart?.name || fileName} 加载完成`,
            time: initialTime,
          }];
          setHistory(initialHistory);
          setHistoryIndex(0);
          setEvflData(result.evflData);
          await performAutoSave(path, 0, "初始文件状态", `${fileName} 加载完成`, initialTime, result.evflData);
        }
      } else {
        setEvflData(null);
      }
      if (!modFolderPath && !result.filePath.startsWith("SARC:") && !path.startsWith("SARC:")) {
        onFileOpened?.(result.filePath || path, false);
      }
    } catch (err: any) {
      console.error("Failed to open file by path", err);
      const rawMsg = err?.message || String(err);
      const isUnsupported = ["ERR_UNSUPPORTED_FORMAT", "文件格式不受支持", "Unsupported file format", "Not a valid BFEVFL", "Unsupported YAML binary"].some((k) => rawMsg.includes(k));
      const displayError = isUnsupported ? t('errors.unsupportedFormat') : rawMsg;
      await message(t('errors.openFileFailed', { error: displayError }), { title: t('common.error'), kind: 'error' });
      throw err;
    }
  };

  const handleOpen = async () => {
    try {
      const file = await open({ multiple: false });
      if (file) {
        const path = Array.isArray(file) ? file[0] : file;
        await openFileByPath(path);
      }
    } catch (err) {
      console.error("Failed to open file", err);
    }
  };

  const openModFolderByPath = async (folder: string) => {
    try {
      setModFolderPath(folder);
      const tree = await loadFolderOrPackTree(folder);
      setModFolderTree(tree);
      onFileOpened?.(folder, true);
    } catch (err) {
      console.error("Failed to open mod folder by path", err);
      throw err;
    }
  };

  const handleOpenModFolder = async () => {
    try {
      const folder = await open({ directory: true, multiple: false });
      if (folder && typeof folder === "string") {
        await openModFolderByPath(folder);
      }
    } catch (err) {
      console.error("Failed to open mod folder", err);
    }
  };

  // 保存当前流程图
  const handleSave = async () => {
    if (!evflData) return;
    try {
      if (filePath && filePath.startsWith("SARC:")) {
        const jsonStr = JSON.stringify(evflData);
        await invoke("save_evfl", { path: filePath, jsonData: jsonStr });
        const fileNamePart = filePath.split("//").pop() || "unknown";
        await message(t('errors.saveSuccess', { name: fileNamePart }), {
          title: t('common.success'),
          kind: 'info',
        });
        return;
      }

      let targetPath = filePath;
      if (!targetPath) {
        const file = await save({
          filters: [{ name: "EventFlow Files", extensions: ["bfevfl"] }],
        });
        if (!file) return;
        targetPath = file;
        setFilePath(targetPath);
        localStorage.setItem("lastOpenedFile", targetPath);
      }
      
      const jsonStr = JSON.stringify(evflData);
      await invoke("save_evfl", { path: targetPath, jsonData: jsonStr });
      const targetName = targetPath.split(/[/\\]/).pop() || targetPath;
      await message(t('errors.saveSuccess', { name: targetName }), {
        title: t('common.success'),
        kind: 'info',
      });
    } catch (err) {
      console.error("Failed to save file", err);
      await message(t('errors.saveFileFailed', { error: String(err) }), {
        title: t('common.error'),
        kind: 'error',
      });
    }
  };

  // 撤销与重做
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setEvflData(history[prevIndex]?.data || history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setEvflData(history[nextIndex]?.data || history[nextIndex]);
    }
  };

  // 跳转到指定历史步骤
  const jumpToHistory = (index: number) => {
    if (index >= 0 && index < history.length) {
      setHistoryIndex(index);
      setEvflData(history[index]?.data || history[index]);
    }
  };

  // 删除指定历史步骤
  const deleteHistoryStep = async (index: number) => {
    if (history.length <= 1 || index < 0 || index >= history.length) return;
    const newHistory = history.filter((_, i) => i !== index);
    const newIndex = index === historyIndex ? Math.max(0, index - 1) : index < historyIndex ? historyIndex - 1 : historyIndex;
    setHistory(newHistory);
    setHistoryIndex(newIndex);
    setEvflData(newHistory[newIndex]?.data || newHistory[newIndex]);

    try {
      await invoke("sync_file_history_timeline", {
        filePath: filePath || "Untitled",
        currentIndex: newIndex,
        steps: newHistory,
      });
    } catch (e) {
      console.warn("Failed to sync history after step deletion", e);
    }
  };

  // 清空历史步骤（保留当前有效状态）
  const clearHistorySteps = async () => {
    if (!evflData) return;
    const nowTime = new Date().toLocaleTimeString();
    const currentItem = history[historyIndex] || { data: evflData, title: "初始文件状态", detail: "历史记录已重置", time: nowTime };
    const newHistory = [{ data: currentItem.data || evflData, title: currentItem.title || "初始文件状态", detail: "历史步骤已重置", time: nowTime }];
    setHistory(newHistory);
    setHistoryIndex(0);

    try {
      await invoke("sync_file_history_timeline", { filePath: filePath || "Untitled", currentIndex: 0, steps: newHistory });
    } catch (e) {
      console.warn("Failed to clear history", e);
    }
  };

  // 取消/重置所有未保存修改
  const handleDiscard = () => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setEvflData(history[0]?.data || history[0]);
    }
  };

  // 更新单个节点数据
  const handleUpdateNode = (updatedNodeData: any) => {
    if (!evflData || !updatedNodeData) return;
    const newEvflData = structuredClone(evflData);
    const rawId = updatedNodeData.id !== undefined ? updatedNodeData.id : updatedNodeData.data?.id;
    const idx = parseInt(rawId);
    if (isNaN(idx) || !newEvflData.flowchart?.events?.[idx]) return;

    const origData = updatedNodeData.originalData !== undefined ? updatedNodeData.originalData : updatedNodeData.data?.originalData;
    newEvflData.flowchart.events[idx].data = origData;
    const nodeName = newEvflData.flowchart.events[idx].name || `Event${idx}`;
    const typeKey = Object.keys(origData || {})[0] || "事件";
    pushToHistory(newEvflData, `修改节点: ${nodeName}`, `更新 ${typeKey} 节点属性/参数`);
  };

  // 新建 .bfevfl 事件流文件（通过系统文件保存对话框创建具体文件，并直接打开进入单文件编辑）
  const handleNew = async (customDefaultDir?: string) => {
    try {
      let defaultPath = "NewEvent.bfevfl";
      if (customDefaultDir) {
        defaultPath = `${customDefaultDir.replace(/[/\\]+$/, "")}/NewEvent.bfevfl`;
      } else if (modFolderPath && !isSarcPackage(modFolderPath)) {
        defaultPath = `${modFolderPath.replace(/[/\\]+$/, "")}/NewEvent.bfevfl`;
      }

      const file = await save({
        filters: [{ name: "EventFlow Files", extensions: ["bfevfl"] }],
        defaultPath,
      });
      if (!file) return;

      let targetPath = file;
      if (!targetPath.toLowerCase().endsWith(".bfevfl")) {
        targetPath += ".bfevfl";
      }

      const fileName = targetPath.split(/[/\\]/).pop() || "NewEvent.bfevfl";
      const parentDir = targetPath.substring(0, targetPath.length - fileName.length);

      await invokeCreateBfevfl(parentDir, fileName);
      await refreshModFolder();
      await openFileByPath(targetPath);
    } catch (err) {
      console.error("Failed to create new evfl file", err);
    }
  };

  const handleSaveAs = async () => {
    if (!evflData) return;
    try {
      const file = await save({
        filters: [{ name: "EventFlow Files", extensions: ["bfevfl"] }],
      });
      if (!file) return;
      
      const targetPath = file;
      setFilePath(targetPath);
      localStorage.setItem("lastOpenedFile", targetPath);
      onFileOpened?.(targetPath, false);
      
      const jsonStr = JSON.stringify(evflData);
      await invoke("save_evfl", { path: targetPath, jsonData: jsonStr });
      const targetName = targetPath.split(/[/\\]/).pop() || targetPath;
      await message(t('errors.saveSuccess', { name: targetName }), {
        title: t('common.success'),
        kind: 'info',
      });
    } catch (err) {
      console.error("Failed to save as", err);
      await message(t('errors.saveFileFailed', { error: String(err) }), {
        title: t('common.error'),
        kind: 'error',
      });
    }
  };

  // 重命名流程图
  const renameFlowchart = (newName: string) => {
    const updated = updateFlowchartName(evflData, newName);
    if (updated) pushToHistory(updated, `重命名流程图: ${newName.trim()}`, "同步内部 Flowchart 标识");
  };

  // 刷新当前打开的模组目录或 SARC 包
  const refreshModFolder = async () => {
    if (modFolderPath) {
      const tree = await loadFolderOrPackTree(modFolderPath);
      setModFolderTree(tree);
    }
  };

  // 在指定目录或包路径下新建 .bfevfl 文件
  const createBfevflFile = async (targetDir: string, fileName: string) => {
    const createdPath = await invokeCreateBfevfl(targetDir, fileName);
    await refreshModFolder();
    await openFileByPath(createdPath);
    return createdPath;
  };

  // 删除文件
  const deleteFile = async (pathToDelete: string) => {
    await invokeDeleteFile(pathToDelete);
    if (filePath === pathToDelete) { setFilePath(null); setEvflData(null); setYamlData(null); }
    await refreshModFolder();
  };

  // 重命名文件
  const renameFile = async (oldPath: string, newName: string) => {
    const newPath = await invokeRenameFile(oldPath, newName);
    const cleanBase = newName.split(/[/\\]/).pop()?.replace(/\.bfevfl$/i, "") || newName;
    if (filePath === oldPath) {
      setFilePath(newPath);
      const updated = updateFlowchartName(evflData, cleanBase);
      if (updated) { setEvflData(updated); pushToHistory(updated); }
    }
    await refreshModFolder();
    return newPath;
  };

  return {
    filePath, evflData, setEvflData, yamlData, setYamlData,
    modFolderPath, modFolderTree, history, historyIndex,
    pushToHistory, handleOpen, handleOpenModFolder,
    openFileByPath, openModFolderByPath, refreshModFolder,
    createBfevflFile, deleteFile, renameFile,
    handleSave, handleUndo, handleRedo, jumpToHistory,
    deleteHistoryStep, clearHistorySteps, handleDiscard,
    handleUpdateNode, handleNew, handleSaveAs, renameFlowchart,
  };
}
