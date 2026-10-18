'use client';

import React, { useEffect, useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

export default function SystemModule() {
  const { t } = useLanguage();
  const { diagnostics, audit, refreshAudit } = useHardware();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [takeOwnershipActive, setTakeOwnershipActive] = useState<boolean>(false);
  const [restoreDesc, setRestoreDesc] = useState<string>('System Optimizer Restore Point');
  const [dnsBenchmark, setDnsBenchmark] = useState<DnsBenchmarkResult | null>(null);
  const [startupApps, setStartupApps] = useState<StartupAppItem[]>([]);
  const [startupExpanded, setStartupExpanded] = useState<boolean>(false);
  const [loadingStartup, setLoadingStartup] = useState<boolean>(false);
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
      id: 'sync_time',
      title: t('sys_chk_sync_time', 'Sincronizar Relógio do Windows'),
      desc: t('sys_chk_sync_time_desc', 'Sincroniza o relógio do sistema com o servidor NTP oficial.'),
      active: false,
      requiresAdmin: false,
    },
  ];

  const activeStartupCount = startupApps.filter((a) => a.enabled).length;

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-neutral-300" />
          <h2 className="text-xl font-bold text-neutral-100">{t('sys_title')}</h2>
        </div>
        <p className="text-xs text-neutral-400">{t('sys_subtitle')}</p>
      </div>

      {/* Results Toast */}
      {Object.entries(results).slice(-2).map(([id, res]) => (
        <div
          key={id}
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fade-in ${
            res.success
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{res.message}</span>
        </div>
      ))}

      {/* Hero Protection Card: Ponto de Restauração (Priority 1) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-100">
                {t('sys_restore_title', 'Criar Ponto de Restauração')}
              </h3>
              {isAdmin === false && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-3 h-3" />
                  <span>{t('admin_required_badge', 'Requer Admin')}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              {t('sys_restore_desc', 'Cria um instantâneo seguro do sistema e do Registro para você poder reverter alterações caso precise.')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-80 md:w-96">
            <input
              type="text"
              value={restoreDesc}
              onChange={(e) => setRestoreDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950/90 border border-neutral-700 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 shadow-inner"
              placeholder={t('sys_restore_placeholder', 'Nome do Ponto de Restauração')}
            />
          </div>
          <button
            onClick={() => handleAction('restore', () => createRestorePoint(restoreDesc))}
            disabled={activeActions['restore']}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] shrink-0"
          >
            {activeActions['restore'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{t('sys_restore_btn', 'Criar Ponto')}</span>
          </button>
        </div>
      </div>

      {/* Post-Format & Usability Checklist (Real-Time Switches) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('sys_checklist_title', 'Checklist Pós-Formatação & Qualidade de Vida')}</h3>
            <p className="text-xs text-neutral-400">{t('sys_checklist_sub', 'Ative ou desative ajustes essenciais do Windows com leitura direta do Registro.')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {checklistItems.map((item) => {
            const busy = !!activeActions[`chk_${item.id}`];
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-100">{item.title}</h4>
                    {item.requiresAdmin && isAdmin === false && (
                      <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                        <ShieldAlert className="w-3 h-3 text-amber-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>

                <button
                  onClick={() => handleChecklistSwitch(item.id, item.active)}
                  disabled={busy}
                  aria-pressed={item.active}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 flex items-center ${
                    item.active ? 'bg-emerald-600 justify-end' : 'bg-neutral-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
                    {busy && <Loader2 className="w-3 h-3 text-neutral-900 animate-spin" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Startup Apps Manager (Collapsed by default to avoid clutter!) */}
      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 overflow-hidden transition-all">
        <div
          onClick={() => setStartupExpanded(!startupExpanded)}
          className="p-5 cursor-pointer hover:bg-neutral-800/30 flex items-center justify-between transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100">
                  {t('sys_startup_title', 'Gerenciador de Inicialização')}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/80">
                  {startupApps.length} {t('sys_startup_apps_count', 'programas')} • {activeStartupCount} {t('sys_startup_active', 'ativos')}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t('sys_startup_sub', 'Clique para gerenciar programas que iniciam com o Windows.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadStartupList();
              }}
              disabled={loadingStartup}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title={t('sys_startup_refresh', 'Recarregar')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStartup ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white">
              {startupExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {startupExpanded && (
          <div className="p-5 pt-0 border-t border-neutral-800/80 space-y-2 mt-3">
            {startupApps.length === 0 ? (
              <div className="text-center py-6 text-xs text-neutral-400">
                {loadingStartup ? t('loading', 'Carregando...') : t('sys_startup_empty', 'Nenhum aplicativo encontrado na inicialização.')}
              </div>
            ) : (
              startupApps.map((item) => {
                const busyToggle = !!activeActions[`tg_${item.name}`];
                const busyRm = !!activeActions[`rm_${item.name}`];
                return (
                  <div
                    key={`${item.location}_${item.name}`}
                    className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-200 truncate">{item.name}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0">
                          {item.location}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          item.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {item.enabled ? t('status_active', 'Ativo') : t('status_inactive', 'Desativado')}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5 max-w-xl" title={item.command}>
                        {item.command}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStartup(item)}
                        disabled={busyToggle}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          item.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                        }`}
                      >
                        {busyToggle ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>{item.enabled ? t('sys_startup_disable', 'Desativar') : t('sys_startup_enable', 'Ativar')}</span>
                      </button>

                      <button
                        onClick={() => handleRemoveStartup(item)}
                        disabled={busyRm}
                        className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                        title={t('sys_startup_remove', 'Remover registro')}
                      >
                        {busyRm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Diagnostic Report: Battery / Energy */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
            {isLaptop ? <BatteryCharging className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('sys_energy_title')}</h3>
            <p className="text-xs text-neutral-300 mt-0.5">
              {isLaptop ? t('sys_energy_desc_laptop') : t('sys_energy_desc_desktop')}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleAction('energy_report', () => generateBatteryOrEnergyReport(isLaptop))}
          disabled={activeActions['energy_report']}
          className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-xs flex items-center gap-2 shrink-0 transition-all"
        >
          {activeActions['energy_report'] ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isLaptop ? (
            <BatteryCharging className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{isLaptop ? t('sys_energy_btn_laptop') : t('sys_energy_btn_desktop')}</span>
        </button>
      </div>

      {/* Bento Grid of System, Network & Privacy Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: DNS Benchmark & Optimization */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_dns_bench_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">Cloudflare, Google, Quad9, OpenDNS</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_dns_bench_desc')}</p>

            {dnsBenchmark && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {dnsBenchmark.providers.map((p, i) => (
                  <div key={i} className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-300">{p.name}</span>
                    <span className="font-bold text-neutral-200">{p.pingMs} ms</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_dns_bench_title'),
                  securityRating: 'safe',
                  action: 'TCP socket latency benchmark on port 53 (1.1.1.1, 8.8.8.8, 9.9.9.9, 208.67.222.222) + Set-DnsClientServerAddress.',
                  targetArea: 'Active Network Interface TCP/IP DNS Resolver',
                  expectedBenefit: t('sys_dns_bench_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={handleBenchmarkDns}
              disabled={activeActions['dns_bench']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {activeActions['dns_bench'] ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <Gauge className="w-4 h-4 text-neutral-300" />}
              <span>{t('sys_dns_bench_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('dns_opt', optimizeDns)}
              disabled={activeActions['dns_opt']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['dns_opt'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              <span>{t('sys_dns_opt_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Network Stack Reset */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_net_reset_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">netsh winsock & int ip reset</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_net_reset_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_net_reset_title'),
                  securityRating: 'safe',
                  action: 'netsh winsock reset, netsh int ip reset, ipconfig /release, ipconfig /renew, ipconfig /flushdns.',
                  targetArea: 'Winsock Catalog & Network Interface Drivers',
                  expectedBenefit: t('sys_net_reset_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('net_reset', resetNetworkStack)}
              disabled={activeActions['net_reset']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['net_reset'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              <span>{t('sys_net_reset_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Classic Context Menu (Win11) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Menu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_classic_menu_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">{"CLSID {86ca1aa0...}"}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_classic_menu_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_classic_menu_title'),
                  securityRating: 'safe',
                  action: 'Cria a chave HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32 com valor vazio e reinicia o explorer.exe.',
                  targetArea: 'HKCU\\Software\\Classes\\CLSID e Shell do Windows Explorer',
                  expectedBenefit: 'Abre o menu de clique direito completo imediatamente, sem atraso de animação e sem submenu intermediário.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={() => handleAction('classic_menu_on', () => toggleClassicContextMenu(true))}
              disabled={activeActions['classic_menu_on']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {activeActions['classic_menu_on'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Menu className="w-4 h-4" />}
              <span>{t('sys_classic_menu_btn_on')}</span>
            </button>

            <button
              onClick={() => handleAction('classic_menu_off', () => toggleClassicContextMenu(false))}
              disabled={activeActions['classic_menu_off']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['classic_menu_off'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{t('sys_classic_menu_btn_off')}</span>
            </button>
          </div>
        </div>

        {/* Card 4: Telemetry & Tracking */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_tel_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">DiagTrack & dmwappushservice</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_tel_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_tel_title'),
                  securityRating: 'safe',
                  action: 'Stop & Disable DiagTrack, dmwappushservice; AllowTelemetry = 0 (Policies); DoNotShowFeedbackNotifications = 1.',
                  targetArea: 'Windows Services & Group Policy Telemetry Registry',
                  expectedBenefit: t('sys_tel_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('telemetry', disableTelemetry)}
              disabled={activeActions['telemetry']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['telemetry'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 text-neutral-300" />}
              <span>{t('sys_tel_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 5: Bloatware Remover */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_bloat_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">Remove-AppxPackage</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_bloat_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_bloat_title'),
                  securityRating: 'safe',
                  action: 'Get-AppxPackage & Get-AppxProvisionedPackage: Remove Cortana, BingNews, Solitaire, XboxGamingOverlay (safe items).',
                  targetArea: 'Windows AppX Deployment Server',
                  expectedBenefit: t('sys_bloat_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-red-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('bloatware', removeBloatware)}
              disabled={activeActions['bloatware']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['bloatware'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{t('sys_bloat_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 6: Orphan Scheduled Tasks */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_orphans_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">schtasks & TaskScheduler</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_orphans_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_orphans_title'),
                  securityRating: 'safe',
                  action: 'Queries Win32_ScheduledJob and Task Scheduler CIM classes to detect tasks pointing to missing executables and removes them.',
                  targetArea: 'C:\\Windows\\System32\\Tasks and Registry Task Cache',
                  expectedBenefit: t('sys_orphans_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('orphan_tasks', cleanOrphanTasks)}
              disabled={activeActions['orphan_tasks']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['orphan_tasks'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{t('sys_orphans_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 7: Windows Update Repair */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_wu_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">wuauserv, bits, SoftwareDistribution</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_wu_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_wu_title'),
                  securityRating: 'safe',
                  action: 'net stop wuauserv, bits, cryptsvc; Rename SoftwareDistribution & Catroot2; net start services; wuauclt /resetauthorization.',
                  targetArea: 'C:\\Windows\\SoftwareDistribution and Windows Update Component Store',
                  expectedBenefit: t('sys_wu_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('wu_repair', repairWindowsUpdate)}
              disabled={activeActions['wu_repair']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['wu_repair'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{t('sys_wu_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 8: SFC & DISM Scan */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_sfc_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">sfc /scannow & DISM /RestoreHealth</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_sfc_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_sfc_title'),
                  securityRating: 'safe',
                  action: 'sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth execution in hidden background process.',
                  targetArea: 'Windows Component Store (WinSxS) & Core System DLLs',
                  expectedBenefit: t('sys_sfc_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('sfc', runSfcScan)}
              disabled={activeActions['sfc']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['sfc'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>{t('sys_sfc_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 9: Microsoft Store Repair */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_store_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">wsreset & AppX Re-register</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_store_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_store_title'),
                  securityRating: 'safe',
                  action: 'wsreset.exe -i and PowerShell AppX re-registration for Microsoft.WindowsStore package.',
                  targetArea: 'Windows Store AppX Packages',
                  expectedBenefit: t('sys_store_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('store_repair', restoreWindowsStore)}
              disabled={activeActions['store_repair']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['store_repair'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
              <span>{t('sys_store_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 10: Remove OneDrive */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <FolderMinus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_onedrive_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">OneDriveSetup.exe /uninstall</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_onedrive_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_onedrive_title'),
                  securityRating: 'safe',
                  action: 'OneDriveSetup.exe /uninstall + cleans OneDrive shell folder namespace from Registry.',
                  targetArea: 'AppData\\Local\\Microsoft\\OneDrive & Explorer CLSID',
                  expectedBenefit: t('sys_onedrive_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('onedrive', removeOneDrive)}
              disabled={activeActions['onedrive']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['onedrive'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderMinus className="w-4 h-4" />}
              <span>{t('sys_onedrive_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 11: Reset Font Cache */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_font_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">FntCache.dat & Windows Font Cache</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_font_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_font_title'),
                  securityRating: 'safe',
                  action: 'net stop FontCache; Remove FntCache.dat & %LOCALAPPDATA%\\FontCache; net start FontCache.',
                  targetArea: 'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Local\\FontCache',
                  expectedBenefit: t('sys_font_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('font_cache', resetFontCache)}
              disabled={activeActions['font_cache']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['font_cache'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
              <span>{t('sys_font_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 12: Bluetooth Cache Repair */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_bt_title')}</h3>
                <span className="text-[10px] text-neutral-400 font-medium">bthserv, bthhfsrv, bthmodem</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_bt_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_bt_title'),
                  securityRating: 'safe',
                  action: 'Restarts bthserv and bthhfsrv services and resets Bluetooth connection cache in Windows Registry.',
                  targetArea: 'Windows Bluetooth Stack & Services',
                  expectedBenefit: t('sys_bt_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('bt_fix', fixBluetoothCache)}
              disabled={activeActions['bt_fix']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['bt_fix'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
              <span>{t('sys_bt_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 13: Take Ownership */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_take_ownership_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">takeown & icacls Shell Menu</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_take_ownership_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_take_ownership_title'),
                  securityRating: 'safe',
                  action: 'Adds "Take Ownership" right-click context menu via takeown.exe and icacls.exe in Registry.',
                  targetArea: 'HKCR\\*\\shell\\runas & HKCR\\Directory\\shell\\runas',
                  expectedBenefit: t('sys_take_ownership_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={handleTakeOwnership}
              disabled={activeActions['ownership']}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                takeOwnershipActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
              }`}
            >
              {activeActions['ownership'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>{takeOwnershipActive ? t('sys_take_ownership_btn_remove') : t('sys_take_ownership_btn_add')}</span>
            </button>
          </div>
        </div>

        {/* Card 14: Backup Drivers */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('sys_driver_backup_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">pnputil /export-driver</span>
                </div>
              </div>
              {isAdmin === false && (
                <span title={t('admin_required_badge', 'Requer Admin')} className="inline-flex items-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_driver_backup_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_driver_backup_title'),
                  securityRating: 'safe',
                  action: 'Runs pnputil.exe /export-driver * to C:\\DriverBackup for instant driver restoration after formatting.',
                  targetArea: 'C:\\DriverBackup and Windows DriverStore',
                  expectedBenefit: t('sys_driver_backup_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('driver_backup', backupDrivers)}
              disabled={activeActions['driver_backup']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['driver_backup'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              <span>{t('sys_driver_backup_btn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Technical Transparency Popover Modal */}
      {techModalData && (
        <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
      )}
    </div>
  );
}
