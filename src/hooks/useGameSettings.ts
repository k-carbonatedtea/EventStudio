import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { GamePathSettings, DEFAULT_SETTINGS, PlatformType } from '../types/settings';

// 游戏与平台路径设置管理 Hook（由用户手动配置和保存）
export function useGameSettings() {
  const [settings, setSettings] = useState<GamePathSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 解析与合并设置数据
  const parseAndMergeSettings = (raw: any): GamePathSettings => {
    return {
      currentPlatform:
        raw.currentPlatform ||
        (raw.wiiu === false
          ? 'switch'
          : raw.wiiu === true
            ? 'wiiu'
            : DEFAULT_SETTINGS.currentPlatform),
      language: raw.language || raw.lang || DEFAULT_SETTINGS.language,
      wiiu: {
        gameDir: raw.wiiu?.gameDir || '',
        updateDir: raw.wiiu?.updateDir || '',
        dlcDir: raw.wiiu?.dlcDir || '',
        exportDir: raw.wiiu?.exportDir || '',
      },
      switch: {
        gameDir: raw.switch?.gameDir || '',
        dlcDir: raw.switch?.dlcDir || '',
        exportDir: raw.switch?.exportDir || '',
      },
    };
  };

  // 初始化加载用户保存的配置
  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        // 优先从应用持久化文件读取
        const jsonStr = await invoke<string>('load_editor_settings');
        if (jsonStr && jsonStr !== '{}') {
          const parsed = JSON.parse(jsonStr);
          const merged = parseAndMergeSettings(parsed);
          setSettings(merged);
          setIsLoaded(true);
          return;
        }
      } catch (err) {
        console.warn('无法从后端加载设置:', err);
      }

      setIsLoaded(true);
    };

    loadInitialSettings();
  }, []);

  // 保存设置
  const saveSettings = useCallback(async (newSettings: GamePathSettings) => {
    setSettings(newSettings);
    try {
      await invoke('save_editor_settings', { settingsJson: JSON.stringify(newSettings, null, 2) });
    } catch (err) {
      console.error('保存设置到后端失败:', err);
    }
  }, []);

  // 切换平台 (Wii U / Switch)
  const setPlatform = useCallback(
    (platform: PlatformType) => {
      setSettings((prev) => {
        const next = { ...prev, currentPlatform: platform };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings],
  );

  // 切换语言包
  const setLanguage = useCallback(
    (lang: string) => {
      setSettings((prev) => {
        const next = { ...prev, language: lang };
        saveSettings(next);
        return next;
      });
    },
    [saveSettings],
  );

  // 选择文件夹通用工具
  const pickFolder = useCallback(async (title: string = '选择目录'): Promise<string | null> => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title,
      });
      if (selected && typeof selected === 'string') {
        return selected;
      }
      return null;
    } catch (err) {
      console.error('打开文件夹选择器失败:', err);
      return null;
    }
  }, []);

  return {
    settings,
    isLoaded,
    saveSettings,
    setPlatform,
    setLanguage,
    pickFolder,
  };
}
