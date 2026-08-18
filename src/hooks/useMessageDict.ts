import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GamePathSettings } from '../types/settings';

// 语言包与剧情台词文本管理 Hook
export function useMessageDict(settings: GamePathSettings, modFolderPath: string | null) {
  const [messageDict, setMessageDict] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDict = useCallback(async () => {
    const platform = settings.currentPlatform;
    const lang = settings.language || 'USen';
    const switchSettings = settings.switch;
    const wiiuSettings = settings.wiiu;

    const gameDir =
      platform === 'switch' ? switchSettings?.gameDir || '' : wiiuSettings?.gameDir || '';
    const updateDir = platform === 'wiiu' ? wiiuSettings?.updateDir || '' : '';
    const dlcDir =
      platform === 'switch' ? switchSettings?.dlcDir || '' : wiiuSettings?.dlcDir || '';

    if (!modFolderPath && !gameDir && !updateDir && !dlcDir) {
      setMessageDict({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dict = await invoke<Record<string, string>>('load_language_dict', {
        platform,
        gameDir,
        updateDir,
        dlcDir,
        modDir: modFolderPath || null,
        language: lang,
      });
      setMessageDict(dict || {});
      console.log(`[MessageDict] 成功加载 ${lang} 语言包文本 ${Object.keys(dict || {}).length} 条`);
    } catch (err: any) {
      console.warn('[MessageDict] 加载语言包失败:', err);
      setError(String(err));
      setMessageDict({});
    } finally {
      setIsLoading(false);
    }
  }, [
    settings.currentPlatform,
    settings.language,
    settings.switch.gameDir,
    settings.switch.dlcDir,
    settings.wiiu.gameDir,
    settings.wiiu.updateDir,
    settings.wiiu.dlcDir,
    modFolderPath,
  ]);

  useEffect(() => {
    loadDict();
  }, [loadDict]);

  return {
    messageDict,
    isLoadingDict: isLoading,
    dictError: error,
    reloadDict: loadDict,
  };
}
