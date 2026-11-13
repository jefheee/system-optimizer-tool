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
  getLiveTweaksStatus,
  applyOrRevertTweak,
  getBitlockerStatus,
  bitlockerDecrypt,
  syncSystemTime,
  restoreEssentialApp,
  getAudioEndpoints,
  injectLoudnessEq,
  openSoundControlPanel,
  disableNicPowerSaving,
  getNetworkBindingsStatus,
  toggleIpv4Only,
  DnsBenchmarkResult,
  StartupAppItem,
  LiveTweakStatus,
  BitLockerDriveStatus,
  AudioEndpointItem,
  NetworkBindingsStatus,
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
  BatteryCharging,
  Zap,
  Search,
  Wrench,
  Clock,
  HardDrive,
  Cpu,
  Activity,
  Shield,
  Layers,
  Unlock,
  Volume2,
  Globe,
  Sparkles,
  Download,
} from 'lucide-react';

type SubView = 'general' | 'startup' | 'checklist' | 'maintenance';

export default function SystemModule({ initialSubView }: { initialSubView?: SubView }) {
  const { language, t } = useLanguage();
  const { diagnostics, audit, refreshAudit, requireRestorePoint } = useHardware();
  const [subView, setSubView] = useState<SubView>(initialSubView ?? 'general');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [takeOwnershipActive, setTakeOwnershipActive] = useState<boolean>(false);
  const [restoreDesc, setRestoreDesc] = useState<string>('RestorePoint_SystemOptimizer_Safe');
  const [dnsBenchmark, setDnsBenchmark] = useState<DnsBenchmarkResult | null>(null);
  const [startupApps, setStartupApps] = useState<StartupAppItem[]>([]);
  const [loadingStartup, setLoadingStartup] = useState<boolean>(false);
  const [startupSearch, setStartupSearch] = useState<string>('');
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  // ETAPA 2 states (Módulos 3 e 6)
  const [liveTweaks, setLiveTweaks] = useState<LiveTweakStatus[]>([]);
  const [bitlockerDrives, setBitlockerDrives] = useState<BitLockerDriveStatus[]>([]);
  const [audioEndpoints, setAudioEndpoints] = useState<AudioEndpointItem[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('');
  const [netBindings, setNetBindings] = useState<NetworkBindingsStatus | null>(null);
  const [preserveSmb, setPreserveSmb] = useState<boolean>(true);

  const isLaptop = diagnostics?.deviceType === 'Laptop';
  const ramTotalGb = diagnostics?.memory?.totalGb ?? 16;

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

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

  const loadEtapa2State = async () => {
    const [ltRes, blRes, auRes, nbRes] = await Promise.all([
      getLiveTweaksStatus(),
      getBitlockerStatus(),
      getAudioEndpoints(),
      getNetworkBindingsStatus(),
    ]);
    if (ltRes.success && ltRes.data) setLiveTweaks(ltRes.data);
    if (blRes.success && blRes.data) setBitlockerDrives(blRes.data);
    if (auRes.success && auRes.data) {
      setAudioEndpoints(auRes.data);
      if (auRes.data.length > 0) {
        setSelectedEndpointId((prev) => prev || auRes.data![0].id);
      }
    }
    if (nbRes.success && nbRes.data) setNetBindings(nbRes.data);
  };

  useEffect(() => {
    checkAdmin().then(setIsAdmin);
    loadStartupList();
    loadEtapa2State();
  }, []);

  const getTweak = (id: string): LiveTweakStatus | undefined =>
    liveTweaks.find((t) => t.id === id);

  const handleLiveTweak = (
    tweakId: string,
    apply: boolean,
    label: string,
    guardRestore: boolean = true
  ) => {
    const run = async () => {
      const key = `lt_${tweakId}`;
      setActiveActions((prev) => ({ ...prev, [key]: true }));
      try {
        const res = await applyOrRevertTweak(tweakId, apply);
        setResults((prev) => ({
          ...prev,
          [key]: { success: res.success, message: res.message },
        }));
        await loadEtapa2State();
        await refreshAudit();
      } catch (err: any) {
        setResults((prev) => ({
          ...prev,
          [key]: { success: false, message: err?.message || 'Error' },
        }));
      } finally {
        setActiveActions((prev) => ({ ...prev, [key]: false }));
      }
    };

    if (apply && guardRestore) {
      requireRestorePoint(label, 'medium', run);
    } else {
      void run();
    }
  };

  const handleBitlockerDecrypt = (drive: string) => {
    requireRestorePoint(
      language === 'PT'
        ? `Desencriptar BitLocker (${drive})`
        : `Decrypt BitLocker (${drive})`,
      'high',
      async () => {
        const key = `bl_${drive}`;
        setActiveActions((prev) => ({ ...prev, [key]: true }));
        try {
          const res = await bitlockerDecrypt(drive);
          setResults((prev) => ({
            ...prev,
            bitlocker: { success: res.success, message: res.message },
          }));
          await loadEtapa2State();
        } finally {
          setActiveActions((prev) => ({ ...prev, [key]: false }));
        }
      }
    );
  };

  const handleLoudnessEq = (enable: boolean) => {
    if (!selectedEndpointId) return;
    const run = async () => {
      setActiveActions((prev) => ({ ...prev, audio_eq: true }));
      try {
        const res = await injectLoudnessEq(selectedEndpointId, enable);
        setResults((prev) => ({
          ...prev,
          audio_eq: { success: res.success, message: res.message },
        }));
        await loadEtapa2State();
      } finally {
        setActiveActions((prev) => ({ ...prev, audio_eq: false }));
      }
    };
    if (enable) {
      requireRestorePoint(
        language === 'PT'
          ? 'Injetar Enhancements & Loudness Equalization no Endpoint de Áudio'
          : 'Inject Audio Enhancements & Loudness Equalization',
        'medium',
        run
      );
    } else {
      void run();
    }
  };

  const handleNicPowerSaving = (enable: boolean) => {
    const run = async () => {
      setActiveActions((prev) => ({ ...prev, nic_ps: true }));
      try {
        const res = await disableNicPowerSaving(enable);
        setResults((prev) => ({
          ...prev,
          nic_ps: { success: res.success, message: res.message },
        }));
        await loadEtapa2State();
      } finally {
        setActiveActions((prev) => ({ ...prev, nic_ps: false }));
      }
    };
    if (enable) {
      requireRestorePoint(
        language === 'PT'
          ? 'Desativar Economia de Energia da Placa de Rede (NIC EEE Off)'
          : 'Disable NIC Power Saving (EEE / PnP Off)',
        'medium',
        run
      );
    } else {
      void run();
    }
  };

  const handleToggleIpv4Only = (enable: boolean) => {
    const run = async () => {
      setActiveActions((prev) => ({ ...prev, ipv4_only: true }));
      try {
        const res = await toggleIpv4Only(enable, preserveSmb);
        setResults((prev) => ({
          ...prev,
          ipv4_only: { success: res.success, message: res.message },
        }));
        await loadEtapa2State();
      } finally {
        setActiveActions((prev) => ({ ...prev, ipv4_only: false }));
      }
    };
    if (enable) {
      requireRestorePoint(
        language === 'PT'
          ? 'Ativar Modo de Rede IPv4-Only'
          : 'Enable IPv4-Only Network Mode',
        'medium',
        run
      );
    } else {
      void run();
    }
  };

  const executeActionRaw = async (id: string, fn: () => Promise<any>) => {
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
        [id]: { success: false, message: err?.message || 'Error' },
      }));
    } finally {
      setActiveActions((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAction = async (id: string, fn: () => Promise<any>) => {
    const protectedIds = new Set(['bloatware', 'clean_orphan', 'remove_onedrive', 'win_update', 'take_ownership']);
    if (protectedIds.has(id)) {
      requireRestorePoint(
        `System Maintenance (${id})`,
        id === 'bloatware' || id === 'remove_onedrive' ? 'high' : 'medium',
        () => executeActionRaw(id, fn)
      );
      return;
    }
    await executeActionRaw(id, fn);
  };

  const handleToggleStartup = async (item: StartupAppItem) => {
    const key = `tg_${item.name}`;
    setActiveActions((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await toggleStartupApp(item.name, item.location, !item.enabled);
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

  const handleToggleChecklist = async (tweakId: string, currentState: boolean) => {
    const key = `chk_${tweakId}`;
    setActiveActions((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await togglePostFormatTweak(tweakId, !currentState);
      setResults((prev) => ({
        ...prev,
        [key]: { success: res.success, message: res.message },
      }));
      await refreshAudit();
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [key]: { success: false, message: err?.message || 'Error' },
      }));
    } finally {
      setActiveActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const checklistItems = [
    {
      id: 'file_extensions',
      title: language === 'PT' ? 'Mostrar Extensões de Arquivos (.exe, .pdf)' : 'Show File Extensions (.exe, .pdf)',
      desc: language === 'PT' ? 'Evita execução de scripts disfarçados de documentos.' : 'Prevents executing disguised malicious scripts.',
      active: !!audit?.showFileExtensions,
      requiresAdmin: false,
    },
    {
      id: 'hidden_files',
      title: language === 'PT' ? 'Mostrar Arquivos e Pastas Ocultas' : 'Show Hidden Files and Folders',
      desc: language === 'PT' ? 'Permite visualizar pastas essenciais como AppData.' : 'Allows viewing essential system directories like AppData.',
      active: !!audit?.showHiddenFiles,
      requiresAdmin: false,
    },
    {
      id: 'bing_search',
      title: language === 'PT' ? 'Desativar Busca Web do Bing no Iniciar' : 'Disable Bing Web Search in Start Menu',
      desc: language === 'PT' ? 'Pesquisa local instantânea sem atraso de internet.' : 'Instant local start search without web latency.',
      active: !!audit?.bingSearchDisabled,
      requiresAdmin: false,
    },
    {
      id: 'sticky_keys',
      title: language === 'PT' ? 'Desativar Teclas de Aderência (Shift 5x)' : 'Disable Sticky Keys (Shift 5x)',
      desc: language === 'PT' ? 'Elimina a janela intrusiva ao pressionar Shift em jogos.' : 'Prevents intrusive accessibility popups during gameplay.',
      active: true,
      requiresAdmin: false,
    },
    {
      id: 'menu_delay',
      title: language === 'PT' ? 'Menus e Barra de Tarefas Instantâneos' : 'Instant Menus and Taskbar',
      desc: language === 'PT' ? 'Reduz atraso de abertura de menus de 400ms para 0ms.' : 'Reduces UI menu open delay from 400ms to 0ms.',
      active: true,
      requiresAdmin: false,
    },
    {
      id: 'fast_startup',
      title: language === 'PT' ? 'Desativar Inicialização Rápida (Fast Startup)' : 'Disable Fast Startup',
      desc: language === 'PT' ? 'Garante reinicialização limpa e previne corrupção de drivers.' : 'Ensures clean kernel reboot and prevents driver corruption.',
      active: false,
      requiresAdmin: true,
    },
    {
      id: 'error_reporting',
      title: language === 'PT' ? 'Desativar Relatório de Erros (WerSvc)' : 'Disable Error Reporting (WerSvc)',
      desc: language === 'PT' ? 'Impede travamentos ao fechar programas problemáticos.' : 'Prevents Explorer freezes when closing crashed apps.',
      active: false,
      requiresAdmin: true,
    },
    {
      id: 'classic_context_menu',
      title: language === 'PT' ? 'Menu de Contexto Clássico (Win 11)' : 'Classic Context Menu (Win 11)',
      desc: language === 'PT' ? 'Restaura o clique direito completo sem submenu intermediário.' : 'Restores full right-click menu without extra click.',
      active: !!audit?.classicContextMenu,
      requiresAdmin: false,
    },
    {
      id: 'telemetry',
      title: language === 'PT' ? 'Bloquear Telemetria & DiagTrack' : 'Block Telemetry & DiagTrack',
      desc: language === 'PT' ? 'Cessa envio de dados diagnósticos em segundo plano.' : 'Halts continuous background telemetry data transmission.',
      active: !!audit?.telemetryDisabled,
      requiresAdmin: true,
    },
    {
      id: 'game_dvr',
      title: language === 'PT' ? 'Desativar GameDVR & Gravação de Fundo' : 'Disable GameDVR & Background Recording',
      desc: language === 'PT' ? 'Elimina gravação contínua da GPU em segundo plano.' : 'Eliminates continuous GPU background clip recording.',
      active: !!audit?.fsoDisabled,
      requiresAdmin: false,
    },
    {
      id: 'hibernation',
      title: language === 'PT' ? 'Desativar Hibernação (-16GB hiberfil.sys)' : 'Disable Hibernation (-16GB hiberfil.sys)',
      desc: language === 'PT' ? 'Libera espaço massivo no disco C: do sistema.' : 'Frees massive space on system drive C:.',
      active: !!audit?.hibernationDisabled,
      requiresAdmin: true,
    },
  ];

  const activeChecklistCount = checklistItems.filter((i) => i.active).length;

  const filteredStartupApps = useMemo(() => {
    if (!startupSearch.trim()) return startupApps;
    const q = startupSearch.toLowerCase();
    return startupApps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.command.toLowerCase().includes(q)
    );
  }, [startupApps, startupSearch]);

  const activeStartupCount = startupApps.filter((a) => a.enabled).length;

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 min-h-0 flex flex-col font-sans">
      {/* Header Row */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <h1 className="text-base sm:text-lg font-bold text-neutral-100 tracking-tight">
                {language === 'PT' ? 'Sistema & Inicialização' : 'System & Startup'}
              </h1>
              <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
                {language === 'PT'
                  ? 'Gerenciamento de inicialização rápida, ponto de restauração, calibração de rede e integridade de arquivos do Windows.'
                  : 'Fast startup manager, system restore points, network calibration, and Windows file integrity.'}
              </p>
            </div>
          </div>
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

      {/* SUB-VIEW 1: Geral & Rede */}
      {subView === 'general' && (
        <div className="space-y-2.5 flex flex-col shrink-0">
          {/* Row 1: Restore Point (Wide and clearly editable) */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-100">
                    {language === 'PT' ? 'Ponto de Restauração do Windows' : 'Windows Restore Point'}
                  </h3>
                  {isAdmin === false && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      <span>{language === 'PT' ? 'Requer Admin' : 'Requires Admin'}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 max-w-xl leading-relaxed">
                  {language === 'PT'
                    ? 'Cria um instantâneo seguro do sistema e do Registro para reverter alterações com facilidade.'
                    : 'Creates a safe snapshot of system and registry to roll back tweaks safely.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
              <div className="relative w-full sm:w-80 md:w-96">
                <input
                  type="text"
                  value={restoreDesc}
                  onChange={(e) => setRestoreDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950/90 border border-neutral-700 text-xs text-neutral-100 font-mono placeholder-neutral-500 focus:outline-none focus:border-neutral-500 shadow-inner"
                  placeholder="RestorePoint_SystemOptimizer_Safe"
                />
              </div>
              <button
                onClick={() => handleAction('restore', () => createRestorePoint(restoreDesc))}
                disabled={activeActions['restore']}
                className="py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98] shrink-0"
              >
                {activeActions['restore'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-cyan-400" />}
                <span>{language === 'PT' ? 'Criar Ponto' : 'Create Snapshot'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Bento Grid of 3 Networking & Shell Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 shrink-0">
            {/* Card 1: DNS Benchmark */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">Benchmark & Cache DNS</h4>
                    <span className="text-[10px] text-neutral-400 font-mono">Cloudflare, Google, Quad9, OpenDNS</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {language === 'PT'
                    ? 'Mede a latência dos principais servidores DNS e configura o mais rápido para sua conexão.'
                    : 'Measures latency to top DNS resolvers and assigns the fastest one to your adapter.'}
                </p>

                {dnsBenchmark && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {dnsBenchmark.providers.map((p, i) => (
                      <div key={i} className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-neutral-300">{p.name}</span>
                        <span className="font-bold text-emerald-400 font-mono tabular-nums">{p.pingMs} ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleBenchmarkDns}
                  disabled={activeActions['dns_bench']}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  {activeActions['dns_bench'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>Benchmark</span>
                </button>
                <button
                  onClick={() => handleAction('dns_opt', optimizeDns)}
                  disabled={activeActions['dns_opt']}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700"
                >
                  {activeActions['dns_opt'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                  <span>{language === 'PT' ? 'Otimizar DNS' : 'Optimize DNS'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Network Stack Reset */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">
                      {language === 'PT' ? 'Reset de Pilha de Rede' : 'Network Stack Reset'}
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">netsh winsock & int ip reset</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {language === 'PT'
                    ? 'Restaura a pilha Winsock, renova leases de DHCP e limpa entradas estagnadas de DNS para corrigir perdas de pacote.'
                    : 'Rebuilds Winsock catalog, resets TCP/IP stack, and purges stale routing entries.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleAction('net_reset', resetNetworkStack)}
                  disabled={activeActions['net_reset']}
                  className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700"
                >
                  {activeActions['net_reset'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{language === 'PT' ? 'Executar Reset de Rede' : 'Reset Network Stack'}</span>
                </button>
              </div>
            </div>

            {/* Card 3: Classic Context Menu */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <Menu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">
                      {language === 'PT' ? 'Menu de Contexto Clássico (Win 11)' : 'Classic Context Menu (Win 11)'}
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">Windows 11 Right-Click</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {language === 'PT'
                    ? 'Restaura o clique direito tradicional do Windows 10 sem a necessidade de clicar em "Mostrar mais opções".'
                    : 'Restores the traditional Windows 10 right-click menu without having to click "Show more options".'}
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => handleAction('classic_menu_on', () => toggleClassicContextMenu(true))}
                  disabled={activeActions['classic_menu_on']}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700"
                >
                  {activeActions['classic_menu_on'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Menu className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{language === 'PT' ? 'Ativar Clássico' : 'Enable Classic'}</span>
                </button>
                <button
                  onClick={() => handleAction('classic_menu_off', () => toggleClassicContextMenu(false))}
                  disabled={activeActions['classic_menu_off']}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-700"
                >
                  {activeActions['classic_menu_off'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>{language === 'PT' ? 'Restaurar Win 11' : 'Restore Win 11'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* MÓDULO 6: Injetor Profundo de Áudio (Loudness EQ) + NIC Power Saving Off + IPv4-Only */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
            {/* Card A: Audio Loudness Equalization Injector */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-100">
                      {language === 'PT'
                        ? 'Injetor de Áudio & Loudness Equalization (FPS)'
                        : 'Deep Audio & Loudness Equalization Injector'}
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400">
                      MMDevices\Audio\Render\FxProperties
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openSoundControlPanel()}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[10px] font-bold text-neutral-200 cursor-pointer shrink-0"
                >
                  mmsys.cpl
                </button>
              </div>

              <p className="text-[11px] text-neutral-300 leading-relaxed">
                {language === 'PT'
                  ? 'Destrava a aba oculta "Enhancements / Melhorias" em drivers modernos do Windows 11 e ativa Loudness Equalization para realçar passos e áudios baixos em jogos competitivos.'
                  : 'Unlocks the hidden Windows Enhancements tab on modern drivers and enables Loudness Equalization for competitive audio clarity.'}
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">
                  {language === 'PT' ? 'Endpoint de Reprodução Ativo:' : 'Active Render Endpoint:'}
                </label>
                <select
                  value={selectedEndpointId}
                  onChange={(e) => setSelectedEndpointId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                >
                  {audioEndpoints.length === 0 && (
                    <option value="">{language === 'PT' ? 'Nenhum dispositivo ativo encontrado' : 'No active render endpoint found'}</option>
                  )}
                  {audioEndpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} ({ep.deviceName}) {ep.loudnessEqEnabled ? '✓ Loudness EQ' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleLoudnessEq(true)}
                  disabled={activeActions['audio_eq'] || !selectedEndpointId}
                  className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {activeActions['audio_eq'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>
                    {language === 'PT'
                      ? 'Destravar Enhancements & Ativar Loudness EQ'
                      : 'Unlock Enhancements & Enable Loudness EQ'}
                  </span>
                </button>
                <button
                  onClick={() => handleLoudnessEq(false)}
                  disabled={activeActions['audio_eq'] || !selectedEndpointId}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer"
                >
                  {language === 'PT' ? 'Reverter' : 'Revert'}
                </button>
              </div>

              {results['audio_eq'] && (
                <div className={`p-2 rounded-lg text-[11px] border ${results['audio_eq'].success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  {results['audio_eq'].message}
                </div>
              )}
            </div>

            {/* Card B: NIC Power Saving Disabler & IPv4-Only Network Mode */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-100">
                      {language === 'PT'
                        ? 'Economia da NIC Off & Modo de Rede IPv4-Only'
                        : 'NIC Power Saving Disabler & IPv4-Only Mode'}
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {netBindings ? `NIC: ${netBindings.adapterName}` : 'Ethernet / Wi-Fi Bindings'}
                    </span>
                  </div>
                </div>
              </div>

              {/* NIC EEE / Green Ethernet / PnP */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-neutral-200">
                    {language === 'PT' ? 'Desativar Economia da Placa de Rede (EEE / Green Ethernet / PnP)' : 'Disable NIC Power Saving (EEE / Green Ethernet / Wake-on-LAN)'}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {getTweak('nic_power_saving_off')?.currentValue || 'PnPCapabilities=24, EEE=0, ULPMode=0'}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleNicPowerSaving(true)}
                    disabled={activeActions['nic_ps']}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold cursor-pointer"
                  >
                    {language === 'PT' ? 'Aplicar Off' : 'Apply Off'}
                  </button>
                  <button
                    onClick={() => handleNicPowerSaving(false)}
                    disabled={activeActions['nic_ps']}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-xs cursor-pointer"
                  >
                    {language === 'PT' ? 'Reverter' : 'Revert'}
                  </button>
                </div>
              </div>

              {/* IPv4-Only Binding Mode + Preserve SMB */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-200">
                    {language === 'PT' ? 'Modo de Rede IPv4-Only (NetAdapterBinding)' : 'IPv4-Only Network Mode (NetAdapterBinding)'}
                  </span>
                  {netBindings && (
                    <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                      <span className={`px-1.5 py-0.5 rounded ${netBindings.ipv4Enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>IPv4:{netBindings.ipv4Enabled ? 'ON' : 'OFF'}</span>
                      <span className={`px-1.5 py-0.5 rounded ${!netBindings.ipv6Enabled ? 'bg-cyan-500/15 text-cyan-300' : 'bg-neutral-800 text-neutral-400'}`}>IPv6:{netBindings.ipv6Enabled ? 'ON' : 'OFF'}</span>
                      <span className={`px-1.5 py-0.5 rounded ${!netBindings.qosEnabled ? 'bg-cyan-500/15 text-cyan-300' : 'bg-neutral-800 text-neutral-400'}`}>QoS:{netBindings.qosEnabled ? 'ON' : 'OFF'}</span>
                      <span className={`px-1.5 py-0.5 rounded ${netBindings.smbEnabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>SMB:{netBindings.smbEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveSmb}
                    onChange={(e) => setPreserveSmb(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>
                    {language === 'PT'
                      ? 'Preservar Compartilhamento de Arquivos em Rede Local (SMB ms_server / ms_msclient)'
                      : 'Preserve Local Network File Sharing (SMB ms_server / ms_msclient)'}
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleIpv4Only(true)}
                    disabled={activeActions['ipv4_only']}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-100 cursor-pointer"
                  >
                    {activeActions['ipv4_only'] ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                    <span>{language === 'PT' ? 'Ativar Modo IPv4-Only' : 'Enable IPv4-Only'}</span>
                  </button>
                  <button
                    onClick={() => handleToggleIpv4Only(false)}
                    disabled={activeActions['ipv4_only']}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-300 cursor-pointer"
                  >
                    {language === 'PT' ? 'Restaurar IPv6/QoS' : 'Restore All'}
                  </button>
                </div>
              </div>

              {(results['nic_ps'] || results['ipv4_only']) && (
                <div className="p-2 rounded-lg text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {results['ipv4_only']?.message || results['nic_ps']?.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Gerenciador de Inicialização */}
      {subView === 'startup' && (
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-4 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">
                  {language === 'PT' ? 'Gerenciador de Aplicativos de Inicialização' : 'Startup Applications Manager'}
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                  {startupApps.length} {language === 'PT' ? 'programas encontrados' : 'programs found'} • {activeStartupCount} {language === 'PT' ? 'ativos no boot' : 'active at boot'}
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
                  placeholder={language === 'PT' ? 'Pesquisar programa...' : 'Search startup app...'}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 font-mono"
                />
              </div>

              <button
                onClick={loadStartupList}
                disabled={loadingStartup}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors border border-neutral-700"
                title={language === 'PT' ? 'Recarregar Inicializadores' : 'Reload Startup Apps'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStartup ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[360px] overflow-y-auto no-scrollbar">
            {filteredStartupApps.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-400">
                {loadingStartup ? (language === 'PT' ? 'Carregando inicializadores...' : 'Loading startup apps...') : (language === 'PT' ? 'Nenhum aplicativo encontrado.' : 'No startup apps found.')}
              </div>
            ) : (
              filteredStartupApps.map((item) => {
                const busyToggle = !!activeActions[`tg_${item.name}`];
                const busyRm = !!activeActions[`rm_${item.name}`];
                return (
                  <div
                    key={`${item.location}_${item.name}`}
                    className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-200 truncate">{item.name}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono shrink-0">
                          {item.location}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            item.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {item.enabled ? (language === 'PT' ? 'Ativo' : 'Active') : (language === 'PT' ? 'Desativado' : 'Disabled')}
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
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                      >
                        {busyToggle ? <Loader2 className="w-3 h-3 animate-spin" /> : item.enabled ? (language === 'PT' ? 'Desativar' : 'Disable') : (language === 'PT' ? 'Ativar' : 'Enable')}
                      </button>

                      <button
                        onClick={() => handleRemoveStartup(item)}
                        disabled={busyToggle || busyRm}
                        className="px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-neutral-700 text-xs font-semibold transition-colors"
                        title={language === 'PT' ? 'Excluir da inicialização' : 'Remove from startup'}
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

      {/* SUB-VIEW 3: Checklist Pós-Formatação */}
      {subView === 'checklist' && (
        <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                {language === 'PT' ? 'Checklist de Ajustes Rápidos Pós-Formatação' : 'Post-Format Quick Tweaks Checklist'}
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              <strong className="text-emerald-400 font-bold tabular-nums">{activeChecklistCount}</strong> / 11 {language === 'PT' ? 'ajustes ativos' : 'active tweaks'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto no-scrollbar">
            {checklistItems.map((item) => {
              const busy = !!activeActions[`chk_${item.id}`];
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-200 truncate">{item.title}</h4>
                      {item.requiresAdmin && (
                        <span title={language === 'PT' ? 'Requer Administrador' : 'Requires Administrator'} className="inline-flex">
                          <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-snug mt-0.5 line-clamp-2">
                      {item.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const action = () => handleToggleChecklist(item.id, item.active);
                      if (!item.active && (item.requiresAdmin || item.id === 'telemetry' || item.id === 'fast_startup')) {
                        requireRestorePoint(item.title, 'medium', action);
                      } else {
                        action();
                      }
                    }}
                    disabled={busy}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                      item.active ? 'bg-cyan-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        item.active ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* MÓDULO 3: SETUP INICIAL DO SISTEMA (BITLOCKER, RAM COMPRESSION, NTP SYNC, WINDOWS UPDATE, UWP) */}
          <div className="pt-4 mt-4 border-t border-neutral-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                {language === 'PT'
                  ? 'Módulo 3 — Setup Inicial do Sistema (BitLocker, Memória, NTP & Updates)'
                  : 'Module 3 — Initial System Setup (BitLocker, Memory, NTP & Updates)'}
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* BitLocker Audit & 1-Click Decrypt */}
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-neutral-100">
                      {language === 'PT'
                        ? 'Auditoria e Desativação do BitLocker (Win11 24H2-26H2)'
                        : 'BitLocker Audit & 1-Click Decrypt'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">manage-bde -off</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  {language === 'PT'
                    ? 'A criptografia automática do Windows 11 reduz IOPS aleatório em SSDs NVMe e adiciona overhead de CPU.'
                    : 'Default BitLocker device encryption on Windows 11 24H2+ reduces NVMe random IOPS and adds CPU I/O overhead.'}
                </p>
                <div className="space-y-1.5">
                  {bitlockerDrives.map((d) => (
                    <div
                      key={d.drive}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px]"
                    >
                      <div className="font-mono">
                        <strong className="text-neutral-100">{d.drive}</strong> •{' '}
                        <span className={d.protectionOn || d.percentageEncrypted > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                          {d.status} ({d.percentageEncrypted}%)
                        </span>
                      </div>
                      {(d.protectionOn || d.percentageEncrypted > 0) && (
                        <button
                          onClick={() => handleBitlockerDecrypt(d.drive)}
                          disabled={activeActions[`bl_${d.drive}`]}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[10px] cursor-pointer"
                        >
                          {language === 'PT' ? 'Desencriptar' : 'Decrypt Off'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {results['bitlocker'] && (
                  <div className="text-[10px] font-mono text-emerald-300">{results['bitlocker'].message}</div>
                )}
              </div>

              {/* Smart Memory Compression */}
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-100">
                      {language === 'PT'
                        ? 'Compressão de Memória RAM (MMAgent)'
                        : 'Smart Memory Compression (MMAgent)'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ramTotalGb >= 16
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {ramTotalGb >= 16
                        ? `${Math.round(ramTotalGb)} GB RAM -> ${language === 'PT' ? 'Recom. Desativar' : 'Rec: Disable'}`
                        : `${Math.round(ramTotalGb)} GB RAM -> ${language === 'PT' ? 'Recom. Manter Ativo' : 'Rec: Keep Active'}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    {language === 'PT'
                      ? 'Com >= 16 GB de RAM, desativar a compressão elimina micro-stutters causados por compactação na CPU. Em portáteis <= 8 GB, mantenha ativo.'
                      : 'With >= 16 GB RAM, disabling compression stops CPU compression micro-stutters. On <= 8 GB handhelds/laptops, keep enabled.'}
                  </p>
                  <div className="text-[10px] font-mono text-neutral-300">
                    Status: <strong className="text-cyan-300">{getTweak('memory_compression')?.currentValue || 'Get-MMAgent'}</strong>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLiveTweak('memory_compression', true, 'Disable Memory Compression', true)}
                    disabled={activeActions['lt_memory_compression']}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold cursor-pointer"
                  >
                    {language === 'PT' ? 'Desativar Compressão' : 'Disable Compression'}
                  </button>
                  <button
                    onClick={() => handleLiveTweak('memory_compression', false, 'Enable Memory Compression', false)}
                    disabled={activeActions['lt_memory_compression']}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs cursor-pointer"
                  >
                    {language === 'PT' ? 'Reverter (Ativar)' : 'Enable (Revert)'}
                  </button>
                </div>
              </div>

              {/* NTP Clock & Windows Update 1-Year Pause + Resume + Delivery Optimization */}
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-100">
                    {language === 'PT'
                      ? 'Relógio NTP Sync & Windows Update (Pausa 1 Ano + Resume)'
                      : 'NTP Clock Sync & Windows Update (1-Year Pause + Resume)'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {language === 'PT'
                    ? 'Sincroniza w32time /resync (corrige falhas de login/download Xbox/Store), pausa updates por 365 dias ou retoma imediatamente, e desativa P2P.'
                    : 'Resyncs w32time (fixes Microsoft Store / Xbox auth errors), pauses updates up to 1 year with instant Resume, and turns Delivery Optimization P2P Off.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction('ntp_sync', syncSystemTime)}
                    disabled={activeActions['ntp_sync']}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language === 'PT' ? 'Sincronizar Relógio NTP' : 'Sync NTP Clock'}</span>
                  </button>
                  <button
                    onClick={() => handleLiveTweak('windows_update_pause', true, 'Pausar Windows Update (1 Ano)', true)}
                    disabled={activeActions['lt_windows_update_pause']}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
                  >
                    {language === 'PT' ? 'Pausar Updates (1 Ano)' : 'Pause Updates (1 Yr)'}
                  </button>
                  <button
                    onClick={() => handleLiveTweak('windows_update_pause', false, 'Retomar Windows Update', false)}
                    disabled={activeActions['lt_windows_update_pause']}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    {language === 'PT' ? 'Retomar Atualizações (Resume)' : 'Resume Updates'}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-neutral-400">
                  <span>{getTweak('windows_update_pause')?.currentValue || 'Update status'}</span>
                  {results['ntp_sync'] && <span className="text-emerald-300">{results['ntp_sync'].message}</span>}
                </div>
              </div>

              {/* Delivery Optimization + UWP Background + Store Auto-Update */}
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-neutral-100 block">
                  {language === 'PT'
                    ? 'P2P Delivery Optimization, Apps UWP & Microsoft Store'
                    : 'P2P Delivery Optimization, UWP Background & Store Auto-Update'}
                </span>
                {[
                  { id: 'delivery_optimization_off', labelPt: 'Desativar Delivery Optimization (P2P Off)', labelEn: 'Disable Delivery Optimization (P2P Off)' },
                  { id: 'uwp_background_off', labelPt: 'Bloquear Apps UWP em Segundo Plano', labelEn: 'Block Background UWP Apps' },
                  { id: 'store_autoupdate_off', labelPt: 'Desativar Auto-Update da Microsoft Store', labelEn: 'Disable Store Auto-Updates' },
                ].map((row) => {
                  const tw = getTweak(row.id);
                  const active = Boolean(tw?.applied);
                  return (
                    <div key={row.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                      <span className={active ? 'text-emerald-300 font-semibold' : 'text-neutral-300'}>
                        {language === 'PT' ? row.labelPt : row.labelEn}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleLiveTweak(row.id, true, row.labelPt, true)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}`}
                        >
                          {active ? (language === 'PT' ? 'Aplicado' : 'Applied') : (language === 'PT' ? 'Aplicar' : 'Apply')}
                        </button>
                        {active && (
                          <button
                            onClick={() => handleLiveTweak(row.id, false, row.labelPt, false)}
                            className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 text-[10px] cursor-pointer"
                          >
                            {language === 'PT' ? 'Reverter' : 'Revert'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MÓDULO 6.1: PERSONALIZAÇÃO SHELL, NOTEPAD, EFEITOS VISUAIS, EXPLORER PRO & TEMA BLACKOUT */}
          <div className="pt-4 mt-4 border-t border-neutral-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                {language === 'PT'
                  ? 'Módulo 6 — Shell Clássico, Notepad Limpo, Efeitos Visuais, Explorer Pro & Tema Blackout'
                  : 'Module 6 — Classic Context Menu, Clean Notepad, Visual FX, Explorer Pro & Blackout Theme'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'classic_context_menu',
                  titlePt: 'Menu de Contexto Clássico (Win10)',
                  titleEn: 'Classic Context Menu (Win10)',
                  descPt: 'Menu direito instantâneo completo (nota: preserva acesso clássico p/ mapear unidade de rede).',
                  descEn: 'Restores instant Win10 right-click menu (reinforces classic network drive workflows).',
                },
                {
                  id: 'clean_notepad',
                  titlePt: 'Bloco de Notas Limpo (Sem IA)',
                  titleEn: 'Clean Notepad (No Copilot/Tabs)',
                  descPt: 'Preserva o Notepad desativando Copilot/IA e abertura de abas da sessão anterior.',
                  descEn: 'Preserves Notepad while disabling Copilot AI buttons and session tab restore.',
                },
                {
                  id: 'visual_effects_opt',
                  titlePt: 'Efeitos Visuais Otimizados',
                  titleEn: 'Lean Visual Effects (ClearType Safe)',
                  descPt: 'Remove animações de minimizar/barra preservando fontes nítidas e miniaturas.',
                  descEn: 'Disables window animations while keeping ClearType font smoothing and thumbnails.',
                },
                {
                  id: 'explorer_pro_settings',
                  titlePt: 'Explorer Pro & Dynamic Lighting Off',
                  titleEn: 'Explorer Pro & Dynamic Lighting Off',
                  descPt: 'Mostra extensões, arquivos ocultos, abre em Este Computador e desliga Iluminação Dinâmica.',
                  descEn: 'Shows extensions, hidden files, opens This PC, and turns off Dynamic Lighting.',
                },
                {
                  id: 'full_blackout_theme',
                  titlePt: 'Tema Escuro Total & Zero Transparência',
                  titleEn: 'Full Blackout Theme (No Transparency)',
                  descPt: 'Força Dark Mode total em Sistema/Apps e remove transparência Mica/Acrylic.',
                  descEn: 'Enforces dark mode across Apps/OS and disables window transparency overhead.',
                },
              ].map((cfg) => {
                const tw = getTweak(cfg.id);
                const applied = Boolean(tw?.applied);
                const busy = !!activeActions[`lt_${cfg.id}`];
                return (
                  <div
                    key={cfg.id}
                    className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-100">
                          {language === 'PT' ? cfg.titlePt : cfg.titleEn}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${applied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>
                          {applied ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
                        {language === 'PT' ? cfg.descPt : cfg.descEn}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleLiveTweak(cfg.id, true, cfg.titlePt, false)}
                        disabled={busy}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold cursor-pointer"
                      >
                        {language === 'PT' ? 'Aplicar' : 'Apply'}
                      </button>
                      <button
                        onClick={() => handleLiveTweak(cfg.id, false, cfg.titlePt, false)}
                        disabled={busy}
                        className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-[11px] cursor-pointer"
                      >
                        {language === 'PT' ? 'Reverter' : 'Revert'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Manutenção Avançada */}
      {subView === 'maintenance' && (
        <div className="space-y-4 shrink-0">
          {/* MÓDULO 6.2: Extermínio de IA Win11 24H2-26H2 + Whitelist Endurecida + Restauração Seletiva */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Windows AI Extermination + Hardened Whitelist */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>
                      {language === 'PT'
                        ? 'Extermínio de IA Windows 11 24H2–26H2'
                        : 'Windows 11 24H2–26H2 AI Extermination'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {language === 'PT'
                      ? 'Desativa via GPO: Windows Copilot, Windows Recall (Snapshots), Paint Image Creator/Cocreator e Cross Device Resume.'
                      : 'Disables Windows Copilot, Recall Snapshots, Paint Cocreator, and Cross Device Resume via Registry policies.'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getTweak('disable_windows_ai')?.applied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>
                  {getTweak('disable_windows_ai')?.applied ? 'IA Bloqueada' : 'Padrão'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleLiveTweak('disable_windows_ai', true, 'Extermínio de IA (Copilot, Recall, Cocreator)', true)}
                  disabled={activeActions['lt_disable_windows_ai']}
                  className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs cursor-pointer"
                >
                  {language === 'PT' ? 'Desativar Toda IA do Windows 11' : 'Disable All Windows 11 AI'}
                </button>
                <button
                  onClick={() => handleLiveTweak('disable_windows_ai', false, 'Reverter Políticas de IA', false)}
                  disabled={activeActions['lt_disable_windows_ai']}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-300 cursor-pointer"
                >
                  {language === 'PT' ? 'Reverter' : 'Revert'}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-[10px]">
                <strong className="text-emerald-300 block mb-1">
                  {language === 'PT'
                    ? 'Whitelist Endurecida de Debloat (Sempre Preservados):'
                    : 'Hardened Debloat Whitelist (Never Removed):'}
                </strong>
                <div className="flex flex-wrap gap-1.5 font-mono text-neutral-300">
                  {['Paint', 'Photos', 'Notepad', 'HEVC/AV1/WebP Codecs', '.NET Framework', 'VBScript', 'EdgeWebView2'].map((pkg) => (
                    <span key={pkg} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                      {pkg}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Selective Component Restoration Panel */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>
                    {language === 'PT'
                      ? 'Restauração Seletiva de Componentes Essenciais'
                      : 'Selective Essential Component Restoration'}
                  </span>
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {language === 'PT'
                    ? 'Reinstale rapidamente componentes removidos por scripts agressivos ou ISOs modificadas.'
                    : 'Quickly repair or reinstall core Windows packages broken by aggressive third-party debloaters.'}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                <strong>{language === 'PT' ? 'Nota Xbox / Steam:' : 'Xbox / Steam Notice:'}</strong>{' '}
                {language === 'PT'
                  ? 'Jogos da Microsoft/Xbox comprados na Steam (Forza Horizon, Sea of Thieves, Halo, etc.) exigem Xbox Game Bar & Gaming Services para exibir o pop-up de login Xbox.'
                  : 'Microsoft/Xbox titles on Steam (Forza Horizon, Sea of Thieves, Halo) require Xbox Game Bar & Gaming Services for the Xbox Live sign-in popup.'}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleAction('restore_xbox', () => restoreEssentialApp('xbox_gaming'))}
                  disabled={activeActions['restore_xbox']}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 flex items-center justify-between cursor-pointer"
                >
                  <span>{language === 'PT' ? 'Reparar/Reinstalar Xbox Game Bar & Gaming Services' : 'Repair/Reinstall Xbox Game Bar & Gaming Services'}</span>
                  {activeActions['restore_xbox'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => handleAction('restore_store', () => restoreEssentialApp('ms_store'))}
                  disabled={activeActions['restore_store']}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 flex items-center justify-between cursor-pointer"
                >
                  <span>{language === 'PT' ? 'Reparar/Reinstalar Microsoft Store (wsreset -i)' : 'Repair/Reinstall Microsoft Store (wsreset -i)'}</span>
                  {activeActions['restore_store'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => handleAction('restore_calc_snip', () => restoreEssentialApp('calc_snipping'))}
                  disabled={activeActions['restore_calc_snip']}
                  className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 flex items-center justify-between cursor-pointer"
                >
                  <span>{language === 'PT' ? 'Reinstalar Calculadora & Ferramenta de Captura' : 'Reinstall Calculator & Snipping Tool'}</span>
                  {activeActions['restore_calc_snip'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 shrink-0">
          {/* Tool 1: Bloatware */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">Remover Bloatware Universal</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">UWP / AppX Package</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Remove aplicativos pré-instalados desnecessários do Windows mantendo loja e utilitários essenciais intactos.
              </p>
            </div>
            <button
              onClick={() => handleAction('bloatware', removeBloatware)}
              disabled={activeActions['bloatware']}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700"
            >
              {activeActions['bloatware'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Limpar Bloatware' : 'Clean Bloatware'}</span>
            </button>
          </div>

          {/* Tool 2: SFC / DISM */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">Verificação de Integridade (SFC)</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">sfc.exe & dism.exe</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Varre e repara arquivos corrompidos da instalação do Windows e repara a imagem do sistema.
              </p>
            </div>
            <button
              onClick={() => handleAction('sfc', runSfcScan)}
              disabled={activeActions['sfc']}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700"
            >
              {activeActions['sfc'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Iniciar Verificação SFC' : 'Run SFC Scan'}</span>
            </button>
          </div>

          {/* Tool 3: Windows Update Repair */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">Reparar Windows Update</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">wuauserv & BITS</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Reinicia serviços travados do Windows Update e recria a pasta SoftwareDistribution com segurança.
              </p>
            </div>
            <button
              onClick={() => handleAction('win_update', repairWindowsUpdate)}
              disabled={activeActions['win_update']}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700"
            >
              {activeActions['win_update'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Reparar Update' : 'Repair Update'}</span>
            </button>
          </div>

          {/* Tool 4: Relatório de Bateria & Energia */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">Relatório de Energia / Bateria</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">powercfg /batteryreport</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Gera um relatório HTML completo com histórico de capacidade, ciclos de recarga e degradação da bateria.
              </p>
            </div>
            <button
              onClick={() => handleAction('battery_report', generateBatteryOrEnergyReport)}
              disabled={activeActions['battery_report']}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700"
            >
              {activeActions['battery_report'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BatteryCharging className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Gerar Relatório' : 'Generate Report'}</span>
            </button>
          </div>

          {/* Tool 5: Backup de Drivers */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">Exportar Backup de Drivers</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">dism /export-driver</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Exporta todos os drivers de terceiros instalados no sistema para uma pasta segura para restauração pós-formatação.
              </p>
            </div>
            <button
              onClick={() => handleAction('drivers_backup', backupDrivers)}
              disabled={activeActions['drivers_backup']}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700"
            >
              {activeActions['drivers_backup'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Exportar Drivers' : 'Export Drivers'}</span>
            </button>
          </div>

          {/* Tool 6: Reset de Cache de Fontes */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">Reset de Cache de Fontes</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">FntCache.dat</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Resolve glifos corrompidos, textos borrados e travamentos de renderização tipográfica no Windows Explorer.
              </p>
            </div>
            <button
              onClick={() => handleAction('font_cache', resetFontCache)}
              disabled={activeActions['font_cache']}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700"
            >
              {activeActions['font_cache'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Type className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Resetar Cache' : 'Reset Font Cache'}</span>
            </button>
          </div>
          </div>
        </div>
      )}

      {techModalData && (
        <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
      )}
    </div>
  );
}
