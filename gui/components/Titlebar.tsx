'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { AVAILABLE_LANGUAGES, Language } from '@/lib/LanguageContext';
import { checkAdmin, restartAsAdmin, minimizeWindow, toggleMaximizeWindow, closeWindow } from '@/lib/api';
import { Shield, ShieldAlert, RefreshCw, ChevronDown, Minus, Square, X } from 'lucide-react';

export default function Titlebar() {
  const { language, setLanguage, t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    checkAdmin().then((elevated) => setIsAdmin(elevated));
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

  const currentLangObj = AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <header
      data-tauri-drag-region
      className="h-10 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 flex items-center justify-between px-3 select-none z-50 sticky top-0"
    >
      {/* Brand & Logo */}
      <div data-tauri-drag-region className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/30">
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="flex items-center gap-1.5 pointer-events-none">
          <span className="text-xs font-semibold tracking-wide text-neutral-200">
            {t('titlebar_title')}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {t('titlebar_version')}
          </span>
        </div>
      </div>

      {/* Middle Drag Region */}
      <div data-tauri-drag-region className="flex-1 h-full mx-4" />

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Admin Status Badge */}
        {isAdmin !== null && (
          <div className="flex items-center">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3 h-3" />
                {t('titlebar_admin_badge')}
              </span>
            ) : (
              <button
                onClick={handleRestartAdmin}
                disabled={isRestarting}
                title={t('titlebar_restart_admin')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
              >
                {isRestarting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldAlert className="w-3 h-3" />
                )}
                <span>{t('titlebar_user_badge')} • {t('titlebar_restart_admin')}</span>
              </button>
            )}
          </div>
        )}

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition-colors"
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
              <div className="absolute right-0 mt-1 w-36 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 z-50 overflow-hidden">
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                      language === lang.code
                        ? 'bg-blue-600/20 text-blue-400 font-semibold'
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
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

        {/* Window Action Controls */}
        <div className="flex items-center ml-1 border-l border-neutral-800/80 pl-1">
          <button
            onClick={minimizeWindow}
            title={t('titlebar_minimize')}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80 rounded transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMaximizeWindow}
            title={t('titlebar_maximize')}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80 rounded transition-colors"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={closeWindow}
            title={t('titlebar_close')}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-red-600 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
