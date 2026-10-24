"use client";

import React, { useEffect, useState } from "react";
import { Scale, Cpu, Monitor, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { analyzeBottleneck, BottleneckReport } from "../lib/api";
import { useHardware } from "../lib/HardwareContext";
import { useLanguage } from "../lib/LanguageContext";

export default function BottleneckModule() {
  const { diagnostics } = useHardware();
  const { lang } = useLanguage();

  const detectedCpu = diagnostics?.cpu?.name || "AMD Ryzen 7 7800X3D";
  const detectedGpu = diagnostics?.gpu?.name || "NVIDIA GeForce RTX 4070 Super";
  const detectedCores = diagnostics?.cpu?.physicalCores || 8;
  const detectedBaseGhz = diagnostics?.cpu?.baseClockGhz || 4.0;
  const detectedVram = diagnostics?.gpu?.vramGb || 12;
  const detectedRamGb = diagnostics?.memory?.totalGb || 32;
  const detectedRamMhz = diagnostics?.memory?.modules?.[0]?.speedMhz || 3200;

  const [simCpu, setSimCpu] = useState<string>("");
  const [simGpu, setSimGpu] = useState<string>("");
  const [selectedRes, setSelectedRes] = useState<string>("1080p");
  const [report, setReport] = useState<BottleneckReport | null>(null);

  useEffect(() => {
    const activeCpu = simCpu || detectedCpu;
    const activeGpu = simGpu || detectedGpu;

    analyzeBottleneck({
      cpuName: activeCpu,
      physicalCores: detectedCores,
      baseGhz: detectedBaseGhz,
      gpuName: activeGpu,
      vramGb: detectedVram,
      ramTotalGb: detectedRamGb,
      ramSpeedMhz: detectedRamMhz,
    }).then((res) => {
      if (res.data) setReport(res.data);
    });
  }, [
    simCpu,
    simGpu,
    detectedCpu,
    detectedGpu,
    detectedCores,
    detectedBaseGhz,
    detectedVram,
    detectedRamGb,
    detectedRamMhz,
  ]);

  const activeResObj =
    report?.resolutions.find((r) => r.resolution === selectedRes) ||
    report?.resolutions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-sky-400" />
            <span>
              {lang === "en"
                ? "Bottleneck Analyzer & Upgrade Simulator"
                : "Analisador de Gargalo & Simulador de Upgrade"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Evaluate CPU vs GPU synergy at 1080p, 1440p, and 4K or simulate hardware upgrades."
              : "Avalie o equilíbrio matemático entre Processador e Placa de Vídeo em 1080p, 1440p e 4K ou simule trocas de peças."}
          </p>
        </div>

        {(simCpu || simGpu) && (
          <button
            onClick={() => {
              setSimCpu("");
              setSimGpu("");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {lang === "en" ? "Restore My Hardware" : "Restaurar Meu Hardware"}
            </span>
          </button>
        )}
      </div>

      {/* Hardware Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              {lang === "en" ? "Processor (CPU)" : "Processador (CPU)"}
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono text-xs font-bold">
              Score: {report?.cpuIndex ?? 100}
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-100 truncate">
            {simCpu || detectedCpu}
          </p>
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              {lang === "en"
                ? "Simulate another CPU:"
                : "Simular outro Processador:"}
            </label>
            <select
              value={simCpu}
              onChange={(e) => setSimCpu(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">
                {lang === "en"
                  ? `Detected: ${detectedCpu}`
                  : `Detectado: ${detectedCpu}`}
              </option>
              {(report?.catalogCpus || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* GPU Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              {lang === "en" ? "Graphics Card (GPU)" : "Placa de Vídeo (GPU)"}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-xs font-bold">
              Score: {report?.gpuIndex ?? 100}
            </span>
          </div>
          <p className="text-sm font-bold text-zinc-100 truncate">
            {simGpu || detectedGpu}
          </p>
          {report?.gpuSpec && (
            <p className="text-[11px] font-mono text-zinc-400">
              {report.gpuSpec.arch} • {report.gpuSpec.vramGb} GB{" "}
              {report.gpuSpec.memType} ({report.gpuSpec.busWidthBits}-bit •{" "}
              {report.gpuSpec.bandwidthGbs} GB/s • TDP {report.gpuSpec.tdpW}W)
            </p>
          )}
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">
              {lang === "en"
                ? "Simulate another GPU:"
                : "Simular outra Placa de Vídeo:"}
            </label>
            <select
              value={simGpu}
              onChange={(e) => setSimGpu(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">
                {lang === "en"
                  ? `Detected: ${detectedGpu}`
                  : `Detectada: ${detectedGpu}`}
              </option>
              {(report?.catalogGpus || []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resolution Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(report?.resolutions || []).map((r) => {
          const active = selectedRes === r.resolution;
          return (
            <button
              key={r.resolution}
              onClick={() => setSelectedRes(r.resolution)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                active
                  ? "bg-white text-zinc-950 border-white shadow-md"
                  : "bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              {r.label} —{" "}
              <span className="font-mono">{r.balanceScore}/100</span>
            </button>
          );
        })}
      </div>

      {/* Main Bottleneck Verdict Card */}
      {activeResObj && (
        <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/80 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {activeResObj.severityLevel === "Balanced" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="text-lg font-bold text-zinc-100">
                  {lang === "en"
                    ? activeResObj.headlineEn || (activeResObj as any).statusLabel || activeResObj.label
                    : activeResObj.headlinePt || (activeResObj as any).statusLabel || activeResObj.label}
                </h3>
              </div>
              <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
                {lang === "en"
                  ? activeResObj.explanationEn || (activeResObj as any).recommendationEn || ""
                  : activeResObj.explanationPt || (activeResObj as any).recommendationPt || ""}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                {lang === "en" ? "Synergy Index" : "Índice de Equilíbrio"}
              </span>
              <span className="text-3xl font-black font-mono text-sky-400">
                {activeResObj.balanceScore ?? Math.round((1 - ((activeResObj.severityPercent ?? (activeResObj as any).bottleneckPercent ?? 5) / 100)) * 100)}%
              </span>
            </div>
          </div>

          {/* Progress Bar Gauge */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>
                {lang === "en" ? "Bottleneck Severity" : "Severidade do Gargalo"}:{" "}
                <strong className="text-zinc-100">
                  {activeResObj.severityPercent ?? (activeResObj as any).bottleneckPercent ?? 0}%
                </strong>
              </span>
              <span>
                {lang === "en" ? "Limiter" : "Limitador"}:{" "}
                <strong className="text-sky-400">
                  {activeResObj.limitingComponent}
                </strong>
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-zinc-950/80 border border-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (activeResObj.severityPercent ?? (activeResObj as any).bottleneckPercent ?? 0) <= 12
                    ? "bg-emerald-500"
                    : (activeResObj.severityPercent ?? (activeResObj as any).bottleneckPercent ?? 0) <= 25
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.max(8, Math.min(100, activeResObj.balanceScore ?? 90))}%`,
                }}
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="pt-3 border-t border-zinc-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              {lang === "en"
                ? "Practical Recommendations"
                : "Recomendações Práticas"}
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {((Array.isArray(lang === "en" ? activeResObj.recommendationsEn : activeResObj.recommendationsPt)
                ? (lang === "en" ? activeResObj.recommendationsEn : activeResObj.recommendationsPt)
                : null) ||
                ((activeResObj as any).recommendationPt || (activeResObj as any).recommendationEn
                  ? [lang === "en" ? ((activeResObj as any).recommendationEn || (activeResObj as any).recommendationPt) : ((activeResObj as any).recommendationPt || (activeResObj as any).recommendationEn)]
                  : [lang === "en" ? "Hardware balanced for this resolution." : "Hardware equilibrado para esta resolução."]
                )
              ).map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
