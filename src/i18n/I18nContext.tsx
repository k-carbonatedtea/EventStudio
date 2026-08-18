import React, { createContext, useContext, useState, useMemo } from 'react';
import { Locale, TranslationSchema } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => any;
  dict: TranslationSchema;
}

const dictionaries: Record<Locale, TranslationSchema> = {
  zh,
  en,
};

const I18nContext = createContext<I18nContextType | null>(null);

/**
 * 获取本地存储的语言偏好，默认英文 (US)
 */
export const getStoredLocale = (): Locale => {
  try {
    const saved = localStorage.getItem('ui_lang');
    if (saved === 'en' || saved === 'zh') {
      return saved;
    }
  } catch (e) {
    console.error('Failed to read ui_lang from localStorage', e);
  }
  return 'en';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale());

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('ui_lang', newLocale);
    } catch (e) {
      console.error('Failed to save ui_lang to localStorage', e);
    }
  };

  const dict = useMemo(() => dictionaries[locale] || dictionaries.en, [locale]);

  /**
   * 翻译函数，支持点号嵌套路径与参数插值
   * 例如: t('subHeader.stepInfo', { current: 1, total: 5 })
   */
  const t = (path: string, params?: Record<string, string | number>): any => {
    const keys = path.split('.');
    let current: any = dict;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // 如果当前语言字典未找到，尝试从回退英文查找
        let fallback: any = dictionaries.en || dictionaries.zh;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    // 字符串插值替换
    if (typeof current === 'string' && params) {
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, current);
    }

    return current ?? path;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dict }}>{children}</I18nContext.Provider>
  );
};

/**
 * 方便组件调用的 Hook
 */
export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};

export default I18nProvider;
