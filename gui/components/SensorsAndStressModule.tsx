"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Flame,
  Layers,
  MemoryStick,
  Monitor,
  Play,
  RefreshCw,
  ShieldCheck,
  Square,
  Thermometer,
} from "lucide-react";
import {
  applyAfterburner1PercentLowFix,
  getGpuGamingState,
  GpuGamingState,
  LiveSensorSnapshot,
  openExternalUrl,
  scanOcAndErrors,
  startStressTest,
  stopStressTest,
  toggleHudOverlay,
  TuningAndErrorsReport,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { useHardware } from "../lib/HardwareContext";

interface SensorsAndStressModuleProps {
  mode: "sensors" | "stress" | "overlay";
  liveSensors: LiveSensorSnapshot | null;
  onRefreshSensors: () => void;
}

type TelemetrySubTab = "live" | "stress" | "whea" | "protocols";

export default function SensorsAndStressModule({
  mode,
  liveSensors,
  onRefreshSensors,
}: SensorsAndStressModuleProps) {
  const { lang } = useLanguage();
  const { requireRestorePoint } = useHardware();
  const [activeTab, setActiveTab] = useState<TelemetrySubTab>(
    mode === "stress" ? "stress" : "live"
  );
  const [sensorCategory, setSensorCategory] = useState<string>("ALL");

  // Stress test state
  const [stressCpu, setStressCpu] = useState(true);
  const [stressRam, setStressRam] = useState(true);
  const [stressBusy, setStressBusy] = useState(false);

  // WHEA & Kernel-Power live scanner state
  const [wheaReport, setWheaReport] = useState<TuningAndErrorsReport | null>(null);
  const [wheaLoading, setWheaLoading] = useState(false);

  // Overlay & Afterburner 1% Low Fix state
  const [overlayActive, setOverlayActive] = useState(false);
  const [overlayPos, setOverlayPos] = useState<string>("top-right");
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null);
  const [gpuState, setGpuState] = useState<GpuGamingState | null>(null);
  const [abBusy, setAbBusy] = useState(false);
  const [abFeedback, setAbFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadGpuState = useCallback(async () => {
    const res = await getGpuGamingState();
    if (res.success && res.data) setGpuState(res.data);
  }, []);

  useEffect(() => {
    if (mode === "overlay") {
      loadGpuState();
    }
  }, [mode, loadGpuState]);

  const handleAfterburnerFix = (revert: boolean) => {
    requireRestorePoint(
      revert
        ? lang === "en"
          ? "Revert MSI Afterburner Config Backup"
          : "Reverter Backup do MSI Afterburner"
        : lang === "en"
        ? "MSI Afterburner 1% Lows Profile Fix"
        : "Fix Crítico de 1% Lows (MSI Afterburner + RTSS)",
      "low",
      async () => {
        setAbBusy(true);
        setAbFeedback(null);
        try {
          const res = await applyAfterburner1PercentLowFix(revert);
          setAbFeedback({ ok: res.success, msg: res.message });
          await loadGpuState();
        } catch (err: unknown) {
          setAbFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
        } finally {
          setAbBusy(false);
        }
      }
    );
  };

  const loadWheaLogs = useCallback(async () => {
    setWheaLoading(true);
    try {
      const res = await scanOcAndErrors();
      if (res.data) setWheaReport(res.data);
    } finally {
      setWheaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "overlay" && activeTab === "whea" && !wheaReport) {
      loadWheaLogs();
    }
  }, [mode, activeTab, wheaReport, loadWheaLogs]);

  const handleToggleStress = async () => {
    setStressBusy(true);
    if (liveSensors?.stressRunning) {
      await stopStressTest();
    } else {
      await startStressTest(stressCpu, stressRam);
    }
    onRefreshSensors();
    setStressBusy(false);
  };

  const handleToggleOverlay = async (nextState: boolean, pos = overlayPos) => {
    const res = await toggleHudOverlay(nextState, pos);
    if (res.data) {
      setOverlayActive(res.data.active);
    } else {
      setOverlayActive(nextState);
    }
    setOverlayMsg(res.message);
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // -----------------------------------------------------------------
  // DEDICATED OVERLAY MODE (SYS GAMING -> HUD Overlay & RTSS)
  // -----------------------------------------------------------------
  if (mode === "overlay") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <span>In-Game HUD Overlay & RTSS</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Launch a lightweight, frameless, always-on-top telemetry window on the corner of your screen or pair with RivaTuner (RTSS) for DX12 hook overlays."
              : "Abra uma janela ultraleve Always-on-Top no canto da tela para monitorar temperaturas, FPS estimado e frametime enquanto joga."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                {lang === "en" ? "Screen Position" : "Posição na Tela"}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: "top-right", pt: "Topo Direito", en: "Top Right" },
                  { id: "top-left", pt: "Topo Esquerdo", en: "Top Left" },
                  { id: "bottom-right", pt: "Base Direita", en: "Bottom Right" },
                  { id: "bottom-left", pt: "Base Esquerda", en: "Bottom Left" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setOverlayPos(p.id);
                      if (overlayActive) handleToggleOverlay(true, p.id);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      overlayPos === p.id
                        ? "bg-white text-zinc-950 border-white"
                        : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
                    }`}
                  >
                    {lang === "en" ? p.en : p.pt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => handleToggleOverlay(!overlayActive)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  overlayActive
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-sky-500 hover:bg-sky-400 text-zinc-950"
                }`}
              >
                {overlayActive
                  ? lang === "en"
                    ? "Close HUD Overlay"
                    : "Fechar HUD Overlay"
                  : lang === "en"
                  ? "Launch HUD Overlay"
                  : "Ativar HUD Overlay"}
              </button>

              <button
                onClick={() =>
                  openExternalUrl("https://www.guru3d.com/download/rtss-rivatuner-statistics-server-download/")
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>RTSS (RivaTuner)</span>
              </button>
            </div>

            {overlayMsg && (
              <p className="text-xs text-sky-400 font-medium">{overlayMsg}</p>
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-6 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
              {lang === "en" ? "LIVE HUD PREVIEW" : "PRÉVIA DO HUD EM TEMPO REAL"}
            </span>
            <div className="w-64 rounded-xl bg-zinc-950/90 border border-sky-500/40 p-3.5 shadow-[0_0_30px_rgba(56,189,248,0.15)] font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                <span className="text-[10px] font-bold text-sky-400">
                  SYS OPTIMIZER HUD
                </span>
                <span className="text-[10px] text-emerald-400">0.5ms ON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">CPU</span>
                <span className="text-zinc-100 font-bold">
                  {liveSensors?.cpuTempC.toFixed(0)}°C ·{" "}
                  {liveSensors?.cpuLoadPercent.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">GPU</span>
                <span className="text-zinc-100 font-bold">
                  {liveSensors?.gpuTempC.toFixed(0)}°C ·{" "}
                  {liveSensors?.gpuLoadPercent.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">RAM</span>
                <span className="text-zinc-100 font-bold">
                  {liveSensors?.ramUsedGb.toFixed(1)} GB (
                  {liveSensors?.ramLoadPercent.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Module 5.2: MSI Afterburner + RTSS Optimized Profile Generator (1% Lows Critical Fix) */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>
                  {lang === "en"
                    ? "MSI Afterburner + RTSS Profile Generator (1% Lows Stutter Fix)"
                    : "Gerador de Perfil MSI Afterburner + RTSS (Fix Crítico de 1% Lows)"}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === "en"
                  ? "Hardware polling of GPU Power (W) and Power Percent (%) causes severe frame dips. Patch MSIAfterburner.cfg safely with backup and pre-configured F10/F11/F12 hotkeys."
                  : "O polling de sensores GPU Power (W) e Power Percent (%) no Afterburner causa quedas severas de 1% Lows. Patcheia MSIAfterburner.cfg com backup automático e hotkeys."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                  gpuState?.afterburnerInstalled
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                }`}
              >
                {gpuState?.afterburnerInstalled
                  ? lang === "en"
                    ? "Afterburner Detected"
                    : "Afterburner Detectado"
                  : lang === "en"
                  ? "Not Installed"
                  : "Não Instalado"}
              </span>
              {gpuState?.afterburnerFixApplied && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                  1% Low Fix ON
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
              <p className="font-bold text-amber-300">
                {lang === "en" ? "Sensor Polling Stutter Discovery" : "Descoberta: Sensor Polling Lag"}
              </p>
              <p className="text-[11px] leading-relaxed">
                {lang === "en"
                  ? "Querying 'GPU Power' and 'Power Percent' over SMbus/NVAPI on every tick blocks frame submission queues. Keeping Temp/Clocks/Frametime without Power polling preserves 1% Lows."
                  : "Consultar 'GPU power' e 'Power percent' a cada tick trava o barramento da GPU e derruba os 1% Lows em até 15%."}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <p className="font-bold text-zinc-200">
                {lang === "en" ? "Pre-Configured Global Hotkeys" : "Hotkeys Globais Pré-Configuradas"}
              </p>
              <ul className="text-[11px] text-zinc-400 font-mono space-y-0.5">
                <li>• F10: {lang === "en" ? "Toggle OSD Overlay" : "Mostrar/Ocultar OSD"}</li>
                <li>• F11: {lang === "en" ? "Begin Benchmark Log" : "Iniciar Benchmark"}</li>
                <li>• F12: {lang === "en" ? "End Benchmark Log" : "Encerrar Benchmark"}</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <p className="font-bold text-zinc-200">
                {lang === "en" ? "Target Configuration File" : "Arquivo & Backup Seguro"}
              </p>
              <p className="text-[10px] font-mono text-sky-300 break-all">
                {gpuState?.afterburnerCfgPath ||
                  "C:\\Program Files (x86)\\MSI Afterburner\\Profiles\\MSIAfterburner.cfg"}
              </p>
              <p className="text-[10px] text-zinc-500">
                Backup: MSIAfterburner.cfg.bak
              </p>
            </div>
          </div>

          {abFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                abFeedback.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              {abFeedback.msg}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleAfterburnerFix(false)}
              disabled={abBusy}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
            >
              {abBusy
                ? "..."
                : lang === "en"
                ? "Apply 1% Lows Profile Fix (.cfg + Hotkeys)"
                : "Aplicar Fix 1% Lows em MSIAfterburner.cfg"}
            </button>
            <button
              onClick={() => handleAfterburnerFix(true)}
              disabled={abBusy || !gpuState?.afterburnerFixApplied}
              className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40 font-semibold text-xs cursor-pointer"
            >
              {lang === "en" ? "Restore Original .cfg.bak" : "Reverter Backup .cfg.bak"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // UNIFIED SENSORS & STRESS WORKBENCH (SYS CORE -> Sensors & Stress)
  // -----------------------------------------------------------------
  const sensors = liveSensors?.sensors || [];
  const filteredSensors =
    sensorCategory === "ALL"
      ? sensors
      : sensors.filter((s) => s.category === sensorCategory);
  const running = Boolean(liveSensors?.stressRunning);
  const errors = liveSensors?.stressMemErrors ?? 0;

  return (
    <div className="space-y-5">
      {/* Unified Tool Switcher for Grouped Sensors, Stress, WHEA & OCCT/FurMark */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/70 p-1 rounded-xl border border-zinc-800/80">
          {[
            {
              id: "live" as TelemetrySubTab,
              pt: "Sensores em Tempo Real",
              en: "Live Sensors",
              icon: Thermometer,
            },
            {
              id: "stress" as TelemetrySubTab,
              pt: "Stress Test CPU/RAM",
              en: "CPU/RAM Stress Test",
              icon: Flame,
            },
            {
              id: "whea" as TelemetrySubTab,
              pt: "Monitor WHEA & Kernel",
              en: "WHEA & Kernel Monitor",
              icon: AlertTriangle,
            },
            {
              id: "protocols" as TelemetrySubTab,
              pt: "OCCT, FurMark & Guia",
              en: "OCCT, FurMark & Guide",
              icon: BookOpen,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{lang === "en" ? tab.en : tab.pt}</span>
                {tab.id === "stress" && running && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Shared Quick Stress Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
            CPU: <strong className="text-sky-400">{liveSensors?.cpuTempC.toFixed(1) ?? "--"}°C</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300">
            GPU: <strong className="text-emerald-400">{liveSensors?.gpuTempC.toFixed(1) ?? "--"}°C</strong>
          </span>
        </div>
      </div>

      {/* TAB 1: LIVE SENSORS */}
      {activeTab === "live" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", pt: "Todos", en: "All" },
                { id: "Temperature", pt: "Temperaturas", en: "Temperatures" },
                { id: "Load", pt: "Carga (%)", en: "Load (%)" },
                { id: "Clock", pt: "Clocks (MHz)", en: "Clocks (MHz)" },
                { id: "Power", pt: "Potência (W)", en: "Power (W)" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSensorCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    sensorCategory === cat.id
                      ? "bg-sky-500 text-zinc-950 font-bold"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
                  }`}
                >
                  {lang === "en" ? cat.en : cat.pt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>CPU Package</span>
                <Cpu className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {liveSensors?.cpuTempC.toFixed(1) ?? "45.0"} °C
              </p>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Carga: {liveSensors?.cpuLoadPercent.toFixed(1)}% •{" "}
                {liveSensors?.cpuClockGhz.toFixed(2)} GHz
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>GPU Core</span>
                <Monitor className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {liveSensors?.gpuTempC.toFixed(1) ?? "42.0"} °C
              </p>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Carga: {liveSensors?.gpuLoadPercent.toFixed(1)}% •{" "}
                {liveSensors?.gpuClockMhz} MHz
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>GPU VRAM</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {liveSensors?.gpuVramUsedMb ?? 2048} MB
              </p>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Total: {liveSensors?.gpuVramTotalMb ?? 8192} MB •{" "}
                {liveSensors?.gpuPowerW.toFixed(1)} W
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Memória RAM</span>
                <MemoryStick className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {liveSensors?.ramLoadPercent.toFixed(1) ?? "32.0"} %
              </p>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {liveSensors?.ramUsedGb.toFixed(1)} GB /{" "}
                {liveSensors?.ramTotalGb.toFixed(1)} GB
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/70 text-[11px] uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Hardware</th>
                    <th className="py-3 px-4">Sensor</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Atual</th>
                    <th className="py-3 px-4 text-right">Mín</th>
                    <th className="py-3 px-4 text-right">Máx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {filteredSensors.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-sans text-zinc-300 font-medium">
                        {s.hardware}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-zinc-100 font-semibold">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-zinc-400">
                        {s.category}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-sky-400">
                        {s.value.toFixed(1)} {s.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">
                        {s.min.toFixed(1)} {s.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-200">
                        {s.max.toFixed(1)} {s.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STRESS TEST CPU/RAM */}
      {activeTab === "stress" && (
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stressCpu}
                  disabled={running}
                  onChange={(e) => setStressCpu(e.target.checked)}
                  className="accent-sky-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-zinc-200">
                  CPU Multi-Thread (FMA / Trig / XORShift64)
                </span>
              </label>

              <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stressRam}
                  disabled={running}
                  onChange={(e) => setStressRam(e.target.checked)}
                  className="accent-sky-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-zinc-200">
                  RAM Bit-Flip Verifier (256 MB Pattern Check)
                </span>
              </label>
            </div>

            <button
              onClick={handleToggleStress}
              disabled={stressBusy || (!stressCpu && !stressRam)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                running
                  ? "bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              }`}
            >
              {running ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>
                    {lang === "en" ? "STOP STRESS TEST" : "PARAR STRESS TEST"}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {lang === "en"
                      ? "START STRESS TEST"
                      : "INICIAR STRESS TEST"}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                {lang === "en" ? "Elapsed Time" : "Tempo Decorrido"}
              </span>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {formatDuration(liveSensors?.stressElapsedSecs ?? 0)}
              </p>
              <span className="text-[11px] text-zinc-500">
                Status: {running ? (lang === "en" ? "Running" : "Em execução") : lang === "en" ? "Stopped" : "Parado"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                {lang === "en" ? "Peak CPU Temp" : "Temp. Máxima Atingida"}
              </span>
              <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                {(liveSensors?.stressMaxTempC ?? liveSensors?.cpuTempC ?? 45).toFixed(1)} °C
              </p>
              <span className="text-[11px] text-zinc-500">
                {lang === "en" ? "Current" : "Atual"}: {liveSensors?.cpuTempC.toFixed(1)} °C
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                {lang === "en" ? "RAM Passes" : "Ciclos RAM Verificados"}
              </span>
              <p className="text-2xl font-black font-mono text-sky-400 mt-1">
                {liveSensors?.stressMemPasses ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">
                {lang === "en" ? "256 MB Blocks" : "Blocos de 256 MB"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                {lang === "en" ? "Hardware Errors" : "Erros Detectados"}
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 flex items-center gap-1.5 ${
                  errors === 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {errors === 0 ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                {errors}
              </p>
              <span className="text-[11px] text-zinc-500">
                {errors === 0
                  ? "100% Estável (0 Bit-Flips)"
                  : lang === "en"
                  ? "RAM Bit-Flip Detected!"
                  : "Instabilidade de RAM!"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE WHEA / KERNEL-POWER / TDR MONITOR */}
      {activeTab === "whea" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>
                  {lang === "en"
                    ? "Windows Event Log Hardware Error Auditor"
                    : "Monitor de Erros de Hardware (WHEA-Logger, Kernel-Power & TDR)"}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === "en"
                  ? "Scans Event Viewer for silent CPU cache/bus parity errors, sudden power drops, and GPU driver resets."
                  : "Audita o Log de Eventos do Windows buscando falhas silenciosas de CPU/RAM/PCIe, quedas de energia e resets de GPU."}
              </p>
            </div>
            <button
              onClick={loadWheaLogs}
              disabled={wheaLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${wheaLoading ? "animate-spin" : ""}`} />
              <span>{lang === "en" ? "Rescan Event Log" : "Reescanear Eventos"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                WHEA-Logger (CPU / PCIe / RAM)
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 ${
                  (wheaReport?.wheaErrorCount ?? 0) === 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {wheaReport?.wheaErrorCount ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">Event IDs 18, 19, 46, 47</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Kernel-Power 41 (Reboot Súbito)
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 ${
                  (wheaReport?.kernelPower41Count ?? 0) === 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {wheaReport?.kernelPower41Count ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">PSU / Undervolt / BSOD</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Display 4101 (Reset GPU TDR)
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 ${
                  (wheaReport?.gpuResetCount ?? 0) === 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {wheaReport?.gpuResetCount ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">Driver / VRAM / OC Reset</span>
            </div>
          </div>

          {wheaReport?.recentErrors && wheaReport.recentErrors.length > 0 ? (
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-2.5">
              {wheaReport.recentErrors.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">
                      {ev.source} (Event ID {ev.eventId})
                    </span>
                    <span className="font-mono text-zinc-400">{ev.timestamp}</span>
                  </div>
                  <p className="text-zinc-300">{ev.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold text-sm">
                  {lang === "en"
                    ? "Zero WHEA, Kernel-Power 41, or Display TDR events found!"
                    : "Nenhum erro crítico WHEA-Logger, Kernel-Power 41 ou Display TDR 4101 encontrado!"}
                </p>
                <p className="text-emerald-300/80 mt-0.5">
                  {lang === "en"
                    ? "Your CPU cores, PCIe link, and system memory reported zero hardware parity faults."
                    : "Seus núcleos de CPU, barramento PCIe e módulos RAM operam sem registros recentes de falha de hardware."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OCCT / FURMARK PROTOCOLS & TROUBLESHOOTING KB (Module 1.5) */}
      {activeTab === "protocols" && (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OCCT Protocol */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-100">
                  Protocolo OCCT (CPU, RAM & Fonte Power)
                </h4>
                <button
                  onClick={() => openExternalUrl("https://www.ocbase.com/")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>OCCT Official</span>
                </button>
              </div>
              <ol className="list-decimal pl-5 space-y-1.5 text-zinc-300 leading-relaxed">
                <li>
                  <strong>CPU + RAM (Large Data Set / AVX2):</strong> Rode por 30 minutos para validar Curve Optimizer / PBO negativo e detectar instabilidade silenciosa de cache L3 / WHEA Event 18.
                </li>
                <li>
                  <strong>Memory (80% RAM, Instruction Set Auto):</strong> Detecta corrupção por temperatura alta ou tREFI agressivo antes mesmo de dar tela azul.
                </li>
                <li>
                  <strong>VRAM & 3D Adaptive:</strong> Testa picos de boost transiente e estabilidade de memória GDDR6/X sem throttling artificial.
                </li>
                <li>
                  <strong>Power Test (Combinado):</strong> Puxa pico simultâneo de CPU + GPU para testar queda na linha +12V da fonte ATX.
                </li>
              </ol>
            </div>

            {/* FurMark 2 & HWInfo */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-zinc-100">
                  FurMark 2 & HWiNFO64 (Térmica / Hotspot / VRM)
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openExternalUrl("https://geeks3d.com/furmark/")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>FurMark 2</span>
                  </button>
                  <button
                    onClick={() => openExternalUrl("https://www.hwinfo.com/download/")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>HWiNFO64</span>
                  </button>
                </div>
              </div>
              <ul className="space-y-1.5 text-zinc-300 leading-relaxed">
                <li>
                  • <strong>Delta Core vs Hotspot GPU:</strong> No FurMark 2 com HWiNFO aberto, um delta (diferença) maior que <strong>20°C–25°C</strong> entre GPU Core e Hotspot indica pasta térmica bombeada ou contato irregular do dissipador.
                </li>
                <li>
                  • <strong>Memory Junction (VRAM):</strong> Temperaturas acima de 100°C em GDDR6X reduzem clocks drasticamente e indicam necessidade de fluxo de ar ou thermal pads.
                </li>
                <li>
                  • <strong>WHEA Hardware Errors no fundo do HWiNFO:</strong> Deve permanecer sempre em <strong>0</strong> durante qualquer stress test.
                </li>
              </ul>
            </div>
          </div>

          {/* Hardware Engineering Knowledge Base */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              {lang === "en"
                ? "Hardware Diagnostic Knowledge Base (Rare Root Causes)"
                : "Base de Conhecimento de Engenharia (Causas Raiz Não-Óbvias)"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <p className="font-bold text-amber-300">DDR5 &gt; 55°C (tREFI &amp; Refresh)</p>
                <p className="text-zinc-400 leading-relaxed">
                  Acima de 55°C no sensor SPD Hub, chips DDR5 (especialmente SK Hynix A-Die/M-Die com tREFI elevado) perdem retenção de carga, gerando erros aleatórios em jogos após 20–40 min quando a GPU aquece o gabinete.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <p className="font-bold text-sky-300">Pressão Desigual do Cooler no Soquete</p>
                <p className="text-zinc-400 leading-relaxed">
                  Parafusos de Air Cooler / Watercooler apertados demais de um lado em AM5 ou LGA1700 empenam levemente o PCB/pinos, causando perda de um canal de memória (Single Channel intermitente) ou erros de POST.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                <p className="font-bold text-purple-300">Loteria do Silício do IMC &amp; 4 Pentes</p>
                <p className="text-zinc-400 leading-relaxed">
                  A controladora de memória (IMC) dentro do processador define o teto real da RAM. Com 4 pentes DDR5, raramente passa de 4800–5200 MT/s com estabilidade; preferir sempre 2 pentes nos slots A2/B2.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
