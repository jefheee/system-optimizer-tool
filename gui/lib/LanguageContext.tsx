'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { DICTIONARY, Language } from './i18n';

export type { Language } from './i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'PT',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const AVAILABLE_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'PT', label: 'Português', flag: '🇧🇷' },
  { code: 'EN', label: 'English', flag: '🇺🇸' },
  { code: 'ES', label: 'Español', flag: '🇪🇸' },
  { code: 'FR', label: 'Français', flag: '🇫🇷' },
  { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'RU', label: 'Русский', flag: '🇷🇺' },
  { code: 'CN', label: '中文', flag: '🇨🇳' },
];

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

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('system_optimizer_lang', lang);
    } catch {}
  };

  const t = useMemo(() => {
    return (key: string, fallback?: string): string => {
      const dict = DICTIONARY[language] || DICTIONARY.PT;
      return dict[key] || DICTIONARY.EN[key] || fallback || key;
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
