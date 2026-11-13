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
  MousePointer,
  Monitor,
  Keyboard,
  ExternalLink,
  Gamepad2,
  Shield,
  Volume2,
  Wifi,
} from "lucide-react";
import {
  scanOcAndErrors,
  setPowerPlan,
  optimizeMouse,
  optimizeKeyboard,
  TuningAndErrorsReport,
  applyLinearMouseScaleCurve,
  unlockBackgroundPollingRate,
  getGpuGamingState,
  openExternalUrl,
  openSoundControlPanel,
  getAntiCheatReadiness,
  AntiCheatReadinessReport,
  setControlFlowGuard,
  toggleVbs,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { useHardware } from "../lib/HardwareContext";

interface TuningModuleProps {
  subTab: string; // "tuning-power" | "tuning-peripherals" | "tuning-whea" | "tuning-oc"
  onChangeSubTab?: (sub: string) => void;
}

export default function TuningModule({
  subTab,
}: TuningModuleProps) {
  const { lang } = useLanguage();
  const { diagnostics, requireRestorePoint } = useHardware();
  const [report, setReport] = useState<TuningAndErrorsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [planBusy, setPlanBusy] = useState(false);
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);
  const [periphBusy, setPeriphBusy] = useState(false);
  const [periphFeedback, setPeriphFeedback] = useState<string | null>(null);
  const [dpiScale, setDpiScale] = useState<number>(100);
  const [bgPollingUnlocked, setBgPollingUnlocked] = useState<boolean>(false);
  const [hidusbfChecks, setHidusbfChecks] = useState<boolean[]>([false, false, false, false]);
  const [antiCheat, setAntiCheat] = useState<AntiCheatReadinessReport | null>(null);
  const [acBusy, setAcBusy] = useState<boolean>(false);
  const [acFeedback, setAcFeedback] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    const [res, gpuRes, acRes] = await Promise.all([
      scanOcAndErrors(),
      getGpuGamingState(),
      getAntiCheatReadiness(),
    ]);
    if (res.data) setReport(res.data);
    if (gpuRes.data) setBgPollingUnlocked(gpuRes.data.backgroundPollingUnlocked);
    if (acRes.data) setAntiCheat(acRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleApplyLinearDpiCurve = (revert: boolean) => {
    requireRestorePoint(
      revert
        ? lang === "en"
          ? "Revert Mouse Acceleration Curve to Default"
          : "Reverter Curva de Mouse para Padrão"
        : lang === "en"
        ? `Apply 1:1 Linear Mouse Curve (${dpiScale}% DPI)`
        : `Aplicar Curva 1:1 Sem Aceleração (${dpiScale}% DPI)`,
      "low",
      async () => {
        setPeriphBusy(true);
        const res = await applyLinearMouseScaleCurve(dpiScale, revert);
        setPeriphFeedback(res.message);
        setPeriphBusy(false);
      }
    );
  };

  const handleToggleBackgroundPolling = (enable: boolean) => {
    requireRestorePoint(
      lang === "en"
        ? "Unlock Background Mouse Polling Rate"
        : "Desbloquear Polling Rate em Segundo Plano",
      "low",
      async () => {
        setPeriphBusy(true);
        const res = await unlockBackgroundPollingRate(enable);
        if (res.success) setBgPollingUnlocked(enable);
        setPeriphFeedback(res.message);
        setPeriphBusy(false);
      }
    );
  };

  const handleToggleCfg = (enable: boolean) => {
    requireRestorePoint(
      lang === "en" ? "Configure Control Flow Guard (CFG)" : "Configurar Control Flow Guard (Vanguard)",
      "medium",
      async () => {
        setAcBusy(true);
        const res = await setControlFlowGuard(enable);
        setAcFeedback(res.message);
        const acRes = await getAntiCheatReadiness();
        if (acRes.data) setAntiCheat(acRes.data);
        setAcBusy(false);
      }
    );
  };

  const handleToggleAcVbs = (disable: boolean) => {
    requireRestorePoint(
      disable ? "Desativar VBS / Core Isolation" : "Reativar VBS (FACEIT)",
      "medium",
      async () => {
        setAcBusy(true);
        const res = await toggleVbs(disable);
        setAcFeedback(res.message);
        const acRes = await getAntiCheatReadiness();
        if (acRes.data) setAntiCheat(acRes.data);
        setAcBusy(false);
      }
    );
  };

  const handleSelectPlan = (planId: string) => {
    requireRestorePoint(
      lang === "en" ? `Change Power Plan (${planId})` : `Alterar Plano de Energia (${planId})`,
      async () => {
        setPlanBusy(true);
        setPlanFeedback(null);
        const res = await setPowerPlan(planId);
        setPlanFeedback(res.message);
        await loadReport();
        setPlanBusy(false);
      }
    );
  };

  const handleMouseRawInput = async () => {
    setPeriphBusy(true);
    const res = await optimizeMouse(true);
    setPeriphFeedback(res.message);
    setPeriphBusy(false);
  };

  const handleKeyboardLatency = async () => {
    setPeriphBusy(true);
    const res = await optimizeKeyboard();
    setPeriphFeedback(res.message);
    setPeriphBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Clean Header (Navigation exclusively handled by LeftSidebar — no duplicate top-right pills) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            <span>
              {subTab === "tuning-peripherals"
                ? lang === "en"
                  ? "Mouse, Keyboard, XMP & Display Latency"
                  : "Mouse, Teclado, Perfil XMP/EXPO & Monitor"
                : subTab === "tuning-whea"
                ? lang === "en"
                  ? "WHEA Auditor, Safe Mode & Recovery Sandbox"
                  : "Auditoria WHEA, Modo de Segurança & Sandbox"
                : lang === "en"
                ? "Power Plans & Overclock / XMP Scanner"
                : "Planos de Energia & Scanner de Overclock / XMP"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {lang === "en"
              ? "Inspect CPU Boost/OC, XMP/EXPO RAM profiles, Windows Power Plans, peripheral polling, and WHEA stability events."
              : "Verifique clocks de Boost/OC, perfis XMP/EXPO, esquemas de energia, fila de periféricos e eventos de estabilidade WHEA."}
          </p>
        </div>

        <button
          onClick={loadReport}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{lang === "en" ? "Rescan" : "Reescanear"}</span>
        </button>
      </div>

      {/* 1. PERIPHERALS, DISPLAYS & OVERCLOCK/XMP DETAILS */}
      {(subTab === "tuning-oc" || subTab === "tuning-peripherals") && (
        <div className="space-y-4">
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

          {periphFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {periphFeedback}
            </div>
          )}

          {/* Mouse / Keyboard / Display Tuning Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                  <MousePointer className="w-4 h-4 text-sky-400" />
                  <span>Mouse 1:1 Raw Input</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {lang === "en"
                    ? "Removes OS pointer acceleration curves (MarkC 1:1) and increases MouseDataQueueSize responsiveness."
                    : "Remove aceleração do ponteiro do Windows (curva 1:1 linear) e reduz enfileiramento HID."}
                </p>
              </div>
              <button
                onClick={handleMouseRawInput}
                disabled={periphBusy}
                className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {lang === "en" ? "Calibrate Mouse 1:1" : "Calibrar Mouse 1:1"}
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                  <Keyboard className="w-4 h-4 text-emerald-400" />
                  <span>Keyboard Repeat &amp; Queue</span>
                </div>
                <p className="text-xs text-zinc-400">
                  {lang === "en"
                    ? "Minimizes initial repeat delay and keyboard buffer queue for snappy competitive movement."
                    : "Minimiza delay de repetição inicial e ajusta KeyboardDataQueueSize para movimentação responsiva."}
                </p>
              </div>
              <button
                onClick={handleKeyboardLatency}
                disabled={periphBusy}
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-bold text-xs cursor-pointer"
              >
                {lang === "en" ? "Optimize Keyboard" : "Otimizar Teclado"}
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-2">
              <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span>{lang === "en" ? "Active Displays & Hz" : "Monitores & Taxa Atual"}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {(diagnostics?.displays || []).length > 0 ? (
                  diagnostics!.displays.map((d, i) => (
                    <div
                      key={`${d.name}-${i}`}
                      className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                    >
                      <span className="truncate text-zinc-300 font-medium">{d.name}</span>
                      <span className="font-mono font-bold text-sky-400 shrink-0 ml-2">
                        {d.refreshRateHz}Hz
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500">1920x1080 @ 60Hz+</p>
                )}
              </div>
            </div>
          </div>

          {/* Module 7.1 & 7.2: High DPI Linear 1:1 Mouse Scaling + Background Polling Unlock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                  <MousePointer className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === "en"
                      ? "1:1 Linear Mouse Curve by Windows DPI Scale"
                      : "Escala de DPI Sem Aceleração (Curva 1:1 Exata)"}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-mono text-[10px] font-bold">
                  MarkC Math
                </span>
              </div>

              {(diagnostics?.deviceType === "Laptop" || diagnostics?.isOnBattery) && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-200 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {lang === "en"
                      ? "Laptop Trackpad Guardrail: Precision touchpads on battery may feel faster with custom MarkC curves. Use 'Revert to Default' if trackpad sensitivity shifts."
                      : "Guardrail de Notebook: Touchpads podem alterar levemente a sensibilidade relativa com curva 1:1 para mouse externo. Use 'Reverter' se necessário."}
                  </span>
                </div>
              )}

              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === "en"
                  ? "At >100% display scaling (1440p/4K), Windows introduces pointer non-linearity. Select your Windows DPI scale to inject exact binary SmoothMouseX/Y curves (keeps MouseSpeed=1 required by Windows to read 1:1 curves)."
                  : "Em escalas acima de 100% (1440p/4K), o Windows distorce o movimento do ponteiro. Selecione sua escala DPI para gravar SmoothMouseX/Y linear (mantém MouseSpeed=1 exigido pelo Windows para ler a curva 1:1)."}
              </p>

              <div className="grid grid-cols-6 gap-1.5">
                {[100, 125, 150, 175, 200, 225].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDpiScale(pct)}
                    className={`py-1.5 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                      dpiScale === pct
                        ? "bg-sky-500 border-sky-400 text-zinc-950"
                        : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => handleApplyLinearDpiCurve(false)}
                  disabled={periphBusy}
                  className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  {lang === "en"
                    ? `Apply 1:1 Linear Curve (${dpiScale}%)`
                    : `Aplicar Curva 1:1 (${dpiScale}%)`}
                </button>
                <button
                  onClick={() => handleApplyLinearDpiCurve(true)}
                  disabled={periphBusy}
                  className="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  {lang === "en" ? "Revert Default" : "Reverter Padrão"}
                </button>
              </div>
            </div>

            {/* Background Polling Rate Unlock + High Hz Guidance */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>
                      {lang === "en"
                        ? "Unlock Background Mouse Polling Rate (1000–8000Hz)"
                        : "Destravar Polling Rate em Segundo Plano (1000–8000Hz)"}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      bgPollingUnlocked
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {bgPollingUnlocked ? "UNLOCKED" : "CAPPED"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {lang === "en"
                    ? "Windows 11 throttles high-frequency USB mice (1000Hz/4000Hz/8000Hz) outside native exclusive windows. Disabling lazy throttling & tightening mouclass queue keeps sensor reporting crisp across Borderless/Independent Flip games."
                    : "O Windows 11 limita mouses 1000Hz/4000Hz/8000Hz em janelas/overlays causando sensação inconsistente. Remover o limitador + ajustar MouseDataQueueSize mantém entrega 1:1 constante."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleBackgroundPolling(true)}
                  disabled={periphBusy}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  {lang === "en" ? "Unlock Polling Rate" : "Destravar Polling Rate"}
                </button>
                <button
                  onClick={() => handleToggleBackgroundPolling(false)}
                  disabled={periphBusy}
                  className="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  {lang === "en" ? "Revert" : "Reverter"}
                </button>
              </div>
            </div>
          </div>

          {/* Module 7.3 & 7.4: Controller Overclock (hidusbf Secure Boot ON) + Monitor / Bufferbloat Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                  <Gamepad2 className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === "en"
                      ? "Controller USB Overclock Center (1000Hz–8000Hz • Secure Boot ON)"
                      : "Overclock de Controle 1000Hz/8000Hz (hidusbf • Secure Boot ON)"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      openExternalUrl("https://github.com/LordOfMice/hidusbf/releases")
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-[11px] cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>hidusbf WHQL</span>
                  </button>
                  <button
                    onClick={() => openSoundControlPanel()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-[11px] cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 text-amber-400" />
                    <span>mmsys.cpl</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {[
                  lang === "en"
                    ? "1. Install the WHQL-signed hidusbf .inf driver first BEFORE running Setup.exe (keeps Secure Boot active)."
                    : "1. Instale o arquivo .inf assinado do hidusbf ANTES de abrir o .exe (funciona com Secure Boot ATIVO).",
                  lang === "en"
                    ? "2. Fixed USB Port Rule: Overclock binds to the exact USB port + controller pair. Never move the cable to another port."
                    : "2. Regra da Porta USB Fixa: O overclock vincula à porta USB física exata; nunca troque de porta depois de aplicar.",
                  lang === "en"
                    ? "3. Open mmsys.cpl above and disable the 'Wireless Controller' speaker/mic device to avoid game audio hijacking."
                    : "3. Clique em mmsys.cpl acima e desative o alto-falante/microfone 'Wireless Controller' do controle.",
                  lang === "en"
                    ? "4. In hidusbf select 'All', check 'Filter On Device', set Rate 1000/8000, click 'Install Service', unplug & replug."
                    : "4. No hidusbf selecione 'All', marque 'Filter On Device', escolha 1000 (ou 8000), clique 'Install Service' e reconecte.",
                ].map((step, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-lg bg-zinc-950/75 border border-zinc-800/80 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={hidusbfChecks[i]}
                      onChange={() =>
                        setHidusbfChecks((prev) =>
                          prev.map((v, idx) => (idx === i ? !v : v))
                        )
                      }
                      className="mt-0.5 accent-sky-500"
                    />
                    <span className={hidusbfChecks[i] ? "line-through text-zinc-500" : "text-zinc-300"}>
                      {step}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Monitor UFO Test + Bufferbloat SQM/QoS */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-zinc-100 font-bold text-sm">
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <span>
                    {lang === "en"
                      ? "Competitive Monitor & Network Bufferbloat Lab"
                      : "Guia de Monitor Competitivo (UFO Test) & Bufferbloat SQM"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/75 border border-zinc-800/80 space-y-1 text-xs">
                  <p className="font-bold text-purple-300">
                    BlurBusters UFO Motion Test &amp; Overdrive
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {lang === "en"
                      ? "Disable Eco/Adaptive Brightness, turn OFF G-Sync/FreeSync for lowest competitive input lag, enable Monitor OC Hz if available, and tune Overdrive to the highest preset WITHOUT bright inverse-ghosting trails behind the UFO."
                      : "Desative Eco/Brilho Adaptativo, desligue G-Sync/FreeSync para menor input lag absoluto, ative Overclock Hz do OSD e ajuste Overdrive ao máximo antes de surgir rastro brilhante (inverse ghosting)."}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/75 border border-zinc-800/80 space-y-1 text-xs">
                  <p className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Waveform Bufferbloat &amp; SQM / QoS Tuning</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {lang === "en"
                      ? "If Waveform shows Grade B/C/F under load, enable SQM/QoS in your router (OpenWrt / Asus / DumaOS) capping max Download & Upload by ~5–10% to eliminate ping spikes during matches."
                      : "Se o teste indicar latência alta sob carga (Bufferbloat), ative SQM / QoS no roteador limitando 5–10% da banda máxima Download/Upload para zerar spikes de ping e perda de hitreg."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => openExternalUrl("https://www.testufo.com/")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 font-bold text-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>BlurBusters UFO Test</span>
                </button>
                <button
                  onClick={() => openExternalUrl("https://www.waveform.com/tools/bufferbloat")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold text-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Waveform Bufferbloat Test</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. POWER PLANS + COMPACT OC/XMP BANNER */}
      {subTab === "tuning-power" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/75 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-bold text-zinc-100">
                  {report?.cpuName || diagnostics?.cpu?.name || "CPU"}
                </span>
                <span className="text-zinc-400 ml-2 font-mono">
                  {report?.cpuCurrentMhz ?? 4400} MHz ({report?.cpuBoostRatio ?? 1.15}x) • RAM{" "}
                  {report?.ramSpeedMhz ?? 3200} MHz ({report?.xmpEnabled ? "XMP/EXPO ON" : "JEDEC"})
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30">
              {report?.activePowerPlanName || "Power Scheme"}
            </span>
          </div>
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

          {/* Anti-Cheat Readiness Matrix (VALORANT Vanguard / CS2 FACEIT / EAC & BattlEye) */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === "en"
                      ? "Competitive Anti-Cheat Readiness Matrix"
                      : "Matriz de Compatibilidade com Anti-Cheats Competitivos"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === "en"
                    ? "Real-time audit of TPM 2.0, Secure Boot, Control Flow Guard (CFG), Core Isolation / VBS, and DEP."
                    : "Verificação real de TPM 2.0, Secure Boot, Control Flow Guard (CFG), Isolamento de Núcleo / VBS e DEP."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                {[
                  { label: "TPM 2.0", on: antiCheat?.tpmEnabled },
                  { label: "Secure Boot", on: antiCheat?.secureBootEnabled },
                  { label: "CFG", on: antiCheat?.cfgEnabled },
                  { label: "VBS", on: antiCheat?.vbsEnabled },
                  { label: "DEP", on: antiCheat?.depEnabled },
                ].map((flag) => (
                  <span
                    key={flag.label}
                    className={`px-2 py-0.5 rounded-full font-bold border ${
                      flag.on
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {flag.label}: {flag.on ? "ON" : "OFF"}
                  </span>
                ))}
              </div>
            </div>

            {acFeedback && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
                {acFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(antiCheat?.games || []).map((g) => (
                <div
                  key={g.id}
                  className={`p-4 rounded-xl bg-zinc-950/75 border space-y-2 ${
                    g.compatible ? "border-emerald-500/30" : "border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{g.name}</h4>
                      <span className="text-[10px] font-mono text-zinc-400">{g.anticheat}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        g.compatible
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {g.compatible
                        ? lang === "en"
                          ? "Ready"
                          : "Compatível"
                        : lang === "en"
                        ? "Action Needed"
                        : "Atenção"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">{g.summary}</p>
                  {g.blockingReasons.length > 0 && (
                    <ul className="space-y-0.5 text-[10px] text-amber-300">
                      {g.blockingReasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleToggleCfg(!antiCheat?.cfgEnabled)}
                disabled={acBusy}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {antiCheat?.cfgEnabled
                  ? lang === "en"
                    ? "CFG Active (Valorant Ready)"
                    : "CFG Ativo (Reverter / Desativar)"
                  : lang === "en"
                  ? "Enable Control Flow Guard (Fix Vanguard)"
                  : "Ativar Control Flow Guard (Fix Vanguard)"}
              </button>
              <button
                onClick={() => handleToggleAcVbs(Boolean(antiCheat?.vbsEnabled))}
                disabled={acBusy}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-bold text-xs cursor-pointer"
              >
                {antiCheat?.vbsEnabled
                  ? lang === "en"
                    ? "Disable VBS (+2–5% FPS, Breaks FACEIT)"
                    : "Desativar VBS (+2–5% FPS, Bloqueia FACEIT)"
                  : lang === "en"
                  ? "Re-enable VBS (FACEIT Ready)"
                  : "Reativar VBS / HVCI (Modo FACEIT)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
