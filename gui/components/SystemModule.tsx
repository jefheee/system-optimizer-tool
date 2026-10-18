'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  createRestorePoint,
  benchmarkDns,
  optimizeDns,
  resetNetworkStack,
  toggleClassicContextMenu,
  disableTelemetry,
  removeBloatware,
  repairWindowsUpdate,
  runSfcScan,
  cleanOrphanTasks,
  restoreWindowsStore,
  removeOneDrive,
  resetFontCache,
  fixBluetoothCache,
  toggleTakeOwnershipMenu,
  backupDrivers,
  togglePostFormatTweak,
  getStartupApps,
  toggleStartupApp,
  removeStartupApp,
  generateBatteryOrEnergyReport,
  checkAdmin,
  DnsBenchmarkResult,
  StartupAppItem,
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useHardware } from '../lib/HardwareContext';
import TechDetailsModal, { TechDetailsData } from './TechDetailsModal';
import {
  Settings,
  RefreshCw,
  Wifi,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  FileText,
  Loader2,
  CheckCircle2,
  Store,
  FolderMinus,
  Type,
  Bluetooth,
  KeyRound,
  Archive,
  Info,
  RotateCcw,
  Menu,
  Gauge,
  CheckSquare,
  Layers,
  BatteryCharging,
  Zap,
  Search,
  Wrench,
  Clock,
  HardDrive,
  Cpu,
  Activity,
} from 'lucide-react';

type SubView = 'general' | 'checklist' | 'startup' | 'maintenance';

