import { Folder, CheckCircle } from "lucide-react";
import { SwitchPathSettings } from "../../types/settings";
import { useTranslation } from "../../i18n";

interface SwitchSettingsPaneProps {
  data: SwitchPathSettings;
  isCurrentPlatform: boolean;
  onSetCurrentPlatform: () => void;
  onChange: (field: keyof SwitchPathSettings, val: string) => void;
  onBrowse: (field: keyof SwitchPathSettings, title: string) => void;
}

// Switch (NX) 平台路径配置分栏
export default function SwitchSettingsPane({
  data,
  isCurrentPlatform,
  onSetCurrentPlatform,
  onChange,
  onBrowse,
}: SwitchSettingsPaneProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="settings-tab-pane">
      <div className="settings-tip flex-between">
        <span>
          {locale === 'zh' 
            ? '配置 Nintendo Switch (NX) 的 RomFS 游戏根目录与 LayeredFS 模组导出路径。' 
            : 'Configure Nintendo Switch (NX) RomFS directory and LayeredFS mod export path.'}
        </span>
        {isCurrentPlatform ? (
          <span className="settings-active-badge">
            <CheckCircle size={13} /> {locale === 'zh' ? '当前生效平台' : 'Active Platform'}
          </span>
        ) : (
          <button type="button" className="set-active-btn" onClick={onSetCurrentPlatform}>
            {locale === 'zh' ? '设为当前平台' : 'Set as Active'}
          </button>
        )}
      </div>

      <div className="settings-field">
        <label>
          <span>{t('settings.switchGameDir')} (game_dir_nx)</span>
          <span className="field-desc">
            {locale === 'zh' ? '包含 EventFlow, Actor, Pack 等资源的 romfs 文件夹' : 'Main romfs folder containing EventFlow, Actor, Pack resources'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="C:\Game\BOTW\01007EF00011E000\romfs"
            value={data.gameDir}
            onChange={(e) => onChange("gameDir", e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() => onBrowse("gameDir", locale === 'zh' ? "选择 Switch RomFS 目录" : "Select Switch RomFS Directory")}
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <label>
          <span>{t('settings.switchDlcDir')} (dlc_dir_nx)</span>
          <span className="field-desc">
            {locale === 'zh' ? 'Switch 版本的 DLC romfs 文件夹（可选）' : 'Switch version DLC romfs directory (Optional)'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="C:\Game\BOTW\01007EF00011F001\romfs"
            value={data.dlcDir}
            onChange={(e) => onChange("dlcDir", e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() => onBrowse("dlcDir", locale === 'zh' ? "选择 Switch DLC RomFS 目录" : "Select Switch DLC RomFS Directory")}
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <label>
          <span>{t('settings.switchExportDir')} (export_dir_nx)</span>
          <span className="field-desc">
            {locale === 'zh' ? 'Atmosphere LayeredFS 导出目录 (contents/01007EF00011E000/romfs)' : 'Atmosphere LayeredFS export directory (contents/.../romfs)'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="E:\Atmosphere\contents\01007EF00011E000\romfs"
            value={data.exportDir}
            onChange={(e) => onChange("exportDir", e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() => onBrowse("exportDir", locale === 'zh' ? "选择 Switch 模组导出路径" : "Select Switch Mod Export Path")}
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>
    </div>
  );
}
