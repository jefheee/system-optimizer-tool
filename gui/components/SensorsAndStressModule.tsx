"use client";

import React, { useState } from "react";
import {
  Thermometer,
  Flame,
  Layers,
  Play,
  Square,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Monitor,
  MemoryStick,
} from "lucide-react";
import {
  LiveSensorSnapshot,
  startStressTest,
  stopStressTest,
  toggleHudOverlay,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

interface SensorsAndStressModuleProps {
  mode: "sensors" | "stress" | "overlay";
  liveSensors: LiveSensorSnapshot | null;
  onRefreshSensors: () => void;
}

export default function SensorsAndStressModule({
  mode,
  liveSensors,
  onRefreshSensors,
}: SensorsAndStressModuleProps) {
  const { lang } = useLanguage();
  const [sensorCategory, setSensorCategory] = useState<string>("ALL");

  // Stress test state
  const [stressCpu, setStressCpu] = useState(true);
  const [stressRam, setStressRam] = useState(true);
  const [stressBusy, setStressBusy] = useState(false);

  // Overlay state
  const [overlayActive, setOverlayActive] = useState(false);
  const [overlayPos, setOverlayPos] = useState<string>("top-right");
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null);

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
  // MODE 1: SENSORS
  // -----------------------------------------------------------------
  if (mode === "sensors") {
    const sensors = liveSensors?.sensors || [];
    const filtered =
      sensorCategory === "ALL"
        ? sensors
        : sensors.filter((s) => s.category === sensorCategory);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-sky-400" />
              <span>
                {lang === "en"
                  ? "Real-Time Hardware Sensors"
                  : "Monitor de Sensores em Tempo Real"}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {lang === "en"
                ? "Continuous polling of temperatures, core clocks, power draw, and utilization."
                : "Leitura contínua de temperaturas, clocks por núcleo, consumo elétrico e carga."}
            </p>
          </div>

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
                    ? "bg-white text-zinc-950"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
                }`}
              >
                {lang === "en" ? cat.en : cat.pt}
              </button>
            ))}
          </div>
        </div>

        {/* Summary KPI Cards */}
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

        {/* Detailed Sensors Table */}
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
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
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
    );
  }

  // -----------------------------------------------------------------
  // MODE 2: STRESS TEST
  // -----------------------------------------------------------------
  if (mode === "stress") {
    const running = Boolean(liveSensors?.stressRunning);
    const errors = liveSensors?.stressMemErrors ?? 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>
              {lang === "en"
                ? "CPU & RAM Stability Stress Test"
                : "Teste de Estresse & Estabilidade Térmica (CPU + RAM)"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Validate cooling capacity, overclock/undervolt stability, and memory bit-flip integrity with instant AtomicBool stop."
              : "Valide a capacidade do seu cooler/watercooler, estabilidade de Undervolt/Overclock e integridade de memória RAM com parada imediata."}
          </p>
        </div>

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

          {/* Live Stress Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                {lang === "en" ? "Elapsed Time" : "Tempo Decorrido"}
              </span>
              <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                {formatDuration(liveSensors?.stressElapsedSecs ?? 0)}
              </p>
              <span className="text-[11px] text-zinc-500">
                Status: {running ? "Em execução" : "Parado"}
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
                Atual: {liveSensors?.cpuTempC.toFixed(1)} °C
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
                Blocos de 256 MB
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
                {errors === 0 ? "100% Estável (0 Bit-Flips)" : "Instabilidade de RAM!"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // MODE 3: IN-GAME HUD OVERLAY
  // -----------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" />
          <span>In-Game HUD Overlay</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {lang === "en"
            ? "Launch a lightweight, frameless, always-on-top telemetry window on the corner of your screen while gaming."
            : "Abra uma segunda janela ultraleve, transparente e sempre no topo (Always-on-Top) no canto da tela para monitorar temperaturas e uso enquanto joga."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
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

          <div className="flex items-center gap-3 pt-2">
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
          </div>

          {overlayMsg && (
            <p className="text-xs text-sky-400 font-medium">{overlayMsg}</p>
          )}
        </div>

        {/* Live HUD Preview */}
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
    </div>
  );
}
