'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import { useHardware } from '@/lib/HardwareContext';
import { runLiteClean, runPreset, createRestorePoint, checkAdmin, toggleTimerResolution, enableUltimatePerformancePlan } from '@/lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Trash2,
  Cpu,
  Gamepad2,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Laptop,
  Monitor,
  BatteryCharging,
  Zap,
  Loader2,
  Clock,
  Wrench,
  ChevronRight,
  HardDrive,
  Layers,
  Activity,
  FileCode,
  CheckSquare,
} from 'lucide-react';
import { Tab } from '@/app/page';

interface HomeModuleProps {
  onNavigate?: (tab: Tab) => void;
}

export default function HomeModule({ onNavigate }: HomeModuleProps) {
  const { t } = useLanguage();
  const { theme } = useSettings();
  const { diagnostics, audit, loadingAudit, refreshAudit } = useHardware();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [restorePointName, setRestorePointName] = useState<string>('System Optimizer Restore Point');
  const [creatingRestore, setCreatingRestore] = useState(false);
  const [cleaningQuick, setCleaningQuick] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [applyingGamer, setApplyingGamer] = useState(false);
  const [actionToast, setActionToast] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    checkAdmin().then(setIsAdmin);
  }, []);

  const isLaptop = diagnostics?.deviceType === 'Laptop';
  const cpu = diagnostics?.cpu;
  const gpu = diagnostics?.gpu;
  const mem = diagnostics?.memory;
  const os = diagnostics?.operatingSystem;
  const primaryDisk = diagnostics?.storage?.[0];

  const roundedRam = mem?.totalGb ? Math.round(mem.totalGb) : 0;

  const handleCreateRestore = async () => {
    setCreatingRestore(true);
    setActionToast(null);
    try {
      const name = restorePointName.trim() || 'System Optimizer Restore Point';
      const res = await createRestorePoint(name);
      setActionToast({ success: res.success, message: res.message });
      refreshAudit();
    } catch (e: any) {
      setActionToast({ success: false, message: e?.message || 'Falha ao criar ponto de restauração.' });
    } finally {
      setCreatingRestore(false);
    }
  };

  const handleQuickClean = async () => {
    setCleaningQuick(true);
    setActionToast(null);
    try {
      const res = await runLiteClean();
      setActionToast({ success: res.success, message: res.message });
      await refreshAudit();
    } catch (err: any) {
      setActionToast({ success: false, message: err?.message || 'Erro ao executar limpeza.' });
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
      setActionToast({ success: res.success, message: res.message });
      await refreshAudit();
    } catch (err: any) {
      setActionToast({ success: false, message: err?.message || 'Erro ao aplicar perfil.' });
    } finally {
      setApplyingPreset(false);
    }
  };

  const handleQuickGamer = async () => {
    setApplyingGamer(true);
    setActionToast(null);
    try {
      await toggleTimerResolution(true);
      const res = await enableUltimatePerformancePlan();
      setActionToast({ success: res.success, message: t('gamer_quick_applied', 'Timer de 0.5ms e Plano Desempenho Máximo ativados!') });
      await refreshAudit();
    } catch (e: any) {
      setActionToast({ success: false, message: e?.message || 'Erro ao otimizar latência.' });
    } finally {
      setApplyingGamer(false);
    }
  };

  const logoSrc = theme === 'light'
    ? '/assets/branding/logo-primary-white-bg.jpg'
    : '/assets/branding/logo-transparent.png';

  const auditItems = [
    { key: 'timer05msActive', label: t('home_audit_timer'), active: !!audit?.timer05msActive, tab: 'gamer' as const, requiresAdmin: true },
    { key: 'ultimatePowerActive', label: t('home_audit_power'), active: !!audit?.ultimatePowerActive, tab: 'gamer' as const, requiresAdmin: true },
    { key: 'telemetryDisabled', label: t('home_audit_telemetry'), active: !!audit?.telemetryDisabled, tab: 'system' as const, requiresAdmin: true },
    { key: 'hibernationDisabled', label: t('home_audit_hibernation'), active: !!audit?.hibernationDisabled, tab: 'clean' as const, requiresAdmin: true },
    { key: 'mousePrecisionActive', label: t('home_audit_mouse'), active: !!audit?.mousePrecisionActive, tab: 'gamer' as const, requiresAdmin: false },
    { key: 'fsoDisabled', label: t('home_audit_fso'), active: !!audit?.fsoDisabled, tab: 'gamer' as const, requiresAdmin: false },
    { key: 'classicContextMenu', label: t('home_audit_classic_menu'), active: !!audit?.classicContextMenu, tab: 'system' as const, requiresAdmin: false },
    { key: 'showFileExtensions', label: t('home_audit_file_ext'), active: !!audit?.showFileExtensions, tab: 'system' as const, requiresAdmin: false },
    { key: 'bingSearchDisabled', label: t('home_audit_bing'), active: !!audit?.bingSearchDisabled, tab: 'system' as const, requiresAdmin: false },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Toast Feedback */}
      {actionToast && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
          actionToast.success
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionToast.message}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="text-[11px] underline opacity-75 hover:opacity-100">
            OK
          </button>
        </div>
      )}

      {/* 1. Executive Welcome & Software Overview */}
      <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-14 h-14 rounded-xl overflow-hidden border p-1 shrink-0 ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <img src={logoSrc} alt="System Optimizer Tool" className="w-full h-full object-contain" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-neutral-100">
                  {t('home_app_name', 'System Optimizer Tool')}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {t('titlebar_version', 'V5.0')}
                </span>
                {isAdmin !== null && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    <span>{isAdmin ? t('titlebar_admin_badge', 'Administrador') : t('titlebar_user_badge', 'Modo Usuário')}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
                {t('home_software_brief', 'Utilitário nativo de alto desempenho em Rust e Win32 API. 0% de telemetria, zero processos em segundo plano e 100% de transparência técnica com reversibilidade.')}
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs text-neutral-400">
                <span className="inline-flex items-center gap-1 text-neutral-200 font-medium">
                  {isLaptop ? <Laptop className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                  <span>{isLaptop ? t('home_device_laptop', 'Notebook') : t('home_device_desktop', 'Computador Desktop')}</span>
                </span>
                <span>•</span>
                <span>{os?.caption || 'Windows'} (Build {os?.buildNumber || 'N/A'})</span>
                {diagnostics?.motherboard?.product && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px] text-neutral-300">{diagnostics.motherboard.product}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {isLaptop && diagnostics?.battery && (
              <div className="px-3 py-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-xs text-neutral-300 flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                <span>{diagnostics.battery.chargePercent}%</span>
              </div>
            )}

            <button
              onClick={() => refreshAudit()}
              disabled={loadingAudit}
              title={t('home_rescan', 'Atualizar Status')}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
              <span>{t('home_rescan', 'Atualizar')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Hardware Quick Glance Strip (4 Clickable Cards to Dashboard) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CPU Glance */}
        <div
          onClick={() => onNavigate?.('dashboard')}
          className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors">
              Processador (CPU)
            </span>
            <Cpu className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-xs font-bold text-neutral-100 truncate" title={cpu?.name || 'N/A'}>
            {cpu?.name || 'Carregando...'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {cpu?.physicalCores ? `${cpu.physicalCores} Núcleos • ${cpu.logicalThreads} Threads` : 'Win32 CPU'}
          </p>
        </div>

        {/* GPU Glance (64-bit VRAM) */}
        <div
          onClick={() => onNavigate?.('dashboard')}
          className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors">
              Placa de Vídeo (GPU)
            </span>
            <Activity className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-xs font-bold text-neutral-100 truncate" title={gpu?.name || 'N/A'}>
            {gpu?.name || 'Carregando...'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {gpu?.vramGb ? `${gpu.vramGb} GB VRAM Real` : 'GPU Integrada / Básica'}
          </p>
        </div>

        {/* RAM Glance */}
        <div
          onClick={() => onNavigate?.('dashboard')}
          className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors">
              Memória RAM
            </span>
            <Layers className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-xs font-bold text-neutral-100">
            {roundedRam > 0 ? `${roundedRam} GB RAM` : 'Carregando...'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {mem?.usedGb !== undefined && mem?.totalGb
              ? `${mem.usedGb.toFixed(1)} GB em uso (${mem.usagePercent?.toFixed(0) || 0}%)`
              : 'DDR RAM'}
          </p>
        </div>

        {/* Primary Storage Glance */}
        <div
          onClick={() => onNavigate?.('dashboard')}
          className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors">
              Armazenamento
            </span>
            <HardDrive className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="text-xs font-bold text-neutral-100 truncate" title={primaryDisk?.model || 'Disco Principal'}>
            {primaryDisk?.model || 'Disco C:'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {primaryDisk?.freeGb !== undefined
              ? `${primaryDisk.freeGb} GB livres de ${primaryDisk.sizeGb} GB`
              : 'Unidade Principal'}
          </p>
        </div>
      </div>

      {/* 3. Primary Protection Feature: Restore Point (Wide and Clearly Editable) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-100">
                {t('sys_restore_title', 'Ponto de Restauração do Windows')}
              </h3>
              {isAdmin === false && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{t('admin_required_badge', 'Requer Admin')}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xl">
              {t('home_restore_hint', 'Recomendado antes de aplicar qualquer alteração. Cria um instantâneo seguro do sistema para reverter com 1 clique caso precise.')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-80 md:w-96">
            <input
              type="text"
              value={restorePointName}
              onChange={(e) => setRestorePointName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-700 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 shadow-inner"
              placeholder={t('sys_restore_placeholder', 'Nome do Ponto de Restauração')}
            />
          </div>
          <button
            onClick={handleCreateRestore}
            disabled={creatingRestore}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] shrink-0"
          >
            {creatingRestore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{creatingRestore ? t('action_processing', 'Criando Ponto...') : t('home_create_restore_now', 'Criar Ponto')}</span>
          </button>
        </div>
      </div>

      {/* 4. Essential Quick Actions Grid (De-saturated Neutral Icons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Quick Action 1: Disk Cleanup */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-neutral-300">
                {audit ? (audit.estimatedJunkMb >= 1024 ? `${(audit.estimatedJunkMb / 1024).toFixed(1)} GB` : `${audit.estimatedJunkMb.toFixed(0)} MB`) : '...'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-neutral-100">{t('home_junk_title', 'Limpeza de Temporários')}</h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
              {t('home_junk_desc', 'Arquivos temporários e caches dispensáveis.')}
            </p>
          </div>

          <button
            onClick={handleQuickClean}
            disabled={cleaningQuick}
            className="mt-3 w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {cleaningQuick ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{cleaningQuick ? t('action_cleaning', 'Limpando...') : t('home_junk_clean_now', 'Limpar Agora')}</span>
          </button>
        </div>

        {/* Quick Action 2: Recommended 1-Click Profile */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium text-neutral-400 uppercase">
                {isLaptop ? t('home_device_laptop', 'Notebook') : t('home_device_desktop', 'Desktop')}
              </span>
            </div>
            <h4 className="text-xs font-bold text-neutral-100">{t('nav_presets', 'Perfis Prontos')}</h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
              {isLaptop ? t('preset_notebook_title', 'Perfil Otimizado para Bateria') : t('preset_essential_title', 'Manutenção Essencial')}
            </p>
          </div>

          <button
            onClick={handleRecommendedPreset}
            disabled={applyingPreset}
            className="mt-3 w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {applyingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{applyingPreset ? t('action_applying', 'Aplicando...') : t('home_apply_preset', 'Aplicar Perfil')}</span>
          </button>
        </div>

        {/* Quick Action 3: Gamer Latency */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Gamepad2 className="w-4 h-4" />
              </div>
              {audit?.timer05msActive ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  0.5ms Ativo
                </span>
              ) : isAdmin === false ? (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                </span>
              ) : null}
            </div>
            <h4 className="text-xs font-bold text-neutral-100">{t('home_gamer_title', 'Otimização Gamer')}</h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
              {t('home_gamer_desc', 'Timer 0.5ms e energia de alto desempenho.')}
            </p>
          </div>

          <button
            onClick={handleQuickGamer}
            disabled={applyingGamer}
            className="mt-3 w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {applyingGamer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{applyingGamer ? t('action_processing', 'Ativando...') : t('home_gamer_btn', 'Ativar Modo Gamer')}</span>
          </button>
        </div>

        {/* Quick Action 4: Startup Apps */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-neutral-300">
                {audit?.startupAppsCount !== undefined ? `${audit.startupAppsCount} ${t('home_startup_unit', 'Programas')}` : '...'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-neutral-100">{t('home_startup_title', 'Inicialização')}</h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
              {t('home_startup_desc', 'Programas que iniciam com o Windows.')}
            </p>
          </div>

          <button
            onClick={() => onNavigate?.('system')}
            className="mt-3 w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('home_startup_manage', 'Gerenciar Inicialização')}</span>
          </button>
        </div>
      </div>

      {/* 5. Shortcuts to Most Used Modules */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            {t('home_shortcuts_title', 'Atalhos Principais & Navegação Rápida')}
          </span>
          <span className="text-[11px] text-neutral-400">
            Acesso direto às ferramentas integradas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => onNavigate?.('clean')}
            className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 text-left transition-all group"
          >
            <Trash2 className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition-colors mb-1.5" />
            <span className="text-xs font-semibold text-neutral-200 block truncate group-hover:text-white">
              {t('nav_clean', 'Limpeza Profunda')}
            </span>
            <span className="text-[10px] text-neutral-400 block truncate">Temp & Caches</span>
          </button>

          <button
            onClick={() => onNavigate?.('gamer')}
            className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 text-left transition-all group"
          >
            <Gamepad2 className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition-colors mb-1.5" />
            <span className="text-xs font-semibold text-neutral-200 block truncate group-hover:text-white">
              {t('nav_gamer', 'Modo Gamer')}
            </span>
            <span className="text-[10px] text-neutral-400 block truncate">0.5ms & Latência</span>
          </button>

          <button
            onClick={() => onNavigate?.('system')}
            className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 text-left transition-all group"
          >
            <ShieldAlert className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition-colors mb-1.5" />
            <span className="text-xs font-semibold text-neutral-200 block truncate group-hover:text-white">
              {t('nav_system', 'Sistema & Privacidade')}
            </span>
            <span className="text-[10px] text-neutral-400 block truncate">Bloatware & Registro</span>
          </button>

          <button
            onClick={() => onNavigate?.('dashboard')}
            className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 text-left transition-all group"
          >
            <Cpu className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition-colors mb-1.5" />
            <span className="text-xs font-semibold text-neutral-200 block truncate group-hover:text-white">
              {t('nav_dashboard', 'Hardware')}
            </span>
            <span className="text-[10px] text-neutral-400 block truncate">Especificações & VRAM</span>
          </button>

          <button
            onClick={() => onNavigate?.('external')}
            className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 text-left transition-all group"
          >
            <Wrench className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition-colors mb-1.5" />
            <span className="text-xs font-semibold text-neutral-200 block truncate group-hover:text-white">
              {t('nav_external', 'Ferramentas')}
            </span>
            <span className="text-[10px] text-neutral-400 block truncate">Hub & Utilitários</span>
          </button>

          <button
            onClick={() => onNavigate?.('docs')}
            className="p-2.5 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 text-left transition-all group"
          >
            <FileCode className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition-colors mb-1.5" />
            <span className="text-xs font-semibold text-neutral-200 block truncate group-hover:text-white">
              {t('nav_docs', 'Documentação')}
            </span>
            <span className="text-[10px] text-neutral-400 block truncate">Wiki & Arquitetura</span>
          </button>
        </div>
      </div>

      {/* 6. System Tweaks Checklist (Clean & Transparent) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800/80">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              {t('home_checklist_title', 'Status das Principais Otimizações')}
            </h3>
            <p className="text-[11px] text-neutral-400">
              {t('home_checklist_sub', 'Verificação em tempo real diretamente do Registro e Políticas do Windows.')}
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('system')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <span>{t('home_view_all_tweaks', 'Ver Todos os Ajustes')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {auditItems.map((item) => (
            <div
              key={item.key}
              onClick={() => onNavigate?.(item.tab)}
              className="p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-600 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.active ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                <span className="text-xs text-neutral-200 truncate group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.requiresAdmin && isAdmin === false && (
                  <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                  </span>
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  item.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {item.active ? t('status_active', 'Ativo') : t('status_inactive', 'Padrão')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
