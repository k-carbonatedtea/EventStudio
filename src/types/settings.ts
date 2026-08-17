// 游戏支持的平台类型
export type PlatformType = 'wiiu' | 'switch';

// Wii U 平台路径配置
export interface WiiUPathSettings {
  gameDir: string;     // 游戏本体 content 目录 (Base Game)
  updateDir: string;   // 游戏补丁 content 目录 (Update v1.5.0/v1.6.0)
  dlcDir: string;      // 游戏 DLC content 目录 (DLC 0010)
  exportDir: string;   // 模组导出路径
}

// Switch (NX) 平台路径配置
export interface SwitchPathSettings {
  gameDir: string;     // Switch RomFS 根目录 (Base/Update RomFS)
  dlcDir: string;      // Switch DLC RomFS 根目录
  exportDir: string;   // Switch 模组导出路径 (Atmosphere LayeredFS)
}

// 全局游戏与编辑器设置接口
export interface GamePathSettings {
  currentPlatform: PlatformType; // 当前生效的主平台
  language: string;              // 语言包代码 (如 CNzh, TWzh, JPja, USen 等)
  wiiu: WiiUPathSettings;        // Wii U 平台路径
  switch: SwitchPathSettings;    // Switch 平台路径
  customAiDumpDir?: string;      // 自定义 AI 解包数据目录
}

// 默认设置
export const DEFAULT_SETTINGS: GamePathSettings = {
  currentPlatform: 'switch',
  language: 'USen',
  customAiDumpDir: '',
  wiiu: {
    gameDir: '',
    updateDir: '',
    dlcDir: '',
    exportDir: '',
  },
  switch: {
    gameDir: '',
    dlcDir: '',
    exportDir: '',
  },
};

// 预设语言包列表
export const SUPPORTED_LANGUAGES = [
  { code: 'CNzh', label: '简体中文 (CNzh)' },
  { code: 'TWzh', label: '繁體中文 (TWzh)' },
  { code: 'JPja', label: '日本語 (JPja)' },
  { code: 'USen', label: 'English (US)' },
  { code: 'EUen', label: 'English (EU)' },
  { code: 'EUde', label: 'Deutsch (EUde)' },
  { code: 'EUfr', label: 'Français (EUfr)' },
  { code: 'USfr', label: 'Français (USfr)' },
  { code: 'EUes', label: 'Español (EUes)' },
  { code: 'USes', label: 'Español (USes)' },
  { code: 'EUit', label: 'Italiano (EUit)' },
  { code: 'EUnl', label: 'Nederlands (EUnl)' },
  { code: 'EUru', label: 'Русский (EUru)' },
];
