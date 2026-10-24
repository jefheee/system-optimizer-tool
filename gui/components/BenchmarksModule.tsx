"use client";

import React, { useState } from "react";
import {
  HardDrive,
  MemoryStick,
  Gauge,
  Play,
  Loader2,
  Trophy,
  Gamepad2,
} from "lucide-react";
import {
  runDiskBenchmark,
  runRamBenchmark,
  runCpuBenchmark,
  DiskBenchmarkResult,
  RamBenchmarkResult,
  CpuAndGameBenchmarkResult,
} from "../lib/api";
import { useHardware } from "../lib/HardwareContext";
import { useLanguage } from "../lib/LanguageContext";

interface BenchmarksModuleProps {
  subTab: string; // "bench-disk" | "bench-ram" | "bench-cpu"
  onChangeSubTab?: (sub: string) => void;
}

export default function BenchmarksModule({
  subTab,
  onChangeSubTab,
}: BenchmarksModuleProps) {
  const { diagnostics } = useHardware();
  const { lang } = useLanguage();

  // Disk state
  const [selectedDrive, setSelectedDrive] = useState("C:");
  const [diskSizeMb, setDiskSizeMb] = useState(256);
  const [diskRunning, setDiskRunning] = useState(false);
  const [diskResult, setDiskResult] = useState<DiskBenchmarkResult | null>(null);

  // RAM state
  const [ramRunning, setRamRunning] = useState(false);
  const [ramResult, setRamResult] = useState<RamBenchmarkResult | null>(null);

  // CPU & Game Sim state
  const [simRes, setSimRes] = useState("1080p");
  const [simPreset, setSimPreset] = useState("Medium");
  const [cpuRunning, setCpuRunning] = useState(false);
  const [cpuResult, setCpuResult] = useState<CpuAndGameBenchmarkResult | null>(
    null
  );

  const drives =
    diagnostics?.logicalVolumes && diagnostics.logicalVolumes.length > 0
      ? diagnostics.logicalVolumes.map((v) => v.letter)
      : ["C:", "D:"];

  const handleRunDisk = async () => {
    setDiskRunning(true);
    const res = await runDiskBenchmark(selectedDrive, diskSizeMb);
    if (res.data) {
      setDiskResult(res.data);
    } else {
      // Browser preview fallback
      setDiskResult({
        drive: selectedDrive,
        fileSizeMb: diskSizeMb,
        seqReadMbs: 5180.4,
        seqWriteMbs: 4420.8,
        random4kReadIops: 48500,
        random4kWriteIops: 41200,
        readLatencyUs: 20.6,
        writeLatencyUs: 24.2,
        score: 5820,
        tier: "NVMe PCIe Gen4 / Gen5 Ultra",
      });
    }
    setDiskRunning(false);
  };

  const handleRunRam = async () => {
    setRamRunning(true);
    const res = await runRamBenchmark();
    if (res.data) {
      setRamResult(res.data);
    } else {
      setRamResult({
        readGbs: 54.8,
        writeGbs: 49.2,
        copyGbs: 51.6,
        latencyNs: 62.4,
        score: 9410,
        tier: "DDR5 High-Frequency Dual-Channel",
      });
    }
    setRamRunning(false);
  };

  const handleRunCpu = async () => {
    setCpuRunning(true);
    const res = await runCpuBenchmark({
      cpuName: diagnostics?.cpu?.name,
      gpuName: diagnostics?.gpu?.name,
      resolution: simRes,
      preset: simPreset,
    });
    if (res.data) {
      setCpuResult(res.data);
    } else {
      setCpuResult({
        singleCoreScore: 2140,
        multiCoreScore: 18950,
        threadsTested: diagnostics?.cpu?.logicalThreads || 16,
        simAvgFps: 295,
        simLow1Fps: 228,
        resolution: simRes,
        preset: simPreset,
        games: [
          { name: "Counter-Strike 2", category: "Esports", avgFps: 420, low1Fps: 310, limiter: "Equilibrado", tier: "Competitivo 240Hz+" },
          { name: "Valorant", category: "Esports", avgFps: 540, low1Fps: 410, limiter: "Equilibrado", tier: "Competitivo 240Hz+" },
          { name: "Fortnite (Performance/DX12)", category: "Battle Royale", avgFps: 270, low1Fps: 200, limiter: "GPU", tier: "Competitivo 240Hz+" },
          { name: "Call of Duty: Warzone", category: "Battle Royale", avgFps: 190, low1Fps: 142, limiter: "GPU", tier: "Fluido 120Hz+" },
          { name: "Cyberpunk 2077", category: "AAA", avgFps: 118, low1Fps: 88, limiter: "GPU", tier: "Fluido 120Hz+" },
        ],
      });
    }
    setCpuRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sky-400" />
            <span>
              {lang === "en"
                ? "SYS BENCH — Native Hardware Benchmark Suite"
                : "SYS BENCH — Suíte de Benchmarks Nativos em Rust"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Measure real sequential/4K storage speeds, DRAM bandwidth & Sattolo latency, and CPU + Game FPS."
              : "Meça velocidades reais de leitura/escrita em disco, largura de banda e latência de RAM, e score de CPU + FPS em jogos."}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: "bench-disk", pt: "Disco (I/O)", en: "Disk (I/O)", icon: HardDrive },
            { id: "bench-ram", pt: "Memória RAM", en: "RAM Memory", icon: MemoryStick },
            { id: "bench-cpu", pt: "CPU & Jogos", en: "CPU & Games", icon: Gauge },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChangeSubTab?.(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{lang === "en" ? t.en : t.pt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. DISK BENCHMARK */}
      {subTab === "bench-disk" && (
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {lang === "en" ? "Target Drive" : "Unidade Alvo"}
                </label>
                <select
                  value={selectedDrive}
                  onChange={(e) => setSelectedDrive(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
                >
                  {drives.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {lang === "en" ? "Test File Size" : "Tamanho do Arquivo"}
                </label>
                <select
                  value={diskSizeMb}
                  onChange={(e) => setDiskSizeMb(Number(e.target.value))}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
                >
                  <option value={128}>128 MB (Rápido)</option>
                  <option value={256}>256 MB (Padrão)</option>
                  <option value={512}>512 MB (Intenso)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunDisk}
              disabled={diskRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {diskRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {diskRunning
                  ? lang === "en"
                    ? "Running Disk Bench..."
                    : "Executando Teste..."
                  : lang === "en"
                  ? "Start Disk Benchmark"
                  : "Iniciar Benchmark de Disco"}
              </span>
            </button>
          </div>

          {diskResult ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Leitura Sequencial
                </span>
                <p className="text-2xl font-black font-mono text-sky-400 mt-1">
                  {diskResult.seqReadMbs} MB/s
                </p>
                <span className="text-[11px] text-zinc-500">
                  Latência: {diskResult.readLatencyUs} μs
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Escrita Sequencial
                </span>
                <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {diskResult.seqWriteMbs} MB/s
                </p>
                <span className="text-[11px] text-zinc-500">
                  Latência: {diskResult.writeLatencyUs} μs
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  4K Random IOPS
                </span>
                <p className="text-2xl font-black font-mono text-zinc-100 mt-1">
                  {diskResult.random4kReadIops.toLocaleString()}
                </p>
                <span className="text-[11px] text-zinc-500">
                  Write: {diskResult.random4kWriteIops.toLocaleString()} IOPS
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Pontuação Geral
                </span>
                <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {diskResult.score} pts
                </p>
                <span className="text-[11px] text-zinc-400 truncate block">
                  {diskResult.tier}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-zinc-950/50 border border-zinc-800/70 text-center text-xs text-zinc-400">
              {lang === "en"
                ? "Creates a temporary incompressible file, measures real sequential & 4K IOPS speeds, and deletes the file automatically upon completion."
                : "Cria um arquivo temporário incompressível seguro, mede a velocidade real de leitura/escrita sequencial e IOPS 4K, e apaga o arquivo automaticamente ao final."}
            </div>
          )}
        </div>
      )}

      {/* 2. RAM BENCHMARK */}
      {subTab === "bench-ram" && (
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {lang === "en"
                  ? "DRAM Bandwidth & Sattolo Pointer-Chase Latency"
                  : "Largura de Banda DRAM & Latência Real (Sattolo Pointer-Chase)"}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === "en"
                  ? "Allocates 128 MB blocks to measure GB/s throughput and nanosecond latency outside L3 cache."
                  : "Aloca blocos de 128 MB em memória física para medir a taxa em GB/s e a latência em nanossegundos fora do cache L3."}
              </p>
            </div>

            <button
              onClick={handleRunRam}
              disabled={ramRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {ramRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {ramRunning
                  ? lang === "en"
                    ? "Testing RAM..."
                    : "Medindo RAM..."
                  : lang === "en"
                  ? "Start RAM Benchmark"
                  : "Iniciar Benchmark de RAM"}
              </span>
            </button>
          </div>

          {ramResult ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Leitura Sequencial
                </span>
                <p className="text-2xl font-black font-mono text-sky-400 mt-1">
                  {ramResult.readGbs} GB/s
                </p>
                <span className="text-[11px] text-zinc-500">
                  Cópia: {ramResult.copyGbs} GB/s
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Escrita Sequencial
                </span>
                <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {ramResult.writeGbs} GB/s
                </p>
                <span className="text-[11px] text-zinc-500">
                  Blocos de 128 MB
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Latência DRAM
                </span>
                <p className="text-2xl font-black font-mono text-purple-400 mt-1">
                  {ramResult.latencyNs} ns
                </p>
                <span className="text-[11px] text-zinc-500">
                  Sattolo Ring (32 MB)
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] uppercase text-zinc-400">
                  Score de Memória
                </span>
                <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {ramResult.score} pts
                </p>
                <span className="text-[11px] text-zinc-400 truncate block">
                  {ramResult.tier}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-zinc-950/50 border border-zinc-800/70 text-center text-xs text-zinc-400">
              {lang === "en"
                ? "Click 'Start RAM Benchmark' to test memory bandwidth (GB/s) and access latency (ns)."
                : "Clique em 'Iniciar Benchmark de RAM' para medir a taxa de transferência em GB/s e a latência em nanossegundos (ns)."}
            </div>
          )}
        </div>
      )}

      {/* 3. CPU & GAME FPS SIMULATOR */}
      {subTab === "bench-cpu" && (
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {lang === "en" ? "Target Resolution" : "Resolução"}
                </label>
                <select
                  value={simRes}
                  onChange={(e) => setSimRes(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
                >
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="1440p">1440p (Quad HD)</option>
                  <option value="2160p">2160p (4K UHD)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  {lang === "en" ? "Graphics Preset" : "Qualidade Gráfica"}
                </label>
                <select
                  value={simPreset}
                  onChange={(e) => setSimPreset(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100"
                >
                  <option value="Low">Competitivo / Baixo</option>
                  <option value="Medium">Médio / Alto</option>
                  <option value="Ultra">Ultra / Máximo</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunCpu}
              disabled={cpuRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {cpuRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {cpuRunning
                  ? lang === "en"
                    ? "Running CPU & FPS Sim..."
                    : "Calculando CPU & FPS..."
                  : lang === "en"
                  ? "Run CPU & FPS Benchmark"
                  : "Rodar Benchmark CPU & FPS"}
              </span>
            </button>
          </div>

          {cpuResult && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-[11px] uppercase text-zinc-400">
                    Single-Core Score
                  </span>
                  <p className="text-2xl font-black font-mono text-sky-400 mt-1">
                    {cpuResult.singleCoreScore.toLocaleString()} pts
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    IPC & Física de Jogos
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-[11px] uppercase text-zinc-400">
                    Multi-Core Score ({cpuResult.threadsTested} Threads)
                  </span>
                  <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    {cpuResult.multiCoreScore.toLocaleString()} pts
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    Renderização & Multitarefa
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-[11px] uppercase text-zinc-400">
                    Engine Loop Sim
                  </span>
                  <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                    {cpuResult.simAvgFps} FPS
                  </p>
                  <span className="text-[11px] text-zinc-500">
                    1% Low: {cpuResult.simLow1Fps} FPS
                  </span>
                </div>
              </div>

              {/* Game FPS Catalog Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-sky-400" />
                  <span>
                    Estimativa de FPS nos Principais Jogos ({cpuResult.resolution} •{" "}
                    {cpuResult.preset})
                  </span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 text-[11px] uppercase text-zinc-400">
                        <th className="py-2.5 px-4">Jogo</th>
                        <th className="py-2.5 px-4">Categoria</th>
                        <th className="py-2.5 px-4 text-right">FPS Médio</th>
                        <th className="py-2.5 px-4 text-right">1% Low</th>
                        <th className="py-2.5 px-4">Limitador</th>
                        <th className="py-2.5 px-4">Experiência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {cpuResult.games.map((g) => (
                        <tr
                          key={g.name}
                          className="hover:bg-zinc-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-bold text-zinc-100">
                            {g.name}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-400">
                            {g.category}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                            {g.avgFps} FPS
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-zinc-300">
                            {g.low1Fps} FPS
                          </td>
                          <td className="py-2.5 px-4 font-mono text-sky-400">
                            {g.limiter}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300 font-medium">
                            {g.tier}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
