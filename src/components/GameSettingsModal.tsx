import { useState, useEffect, type FormEvent } from 'react';
import { X, CheckCircle2, Monitor, Gamepad2, Settings } from 'lucide-react';
import {
  GamePathSettings,
  SwitchPathSettings,
  WiiUPathSettings,
  PlatformType,
} from '../types/settings';
import SwitchSettingsPane from './settings/SwitchSettingsPane';
import WiiUSettingsPane from './settings/WiiUSettingsPane';
import GeneralSettingsPane from './settings/GeneralSettingsPane';
import { useTranslation } from '../i18n';

interface GameSettingsModalProps {
  isOpen: boolean;
  initialSettings: GamePathSettings;
  onClose: () => void;
  onSave: (newSettings: GamePathSettings) => void;
  onPickFolder: (title?: string) => Promise<string | null>;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

// 统一偏好与双平台路径设置弹窗
export default function GameSettingsModal({
  isOpen,
  initialSettings,
  onClose,
  onSave,
  onPickFolder,
  onShowToast,
}: GameSettingsModalProps) {
  const { t, locale } = useTranslation();
  const [formData, setFormData] = useState<GamePathSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'switch' | 'wiiu'>('general');

  useEffect(() => {
    if (isOpen) {
      setFormData(structuredClone(initialSettings));
      setActiveTab('general');
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  // 更新 Switch 字段
  const handleSwitchChange = (field: keyof SwitchPathSettings, val: string) => {
    setFormData((prev) => ({
      ...prev,
      switch: { ...prev.switch, [field]: val },
    }));
  };

  // 浏览 Switch 文件夹
  const handleSwitchBrowse = async (field: keyof SwitchPathSettings, title: string) => {
    const selected = await onPickFolder(title);
    if (selected) handleSwitchChange(field, selected);
  };

  // 更新 Wii U 字段
  const handleWiiUChange = (field: keyof WiiUPathSettings, val: string) => {
    setFormData((prev) => ({
      ...prev,
      wiiu: { ...prev.wiiu, [field]: val },
    }));
  };

  // 浏览 Wii U 文件夹
  const handleWiiUBrowse = async (field: keyof WiiUPathSettings, title: string) => {
    const selected = await onPickFolder(title);
    if (selected) handleWiiUChange(field, selected);
  };

  // 保存配置
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onShowToast(t('settings.saveSuccess'), 'success');
    onClose();
  };

  // 批量应用从 BCML 导入的路径
  const handleApplyBcmlPaths = (
    wiiuGame?: string,
    wiiuUpdate?: string,
    wiiuDlc?: string,
    switchGame?: string,
    switchDlc?: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      wiiu: {
        ...prev.wiiu,
        gameDir: wiiuGame || prev.wiiu.gameDir,
        updateDir: wiiuUpdate || prev.wiiu.updateDir,
        dlcDir: wiiuDlc || prev.wiiu.dlcDir,
      },
      switch: {
        ...prev.switch,
        gameDir: switchGame || prev.switch.gameDir,
        dlcDir: switchDlc || prev.switch.dlcDir,
      },
    }));
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* 弹窗头部 */}
        <div className="modal-header">
          <div className="modal-title">
            <Settings size={18} style={{ marginRight: '8px', color: '#38bdf8' }} />
            <span>{t('settings.title')}</span>
          </div>
          <button className="close-btn" onClick={onClose} title={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {/* 顶部选项卡导航：通用设置置于首位 */}
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings size={16} />
            <span>{t('settings.generalTab')}</span>
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'switch' ? 'active' : ''}`}
            onClick={() => setActiveTab('switch')}
          >
            <Gamepad2 size={16} />
            <span>{t('settings.switchTab')}</span>
            {formData.currentPlatform === 'switch' && (
              <span className="settings-badge">{locale === 'zh' ? '当前生效' : 'Active'}</span>
            )}
          </button>

          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'wiiu' ? 'active' : ''}`}
            onClick={() => setActiveTab('wiiu')}
          >
            <Monitor size={16} />
            <span>{t('settings.wiiuTab')}</span>
            {formData.currentPlatform === 'wiiu' && (
              <span className="settings-badge">{locale === 'zh' ? '当前生效' : 'Active'}</span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form-body">
          {activeTab === 'general' && (
            <GeneralSettingsPane
              settings={formData}
              onPlatformChange={(platform: PlatformType) =>
                setFormData((prev) => ({ ...prev, currentPlatform: platform }))
              }
              onLanguageChange={(lang: string) =>
                setFormData((prev) => ({ ...prev, language: lang }))
              }
              onApplyBcmlPaths={handleApplyBcmlPaths}
              onShowToast={onShowToast}
            />
          )}

          {activeTab === 'switch' && (
            <SwitchSettingsPane
              data={formData.switch}
              isCurrentPlatform={formData.currentPlatform === 'switch'}
              onSetCurrentPlatform={() =>
                setFormData((prev) => ({ ...prev, currentPlatform: 'switch' }))
              }
              onChange={handleSwitchChange}
              onBrowse={handleSwitchBrowse}
            />
          )}

          {activeTab === 'wiiu' && (
            <WiiUSettingsPane
              data={formData.wiiu}
              isCurrentPlatform={formData.currentPlatform === 'wiiu'}
              onSetCurrentPlatform={() =>
                setFormData((prev) => ({ ...prev, currentPlatform: 'wiiu' }))
              }
              onChange={handleWiiUChange}
              onBrowse={handleWiiUBrowse}
            />
          )}

          {/* 底部操作按钮 */}
          <div className="modal-footer settings-footer" style={{ justifyContent: 'flex-end' }}>
            <div className="footer-actions">
              <button type="button" className="btn" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn primary">
                <CheckCircle2 size={15} style={{ marginRight: '6px' }} />
                {t('settings.saveBtn')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
