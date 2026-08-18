import { Folder, CheckCircle } from 'lucide-react';
import { WiiUPathSettings } from '../../types/settings';
import { useTranslation } from '../../i18n';

interface WiiUSettingsPaneProps {
  data: WiiUPathSettings;
  isCurrentPlatform: boolean;
  onSetCurrentPlatform: () => void;
  onChange: (field: keyof WiiUPathSettings, val: string) => void;
  onBrowse: (field: keyof WiiUPathSettings, title: string) => void;
}

// Wii U (Cemu) 平台路径配置分栏
export default function WiiUSettingsPane({
  data,
  isCurrentPlatform,
  onSetCurrentPlatform,
  onChange,
  onBrowse,
}: WiiUSettingsPaneProps) {
  const { t, locale } = useTranslation();

  return (
    <div className="settings-tab-pane">
      <div className="settings-tip flex-between">
        <span>
          {locale === 'zh'
            ? '配置 Wii U 平台 (Cemu) 的 Base, Update (MLC v1.5.0/v1.6.0), DLC 路径。'
            : 'Configure Wii U (Cemu) Base, Update (MLC v1.5.0/v1.6.0), and DLC paths.'}
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
          <span>{t('settings.wiiuGameDir')} (game_dir)</span>
          <span className="field-desc">
            {locale === 'zh' ? '原版游戏本体 content 文件夹' : 'Base game content directory'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="E:\Botw_Dump\Games\The Legend of Zelda-Breath of the Wild\content"
            value={data.gameDir}
            onChange={(e) => onChange('gameDir', e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() =>
              onBrowse(
                'gameDir',
                locale === 'zh'
                  ? '选择 Wii U 本体 content 目录'
                  : 'Select Wii U Base content Directory',
              )
            }
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <label>
          <span>{t('settings.wiiuUpdateDir')} (update_dir)</span>
          <span className="field-desc">
            {locale === 'zh'
              ? 'v1.5.0 / v1.6.0 更新补丁 MLC content 文件夹 (推荐配置)'
              : 'v1.5.0 / v1.6.0 Update MLC content directory (Recommended)'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="E:\Botw_Dump\MLC\usr\title\0005000E\101C9300\content"
            value={data.updateDir}
            onChange={(e) => onChange('updateDir', e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() =>
              onBrowse(
                'updateDir',
                locale === 'zh'
                  ? '选择 Wii U 补丁 content 目录'
                  : 'Select Wii U Update content Directory',
              )
            }
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <label>
          <span>{t('settings.wiiuDlcDir')} (dlc_dir)</span>
          <span className="field-desc">
            {locale === 'zh'
              ? 'DLC 扩展包 MLC content/0010 文件夹'
              : 'DLC expansion MLC content/0010 directory'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="E:\Botw_Dump\MLC\usr\title\0005000c\101c9300\content\0010"
            value={data.dlcDir}
            onChange={(e) => onChange('dlcDir', e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() =>
              onBrowse(
                'dlcDir',
                locale === 'zh'
                  ? '选择 Wii U DLC content 目录'
                  : 'Select Wii U DLC content Directory',
              )
            }
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <label>
          <span>{t('settings.wiiuExportDir')} (export_dir)</span>
          <span className="field-desc">
            {locale === 'zh'
              ? '用于导出和加载生成的模组补丁包'
              : 'Target directory for exporting generated mod pack'}
          </span>
        </label>
        <div className="path-input-group">
          <input
            type="text"
            placeholder="C:\Users\xxxx\Documents\EventEditor\Wiiu"
            value={data.exportDir}
            onChange={(e) => onChange('exportDir', e.target.value)}
          />
          <button
            type="button"
            className="browse-btn"
            onClick={() =>
              onBrowse(
                'exportDir',
                locale === 'zh' ? '选择模组导出路径' : 'Select Mod Export Directory',
              )
            }
          >
            <Folder size={14} /> {t('common.browse')}
          </button>
        </div>
      </div>
    </div>
  );
}
