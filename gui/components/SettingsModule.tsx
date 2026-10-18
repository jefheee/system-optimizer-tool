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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">{t('settings_title')}</h2>
        </div>
        <p className="text-xs text-neutral-400">{t('settings_subtitle')}</p>
      </div>

      {/* Card 1: Theme Mode (Dark / Light) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('settings_theme_title')}</h3>
            <p className="text-xs text-neutral-400">{t('settings_theme_desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
              theme === 'dark'
                ? 'bg-blue-600/15 border-blue-500 text-neutral-100'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold">{t('settings_theme_dark')}</span>
            </div>
            {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
              theme === 'light'
                ? 'bg-blue-600/15 border-blue-500 text-neutral-100'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold">{t('settings_theme_light')}</span>
            </div>
            {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* Card 2: Performance Mode (Low-End PC / 0% GPU) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('settings_perf_title')}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mt-0.5 max-w-xl">
              {t('settings_perf_desc')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setPerformanceMode(!performanceMode)}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 border transition-all flex items-center gap-2 ${
            performanceMode
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{performanceMode ? t('settings_perf_on') : t('settings_perf_off')}</span>
        </button>
      </div>

      {/* Card 3: Interface Language */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('settings_lang_title')}</h3>
            <p className="text-xs text-neutral-400">{t('settings_lang_desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                language === lang.code
                  ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </span>
              {language === lang.code && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Card 4: Administrator Privileges */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              isAdmin
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            {isAdmin ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('settings_admin_title')}</h3>
            <p className="text-xs text-neutral-400 mt-0.5 max-w-xl">{t('settings_admin_desc')}</p>
          </div>
        </div>

        {isAdmin ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Shield className="w-4 h-4" />
            {t('titlebar_admin_badge')}
          </span>
        ) : (
          <button
            onClick={handleRestartElevated}
            disabled={restarting}
            className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-2 shrink-0 transition-all"
          >
            {restarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            <span>{t('titlebar_restart_admin')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
