'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage, AVAILABLE_LANGUAGES } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import { checkAdmin, restartAsAdmin } from '@/lib/api';
import {
  Settings,
  Sun,
  Moon,
  Zap,
  Globe,
  Shield,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsModule() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme, performanceMode, setPerformanceMode } = useSettings();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    checkAdmin().then(setIsAdmin);
  }, []);

  const handleRestartElevated = async () => {
    setRestarting(true);
    try {
      await restartAsAdmin();
    } catch {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-neutral-300" />
          <h2 className="text-lg font-bold text-neutral-100">{t('settings_title')}</h2>
        </div>
        <p className="text-xs text-neutral-400">{t('settings_subtitle')}</p>
      </div>

      {/* Card 1: Theme Mode (Dark / Light) */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-100">{t('settings_theme_title')}</h3>
            <p className="text-[11px] text-neutral-400">{t('settings_theme_desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-zinc-800 text-white border-sky-500 shadow-md ring-1 ring-sky-500/30'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Moon className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold">{t('settings_theme_dark')}</span>
            </div>
            {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-sky-600 text-white border-sky-600 shadow-md font-bold'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-amber-200' : 'text-amber-400'}`} />
              <span className="text-xs font-semibold">{t('settings_theme_light')}</span>
            </div>
            {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Card 2: Performance Mode (Low-End PC / 0% GPU) */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-100">{t('settings_perf_title')}</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5 max-w-xl">
              {t('settings_perf_desc')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setPerformanceMode(!performanceMode)}
          className={`px-4 py-2 rounded-xl font-semibold text-xs shrink-0 border transition-all flex items-center gap-2 ${
            performanceMode
              ? 'bg-neutral-800 text-emerald-400 border-neutral-600 shadow-sm'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-neutral-300" />
          <span>{performanceMode ? t('settings_perf_on') : t('settings_perf_off')}</span>
        </button>
      </div>

      {/* Card 3: Interface Language (Português & English only) */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-100">{t('settings_lang_title')}</h3>
            <p className="text-[11px] text-neutral-400">{t('settings_lang_desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {AVAILABLE_LANGUAGES.map((item) => (
            <button
              key={item.code}
              onClick={() => setLanguage(item.code)}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                language === item.code
                  ? theme === 'light'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md font-bold'
                    : 'bg-zinc-800 text-white border-sky-500 shadow-md ring-1 ring-sky-500/30'
                  : theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{item.flag}</span>
                <span>{item.label}</span>
              </span>
              {language === item.code && (
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-white' : 'text-sky-400'}`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Card 4: Administrator Privileges */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
            {isAdmin ? <Shield className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-100">{t('settings_admin_title')}</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5 max-w-xl">{t('settings_admin_desc')}</p>
          </div>
        </div>

        {isAdmin ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('titlebar_admin_badge')}
          </span>
        ) : (
          <button
            onClick={handleRestartElevated}
            disabled={restarting}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-semibold text-xs flex items-center gap-2 shrink-0 transition-all"
          >
            {restarting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
            <span>{t('titlebar_restart_admin')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
