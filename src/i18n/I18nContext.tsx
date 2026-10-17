import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './en';
import { ar } from './ar';

export type Locale = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

type TranslationType = typeof en;

interface I18nContextType {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  t: (keyPath: string, fallback?: string) => string;
  dictionary: TranslationType;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('flowcrm_locale');
    if (saved === 'ar' || saved === 'en') return saved;
    // Check browser language
    if (typeof navigator !== 'undefined' && navigator.language.startsWith('ar')) {
      return 'ar';
    }
    return 'en';
  });

  const direction: Direction = locale === 'ar' ? 'rtl' : 'ltr';
  const dictionary = locale === 'ar' ? ar : en;

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('flowcrm_locale', newLocale);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    if (locale === 'ar') {
      document.documentElement.classList.add('font-arabic');
    } else {
      document.documentElement.classList.remove('font-arabic');
    }
  }, [locale, direction]);

  const t = (keyPath: string, fallback?: string): string => {
    const keys = keyPath.split('.');
    let current: unknown = dictionary;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return fallback || keyPath;
      }
    }

    if (typeof current === 'string') {
      return current;
    }

    return fallback || keyPath;
  };

  return (
    <I18nContext.Provider value={{ locale, direction, setLocale, t, dictionary }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
