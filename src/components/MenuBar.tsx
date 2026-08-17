import { useState, useRef, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from '../i18n';

interface MenuBarProps {
  onNew?: () => void;
  onOpen?: () => void;
  onOpenModFolder?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onRename?: () => void;
  onOpenSettings?: () => void;
  onOpenSettingsDir?: () => void;
  onOpenProjectDir?: () => void;
  onOpenAbout?: () => void;
  onOpenHelp?: () => void;
  onExportActorDefs?: () => void;
  expandAllParams?: boolean;
  onToggleExpandParams?: () => void;
  showFlowAnimation?: boolean;
  onToggleFlowAnimation?: () => void;
  onReloadGraph?: () => void;
  modFolderPath?: string | null;
  filePath?: string | null;
  evflData?: any;
  currentPlatform?: 'wiiu' | 'switch';
}

// 统一顶部原生风格菜单栏
export default function MenuBar({
  onNew,
  onOpen,
  onOpenModFolder,
  onSave,
  onSaveAs,
  onRename,
  onOpenSettings,
  onOpenSettingsDir,
  onOpenProjectDir,
  onOpenAbout,
  onOpenHelp,
  onExportActorDefs,
  expandAllParams = false,
  onToggleExpandParams,
  showFlowAnimation = true,
  onToggleFlowAnimation,
  onReloadGraph,
  modFolderPath,
  filePath,
  evflData,
  currentPlatform = 'switch',
}: MenuBarProps = {}) {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 计算当前运行模式
  const modeInfo = (() => {
    // 0. 未打开任何文件且未加载 Mod 目录
    if (!modFolderPath && !filePath && !evflData) {
      return {
        name: t('status.ready'),
        type: 'ready',
      };
    }

    // 1. 检查打开的 Mod 目录或封包
    if (modFolderPath) {
      const lowerMod = modFolderPath.toLowerCase();
      const isPack = lowerMod.endsWith('.sbeventpack') || lowerMod.endsWith('.pack') || lowerMod.endsWith('.sarc');
      if (isPack) {
        const isWiiu = lowerMod.includes('wiiu') || lowerMod.includes('cemu') || lowerMod.includes('content') || currentPlatform === 'wiiu';
        return {
          name: isWiiu ? t('status.wiiuPackMode') : t('status.switchPackMode'),
          type: isWiiu ? 'wiiu-pack' : 'switch-pack',
        };
      }
      if (lowerMod.includes('wiiu') || lowerMod.includes('cemu') || lowerMod.includes('mlc01')) {
        return { name: t('status.wiiuModMode'), type: 'wiiu' };
      }
      if (lowerMod.includes('switch') || lowerMod.includes('atmosphere') || lowerMod.includes('romfs') || lowerMod.includes('01007ef')) {
        return { name: t('status.switchModMode'), type: 'switch' };
      }
      return {
        name: currentPlatform === 'wiiu' ? t('status.wiiuModMode') : t('status.switchModMode'),
        type: currentPlatform === 'wiiu' ? 'wiiu' : 'switch',
      };
    }

    // 2. 检查单文件
    if (filePath) {
      const lowerFile = filePath.toLowerCase();
      if (lowerFile.endsWith('.sbeventpack') || lowerFile.endsWith('.pack') || lowerFile.endsWith('.sarc')) {
        const isWiiu = lowerFile.includes('wiiu') || lowerFile.includes('cemu') || lowerFile.includes('content') || currentPlatform === 'wiiu';
        return {
          name: isWiiu ? t('status.wiiuPackMode') : t('status.switchPackMode'),
          type: isWiiu ? 'wiiu-pack' : 'switch-pack',
        };
      }
      if (lowerFile.endsWith('.bfevfl')) {
        return { name: t('status.bfevflMode'), type: 'bfevfl' };
      }
      if (lowerFile.endsWith('.msbt')) {
        return { name: t('status.msbtMode'), type: 'other' };
      }
      if (lowerFile.endsWith('.yml') || lowerFile.endsWith('.yaml') || lowerFile.endsWith('.aamp') || lowerFile.endsWith('.byml')) {
        return { name: t('status.yamlMode'), type: 'other' };
      }
    }

    if (evflData) {
      return { name: t('status.bfevflMode'), type: 'bfevfl' };
    }

    return {
      name: t('status.ready'),
      type: 'ready',
    };
  })();

  // 监听外部点击自动收起下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleWindowBlur = () => {
      setActiveMenu(null);
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMouseEnter = (menu: string) => {
    if (activeMenu) {
      setActiveMenu(menu);
    }
  };

  const handleItemClick = (action?: () => void) => {
    setActiveMenu(null);
    if (action) action();
  };

  return (
    <div className="native-menu-bar" ref={menuRef}>
      <div className="menu-bar-left">
        {/* 文件菜单 */}
        <div className="menu-bar-item-container" onMouseEnter={() => handleMouseEnter('file')}>
          <div className={`menu-bar-item ${activeMenu === 'file' ? 'active' : ''}`} onClick={() => handleMenuClick('file')}>
            {t('menu.file')}
          </div>
          {activeMenu === 'file' && (
            <div className="menu-dropdown">
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onNew)}>
                <span>{t('menu.new')}</span>
                <span className="menu-shortcut">Ctrl+N</span>
              </div>
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpen)}>
                <span>{t('menu.openFile')}</span>
                <span className="menu-shortcut">Ctrl+O</span>
              </div>
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpenModFolder)}>
                <span>{t('menu.openModFolder')}</span>
              </div>
              <div className="menu-separator"></div>

              <div className="menu-dropdown-item" onClick={() => handleItemClick(onSave)}>
                <span>{t('menu.save')}</span>
                <span className="menu-shortcut">Ctrl+S</span>
              </div>
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onSaveAs)}>
                <span>{t('menu.saveAs')}</span>
                <span className="menu-shortcut">Ctrl+Shift+S</span>
              </div>
              {evflData && onExportActorDefs && (
                <div className="menu-dropdown-item" onClick={() => handleItemClick(onExportActorDefs)}>
                  <span>{t('autofill.exportDefs')}</span>
                </div>
              )}
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onRename)}>
                <span>{t('menu.renameFlowchart')}</span>
              </div>
              <div className="menu-separator"></div>

              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpenProjectDir)}>
                <span>{t('menu.openProjectDir')}</span>
              </div>
              <div className="menu-separator"></div>

              <div className="menu-dropdown-item" onClick={() => handleItemClick(() => getCurrentWindow().close())}>
                <span>{t('common.close')}</span>
              </div>
            </div>
          )}
        </div>

        {/* 流程图菜单 */}
        <div className="menu-bar-item-container" onMouseEnter={() => handleMouseEnter('flowchart')}>
          <div className={`menu-bar-item ${activeMenu === 'flowchart' ? 'active' : ''}`} onClick={() => handleMenuClick('flowchart')}>
            {t('menu.flowchart')}
          </div>
          {activeMenu === 'flowchart' && (
            <div className="menu-dropdown">
              <div
                className={`menu-dropdown-item ${expandAllParams ? 'has-check' : ''}`}
                onClick={() => handleItemClick(onToggleExpandParams)}
              >
                {expandAllParams && <span className="menu-check">✓</span>}
                <span>{expandAllParams ? t('menu.collapseParams') : t('menu.expandParams')}</span>
              </div>
              <div
                className={`menu-dropdown-item ${showFlowAnimation ? 'has-check' : ''}`}
                onClick={() => handleItemClick(onToggleFlowAnimation)}
              >
                {showFlowAnimation && <span className="menu-check">✓</span>}
                <span>{showFlowAnimation ? t('menu.hideFlowAnimation') : t('menu.showFlowAnimation')}</span>
              </div>
              <div className="menu-separator"></div>
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onReloadGraph)}>
                <span>{t('menu.autoLayout')}</span>
                <span className="menu-shortcut">Ctrl+Shift+R</span>
              </div>
            </div>
          )}
        </div>

        {/* 帮助菜单 */}
        <div className="menu-bar-item-container" onMouseEnter={() => handleMouseEnter('help')}>
          <div className={`menu-bar-item ${activeMenu === 'help' ? 'active' : ''}`} onClick={() => handleMenuClick('help')}>
            {t('menu.help')}
          </div>
          {activeMenu === 'help' && (
            <div className="menu-dropdown">
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpenHelp)}>
                <span>{t('menu.userGuide')}</span>
                <span className="menu-shortcut">F1</span>
              </div>
              <div className="menu-separator"></div>
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpenAbout)}>
                <span>{t('menu.about')}</span>
              </div>
            </div>
          )}
        </div>

        {/* 设置菜单 */}
        <div className="menu-bar-item-container" onMouseEnter={() => handleMouseEnter('settings')}>
          <div className={`menu-bar-item ${activeMenu === 'settings' ? 'active' : ''}`} onClick={() => handleMenuClick('settings')}>
            {t('menu.settings')}
          </div>
          {activeMenu === 'settings' && (
            <div className="menu-dropdown">
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpenSettings)}>
                <span>{t('menu.preferences')}</span>
              </div>
              <div className="menu-dropdown-item" onClick={() => handleItemClick(onOpenSettingsDir)}>
                <span>{t('menu.openSettingsDir')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧运行模式识别标识 */}
      <div className="menu-bar-right">
        <div className={`editor-mode-badge mode-${modeInfo.type}`} title={`Mode: ${modeInfo.name}`}>
          <span className="mode-dot"></span>
          <span className="mode-text">{modeInfo.name}</span>
        </div>
      </div>
    </div>
  );
}
