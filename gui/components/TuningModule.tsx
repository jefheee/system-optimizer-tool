"use client";

import React, { useEffect, useState } from "react";
import {
  Cpu,
  BatteryCharging,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Zap,
  CheckCircle2,
} from "lucide-react";
import {
  scanOcAndErrors,
  setPowerPlan,
  TuningAndErrorsReport,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

interface TuningModuleProps {
  subTab: string; // "tuning-oc" | "tuning-power" | "tuning-whea"
  onChangeSubTab?: (sub: string) => void;
}

export default function TuningModule({
  subTab,
  onChangeSubTab,
}: TuningModuleProps) {
  const { lang } = useLanguage();
  const [report, setReport] = useState<TuningAndErrorsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [planBusy, setPlanBusy] = useState(false);
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    const res = await scanOcAndErrors();
    if (res.data) setReport(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    setPlanBusy(true);
    setPlanFeedback(null);
    const res = await setPowerPlan(planId);
    setPlanFeedback(res.message);
    await loadReport();
    setPlanBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            <span>
              {lang === "en"
                ? "SYS TUNING — Overclock, Power Plans & WHEA Hardware Auditor"
                : "SYS TUNING — Scanner de Overclock, Energia & Erros WHEA"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Inspect CPU Boost/OC, XMP/EXPO RAM profiles, Windows Power Plans, and WHEA-Logger stability events."
              : "Verifique clocks de Boost/Overclock, perfis XMP/DOCP/EXPO, planos de energia e erros de hardware WHEA-Logger no Log de Eventos."}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: "tuning-oc", pt: "Overclock & XMP", en: "Overclock & XMP" },
            { id: "tuning-power", pt: "Planos de Energia", en: "Power Plans" },
            { id: "tuning-whea", pt: "Erros WHEA & Kernel", en: "WHEA & Kernel" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeSubTab?.(t.id)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                subTab === t.id
                  ? "bg-white text-zinc-950"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 border border-zinc-800"
              }`}
            >
              {lang === "en" ? t.en : t.pt}
            </button>
          ))}
          <button
            onClick={loadReport}
            disabled={loading}
            className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 1. OVERCLOCK & XMP SCANNER */}
      {subTab === "tuning-oc" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-400" />
                CPU Clock & Turbo Boost
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  report?.cpuOcActive
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {report?.cpuOcActive ? "Boost / OC Ativo" : "Clock Base"}
              </span>
            </div>
            <p className="text-base font-bold text-zinc-100">
              {report?.cpuName || "Processador"}
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-800/70 text-xs">
              <div>
                <span className="text-zinc-400 block">Clock Base</span>
                <span className="font-mono font-bold text-zinc-200">
                  {report?.cpuBaseMhz ?? 3600} MHz
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Clock Atual</span>
                <span className="font-mono font-bold text-sky-400">
                  {report?.cpuCurrentMhz ?? 4400} MHz
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Multiplicador</span>
                <span className="font-mono font-bold text-emerald-400">
                  {report?.cpuBoostRatio ?? 1.15}x
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Perfil de Memória XMP / DOCP / EXPO
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  report?.xmpEnabled
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                }`}
              >
                {report?.xmpEnabled ? "XMP / EXPO Ativo" : "JEDEC Padrão"}
              </span>
            </div>
            <p className="text-2xl font-black font-mono text-zinc-100">
              {report?.ramType || "DDR4"} @ {report?.ramSpeedMhz ?? 3200} MHz
            </p>
            <p className="text-xs text-zinc-400">
              {report?.xmpEnabled
                ? "Sua memória RAM está operando em perfil de alta frequência (XMP/DOCP/EXPO ativo na BIOS)."
                : "Atenção: Sua memória pode estar rodando no clock básico JEDEC. Verifique na BIOS se o perfil XMP/DOCP/EXPO está habilitado."}
            </p>
          </div>
        </div>
      )}

      {/* 2. POWER PLANS */}
      {subTab === "tuning-power" && (
        <div className="space-y-4">
          {planFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {planFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: "balanced",
                titlePt: "Equilibrado (Balanced)",
                titleEn: "Balanced",
                descPt:
                  "Escalonamento dinâmico de clock da CPU. Recomendado para uso diário leve e economia de energia.",
                descEn:
                  "Dynamic CPU clock scaling. Recommended for daily browsing and power saving.",
              },
              {
                id: "high",
                titlePt: "Alto Desempenho",
                titleEn: "High Performance",
                descPt:
                  "Mantém clocks elevados e reduz estados de suspensão PCIe/USB para resposta rápida em jogos.",
                descEn:
                  "Keeps clocks high and reduces PCIe/USB sleep states for fast gaming response.",
              },
              {
                id: "ultimate",
                titlePt: "Desempenho Máximo (Ultimate)",
                titleEn: "Ultimate Performance",
                descPt:
                  "Elimina micro-latências de C-States e Parking de núcleos. Ideal para PCs competitivos.",
                descEn:
                  "Eliminates C-State micro-latencies and Core Parking. Ideal for competitive PCs.",
              },
            ].map((plan) => {
              const isCurrent = report?.activePowerPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                    isCurrent
                      ? "bg-zinc-900 border-sky-500/70 shadow-[0_0_25px_rgba(56,189,248,0.12)]"
                      : "bg-zinc-900/70 border-zinc-800/90"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <BatteryCharging
                        className={`w-5 h-5 ${
                          isCurrent ? "text-sky-400" : "text-zinc-500"
                        }`}
                      />
                      {isCurrent && (
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase">
                          Ativo Agora
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100">
                      {lang === "en" ? plan.titleEn : plan.titlePt}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {lang === "en" ? plan.descEn : plan.descPt}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={planBusy || isCurrent}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-zinc-800 text-zinc-400 cursor-default"
                        : "bg-white hover:bg-zinc-200 text-zinc-950"
                    }`}
                  >
                    {isCurrent
                      ? lang === "en"
                        ? "Active Plan"
                        : "Plano Ativo"
                      : lang === "en"
                      ? "Activate Plan"
                      : "Ativar Plano"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. WHEA-LOGGER & HARDWARE ERRORS */}
      {subTab === "tuning-whea" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                WHEA-Logger (Erros de CPU/PCIe)
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 ${
                  (report?.wheaErrorCount ?? 0) === 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {report?.wheaErrorCount ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">
                Event IDs 18, 19, 46, 47
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Kernel-Power 41 (Desligamentos)
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 ${
                  (report?.kernelPower41Count ?? 0) === 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {report?.kernelPower41Count ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">
                Quedas de energia / BSOD
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90">
              <span className="text-[11px] uppercase text-zinc-400">
                Display 4101 (Resets de GPU TDR)
              </span>
              <p
                className={`text-2xl font-black font-mono mt-1 ${
                  (report?.gpuResetCount ?? 0) === 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {report?.gpuResetCount ?? 0}
              </p>
              <span className="text-[11px] text-zinc-500">
                Crash de driver de vídeo
              </span>
            </div>
          </div>

          {report?.recentErrors && report.recentErrors.length > 0 ? (
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Eventos Críticos Encontrados no Windows Event Log
              </h4>
              <div className="space-y-2">
                {report.recentErrors.map((ev, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100">
                        {ev.source} (Event ID {ev.eventId})
                      </span>
                      <span className="font-mono text-zinc-400">
                        {ev.timestamp}
                      </span>
                    </div>
                    <p className="text-zinc-400">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold text-sm">
                  Nenhum erro crítico de hardware (WHEA-Logger) detectado!
                </p>
                <p className="text-emerald-300/80 mt-0.5">
                  Seu processador, barramento PCIe e módulos de memória RAM operam sem registros de corrupção ou instabilidade no Log de Eventos do Sistema.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
