import { useState, useCallback } from 'react';
import { RecentProjectItem, ProjectType } from '../types/recentProject';

const RECENT_PROJECTS_KEY = 'event_studio_recent_projects';
const MAX_RECENT_PROJECTS = 20;

// 推断文件或目录所属的项目类型
export function getProjectType(path: string, isMod?: boolean): ProjectType {
  if (isMod) return 'mod';
  const lower = path.toLowerCase();
  if (lower.endsWith('.sbeventpack')) return 'sbeventpack';
  if (lower.endsWith('.pack') || lower.endsWith('.sarc') || lower.endsWith('.ssarc')) return 'pack';
  if (lower.endsWith('.bfevfl')) return 'bfevfl';
  if (lower.endsWith('.msbt')) return 'msbt';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.aamp') || lower.endsWith('.byml')) return 'yaml';
  return 'other';
}

// 最近打开项目与文件管理 Hook
export function useRecentProjects() {
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (stored) {
        const parsed: RecentProjectItem[] = JSON.parse(stored);
        // 过滤掉内部 SARC 虚拟文件路径与非法子文件路径
        return parsed.filter(
          (item) => item.path && !item.path.startsWith('SARC:') && !item.path.includes('//')
        );
      }
    } catch (e) {
      console.warn("Failed to load recent projects from localStorage", e);
    }
    return [];
  });

  // 保存到 localStorage
  const saveToStorage = (items: RecentProjectItem[]) => {
    // 确保仅保存非 SARC 独立顶层工程或物理文件
    const cleanItems = items.filter(
      (item) => item.path && !item.path.startsWith('SARC:') && !item.path.includes('//')
    );
    setRecentProjects(cleanItems);
    try {
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(cleanItems));
    } catch (e) {
      console.warn("Failed to save recent projects to localStorage", e);
    }
  };

  // 添加或更新最近打开项（忽略 Mod 内部的子文件）
  const addRecent = useCallback((path: string, isMod: boolean = false) => {
    if (!path) return;
    const cleanPath = path.trim();
    // 内部 SARC 虚拟节点或包内子路径不作为顶层项目记录
    if (cleanPath.startsWith('SARC:') || cleanPath.includes('//')) {
      return;
    }

    const name = cleanPath.split(/[/\\]/).pop() || cleanPath;
    const type = getProjectType(cleanPath, isMod);

    setRecentProjects((prev) => {
      const filtered = prev.filter(
        (item) => item.path.toLowerCase() !== cleanPath.toLowerCase() && !item.path.startsWith('SARC:') && !item.path.includes('//')
      );
      const newItem: RecentProjectItem = {
        id: `${cleanPath}_${Date.now()}`,
        name,
        path: cleanPath,
        type,
        lastOpened: Date.now(),
      };
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_PROJECTS);
      try {
        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save recent projects", e);
      }
      return updated;
    });
  }, []);

  // 移除单个历史项
  const removeRecent = useCallback((path: string) => {
    setRecentProjects((prev) => {
      const updated = prev.filter((item) => item.path.toLowerCase() !== path.toLowerCase());
      try {
        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to update recent projects", e);
      }
      return updated;
    });
  }, []);

  // 清空所有历史项
  const clearAllRecents = useCallback(() => {
    saveToStorage([]);
  }, []);

  return {
    recentProjects,
    addRecent,
    removeRecent,
    clearAllRecents,
  };
}
