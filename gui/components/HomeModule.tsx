'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useHardware } from '@/lib/HardwareContext';
import { runLiteClean, runPreset } from '@/lib/api';
import {
  ShieldCheck,
  Sparkles,
  Trash2,
  Cpu,
  Gamepad2,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Laptop,
  Monitor,
  BatteryCharging,
  Zap,
  Loader2,
  Layers,
} from 'lucide-react';

interface HomeModuleProps {
  onNavigate?: (tab: 'home' | 'dashboard' | 'presets' | 'clean' | 'gamer' | 'system' | 'external' | 'docs' | 'settings') => void;
}

export default function HomeModule({ onNavigate }: HomeModuleProps) {
  const { t } = useLanguage();
  const { diagnostics, audit, loadingAudit, refreshAudit } = useHardware();
  const [cleaningQuick, setCleaningQuick] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const isLaptop = diagnostics?.deviceType === 'Laptop';
  const score = audit?.optimizationScore ?? 72;

  const auditItems = [
    { key: 'timer05msActive', label: t('home_audit_timer'), active: !!audit?.timer05msActive, tab: 'gamer' as const },
    { key: 'ultimatePowerActive', label: t('home_audit_power'), active: !!audit?.ultimatePowerActive, tab: 'gamer' as const },
    { key: 'telemetryDisabled', label: t('home_audit_telemetry'), active: !!audit?.telemetryDisabled, tab: 'system' as const },
    { key: 'hibernationDisabled', label: t('home_audit_hibernation'), active: !!audit?.hibernationDisabled, tab: 'clean' as const },
    { key: 'mousePrecisionActive', label: t('home_audit_mouse'), active: !!audit?.mousePrecisionActive, tab: 'gamer' as const },
    { key: 'fsoDisabled', label: t('home_audit_fso'), active: !!audit?.fsoDisabled, tab: 'gamer' as const },
    { key: 'vbsDisabled', label: t('home_audit_vbs'), active: !!audit?.vbsDisabled, tab: 'gamer' as const },
    { key: 'classicContextMenu', label: t('home_audit_classic_menu'), active: !!audit?.classicContextMenu, tab: 'system' as const },
    { key: 'showFileExtensions', label: t('home_audit_file_ext'), active: !!audit?.showFileExtensions, tab: 'system' as const },
    { key: 'showHiddenFiles', label: t('home_audit_hidden_files'), active: !!audit?.showHiddenFiles, tab: 'system' as const },
    { key: 'bingSearchDisabled', label: t('home_audit_bing'), active: !!audit?.bingSearchDisabled, tab: 'system' as const },
  ];

  const activeTweaksCount = auditItems.filter((i) => i.active).length;

  const handleQuickClean = async () => {
    setCleaningQuick(true);
    setActionToast(null);
    try {
      const res = await runLiteClean();
      setActionToast(res.message);
      await refreshAudit();
    } catch (err: any) {
      setActionToast(err?.message || 'Error');
    } finally {
      setCleaningQuick(false);
    }
  };

  const handleRecommendedPreset = async () => {
    setApplyingPreset(true);
    setActionToast(null);
    try {
      const targetPreset = isLaptop ? 'notebook' : 'essential';
      const res = await runPreset(targetPreset);
      setActionToast(res.message);
      await refreshAudit();
    } catch (err: any) {
      setActionToast(err?.message || 'Error');
    } finally {
      setApplyingPreset(false);
    }
  };

  const scoreColor =
    score >= 80 ? 'text-emerald-400' : score >= 55 ? 'text-cyan-400' : 'text-amber-400';
  const scoreRingColor =
    score >= 80 ? 'border-emerald-500/40 bg-emerald-500/10' : score >= 55 ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-amber-500/40 bg-amber-500/10';
  const scoreStatusText =
    score >= 80 ? t('home_score_excellent') : score >= 55 ? t('home_score_good') : t('home_score_needs_attention');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Command Center Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800/90 backdrop-blur-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Official Hero Logo + Title & Device Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border border-neutral-700/80 shadow-xl shrink-0 bg-neutral-950">
              <img
                src="/assets/branding/logo-original.jpg"
                alt="System Optimizer Tool V5.0"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {t('home_badge')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {isLaptop ? <Laptop className="w-3 h-3 text-amber-400" /> : <Monitor className="w-3 h-3 text-cyan-400" />}
                  {t('home_device_detected')}: {isLaptop ? t('home_device_laptop') : t('home_device_desktop')}
                </span>
                {isLaptop && diagnostics?.battery && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <BatteryCharging className="w-3 h-3" />
                    {diagnostics.battery.chargePercent}% • {t('dash_battery_health')} {diagnostics.battery.healthPercent}%
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-100 tracking-tight">
                {t('home_title')}
              </h1>
              <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                {t('home_subtitle')}
              </p>
            </div>
          </div>

          {/* Right: Optimization Score Gauge + Rescan Button */}
          <div className="flex items-center gap-4 self-start lg:self-center shrink-0">
            <div className={`px-4 py-3 rounded-2xl border ${scoreRingColor} flex items-center gap-3.5`}>
              <div className="text-center">
                <span className={`text-2xl font-black ${scoreColor}`}>
                  {loadingAudit && !audit ? '...' : `${score}%`}
                </span>
                <span className="block text-[9px] uppercase font-bold tracking-wider text-neutral-400">
                  {t('home_score_label')}
                </span>
              </div>
              <div className="border-l border-neutral-800 pl-3 max-w-[140px]">
                <span className={`text-xs font-bold block ${scoreColor}`}>
                  {scoreStatusText}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {activeTweaksCount} {t('home_tweaks_of')} {auditItems.length} {t('home_status_active')}
                </span>
              </div>
            </div>

            <button
              onClick={() => refreshAudit()}
              disabled={loadingAudit}
              className="px-3.5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
              title={t('home_rescan')}
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${loadingAudit ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('home_rescan')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {actionToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="text-[11px] underline opacity-80 hover:opacity-100">
            OK
          </button>
        </div>
      )}

      {/* 3 Primary Checkup Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Junk Scanner */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-orange-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-orange-400">
                {audit
                  ? audit.estimatedJunkMb >= 1024
                    ? `${(audit.estimatedJunkGb ?? audit.estimatedJunkMb / 1024).toFixed(2)} GB`
                    : `${audit.estimatedJunkMb.toFixed(0)} MB`
                  : '...'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-neutral-100">{t('home_junk_title')}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">{t('home_junk_desc')}</p>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={handleQuickClean}
              disabled={cleaningQuick}
              className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-orange-600/20"
            >
              {cleaningQuick ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{t('home_junk_clean_now')}</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('clean')}
                className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Active Tweaks & Smart Device Recommendation */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-blue-400">
                {activeTweaksCount} / {auditItems.length}
              </span>
            </div>
            <h3 className="text-sm font-bold text-neutral-100">{t('home_tweaks_title')}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">{t('home_tweaks_desc')}</p>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={handleRecommendedPreset}
              disabled={applyingPreset}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-600/20"
            >
              {applyingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>
                {isLaptop ? t('preset_notebook_title') : t('preset_essential_title')}
              </span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('presets')}
                className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Startup Apps Count */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-emerald-400">
                {audit ? audit.startupAppsCount : '...'} Apps
              </span>
            </div>
            <h3 className="text-sm font-bold text-neutral-100">{t('home_startup_title')}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">{t('home_startup_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => onNavigate && onNavigate('system')}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('home_startup_manage')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time System Registry & Optimization X-Ray Matrix */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              {t('home_audit_matrix_title')}
            </h2>
            <p className="text-[11px] text-neutral-400">{t('home_audit_matrix_sub')}</p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
            {diagnostics?.operatingSystem?.caption || 'Windows 10/11'} • Build {diagnostics?.operatingSystem?.buildNumber || '26100'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {auditItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate && onNavigate(item.tab)}
              className="p-3 rounded-xl bg-neutral-950/70 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {item.active ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0" />
                )}
                <span className="text-xs font-medium text-neutral-200 truncate group-hover:text-white">
                  {item.label}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                  item.active
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {item.active ? t('home_status_active') : t('home_status_inactive')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      {onNavigate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-blue-500/40 flex items-center gap-3 transition-all text-left"
          >
            <Cpu className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-neutral-100 block">{t('nav_dashboard')}</span>
              <span className="text-[10px] text-neutral-400">{diagnostics?.cpu?.name?.slice(0, 24) || 'Hardware'}</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('gamer')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-emerald-500/40 flex items-center gap-3 transition-all text-left"
          >
            <Gamepad2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-neutral-100 block">{t('nav_gamer')}</span>
              <span className="text-[10px] text-neutral-400">0.5ms • Process Freezer</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('system')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-cyan-500/40 flex items-center gap-3 transition-all text-left"
          >
            <Settings className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-neutral-100 block">{t('nav_system')}</span>
              <span className="text-[10px] text-neutral-400">Checklist • Startup</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('docs')}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800/80 hover:border-purple-500/40 flex items-center gap-3 transition-all text-left"
          >
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-neutral-100 block">{t('nav_docs')}</span>
              <span className="text-[10px] text-neutral-400">Wiki • V5.0</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
