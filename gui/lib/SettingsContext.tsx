'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

interface SettingsContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  performanceMode: boolean;
  setPerformanceMode: (enabled: boolean) => void;
  clearLocalCache: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  performanceMode: false,
  setPerformanceMode: () => {},
  clearLocalCache: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [performanceMode, setPerformanceModeState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('system_optimizer_theme') as ThemeMode;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
      const savedPerf = localStorage.getItem('system_optimizer_perf_mode');
      if (savedPerf === 'true') {
        setPerformanceModeState(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
    } else {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (performanceMode) {
      root.classList.add('performance-mode');
    } else {
      root.classList.remove('performance-mode');
    }
  }, [performanceMode]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('system_optimizer_theme', newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setPerformanceMode = (enabled: boolean) => {
    setPerformanceModeState(enabled);
    try {
      localStorage.setItem('system_optimizer_perf_mode', String(enabled));
    } catch {}
  };

  const clearLocalCache = () => {
    try {
      localStorage.removeItem('system_optimizer_diag_cache');
      localStorage.removeItem('system_optimizer_audit_cache');
    } catch {}
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        performanceMode,
        setPerformanceMode,
        clearLocalCache,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
