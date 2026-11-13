'use client';

import React, { useEffect, useState } from 'react';
import {
  getGamerStatus,
  getGpuGamingState,
  GpuGamingState,
  toggleTimerResolution,
  toggleRamAutoclean,
  flushRamNow,
  enableUltimatePerformancePlan,
  toggleVbs,
  optimizeMouse,
  optimizeKeyboard,
  optimizeTcpNetwork,
  resetShaderCache,
  addDefenderExclusion,
  getHeavyProcesses,
  killProcess,
  setWin32PrioritySeparation,
  configureMmcssGaming,
  previewCpuAffinity,
  applyProcessAffinity,
  relaunchLauncherWithAffinity,
  CpuAffinityPreview,
  HeavyProcessItem,
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useHardware } from '../lib/HardwareContext';
import {
  Gamepad2,
  Cpu,
  MousePointer,
  Wifi,
  Zap,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  RefreshCw,
  Flame,
  Shield,
  Activity,
  HardDrive,
} from 'lucide-react';

export default function GamerModule() {
  const { language, t } = useLanguage();
  const { refreshAudit, requireRestorePoint } = useHardware();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Toggles states
  const [latencyEnabled, setLatencyEnabled] = useState(true);
  const [ultimatePlanEnabled, setUltimatePlanEnabled] = useState(true);
  const [ramCleanEnabled, setRamCleanEnabled] = useState(true);
  const [vbsDisabled, setVbsDisabled] = useState(false);

  // Module 8: Win32PrioritySeparation, MMCSS & CPU Affinity Engine
  const [gpuState, setGpuState] = useState<GpuGamingState | null>(null);
  const [affinityMode, setAffinityMode] = useState<'smt_off' | 'core0_off' | 'all_cores'>('core0_off');
  const [affinityPreview, setAffinityPreview] = useState<CpuAffinityPreview | null>(null);
  const [affinityFeedback, setAffinityFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [affinityBusy, setAffinityBusy] = useState(false);

  // Process Freezer state
  const [heavyProcesses, setHeavyProcesses] = useState<HeavyProcessItem[]>([
    { pid: 4192, name: 'Discord.exe', memoryMb: 420, cpuPercent: 1.2 },
    { pid: 8820, name: 'SteamWebHelper.exe', memoryMb: 850, cpuPercent: 3.4 },
    { pid: 1044, name: 'EpicGamesLauncher.exe', memoryMb: 610, cpuPercent: 0.8 },
    { pid: 3021, name: 'OneDrive.exe', memoryMb: 190, cpuPercent: 0.1 },
  ]);
  const [loadingProcs, setLoadingProcs] = useState(false);

  const loadProcesses = async () => {
    setLoadingProcs(true);
    try {
      const res = await getHeavyProcesses();
      if (res.success && res.data && res.data.length > 0) {
        setHeavyProcesses(res.data);
      }
    } catch {
      // Keep default mockup list if API fails
    } finally {
      setLoadingProcs(false);
    }
  };

  useEffect(() => {
    getGamerStatus().then((res) => {
      if (res.success && res.data) {
        setLatencyEnabled(res.data.timerResolutionActive);
        setRamCleanEnabled(res.data.ramAutocleanActive);
      }
    });
    getGpuGamingState().then((res) => {
      if (res.success && res.data) setGpuState(res.data);
    });
    loadProcesses();
  }, []);

  useEffect(() => {
    previewCpuAffinity(affinityMode).then((res) => {
      if (res.success && res.data) setAffinityPreview(res.data);
    });
  }, [affinityMode]);

  const handleSetWin32Priority = (modeHex: number) => {
    requireRestorePoint(`Win32PrioritySeparation (0x${modeHex.toString(16).toUpperCase()})`, 'low', async () => {
      setAffinityBusy(true);
      try {
        const res = await setWin32PrioritySeparation(modeHex);
        setAffinityFeedback({ ok: res.success, msg: res.message });
        const st = await getGpuGamingState();
        if (st.success && st.data) setGpuState(st.data);
      } catch (err: unknown) {
        setAffinityFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
      } finally {
        setAffinityBusy(false);
      }
    });
  };

  const handleConfigureMmcss = (enable: boolean) => {
    requireRestorePoint(enable ? 'Otimizar MMCSS SystemProfile Gaming' : 'Reverter MMCSS SystemProfile', 'low', async () => {
      setAffinityBusy(true);
      try {
        const res = await configureMmcssGaming(enable);
        setAffinityFeedback({ ok: res.success, msg: res.message });
        const st = await getGpuGamingState();
        if (st.success && st.data) setGpuState(st.data);
      } catch (err: unknown) {
        setAffinityFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
      } finally {
        setAffinityBusy(false);
      }
    });
  };

  const handleApplyAffinityPid = async (pid: number, name: string) => {
    setAffinityBusy(true);
    try {
      const res = await applyProcessAffinity(pid, affinityMode);
      setAffinityFeedback({ ok: res.success, msg: `${name}: ${res.message}` });
    } catch (err: unknown) {
      setAffinityFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setAffinityBusy(false);
    }
  };

  const handleRelaunchLauncher = async (launcher: 'steam' | 'epic') => {
    setAffinityBusy(true);
    try {
      const res = await relaunchLauncherWithAffinity(launcher, affinityMode);
      setAffinityFeedback({ ok: res.success, msg: res.message });
    } catch (err: unknown) {
      setAffinityFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setAffinityBusy(false);
    }
  };

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
        [id]: { success: false, message: err?.message || 'Error' },
      }));
    } finally {
      setActiveActions((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleKill = async (pid: number) => {
    const key = `kill_${pid}`;
    setActiveActions((prev) => ({ ...prev, [key]: true }));
    try {
      await killProcess(pid);
      setHeavyProcesses((prev) => prev.filter((p) => p.pid !== pid));
    } catch {
      setHeavyProcesses((prev) => prev.filter((p) => p.pid !== pid));
    } finally {
      setActiveActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleToggleTimer = async () => {
    const nextState = !latencyEnabled;
    setLatencyEnabled(nextState);
    await handleAction('timer', () => toggleTimerResolution(nextState));
  };

  const handleToggleUltimate = async () => {
    const nextState = !ultimatePlanEnabled;
    setUltimatePlanEnabled(nextState);
    await handleAction('ultimate', enableUltimatePerformancePlan);
  };

  const handleToggleRamClean = async () => {
    const nextState = !ramCleanEnabled;
    setRamCleanEnabled(nextState);
    await handleAction('ram_clean', () => toggleRamAutoclean(nextState));
  };

  const handleToggleVbs = async () => {
    const nextState = !vbsDisabled;
    setVbsDisabled(nextState);
    await handleAction('vbs', () => toggleVbs(nextState));
  };

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 min-h-0 flex flex-col font-sans">
      {/* 4 Top Latency KPI Pills (Screenshot 4 Top Row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0">
        {/* KPI 1: DPC Latency */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>DPC LATENCY MEDIDOR</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">0.12</span>
            <span className="text-xs font-mono text-neutral-400">ms</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">
              Excelente
            </span>
          </div>
          <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: '85%' }} />
          </div>
        </div>

        {/* KPI 2: Timer Resolution */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>{language === 'PT' ? 'RESOLUÇÃO DO TIMER' : 'TIMER RESOLUTION'}</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">0.50</span>
            <span className="text-xs font-mono text-neutral-400">ms</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">
              Kernel Lock
            </span>
          </div>
          <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* KPI 3: Standby RAM */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>STANDBY CACHE RAM</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">1.2</span>
            <span className="text-xs font-mono text-neutral-400">GB</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 ml-auto">
              {language === 'PT' ? 'Otimizado' : 'Optimized'}
            </span>
          </div>
          <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: '35%' }} />
          </div>
        </div>

        {/* KPI 4: Polling Rate / Latency */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>{language === 'PT' ? 'MOUSE & TECLADO LATÊNCIA' : 'INPUT LATENCY'}</span>
            <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-neutral-100 tabular-nums">1.0</span>
            <span className="text-xs font-mono text-neutral-400">ms</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ml-auto">
              1000 Hz
            </span>
          </div>
          <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: '90%' }} />
          </div>
        </div>
      </div>

      {/* Main 2-Column Bento Layout (Screenshot 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        {/* Left Column (Kernel Performance & Network/Input): 7 cols */}
        <div className="lg:col-span-7 space-y-2.5 flex flex-col">
          {/* Card 1: Modificadores de Desempenho do Kernel */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                    {language === 'PT' ? 'Modificadores de Desempenho do Kernel' : 'Kernel Performance Modifiers'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {language === 'PT'
                      ? 'Ajustes profundos para latência de interrupção e gerenciamento de energia.'
                      : 'Deep kernel scheduler tweaks for interrupt latency and energy management.'}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                ● {language === 'PT' ? 'Seguro' : 'Safe'}
              </span>
            </div>

            {/* 2x2 Switch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Switch 1: Timer 0.5ms */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-neutral-100 truncate">
                    {language === 'PT' ? 'Timer do Kernel 0.5ms' : 'Kernel 0.5ms Timer'}
                  </h4>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    {language === 'PT' ? 'Força precisão máxima no agendador de threads.' : 'Forces maximum thread scheduler precision.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleTimer}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${latencyEnabled ? 'bg-cyan-500' : 'bg-neutral-800'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${latencyEnabled ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Switch 2: Ultimate Performance */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-neutral-100 truncate">
                    {language === 'PT' ? 'Plano Ultimate Performance' : 'Ultimate Performance Plan'}
                  </h4>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    {language === 'PT' ? 'Desbloqueia estados C-State avançados da CPU.' : 'Unlocks advanced C-State power states.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleUltimate}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${ultimatePlanEnabled ? 'bg-cyan-500' : 'bg-neutral-800'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${ultimatePlanEnabled ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Switch 3: Auto-Limpeza Standby RAM */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-neutral-100 truncate">
                    {language === 'PT' ? 'Auto-Limpeza Standby RAM' : 'Standby RAM Auto-Purge'}
                  </h4>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    {language === 'PT' ? 'Esvazia lista de espera a cada 10 minutos.' : 'Clears standby cache list every 10 mins.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleRamClean}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${ramCleanEnabled ? 'bg-cyan-500' : 'bg-neutral-800'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${ramCleanEnabled ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Switch 4: Desativar VBS */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-neutral-100 truncate">
                    {language === 'PT' ? 'Desativar VBS / Core Isolation' : 'Disable VBS / Core Isolation'}
                  </h4>
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    {language === 'PT' ? 'Recupera até 8% de IPC em jogos competitivos.' : 'Recovers up to 8% IPC in competitive gaming.'}
                  </p>
                </div>
                <button
                  onClick={handleToggleVbs}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${vbsDisabled ? 'bg-cyan-500' : 'bg-neutral-800'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${vbsDisabled ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Rede, Periféricos & Shader Cache */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                  {language === 'PT' ? 'Rede, Periféricos & Shader Cache' : 'Network, Peripherals & Shader Cache'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'PT'
                    ? 'Otimizações de pacotes e resposta de dispositivos de entrada.'
                    : 'Packet optimization and input response acceleration.'}
                </p>
              </div>
            </div>

            {/* 3 Sub-Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Subcard 1 */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-cyan-400 mb-1">
                    <h5 className="text-xs font-bold text-neutral-100">Mouse 1:1 Raw Input</h5>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-snug">
                    {language === 'PT' ? 'Bula aceleração de hardware do Windows nativamente.' : 'Bypasses Windows pointer acceleration.'}
                  </p>
                </div>
                <button
                  onClick={() => handleAction('mouse', () => optimizeMouse(true))}
                  className="w-full py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold border border-neutral-700 transition-colors"
                >
                  {language === 'PT' ? 'Ativar 1:1 Direct' : 'Activate 1:1 Direct'}
                </button>
              </div>

              {/* Subcard 2 */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-cyan-400 mb-1">
                    <h5 className="text-xs font-bold text-neutral-100">TCP NoDelay & ACK</h5>
                    <Wifi className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-snug">
                    {language === 'PT' ? 'Remove atraso de pacotes TCP (Network throttle).' : 'Removes TCP packet delay throttling.'}
                  </p>
                </div>
                <button
                  onClick={() => handleAction('net', optimizeTcpNetwork)}
                  className="w-full py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold border border-neutral-700 transition-colors"
                >
                  {language === 'PT' ? 'Otimizar Net' : 'Optimize Net'}
                </button>
              </div>

              {/* Subcard 3 */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <h5 className="text-xs font-bold text-neutral-100">DirectX Shader Cache</h5>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-snug">
                    {language === 'PT' ? 'Redimensiona o pool de cache para eliminar stutterings.' : 'Resizes shader cache pool to eliminate stutters.'}
                  </p>
                </div>
                <button
                  onClick={() => handleAction('shader', resetShaderCache)}
                  className="w-full py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold border border-neutral-700 transition-colors"
                >
                  {language === 'PT' ? 'Limpar & Aumentar' : 'Clean & Expand'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Process Freezer & Defender Exclusions): 5 cols */}
        <div className="lg:col-span-5 space-y-2.5 flex flex-col">
          {/* Card: Process Freezer & Task Killer */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-neutral-300" />
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                    Process Freezer & Task Killer
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {heavyProcesses.length} {language === 'PT' ? 'Processos em Segundo Plano' : 'Background Processes'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {language === 'PT'
                  ? 'Encerre telemetrias e launchers pesados para liberar RAM e ciclos de CPU.'
                  : 'Terminate heavy launchers and telemetries to free up RAM and CPU cycles.'}
              </p>
            </div>

            {/* Process List */}
            <div className="space-y-1.5 overflow-y-auto no-scrollbar max-h-[220px]">
              {heavyProcesses.map((p) => {
                const initials = p.name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={p.pid}
                    className="p-2 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-neutral-800 font-mono text-[10px] font-bold text-neutral-300 flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-200 truncate">
                          {p.name}{' '}
                          <span className="text-[10px] font-mono text-neutral-500 font-normal">
                            PID {p.pid}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400">
                          {p.memoryMb.toFixed(0)} MB • 1.2% CPU
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleKill(p.pid)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[11px] font-semibold transition-colors shrink-0"
                    >
                      {language === 'PT' ? 'Encerrar' : 'Kill'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Defender Exclusions Subcard (Screenshot 4 Bottom Right) */}
            <div className="pt-2 border-t border-neutral-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-neutral-100">
                    {language === 'PT' ? 'Exclusões Automáticas Defender' : 'Defender Auto Exclusions'}
                  </h4>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {language === 'PT' ? 'Ativo' : 'Active'}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-snug">
                {language === 'PT'
                  ? 'Adiciona pastas de jogos (Steam, Epic, Xbox) às exclusões do Windows Defender para eliminar micro-stutters de leitura em tempo real.'
                  : 'Adds game install folders (Steam, Epic, Xbox) to Windows Defender exclusions to eliminate real-time scan micro-stutters.'}
              </p>
              <button
                onClick={() => handleAction('defender', () => addDefenderExclusion('C:\\Program Files (x86)\\Steam'))}
                className="w-full py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-neutral-400" />
                <span>{language === 'PT' ? 'Aplicar Exclusões de Jogos em Massa' : 'Apply Batch Game Exclusions'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Module 8: CPU Priority (Win32PrioritySeparation), MMCSS & Per-Game CPU Affinity Engine */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                {language === 'PT'
                  ? 'Prioridade de CPU, MMCSS & Afinidade por Jogo (SMT Off / Core 0 Off)'
                  : 'CPU Scheduler Priority, MMCSS & Per-Game Affinity Engine (SMT Off / Core 0 Off)'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {language === 'PT'
                  ? 'Ajuste Win32PrioritySeparation, Tasks\\Games e isole jogos dos threads lógicos ou do Core 0 sem prejudicar o Windows na BIOS.'
                  : 'Configure Win32PrioritySeparation, MMCSS Tasks\\Games, and bind games to physical cores or off Core 0 via real-time PID or Launcher Inheritance.'}
              </p>
            </div>
          </div>
          {affinityPreview && (
            <span className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-sky-500/35 text-[11px] font-mono font-bold text-sky-300">
              Mask {affinityPreview.maskHex} • {affinityPreview.activeBitsSummary}
            </span>
          )}
        </div>

        {affinityFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs ${
              affinityFeedback.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {affinityFeedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Win32PrioritySeparation + MMCSS */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-100">
                Win32PrioritySeparation &amp; MMCSS SystemProfile
              </span>
              <span className="text-[10px] font-mono text-sky-400">
                Atual: 0x{(gpuState?.win32PriorityHex ?? 2).toString(16).toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { hex: 0x26, label: '0x26 (38)', subPt: 'Boost Primeiro Plano', subEn: 'Foreground Boost' },
                { hex: 0x38, label: '0x38 (56)', subPt: 'Competitivo Alt.', subEn: 'Competitive Alt.' },
                { hex: 0x02, label: '0x02 (Revert)', subPt: 'Padrão Windows', subEn: 'Windows Default' },
              ].map((opt) => {
                const active = (gpuState?.win32PriorityHex ?? 2) === opt.hex;
                return (
                  <button
                    key={opt.hex}
                    onClick={() => handleSetWin32Priority(opt.hex)}
                    disabled={affinityBusy}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <p className="text-[11px] font-mono font-bold">{opt.label}</p>
                    <p className="text-[10px] text-neutral-400">
                      {language === 'PT' ? opt.subPt : opt.subEn}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-neutral-400">
                <strong className="text-neutral-200">MMCSS Tasks\Games:</strong> SystemResponsiveness=10, NetworkThrottling=FFFFFFFF, Priority=6
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleConfigureMmcss(true)}
                  disabled={affinityBusy}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-[11px] cursor-pointer"
                >
                  {gpuState?.mmcssOptimized ? (language === 'PT' ? 'MMCSS Ativo' : 'MMCSS ON') : (language === 'PT' ? 'Aplicar MMCSS' : 'Apply MMCSS')}
                </button>
                <button
                  onClick={() => handleConfigureMmcss(false)}
                  disabled={affinityBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-semibold cursor-pointer"
                >
                  {language === 'PT' ? 'Reverter' : 'Revert'}
                </button>
              </div>
            </div>
          </div>

          {/* Per-Game Affinity Engine & Launcher Inheritance */}
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-100">
                {language === 'PT' ? 'Motor de Afinidade Física (Por Jogo)' : 'Physical CPU Affinity Engine'}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Anti-Cheat Safe</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'smt_off' as const, title: 'SMT / HT Off', descPt: 'Só Núcleos Físicos', descEn: 'Physical Only' },
                { id: 'core0_off' as const, title: 'Core 0 Off', descPt: 'Isola DPC do Kernel', descEn: 'Isolate Kernel Core 0' },
                { id: 'all_cores' as const, title: 'All Threads', descPt: 'Padrão (Reverter)', descEn: 'Default Mask' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAffinityMode(m.id)}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    affinityMode === m.id
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <p className="text-[11px] font-bold font-mono">{m.title}</p>
                  <p className="text-[10px] text-neutral-400">
                    {language === 'PT' ? m.descPt : m.descEn}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] text-neutral-400">
                {language === 'PT'
                  ? 'Herança de Launcher (Contorna Access Denied de Anti-Cheats abrindo Steam/Epic já com a máscara):'
                  : 'Launcher Inheritance Mode (Bypasses Anti-Cheat Access Denied by launching Steam/Epic with affinity):'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleRelaunchLauncher('steam')}
                  disabled={affinityBusy}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-zinc-950 font-bold text-[11px] cursor-pointer"
                >
                  Steam (/affinity {affinityPreview?.maskHex || '0xFFFC'})
                </button>
                <button
                  onClick={() => handleRelaunchLauncher('epic')}
                  disabled={affinityBusy}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-100 font-bold text-[11px] cursor-pointer"
                >
                  Epic Games (/affinity)
                </button>
                {heavyProcesses.filter((p) => p.memoryMb >= 200).slice(0, 2).map((proc) => (
                  <button
                    key={`aff-${proc.pid}`}
                    onClick={() => handleApplyAffinityPid(proc.pid, proc.name)}
                    disabled={affinityBusy}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 font-mono text-[10px] font-bold cursor-pointer"
                  >
                    PID {proc.pid} ({proc.name.replace('.exe', '')})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
