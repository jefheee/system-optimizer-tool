'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage, AVAILABLE_LANGUAGES } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import { checkAdmin, restartAsAdmin, minimizeWindow, toggleMaximizeWindow, closeWindow } from '@/lib/api';
import { Shield, ShieldAlert, RefreshCw, ChevronDown, Minus, Square, X } from 'lucide-react';

export default function Titlebar() {
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useSettings();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    checkAdmin().then((elevated) => setIsAdmin(elevated));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unlistenFn: (() => void) | undefined;

    const setupWindowListener = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const max = await win.isMaximized();
        if (isMounted) setIsMaximized(max);

        const unlisten = await win.onResized(async () => {
          const currentMax = await win.isMaximized();
          if (isMounted) setIsMaximized(currentMax);
        });
        unlistenFn = unlisten;
      } catch {}
    };

    setupWindowListener();

    return () => {
      isMounted = false;
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const handleRestartAdmin = async () => {
    setIsRestarting(true);
    try {
      await restartAsAdmin();
    } catch (e) {
      console.error(e);
      setIsRestarting(false);
    }
  };

  const handleToggleMaximize = async () => {
    await toggleMaximizeWindow();
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const max = await getCurrentWindow().isMaximized();
      setIsMaximized(max);
    } catch {}
  };

  const currentLangObj = AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];
  const logoSrc = theme === 'light'
    ? '/assets/branding/logo-primary-white-bg.jpg'
    : '/assets/branding/logo-transparent.png';

  return (
    <header
      data-tauri-drag-region
      className={`h-10 border-b flex items-center justify-between px-3 select-none z-50 sticky top-0 transition-colors ${
        theme === 'light'
          ? 'bg-white/95 border-slate-200 text-slate-800'
          : 'bg-neutral-950/90 border-neutral-800/80 text-neutral-200'
      }`}
    >
      {/* Brand & App Title */}
      <div data-tauri-drag-region className="flex items-center gap-2.5">
        <div className={`w-5 h-5 rounded overflow-hidden flex items-center justify-center border shrink-0 ${
          theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-700/60 bg-neutral-900'
        }`}>
          <img
            src={logoSrc}
            alt="System Optimizer Tool"
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
        <div className="flex items-center pointer-events-none">
          <span className={`text-xs font-semibold tracking-wide ${theme === 'light' ? 'text-slate-800' : 'text-neutral-200'}`}>
            System Optimizer Tool
          </span>
        </div>
      </div>

      {/* Middle Drag Region */}
      <div data-tauri-drag-region className="flex-1 h-full mx-4" />

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Admin Elevation Status */}
        {isAdmin !== null && (
          <div className="flex items-center">
            {isAdmin ? (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide ${
                theme === 'light' ? 'text-slate-500 bg-slate-100' : 'text-neutral-400 bg-neutral-900/60'
              }`}>
                <Shield className="w-3 h-3 text-emerald-500" />
                <span>{t('titlebar_admin_badge')}</span>
              </span>
            ) : (
              <button
                onClick={handleRestartAdmin}
                disabled={isRestarting}
                title={t('titlebar_restart_admin')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/70'
                }`}
              >
                {isRestarting ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-neutral-400" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                )}
                <span>{t('titlebar_restart_admin')}</span>
              </button>
            )}
          </div>
        )}

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              theme === 'light'
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
            }`}
          >
            <span>{currentLangObj.flag}</span>
            <span className="text-[11px] font-medium">{currentLangObj.code}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {langMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangMenuOpen(false)}
              />
              <div className={`absolute right-0 mt-1 w-36 rounded-lg shadow-xl py-1 z-50 overflow-hidden border ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-200'
              }`}>
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                      language === lang.code
                        ? theme === 'light' ? 'bg-blue-50 text-blue-600 font-semibold' : 'bg-blue-600/20 text-blue-400 font-semibold'
                        : theme === 'light' ? 'text-slate-700 hover:bg-slate-100' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Window Controls (Minimize, Maximize / Restore, Close) */}
        <div className={`flex items-center ml-1 border-l pl-1 ${
          theme === 'light' ? 'border-slate-200' : 'border-neutral-800/80'
        }`}>
          <button
            onClick={minimizeWindow}
            title={t('titlebar_minimize')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              theme === 'light'
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleMaximize}
            title={isMaximized ? t('titlebar_restore', 'Restaurar') : t('titlebar_maximize', 'Maximizar')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              theme === 'light'
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80'
            }`}
          >
            {isMaximized ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                <rect x="1.5" y="4.5" width="9" height="9" rx="0.5" />
                <path d="M4.5 4.5V2.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2" />
              </svg>
            ) : (
              <Square className="w-3.5 h-3.5" strokeWidth={1.3} />
            )}
          </button>
          <button
            onClick={closeWindow}
            title={t('titlebar_close')}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              theme === 'light'
                ? 'text-slate-600 hover:text-white hover:bg-red-600'
                : 'text-neutral-400 hover:text-white hover:bg-red-600'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
