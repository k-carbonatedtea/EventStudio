import { useState, useEffect } from 'react';
import {
  Monitor,
  Gamepad2,
  Globe,
  HardDrive,
  Trash2,
  Cpu,
  Sparkles,
  FolderInput,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { PlatformType, SUPPORTED_LANGUAGES, GamePathSettings } from '../../types/settings';
import { useTranslation, Locale } from '../../i18n';

interface GeneralSettingsPaneProps {
  settings: GamePathSettings;
  onPlatformChange: (platform: PlatformType) => void;
  onLanguageChange: (lang: string) => void;
  onApplyBcmlPaths?: (
    wiiuGame?: string,
    wiiuUpdate?: string,
    wiiuDlc?: string,
    switchGame?: string,
    switchDlc?: string,
  ) => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

interface AiDataStatus {
  is_loaded: boolean;
  actions_count: number;
  queries_count: number;
  actors_count: number;
  dump_dir: string | null;
}

// 常规选项（界面语言、默认主平台、游戏语言包及临时备份缓存管理）分栏
export default function GeneralSettingsPane({
  settings,
  onPlatformChange,
  onLanguageChange,
  onApplyBcmlPaths,
  onShowToast,
}: GeneralSettingsPaneProps) {
  const { t, locale, setLocale } = useTranslation();
  const [aiStatus, setAiStatus] = useState<AiDataStatus | null>(null);
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [isImportingBcml, setIsImportingBcml] = useState(false);

  const fetchAiStatus = () => {
    const gDir =
      settings.currentPlatform === 'wiiu' ? settings.wiiu.gameDir : settings.switch.gameDir;
    const uDir =
      settings.currentPlatform === 'wiiu' ? settings.wiiu.updateDir : settings.switch.gameDir;
    invoke<AiDataStatus>('get_ai_data_status', {
      gameDir: gDir || null,
      updateDir: uDir || null,
      customDumpDir: settings.customAiDumpDir || null,
    })
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  };

  useEffect(() => {
    fetchAiStatus();
  }, [settings.currentPlatform, settings.wiiu.gameDir, settings.switch.gameDir]);

  // 一键解包 AI 数据
  const handleUnpackAi = async () => {
    setIsUnpacking(true);
    try {
      const gDir =
        settings.currentPlatform === 'wiiu' ? settings.wiiu.gameDir : settings.switch.gameDir;
      const uDir =
        settings.currentPlatform === 'wiiu' ? settings.wiiu.updateDir : settings.switch.gameDir;
      const res = await invoke<{ output_dir: string; actors_unpacked: number }>(
        'unpack_game_ai_data',
        {
          gameDir: gDir || null,
          updateDir: uDir || null,
          customOutputDir: settings.customAiDumpDir || null,
        },
      );
      onShowToast?.(`${t('autofill.unpackAiSuccess')}${res.output_dir}`, 'success');
      fetchAiStatus();
    } catch (err) {
      onShowToast?.(`${t('autofill.unpackAiFailed')}: ${err}`, 'error');
    } finally {
      setIsUnpacking(false);
    }
  };

  // 一键从 BCML 导入路径
  const handleImportBcml = async () => {
    setIsImportingBcml(true);
    try {
      const res = await invoke<{
        success: boolean;
        message: string;
        wiiu_game_dir?: string | null;
        wiiu_update_dir?: string | null;
        wiiu_dlc_dir?: string | null;
        switch_game_dir?: string | null;
        switch_dlc_dir?: string | null;
      }>('import_bcml_paths');

      if (res.success) {
        onApplyBcmlPaths?.(
          res.wiiu_game_dir || undefined,
          res.wiiu_update_dir || undefined,
          res.wiiu_dlc_dir || undefined,
          res.switch_game_dir || undefined,
          res.switch_dlc_dir || undefined,
        );
        onShowToast?.(t('settings.importBcmlSuccess'), 'success');
      } else {
        onShowToast?.(res.message || t('settings.importBcmlNoData'), 'info');
      }
    } catch (err) {
      onShowToast?.(`${err}`, 'error');
    } finally {
      setIsImportingBcml(false);
    }
  };

  // 清理临时自动保存快照
  const handleCleanAutosave = async () => {
    if (!confirm(t('settings.cleanAutosaveConfirm'))) return;
    try {
      await invoke<number>('clean_autosave_cache');
      onShowToast?.(t('settings.cleanAutosaveSuccess'), 'success');
    } catch (err) {
      onShowToast?.(`清理失败: ${err}`, 'error');
    }
  };

  return (
    <div className="settings-tab-pane">
      {/* 界面显示语言切换 */}
      <div className="settings-field">
        <label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={16} className="text-sky" />
            <span>{t('settings.uiLanguage')}</span>
          </span>
          <span className="field-desc">{t('settings.uiLanguageDesc')}</span>
        </label>
        <select
          className="settings-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          <option value="zh">简体中文 (Simplified Chinese)</option>
          <option value="en">English (US)</option>
        </select>
      </div>

      {/* 默认平台设置 */}
      <div className="settings-field">
        <label>
          <span>{t('settings.defaultPlatform')}</span>
          <span className="field-desc">{t('settings.defaultPlatformDesc')}</span>
        </label>
        <div className="platform-radio-group">
          <label className={`radio-card ${settings.currentPlatform === 'switch' ? 'checked' : ''}`}>
            <input
              type="radio"
              name="platform"
              value="switch"
              checked={settings.currentPlatform === 'switch'}
              onChange={() => onPlatformChange('switch')}
            />
            <Gamepad2 size={20} />
            <div className="radio-card-info">
              <span className="radio-card-title">Nintendo Switch (NX)</span>
              <span className="radio-card-sub">Little-Endian (RomFS)</span>
            </div>
          </label>

          <label className={`radio-card ${settings.currentPlatform === 'wiiu' ? 'checked' : ''}`}>
            <input
              type="radio"
              name="platform"
              value="wiiu"
              checked={settings.currentPlatform === 'wiiu'}
              onChange={() => onPlatformChange('wiiu')}
            />
            <Monitor size={20} />
            <div className="radio-card-info">
              <span className="radio-card-title">Wii U (Cemu)</span>
              <span className="radio-card-sub">Big-Endian (Content / MLC)</span>
            </div>
          </label>
        </div>
      </div>

      {/* 游戏文本语言包 */}
      <div className="settings-field">
        <label>
          <span>{t('settings.gameLanguage')}</span>
          <span className="field-desc">{t('settings.gameLanguageDesc')}</span>
        </label>
        <select
          className="settings-select"
          value={settings.language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* BCML 路径快捷导入 */}
      <div
        className="settings-field"
        style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #262626' }}
      >
        <label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderInput size={16} className="text-emerald" />
            <span>{t('settings.importBcml')}</span>
          </span>
          <span className="field-desc">{t('settings.importBcmlDesc')}</span>
        </label>
        <div>
          <button
            type="button"
            className="browse-btn"
            style={{
              color: '#34d399',
              borderColor: 'rgba(52, 211, 153, 0.4)',
              background: 'rgba(52, 211, 153, 0.08)',
            }}
            onClick={handleImportBcml}
            disabled={isImportingBcml}
          >
            <FolderInput size={14} />
            <span>
              {isImportingBcml
                ? locale === 'zh'
                  ? '正在读取...'
                  : 'Reading...'
                : t('settings.importBcmlBtn')}
            </span>
          </button>
        </div>
      </div>

      {/* 游戏 AI 数据状态与一键解包 */}
      <div
        className="settings-field"
        style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #262626' }}
      >
        <label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={16} className="text-cyan" />
            <span>{t('autofill.aiDataStatus')}</span>
          </span>
          <span className="field-desc">
            {aiStatus?.is_loaded
              ? `${t('autofill.aiDataLoaded')} (${aiStatus.actions_count} Actions / ${aiStatus.queries_count} Queries)`
              : t('autofill.aiDataNotLoaded')}
          </span>
        </label>
        <div>
          <button
            type="button"
            className="browse-btn"
            style={{
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.08)',
            }}
            onClick={handleUnpackAi}
            disabled={isUnpacking}
          >
            <Sparkles size={14} />
            <span>
              {isUnpacking
                ? locale === 'zh'
                  ? '正在解包...'
                  : 'Unpacking...'
                : t('autofill.unpackAi')}
            </span>
          </button>
        </div>
      </div>

      {/* 临时自动保存快照与缓存管理 */}
      <div
        className="settings-field"
        style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #262626' }}
      >
        <label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HardDrive size={16} className="text-amber" />
            <span>{t('settings.storageCache')}</span>
          </span>
          <span className="field-desc">{t('settings.storageCacheDesc')}</span>
        </label>
        <div>
          <button
            type="button"
            className="browse-btn"
            style={{
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.08)',
            }}
            onClick={handleCleanAutosave}
          >
            <Trash2 size={14} />
            <span>{t('settings.cleanAutosaveBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