export default function SystemModule() {
  const { t } = useLanguage();
  const { diagnostics, audit, refreshAudit } = useHardware();
  const [subView, setSubView] = useState<SubView>('general');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [takeOwnershipActive, setTakeOwnershipActive] = useState<boolean>(false);
  const [restoreDesc, setRestoreDesc] = useState<string>('System Optimizer Restore Point');
  const [dnsBenchmark, setDnsBenchmark] = useState<DnsBenchmarkResult | null>(null);
  const [startupApps, setStartupApps] = useState<StartupAppItem[]>([]);
  const [loadingStartup, setLoadingStartup] = useState<boolean>(false);
  const [startupSearch, setStartupSearch] = useState<string>('');
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  const isLaptop = diagnostics?.deviceType === 'Laptop';

  const loadStartupList = async () => {
    setLoadingStartup(true);
    try {
      const res = await getStartupApps();
      if (res.success && res.data) {
        setStartupApps(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStartup(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(setIsAdmin);
    loadStartupList();
  }, []);

  const handleAction = async (id: string, fn: () => Promise<any>) => {
    setActiveActions((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fn();
      setResults((prev) => ({
        ...prev,
        [id]: { success: res.success, message: res.message },
      }));
      await refreshAudit();
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [id]: { success: false, message: err?.message || 'Erro de comunicação.' },
      }));
    } finally {
      setActiveActions((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleChecklistSwitch = async (tweakId: string, currentValue: boolean) => {
    const nextValue = !currentValue;
    await handleAction(`chk_${tweakId}`, async () => {
      if (tweakId === 'classic_context_menu') {
        return await toggleClassicContextMenu(nextValue);
      }
      if (tweakId === 'telemetry_disabled' && nextValue) {
        return await disableTelemetry();
      }
      return await togglePostFormatTweak(tweakId, nextValue);
    });
  };

  const handleToggleStartup = async (item: StartupAppItem) => {
    const key = `tg_${item.name}`;
    const next = !item.enabled;
    setActiveActions((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await toggleStartupApp(item.name, item.location, next);
      setResults((prev) => ({
        ...prev,
        [key]: { success: res.success, message: res.message },
      }));
      await loadStartupList();
      await refreshAudit();
    } finally {
      setActiveActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRemoveStartup = async (item: StartupAppItem) => {
    const key = `rm_${item.name}`;
    setActiveActions((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await removeStartupApp(item.name, item.location);
      setResults((prev) => ({
        ...prev,
        [key]: { success: res.success, message: res.message },
      }));
      await loadStartupList();
      await refreshAudit();
    } finally {
      setActiveActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleBenchmarkDns = async () => {
    setActiveActions((prev) => ({ ...prev, dns_bench: true }));
    try {
      const res = await benchmarkDns();
      if (res.success && res.data) {
        setDnsBenchmark(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setActiveActions((prev) => ({ ...prev, dns_bench: false }));
    }
  };

  const handleTakeOwnership = async () => {
    const nextState = !takeOwnershipActive;
    await handleAction('ownership', async () => {
      const res = await toggleTakeOwnershipMenu(nextState);
      if (res.success) {
        setTakeOwnershipActive(nextState);
      }
      return res;
    });
  };

  const checklistItems = [
    {
      id: 'file_extensions',
      title: t('sys_chk_ext_title', 'Mostrar Extensões de Arquivos (.exe, .pdf)'),
      desc: t('sys_chk_ext_desc', 'Evita execução de scripts perigosos disfarçados de documentos.'),
      active: !!audit?.showFileExtensions,
      requiresAdmin: false,
    },
    {
      id: 'hidden_files',
      title: t('sys_chk_hidden_title', 'Mostrar Arquivos e Pastas Ocultas'),
      desc: t('sys_chk_hidden_desc', 'Permite visualizar pastas essenciais como AppData e ProgramData.'),
      active: !!audit?.showHiddenFiles,
      requiresAdmin: false,
    },
    {
      id: 'bing_search',
      title: t('sys_chk_bing_title', 'Desativar Busca Web do Bing no Iniciar'),
      desc: t('sys_chk_bing_desc', 'Torna a pesquisa do menu iniciar instantânea, sem atraso de internet.'),
      active: !!audit?.bingSearchDisabled,
      requiresAdmin: false,
    },
    {
      id: 'sticky_keys',
      title: t('sys_chk_sticky_keys', 'Desativar Teclas de Aderência (Shift 5x)'),
      desc: t('sys_chk_sticky_keys_desc', 'Elimina a janela intrusiva ao pressionar Shift repetidamente em jogos.'),
      active: true,
      requiresAdmin: false,
    },
    {
      id: 'menu_delay',
      title: t('sys_chk_menu_delay', 'Menus e Barra de Tarefas Instantâneos'),
      desc: t('sys_chk_menu_delay_desc', 'Reduz o atraso de abertura de menus do Windows de 400ms para 0ms.'),
      active: true,
      requiresAdmin: false,
    },
    {
      id: 'fast_startup',
      title: t('sys_chk_fast_startup', 'Desativar Inicialização Rápida (Fast Startup)'),
      desc: t('sys_chk_fast_startup_desc', 'Garante que o Windows reinicie limpo e previne corrupção de drivers.'),
      active: false,
      requiresAdmin: true,
    },
    {
      id: 'error_reporting',
      title: t('sys_chk_error_reporting', 'Desativar Relatório de Erros (WerSvc)'),
      desc: t('sys_chk_error_reporting_desc', 'Impede travamentos do Windows Explorer ao fechar programas problemáticos.'),
      active: false,
      requiresAdmin: true,
    },
    {
      id: 'classic_context_menu',
      title: t('sys_chk_classic_title', 'Menu de Contexto Clássico (Win 11)'),
      desc: t('sys_chk_classic_desc', 'Restaura o clique direito completo sem submenu intermediário.'),
      active: !!audit?.classicContextMenu,
      requiresAdmin: false,
    },
    {
      id: 'telemetry_disabled',
      title: t('sys_chk_tel_title', 'Bloquear Telemetria (DiagTrack)'),
      desc: t('sys_chk_tel_desc', 'Desativa o envio de relatórios e telemetria contínua para a Microsoft.'),
      active: !!audit?.telemetryDisabled,
      requiresAdmin: true,
    },
    {
      id: 'hibernation_disabled',
      title: t('sys_chk_hib_title', 'Desativar Hibernação (hiberfil.sys)'),
      desc: t('sys_chk_hib_desc', 'Libera entre 8 GB e 32 GB contínuos no drive C:.'),
      active: !!audit?.hibernationDisabled,
      requiresAdmin: true,
    },
    {
      id: 'fso_disabled',
      title: t('sys_chk_fso_title', 'Desativar GameDVR e FSO Global'),
      desc: t('sys_chk_fso_desc', 'Evita sobreposição gráfica e melhora os 1% low frames.'),
      active: !!audit?.fsoDisabled,
      requiresAdmin: false,
    },
  ];

  const activeStartupCount = startupApps.filter((a) => a.enabled).length;

  const filteredStartupApps = useMemo(() => {
    const q = startupSearch.trim().toLowerCase();
    if (!q) return startupApps;
    return startupApps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.location.toLowerCase().includes(q)
    );
  }, [startupApps, startupSearch]);

  const activeChecklistCount = checklistItems.filter((i) => i.active).length;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-3 max-w-7xl w-full mx-auto overflow-hidden">
      {/* Top Header & Segmented Sub-View Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-200 shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100 leading-tight">{t('sys_title')}</h2>
            <p className="text-xs text-neutral-400">{t('sys_subtitle')}</p>
          </div>
        </div>

        {/* Sub-view Segmented Buttons (Neutral styling - NO BLUE) */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 self-start sm:self-center shrink-0">
          <button
            onClick={() => setSubView('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subView === 'general'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Geral & Rede
          </button>
          <button
            onClick={() => setSubView('checklist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subView === 'checklist'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Checklist</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-neutral-900 text-emerald-400">
              {activeChecklistCount}/11
            </span>
          </button>
          <button
            onClick={() => setSubView('startup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              subView === 'startup'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Inicialização</span>
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-neutral-900 text-neutral-300">
              {activeStartupCount}
            </span>
          </button>
          <button
            onClick={() => setSubView('maintenance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subView === 'maintenance'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Manutenção Avançada
          </button>
        </div>
      </div>

      {/* Action Results Banner */}
      {Object.entries(results).slice(-1).map(([id, res]) => (
        <div
          key={id}
          className={`p-2.5 rounded-xl text-xs flex items-center justify-between border shrink-0 animate-fade-in ${
            res.success
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{res.message}</span>
          </div>
          <button onClick={() => setResults({})} className="text-[10px] underline opacity-75 hover:opacity-100">
            OK
          </button>
        </div>
      ))}

      {/* Main Sub-View Content Container (Fits 100% of viewport without page scroll) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* SUB-VIEW 1: Geral & Rede */}
        {subView === 'general' && (
          <div className="flex-1 flex flex-col space-y-3 min-h-0 overflow-y-auto no-scrollbar">
            {/* Row 1: Restore Point (Wide, clearly editable input) */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-200 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
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
                  <p className="text-xs text-neutral-400 mt-0.5 max-w-xl leading-relaxed">
                    {t('sys_restore_desc', 'Cria um instantâneo seguro do sistema e do Registro para reverter alterações com facilidade.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
                <div className="relative w-full sm:w-80 md:w-96">
                  <input
                    type="text"
                    value={restoreDesc}
                    onChange={(e) => setRestoreDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950/90 border border-neutral-700 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500 shadow-inner"
                    placeholder={t('sys_restore_placeholder', 'Nome do Ponto de Restauração')}
                  />
                </div>
                <button
                  onClick={() => handleAction('restore', () => createRestorePoint(restoreDesc))}
                  disabled={activeActions['restore']}
                  className="py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98] shrink-0"
                >
                  {activeActions['restore'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-neutral-300" />}
                  <span>{t('sys_restore_btn', 'Criar Ponto')}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Bento Grid of 3 Networking & Shell Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
              {/* Card 1: DNS Benchmark & Optimization */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-100">{t('sys_dns_bench_title')}</h4>
                      <span className="text-[10px] text-neutral-400 font-medium">Cloudflare, Google, Quad9, OpenDNS</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">{t('sys_dns_bench_desc')}</p>

                  {dnsBenchmark && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {dnsBenchmark.providers.map((p, i) => (
                        <div key={i} className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-neutral-300">{p.name}</span>
                          <span className="font-bold text-neutral-200 font-mono tabular-nums">{p.pingMs} ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    onClick={handleBenchmarkDns}
                    disabled={activeActions['dns_bench']}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    {activeActions['dns_bench'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5 text-neutral-300" />}
                    <span>{t('sys_dns_bench_btn')}</span>
                  </button>

                  <button
                    onClick={() => handleAction('dns_opt', optimizeDns)}
                    disabled={activeActions['dns_opt']}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700 active:scale-[0.98]"
                  >
                    {activeActions['dns_opt'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    <span>{t('sys_dns_opt_btn')}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Network Stack Reset */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-100">{t('sys_net_reset_title')}</h4>
                      <span className="text-[10px] text-neutral-400 font-medium">netsh winsock & int ip reset</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">{t('sys_net_reset_desc')}</p>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => handleAction('net_reset', resetNetworkStack)}
                    disabled={activeActions['net_reset']}
                    className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
                  >
                    {activeActions['net_reset'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    <span>{t('sys_net_reset_btn')}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Classic Context Menu & Telemetry */}
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                      <Menu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-100">{t('sys_classic_menu_title')}</h4>
                      <span className="text-[10px] text-neutral-400 font-medium">Windows 11 Right-Click</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {t('sys_classic_menu_desc')}
                  </p>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    onClick={() => handleAction('classic_menu_on', () => toggleClassicContextMenu(true))}
                    disabled={activeActions['classic_menu_on']}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700 active:scale-[0.98]"
                  >
                    {activeActions['classic_menu_on'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Menu className="w-3.5 h-3.5 text-neutral-300" />}
                    <span>{t('sys_classic_menu_btn_on')}</span>
                  </button>

                  <button
                    onClick={() => handleAction('classic_menu_off', () => toggleClassicContextMenu(false))}
                    disabled={activeActions['classic_menu_off']}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700 active:scale-[0.98]"
                  >
                    {activeActions['classic_menu_off'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>{t('sys_classic_menu_btn_off')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-VIEW 2: Checklist Pós-Formatação (11 Compact Bento Switches) */}
        {subView === 'checklist' && (
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-neutral-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  {t('sys_checklist_title')}
                </h3>
              </div>
              <span className="text-xs text-neutral-400">
                <strong className="text-emerald-400 font-mono tabular-nums">{activeChecklistCount}</strong> de 11 ajustes ativos
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 no-scrollbar">
              {checklistItems.map((item) => {
                const busy = !!activeActions[`chk_${item.id}`];
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-neutral-100 truncate">{item.title}</h4>
                        {item.requiresAdmin && isAdmin === false && (
                          <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                            <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug truncate">{item.desc}</p>
                    </div>

                    <button
                      onClick={() => handleChecklistSwitch(item.id, item.active)}
                      disabled={busy}
                      aria-pressed={item.active}
                      className={`w-10 h-5.5 rounded-full transition-colors p-0.5 shrink-0 flex items-center ${
                        item.active ? 'bg-emerald-600 justify-end' : 'bg-neutral-700 justify-start'
                      }`}
                    >
                      <span className="w-4.5 h-4.5 rounded-full bg-white shadow flex items-center justify-center">
                        {busy && <Loader2 className="w-2.5 h-2.5 text-neutral-900 animate-spin" />}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: Inicialização (Startup Apps Manager) */}
        {subView === 'startup' && (
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_startup_title')}</h3>
                  <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                    {startupApps.length} {t('sys_startup_apps_count', 'programas')} • {activeStartupCount} {t('sys_startup_active', 'ativos')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={startupSearch}
                    onChange={(e) => setStartupSearch(e.target.value)}
                    placeholder="Pesquisar programa..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                <button
                  onClick={loadStartupList}
                  disabled={loadingStartup}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors border border-neutral-700"
                  title={t('sys_startup_refresh', 'Recarregar')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStartup ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-1.5 no-scrollbar">
              {filteredStartupApps.length === 0 ? (
                <div className="text-center py-12 text-xs text-neutral-400">
                  {loadingStartup ? t('loading', 'Carregando...') : t('sys_startup_empty', 'Nenhum aplicativo encontrado.')}
                </div>
              ) : (
                filteredStartupApps.map((item) => {
                  const busyToggle = !!activeActions[`tg_${item.name}`];
                  const busyRm = !!activeActions[`rm_${item.name}`];
                  return (
                    <div
                      key={`${item.location}_${item.name}`}
                      className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-200 truncate">{item.name}</span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono shrink-0">
                            {item.location}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {item.enabled ? t('status_active', 'Ativo') : t('status_inactive', 'Desativado')}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                          {item.command}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleStartup(item)}
                          disabled={busyToggle || busyRm}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            item.enabled
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border-neutral-700'
                          }`}
                        >
                          {busyToggle ? <Loader2 className="w-3 h-3 animate-spin" /> : item.enabled ? t('btn_disable', 'Desativar') : t('btn_enable', 'Ativar')}
                        </button>

                        <button
                          onClick={() => handleRemoveStartup(item)}
                          disabled={busyToggle || busyRm}
                          className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
                          title={t('btn_delete', 'Excluir da inicialização')}
                        >
                          {busyRm ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW 4: Manutenção Avançada (SFC/DISM, Bloatware, Windows Update, Bateria, Drivers) */}
        {subView === 'maintenance' && (
          <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Tool 1: Universal Bloatware Removal */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('sys_bloat_title')}</h4>
                    <span className="text-[10px] text-neutral-400 font-medium">UWP / AppX Package</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">{t('sys_bloat_desc')}</p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => handleAction('bloatware', removeBloatware)}
                  disabled={activeActions['bloatware']}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.98] transition-all"
                >
                  {activeActions['bloatware'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{t('sys_bloat_btn')}</span>
                </button>
              </div>
            </div>

            {/* Tool 2: SFC / Scannow & DISM Health */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('sys_sfc_title')}</h4>
                    <span className="text-[10px] text-neutral-400 font-medium">sfc.exe & dism.exe</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">{t('sys_sfc_desc')}</p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => handleAction('sfc', runSfcScan)}
                  disabled={activeActions['sfc']}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.98] transition-all"
                >
                  {activeActions['sfc'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{t('sys_sfc_btn')}</span>
                </button>
              </div>
            </div>

            {/* Tool 3: Windows Update & BITS Repair */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('sys_update_title')}</h4>
                    <span className="text-[10px] text-neutral-400 font-medium">SoftwareDistribution & BITS</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">{t('sys_update_desc')}</p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => handleAction('win_update', repairWindowsUpdate)}
                  disabled={activeActions['win_update']}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.98] transition-all"
                >
                  {activeActions['win_update'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{t('sys_update_btn')}</span>
                </button>
              </div>
            </div>

            {/* Tool 4: Clean Orphan Scheduled Tasks */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('sys_orphans_title')}</h4>
                    <span className="text-[10px] text-neutral-400 font-medium">Task Scheduler (schtasks)</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">{t('sys_orphans_desc')}</p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => handleAction('orphans', cleanOrphanTasks)}
                  disabled={activeActions['orphans']}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.98] transition-all"
                >
                  {activeActions['orphans'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{t('sys_orphans_btn')}</span>
                </button>
              </div>
            </div>

            {/* Tool 5: Backup System Drivers */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('sys_drivers_title')}</h4>
                    <span className="text-[10px] text-neutral-400 font-medium">dism.exe /Export-Driver</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">{t('sys_drivers_desc')}</p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => handleAction('drivers', backupDrivers)}
                  disabled={activeActions['drivers']}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.98] transition-all"
                >
                  {activeActions['drivers'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{t('sys_drivers_btn')}</span>
                </button>
              </div>
            </div>

            {/* Tool 6: Energy / Battery Report */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    {isLaptop ? <BatteryCharging className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('sys_energy_title')}</h4>
                    <span className="text-[10px] text-neutral-400 font-medium">powercfg /batteryreport</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">
                  {isLaptop ? t('sys_energy_desc_laptop') : t('sys_energy_desc_desktop')}
                </p>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => handleAction('energy_report', () => generateBatteryOrEnergyReport(isLaptop))}
                  disabled={activeActions['energy_report']}
                  className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.98] transition-all"
                >
                  {activeActions['energy_report'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{isLaptop ? t('sys_energy_btn_laptop') : t('sys_energy_btn_desktop')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tech Details Modal */}
      <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
    </div>
  );
}
