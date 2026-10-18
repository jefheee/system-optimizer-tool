'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DICTIONARY, Language } from './i18n';

export type { Language } from './i18n';

export type TFunction = (
  key: string,
  fallbackOrVars?: string | Record<string, string | number>,
  maybeVars?: Record<string, string | number>
) => string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFunction;
}

export const AVAILABLE_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'PT', label: 'Português', flag: '🇧🇷' },
  { code: 'EN', label: 'English', flag: '🇺🇸' },
];

const HTML_LANG_MAP: Record<Language, string> = {
  PT: 'pt-BR',
  EN: 'en',
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'PT',
  setLanguage: () => {},
  t: (key: string, fallbackOrVars?: string | Record<string, string | number>) =>
    typeof fallbackOrVars === 'string' ? fallbackOrVars : key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('PT');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('system_optimizer_lang') as Language;
      if (saved && DICTIONARY[saved]) {
        setLanguageState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = HTML_LANG_MAP[language] || 'pt-BR';
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('system_optimizer_lang', lang);
    } catch {}
  }, []);

  const t = useCallback<TFunction>(
    (
      key: string,
      fallbackOrVars?: string | Record<string, string | number>,
      maybeVars?: Record<string, string | number>
    ): string => {
      let fallback: string | undefined;
      let vars: Record<string, string | number> | undefined;

      if (typeof fallbackOrVars === 'string') {
        fallback = fallbackOrVars;
        vars = maybeVars;
      } else if (typeof fallbackOrVars === 'object' && fallbackOrVars !== null) {
        vars = fallbackOrVars;
      }

      const dict = DICTIONARY[language] || DICTIONARY.PT;
      let raw = dict[key];

      // Fallbacks: Portuguese falls back to English; all other languages fall back to English first, then Portuguese
      if (!raw && language !== 'EN') {
        raw = DICTIONARY.EN?.[key];
      }
      if (!raw && language !== 'PT') {
        raw = DICTIONARY.PT?.[key];
      }

      const res = raw || fallback || key;
      if (vars) {
        return res.replace(/\{(\w+)\}/g, (match, name) =>
          name in vars! ? String(vars![name]) : match
        );
      }
      return res;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
