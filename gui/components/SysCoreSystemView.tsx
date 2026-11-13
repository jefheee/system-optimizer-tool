"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  FileDown,
  FileJson,
  HardDrive,
  Info,
  Loader2,
  MemoryStick,
  Monitor,
  Power,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Usb,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useHardware } from "../lib/HardwareContext";
import { useLanguage } from "../lib/LanguageContext";
import { useSettings } from "../lib/SettingsContext";
import {
  applyOrRevertTweak,
  benchmarkDns,
  DnsBenchmarkResult,
  enableTrim,
  generateBatteryOrEnergyReport,
  openExternalUrl,
  optimizeDns,
  rebootToBios,
  restartAsAdmin,
} from "../lib/api";

export type SystemCategoryPill =
  | "os"
  | "motherboard"
  | "cpu"
  | "ram"
  | "gpu"
  | "storage"
  | "peripherals";

interface SysCoreSystemViewProps {
  initialPill?: SystemCategoryPill;
  directMode?: "system" | "gpu" | "disks" | "power" | "network";
}

function CircularDonut({
  percent,
  critical,
}: {
  percent: number;
  critical?: boolean;
}) {
  const safePct = Math.min(100, Math.max(0, Math.round(percent)));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePct / 100) * circumference;
  const strokeColor =
    critical || safePct > 90
      ? "#ef4444"
      : safePct >= 75
      ? "#38bdf8"
      : "#10b981";

  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="5"
          className="text-zinc-800"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`absolute text-xs font-bold font-mono ${
          critical || safePct > 90 ? "text-red-400" : "text-zinc-100"
        }`}
      >
        {safePct}%
      </span>
    </div>
  );
}

interface BiosChecklistItem {
  setting: string;
  recommended: string;
  whyPt: string;
  whyEn: string;
}

const AMD_BIOS_CHECKLIST: BiosChecklistItem[] = [
  {
    setting: "XMP / DOCP / EXPO",
    recommended: "Enabled (Profile 1)",
    whyPt: "Executa a RAM na frequência/latência nominal; reduz gargalo no Infinity Fabric.",
    whyEn: "Runs RAM at rated frequency/timings; prevents Infinity Fabric bottleneck.",
  },
  {
    setting: "Above 4G Decoding & ReBAR / SAM",
    recommended: "Enabled",
    whyPt: "Libera mapeamento completo da VRAM para a CPU (até +5–12% FPS em DX12/Vulkan).",
    whyEn: "Allows CPU full VRAM aperture mapping (+5–12% FPS in supported DX12/Vulkan titles).",
  },
  {
    setting: "Precision Boost Overdrive (PBO) & Curve Optimizer",
    recommended: "Advanced / Negative -15 to -25",
    whyPt: "All-core negative CO reduz tensão/calor e sustenta boost maior em Ryzen.",
    whyEn: "Negative per-core/all-core CO lowers thermals and sustains higher Ryzen boost.",
  },
  {
    setting: "X3D SoC Voltage (VSOC)",
    recommended: "<= 1.25V (Safe Ceiling)",
    whyPt: "Protege o cache 3D V-Cache contra degradação térmica e picos excessivos.",
    whyEn: "Protects 3D V-Cache silicon from excessive voltage degradation.",
  },
  {
    setting: "Global C-State Control",
    recommended: "Enabled (Auto on X3D)",
    whyPt: "Permite Boost máximo em single/few-core desligando núcleos ociosos.",
    whyEn: "Allows idle cores to sleep so active cores hit peak single-core boost clocks.",
  },
  {
    setting: "CSM (Compatibility Support Module) & fTPM",
    recommended: "CSM Disabled / fTPM Enabled",
    whyPt: "Boot UEFI puro obrigatório para Resizable BAR, Secure Boot e jogos anti-cheat.",
    whyEn: "Pure UEFI mode required for ReBAR, Secure Boot, and modern kernel anti-cheats.",
  },
];

const INTEL_BIOS_CHECKLIST: BiosChecklistItem[] = [
  {
    setting: "XMP 3.0 Profile",
    recommended: "Enabled (Profile 1)",
    whyPt: "Ativa velocidade nominal DDR4/DDR5; confirme modo Gear 1 (DDR4) ou Gear 2 (DDR5).",
    whyEn: "Enables rated DDR4/DDR5 frequency; verify Gear 1 (DDR4) or Gear 2 (DDR5).",
  },
  {
    setting: "Intel Default Settings / PL1 & PL2",
    recommended: "Intel Baseline (Strict IccMax)",
    whyPt: "Crítico em Core 13ª/14ª Gen para evitar degradação por tensão/corrente ilimitada (MCE).",
    whyEn: "Critical on 13th/14th Gen Core CPUs to prevent MCE unlimited voltage instability.",
  },
  {
    setting: "Resizable BAR & Above 4G Decoding",
    recommended: "Enabled",
    whyPt: "Essencial para GPUs NVIDIA RTX 30/40/50, AMD RX e Intel Arc extraírem banda máxima.",
    whyEn: "Essential for RTX 30/40/50, AMD RX, and Intel Arc maximum PCIe bandwidth.",
  },
  {
    setting: "Enhanced Halt State (C1E) & Speed Shift",
    recommended: "Enabled (High Perf)",
    whyPt: "Ajuste rápido de P-State pelo hardware; evita travamento de clock em idle.",
    whyEn: "Hardware-controlled P-State scaling for rapid boost transitions without thermal soak.",
  },
  {
    setting: "CSM (Legacy Support) & TPM 2.0",
    recommended: "CSM Disabled / PTT Enabled",
    whyPt: "Necessário para Secure Boot, Vanguard/FACEIT/Ricochet e inicialização NVMe rápida.",
    whyEn: "Required for Secure Boot, anti-cheat drivers, and fast UEFI NVMe boot.",
  },
];

export default function SysCoreSystemView({
  initialPill = "storage",
  directMode = "system",
}: SysCoreSystemViewProps) {
  const { diagnostics, loading, refreshDiagnostics, isAdmin, requireRestorePoint } =
    useHardware();
  const { lang } = useLanguage();
  const { theme } = useSettings();
  const [activePill, setActivePill] = useState<SystemCategoryPill>(initialPill);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Power & Network sub-states
  const [powerReportLoading, setPowerReportLoading] = useState(false);
  const [powerReportMsg, setPowerReportMsg] = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsBenchmarkResult | null>(null);
  const [dnsOptMsg, setDnsOptMsg] = useState<string | null>(null);

  // Module 1.1–1.4 action states
  const [biosModalOpen, setBiosModalOpen] = useState(false);
  const [biosRebooting, setBiosRebooting] = useState(false);
  const [biosMsg, setBiosMsg] = useState<string | null>(null);
  const [checklistOverride, setChecklistOverride] = useState<"auto" | "amd" | "intel">("auto");

  const [trimBusy, setTrimBusy] = useState(false);
  const [trimFeedback, setTrimFeedback] = useState<string | null>(null);
  const [msiBusy, setMsiBusy] = useState(false);
  const [msiFeedback, setMsiFeedback] = useState<string | null>(null);

  const pills: { id: SystemCategoryPill; labelPt: string; labelEn: string }[] = [
    { id: "os", labelPt: "Sistema operacional", labelEn: "Operating System" },
    { id: "motherboard", labelPt: "Placa-mãe e BIOS", labelEn: "Motherboard & BIOS" },
    { id: "cpu", labelPt: "Processador", labelEn: "Processor" },
    { id: "ram", labelPt: "Memória RAM", labelEn: "RAM Memory" },
    { id: "gpu", labelPt: "Placa de vídeo", labelEn: "Graphics Card" },
    { id: "storage", labelPt: "Armazenamento", labelEn: "Storage" },
    { id: "peripherals", labelPt: "Monitores & Periféricos", labelEn: "Displays & Peripherals" },
  ];

  const effectivePill: SystemCategoryPill =
    directMode === "gpu"
      ? "gpu"
      : directMode === "disks"
      ? "storage"
      : activePill;

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyFullReport = async () => {
    if (!diagnostics?.setupExport) return;
    await navigator.clipboard.writeText(diagnostics.setupExport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleDownloadFullReport = (format: "md" | "json") => {
    if (!diagnostics) return;
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      downloadBlob(
        JSON.stringify(diagnostics, null, 2),
        `System_Optimizer_Full_PC_Report_${dateStamp}.json`,
        "application/json;charset=utf-8"
      );
    } else {
      downloadBlob(
        diagnostics.setupExport || "Relatório vazio.",
        `System_Optimizer_Full_PC_Report_${dateStamp}.md`,
        "text/markdown;charset=utf-8"
      );
    }
  };

  const handleCopyProductKey = async () => {
    const key = diagnostics?.license?.productKey;
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateEnergyReport = async () => {
    setPowerReportLoading(true);
    setPowerReportMsg(null);
    const res = await generateBatteryOrEnergyReport(
      diagnostics?.deviceType === "Laptop"
    );
    setPowerReportMsg(res.message);
    setPowerReportLoading(false);
  };

  const handleBenchmarkDns = async () => {
    setDnsLoading(true);
    const res = await benchmarkDns();
    if (res.data) setDnsResult(res.data);
    setDnsLoading(false);
  };

  const handleOptimizeDns = async () => {
    setDnsLoading(true);
    const res = await optimizeDns();
    setDnsOptMsg(res.message);
    setDnsLoading(false);
  };

  const handleEnableTrim = async () => {
    setTrimBusy(true);
    setTrimFeedback(null);
    const res = await enableTrim();
    setTrimFeedback(res.message);
    await refreshDiagnostics();
    setTrimBusy(false);
  };

  const handleToggleMsiMode = (enableTarget: boolean) => {
    requireRestorePoint(
      lang === "en"
        ? "GPU MSI Mode (Interrupt Priority)"
        : "MSI Mode da GPU (Interrupções PCIe)",
      async () => {
        setMsiBusy(true);
        setMsiFeedback(null);
        const res = await applyOrRevertTweak("msi_mode_gpu", enableTarget);
        setMsiFeedback(res.message);
        await refreshDiagnostics();
        setMsiBusy(false);
      }
    );
  };

  const handleConfirmRebootToBios = async () => {
    setBiosRebooting(true);
    setBiosMsg(null);
    try {
      const res = await rebootToBios();
      setBiosMsg(res.message);
      if (!res.success) {
        setBiosRebooting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBiosMsg(msg);
      setBiosRebooting(false);
    }
  };

  // Dedicated Power view
  if (directMode === "power") {
    const bat = diagnostics?.battery;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">
              {lang === "en" ? "Power, Battery & ACPI Diagnostics" : "Energia, Bateria & Diagnóstico ACPI"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {lang === "en"
                ? "Inspect chassis type, battery wear level, and generate official Windows powercfg HTML reports."
                : "Inspecione o chassi, nível de desgaste da bateria e gere laudos oficiais HTML via powercfg."}
            </p>
          </div>
          <button
            onClick={handleGenerateEnergyReport}
            disabled={powerReportLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
          >
            {powerReportLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BatteryCharging className="w-4 h-4" />
            )}
            <span>
              {lang === "en"
                ? "Generate Official HTML Report"
                : "Gerar Laudo Oficial HTML (powercfg)"}
            </span>
          </button>
        </div>

        {powerReportMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
            {powerReportMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/75 border border-zinc-800/80">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400">
              {lang === "en" ? "Chassis Type" : "Tipo de Chassi"}
            </span>
            <p className="text-lg font-bold text-zinc-100 mt-1">
              {diagnostics?.deviceType || "Desktop"}
            </p>
            <span className="text-xs text-zinc-500">
              {bat
                ? `${bat.status} • ${bat.chargePercent}%`
                : lang === "en"
                ? "Direct AC Power Supply"
                : "Alimentação Direta AC (Sem Bateria)"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/75 border border-zinc-800/80">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400">
              {lang === "en" ? "Battery Health" : "Saúde da Bateria"}
            </span>
            <p className="text-lg font-bold text-emerald-400 mt-1">
              {bat ? `${bat.healthPercent.toFixed(1)}%` : "100% (AC)"}
            </p>
            <span className="text-xs text-zinc-500">
              {bat
                ? `Desgaste: ${bat.wearLevelPercent.toFixed(1)}%`
                : "Fonte de Alimentação ATX"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/75 border border-zinc-800/80">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400">
              {lang === "en" ? "UEFI & ACPI State" : "Estado UEFI & ACPI"}
            </span>
            <p className="text-lg font-bold text-sky-400 mt-1">
              {diagnostics?.security?.biosMode || "UEFI"}
            </p>
            <span className="text-xs text-zinc-500">
              Uptime: {diagnostics?.operatingSystem?.formattedUptime || "0d 0h"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Network view
  if (directMode === "network") {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">
              {lang === "en"
                ? "Network Latency & DNS Benchmark"
                : "Rede, Latência & Benchmark de DNS"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {lang === "en"
                ? "Test real ICMP response times across global DNS resolvers and apply the fastest one."
                : "Meça a latência real dos principais servidores DNS e aplique automaticamente o mais veloz."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBenchmarkDns}
              disabled={dnsLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700 transition-all cursor-pointer"
            >
              {dnsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{lang === "en" ? "Test DNS Ping" : "Testar Ping DNS"}</span>
            </button>
            <button
              onClick={handleOptimizeDns}
              disabled={dnsLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
            >
              <span>
                {lang === "en" ? "Apply Fastest DNS" : "Aplicar DNS Mais Rápido"}
              </span>
            </button>
          </div>
        </div>

        {dnsOptMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
            {dnsOptMsg}
          </div>
        )}

        {dnsResult ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dnsResult.providers.map((p) => (
              <div
                key={p.name}
                className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-100">{p.name}</p>
                  <p className="text-xs font-mono text-zinc-400">
                    {p.primaryIp} • {p.secondaryIp}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono font-bold text-xs">
                  {p.pingMs} ms
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-center text-xs text-zinc-400">
            {lang === "en"
              ? "Click 'Test DNS Ping' to measure Cloudflare (1.1.1.1), Google (8.8.8.8), and Quad9 (9.9.9.9) response times."
              : "Clique em 'Testar Ping DNS' para medir o tempo de resposta em tempo real da Cloudflare (1.1.1.1), Google (8.8.8.8) e Quad9 (9.9.9.9)."}
          </div>
        )}
      </div>
    );
  }

  // Build logical volumes
  const logicalVolumes =
    diagnostics?.logicalVolumes && diagnostics.logicalVolumes.length > 0
      ? diagnostics.logicalVolumes
      : (diagnostics?.storage || []).map((d) => {
          const letter = Array.isArray(d.driveLetters)
            ? d.driveLetters[0] || `Disk #${d.diskNumber}`
            : d.driveLetters || `Disk #${d.diskNumber}`;
          return {
            letter,
            label: "Volume Local",
            fileSystem: "NTFS",
            kind: "Fixo",
            totalGb: d.sizeGb,
            freeGb: d.freeGb,
            usedGb: d.usedGb,
            usagePercent: d.usagePercent,
            freePercent: d.freePercent,
            lowSpaceCritical: d.lowSpaceCritical,
            physicalDiskModel: d.model,
            physicalDiskType: `${d.mediaType} (${d.busType})`,
          };
        });

  const detectedVendorRaw = (
    diagnostics?.motherboard?.cpuVendor ||
    diagnostics?.cpu?.manufacturer ||
    ""
  ).toLowerCase();
  const effectiveChecklistVendor: "amd" | "intel" =
    checklistOverride !== "auto"
      ? checklistOverride
      : detectedVendorRaw.includes("intel")
      ? "intel"
      : "amd";
  const checklistRows =
    effectiveChecklistVendor === "amd" ? AMD_BIOS_CHECKLIST : INTEL_BIOS_CHECKLIST;

  const isX3dCpu = Boolean(
    diagnostics?.motherboard?.isX3d ||
      diagnostics?.cpu?.name?.toLowerCase().includes("x3d")
  );

  const mbSearchUrl =
    diagnostics?.motherboard?.supportSearchUrl ||
    `https://www.google.com/search?q=${encodeURIComponent(
      `${diagnostics?.motherboard?.manufacturer || ""} ${
        diagnostics?.motherboard?.product || ""
      } official BIOS download`
    )}`;

  return (
    <div className="space-y-4">
      {/* Global Full PC Report Export Action Bar (OUTSIDE individual component cards) */}
      {directMode === "system" && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border ${
            theme === "light"
              ? "bg-white/90 border-slate-200 shadow-sm"
              : "bg-zinc-900/60 border-zinc-800/80"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <p
                className={`text-xs font-bold ${
                  theme === "light" ? "text-slate-800" : "text-zinc-100"
                }`}
              >
                {lang === "en"
                  ? "Unified Full-System Hardware Audit"
                  : "Auditoria Completa Unificada do Sistema"}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {lang === "en"
                  ? "Exports OS, Motherboard/BIOS, Security, CPU, all RAM slots, GPUs, SMART Storage & Displays at once."
                  : "Exporta SO, Placa-Mãe/BIOS, Segurança, CPU, todos os slots RAM, GPUs, Discos SMART e Monitores de uma só vez."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => refreshDiagnostics()}
              disabled={loading}
              title={lang === "en" ? "Refresh Hardware" : "Atualizar Hardware"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{lang === "en" ? "Rescan" : "Atualizar"}</span>
            </button>

            <button
              onClick={handleCopyFullReport}
              disabled={!diagnostics?.setupExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-[11px] font-semibold transition-all cursor-pointer"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === "en" ? "Summary Copied" : "Resumo Copiado"}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>{lang === "en" ? "Copy Summary" : "Copiar Resumo"}</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownloadFullReport("json")}
              disabled={!diagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] font-semibold transition-all cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>.JSON</span>
            </button>

            <button
              onClick={() => handleDownloadFullReport("md")}
              disabled={!diagnostics}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>
                {lang === "en"
                  ? "Export Full PC Report (.MD)"
                  : "Exportar Relatório Completo do PC (.MD)"}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Category Pills (only in full 'system' mode) */}
        {directMode === "system" && (
          <div className="w-full lg:w-52 shrink-0 flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {pills.map((pill) => {
              const isActive = effectivePill === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setActivePill(pill.id)}
                  className={`px-4 py-2.5 rounded-full text-left text-xs transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? theme === "light"
                        ? "bg-sky-600 text-white font-bold shadow-md"
                        : "bg-white text-zinc-950 font-bold shadow-[0_0_20px_rgba(255,255,255,0.18)]"
                      : theme === "light"
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70"
                  }`}
                >
                  {lang === "en" ? pill.labelEn : pill.labelPt}
                </button>
              );
            })}
          </div>
        )}

        {/* Right Main Inspection Card (No Export Button Inside Card) */}
        <div className="flex-1 w-full rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/70 p-6 shadow-2xl">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-zinc-800/80">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {effectivePill === "storage"
                  ? lang === "en"
                    ? "Storage & TRIM Health"
                    : "Armazenamento, S.M.A.R.T. & TRIM"
                  : effectivePill === "os"
                  ? lang === "en"
                    ? "Operating System & License"
                    : "Sistema Operacional & Licença"
                  : effectivePill === "motherboard"
                  ? lang === "en"
                    ? "Motherboard, UEFI BIOS & Security"
                    : "Placa-mãe, BIOS UEFI & Segurança"
                  : effectivePill === "cpu"
                  ? lang === "en"
                    ? "Processor (CPU)"
                    : "Processador (CPU)"
                  : effectivePill === "ram"
                  ? lang === "en"
                    ? "Deep RAM Memory & Channel Audit"
                    : "Auditoria Profunda de Memória RAM & Canais"
                  : effectivePill === "gpu"
                  ? lang === "en"
                    ? "Graphics Card, PCIe Lanes, ReBAR & MSI Mode"
                    : "Placa de Vídeo, Lanes PCIe, ReBAR & MSI Mode"
                  : lang === "en"
                  ? "Displays & Peripherals"
                  : "Monitores & Periféricos"}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {effectivePill === "storage"
                  ? lang === "en"
                    ? "Logical volumes (<10% free alerts), physical drives S.M.A.R.T. and SSD TRIM verification"
                    : "Volumes lógicos (alerta <10% livre), saúde S.M.A.R.T. dos discos e verificação de TRIM"
                  : lang === "en"
                  ? "Real-time hardware telemetry collected natively via WMI & Registry"
                  : "Telemetria de hardware coletada nativamente via WMI e Registro do Windows"}
              </p>
            </div>

            {diagnostics?.osCompat && (
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-zinc-800 text-[11px] font-mono text-sky-400">
                {diagnostics.osCompat.osTier} • Build {diagnostics.osCompat.buildNumber}
              </span>
            )}
          </div>

          {/* Sub-tab 1: STORAGE & TRIM */}
          {effectivePill === "storage" && (
            <div className="space-y-6">
              {/* Live TRIM Banner + 1-Click Enable */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  diagnostics?.trimEnabled !== false
                    ? "bg-emerald-500/5 border-emerald-500/25"
                    : "bg-red-500/10 border-red-500/35"
                }`}
              >
                <div className="flex items-start gap-3">
                  {diagnostics?.trimEnabled !== false ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-zinc-100">
                      {lang === "en"
                        ? `SSD / NVMe TRIM Status (NTFS DisableDeleteNotify): ${
                            diagnostics?.trimEnabled !== false ? "ENABLED (0)" : "DISABLED (1)"
                          }`
                        : `Status do TRIM para SSD/NVMe (DisableDeleteNotify): ${
                            diagnostics?.trimEnabled !== false ? "ATIVO (0)" : "DESATIVADO (1)"
                          }`}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {diagnostics?.trimEnabled !== false
                        ? lang === "en"
                          ? "Windows continuously garbage-collects deleted NAND blocks to sustain NVMe write speeds."
                          : "O Windows envia comandos TRIM automaticamente ao SSD/NVMe para evitar degradação na escrita."
                        : lang === "en"
                        ? "TRIM is disabled! Enable it immediately to recover write performance and prolong SSD endurance."
                        : "TRIM desativado! Ative imediatamente para evitar quedas de velocidade em gravação e desgaste prematuro."}
                    </p>
                  </div>
                </div>

                {diagnostics?.trimEnabled === false && (
                  <button
                    onClick={handleEnableTrim}
                    disabled={trimBusy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer"
                  >
                    {trimBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>{lang === "en" ? "Enable TRIM Now" : "Ativar TRIM Agora"}</span>
                  </button>
                )}
              </div>

              {trimFeedback && (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
                  {trimFeedback}
                </div>
              )}

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  {lang === "en" ? "LOGICAL DRIVES" : "UNIDADES LÓGICAS"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {logicalVolumes.map((vol) => {
                    const freePct =
                      vol.freePercent !== undefined
                        ? vol.freePercent
                        : Math.max(0, 100 - (vol.usagePercent || 0));
                    const isCriticalLow = Boolean(vol.lowSpaceCritical || freePct < 10);
                    return (
                      <div
                        key={vol.letter}
                        className={`rounded-xl bg-zinc-950/75 border p-4 flex flex-col justify-between gap-3 transition-colors ${
                          isCriticalLow
                            ? "border-red-500/70 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.12)]"
                            : "border-zinc-800/90 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <CircularDonut percent={vol.usagePercent} critical={isCriticalLow} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-bold text-zinc-100">
                                {vol.letter}
                              </span>
                              <span className="text-xs text-zinc-400 truncate">
                                {vol.label}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-zinc-300 mt-1">
                              {vol.usedGb} GB / {vol.totalGb} GB
                            </p>
                            <p
                              className={`text-[11px] mt-0.5 ${
                                isCriticalLow ? "text-red-400 font-bold" : "text-zinc-400"
                              }`}
                            >
                              {lang === "en" ? "Free" : "Livre"}: {vol.freeGb} GB ({freePct.toFixed(1)}%) ·{" "}
                              {vol.fileSystem}
                            </p>
                          </div>
                        </div>

                        {isCriticalLow && (
                          <div className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/35 text-[11px] text-red-300 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {lang === "en"
                                ? "Critical: <10% free space slows down SLC cache & causes stuttering!"
                                : "Crítico: <10% livre satura cache SLC e derruba velocidade do SSD!"}
                            </span>
                          </div>
                        )}

                        <div className="pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400 truncate">
                          {vol.physicalDiskModel} —{" "}
                          <span className="text-zinc-300 font-medium">
                            {vol.physicalDiskType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Physical Disks Table */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  {lang === "en" ? "PHYSICAL DISKS (S.M.A.R.T.)" : "DISCOS FÍSICOS (S.M.A.R.T.)"}
                </h3>
                <div className="space-y-3">
                  {(diagnostics?.storage || []).map((disk) => {
                    const isSlowMedia = Boolean(
                      disk.isHddOrUsbWarning ||
                        disk.mediaType.toUpperCase() === "HDD" ||
                        disk.busType.toUpperCase() === "USB"
                    );
                    const diskCritical = Boolean(
                      disk.lowSpaceCritical ||
                        (disk.freePercent !== undefined && disk.freePercent < 10)
                    );
                    return (
                      <div
                        key={disk.diskNumber}
                        className={`rounded-xl bg-zinc-950/75 border p-4 space-y-3 ${
                          diskCritical
                            ? "border-red-500/60"
                            : isSlowMedia
                            ? "border-amber-500/45"
                            : "border-zinc-800/90"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {disk.busType.toUpperCase() === "USB" ? (
                              <Usb className="w-4 h-4 text-amber-400" />
                            ) : (
                              <HardDrive className="w-4 h-4 text-sky-400" />
                            )}
                            <span className="text-sm font-bold text-zinc-100">
                              {disk.model}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isSlowMedia
                                ? "bg-amber-500/15 border-amber-500/35 text-amber-300"
                                : "bg-zinc-800 border-zinc-700 text-zinc-200"
                            }`}
                          >
                            {disk.mediaType} ({disk.busType})
                          </span>
                        </div>

                        {isSlowMedia && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              {disk.busType.toUpperCase() === "USB"
                                ? lang === "en"
                                  ? "USB External Drive detected — unsuitable for Windows OS or modern DirectStorage games."
                                  : "Unidade USB externa detectada — evite rodar jogos modernos ou cache do Windows via USB."
                                : lang === "en"
                                ? "Mechanical HDD detected — causes texture streaming stutter and slow loading; move OS & games to NVMe/SATA SSD."
                                : "HDD mecânico detectado — causa engasgos de textura (traversal stutter); recomenda-se SSD/NVMe para jogos e SO."}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                            <span className="text-zinc-400">
                              {lang === "en" ? "Capacity" : "Capacidade"}
                            </span>
                            <span className="font-mono text-zinc-200 font-semibold">
                              {disk.sizeGb} GB ({disk.freeGb} GB {lang === "en" ? "free" : "livres"})
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                            <span className="text-zinc-400">Interface</span>
                            <span className="font-mono text-zinc-200">
                              {disk.busType}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                            <span className="text-zinc-400">
                              {lang === "en" ? "Serial Number" : "Nº de série"}
                            </span>
                            <span className="font-mono text-zinc-300">
                              {disk.serialNumber || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                            <span className="text-zinc-400">Firmware</span>
                            <span className="font-mono text-zinc-300">
                              {disk.firmwareRevision || "Padrão"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1 md:col-span-2">
                            <span className="text-zinc-400">
                              {lang === "en" ? "S.M.A.R.T. Health" : "Saúde S.M.A.R.T."}
                            </span>
                            <span
                              className={`font-semibold ${
                                disk.healthStatus === "Healthy"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {disk.healthStatus === "Healthy"
                                ? lang === "en"
                                  ? "Healthy (OK)"
                                  : "Saudável (OK)"
                                : disk.healthStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: OPERATING SYSTEM & LICENSE */}
          {effectivePill === "os" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    WINDOWS ({diagnostics?.osCompat?.osTier || "NT"})
                  </span>
                  <p className="text-base font-bold text-zinc-100">
                    {diagnostics?.operatingSystem?.caption || "Windows 11"}
                  </p>
                  <p className="text-zinc-400 font-mono">
                    Build {diagnostics?.operatingSystem?.buildNumber || "26100"} • Uptime:{" "}
                    {diagnostics?.operatingSystem?.formattedUptime || "0d 0h"}
                  </p>
                  {diagnostics?.osCompat && (
                    <p className="text-[11px] text-sky-400 font-mono">
                      Release {diagnostics.osCompat.displayVersion || "Current"} •{" "}
                      {diagnostics.osCompat.isLegacyWin78
                        ? "Legacy Win7/8 Fallbacks Enabled"
                        : "Modern WMI + Win32 Full Support"}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {lang === "en" ? "ORIGINAL WINDOWS KEY (OEM/BIOS)" : "CHAVE ORIGINAL DO WINDOWS (OEM/BIOS)"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold text-[10px]">
                      {diagnostics?.license?.licenseType || "OEM"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-mono text-sm font-bold text-zinc-100 tracking-wider">
                      {showKey
                        ? diagnostics?.license?.productKey || "*****-*****-*****-*****-*****"
                        : diagnostics?.license?.maskedKey || "*****-*****-*****-*****-*****"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={handleCopyProductKey}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      >
                        {copiedKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 3: MOTHERBOARD & BIOS (Module 1.1) */}
          {effectivePill === "motherboard" && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {lang === "en" ? "MOTHERBOARD" : "PLACA-MÃE"}
                  </span>
                  <p className="text-base font-bold text-zinc-100">
                    {diagnostics?.motherboard?.product || "Placa-mãe Padrão"}
                  </p>
                  <p className="text-zinc-400">
                    {diagnostics?.motherboard?.manufacturer || "OEM"}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      onClick={() => openExternalUrl(mbSearchUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 font-bold transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {lang === "en" ? "Find Official BIOS" : "Buscar BIOS Oficial"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {lang === "en" ? "BIOS & FIRMWARE SECURITY" : "BIOS & SEGURANÇA UEFI"}
                  </span>
                  <p className="text-base font-bold text-zinc-100 font-mono">
                    BIOS {diagnostics?.motherboard?.biosVersion || "N/A"} (
                    {diagnostics?.motherboard?.biosReleaseDate || "N/A"})
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-semibold">
                      {diagnostics?.security?.biosMode || "UEFI"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        diagnostics?.security?.secureBoot
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      Secure Boot: {diagnostics?.security?.secureBoot ? "ON" : "OFF"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-semibold">
                      {diagnostics?.security?.tpmVersion || "TPM 2.0"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                      VBS: {diagnostics?.security?.vbsActive ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setBiosMsg(null);
                        setBiosModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold transition-all cursor-pointer"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        {lang === "en"
                          ? "Reboot Directly to BIOS (UEFI)"
                          : "Reiniciar Direto na BIOS (UEFI Firmware)"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic AMD / X3D vs Intel BIOS Checklist Table */}
              <div className="rounded-xl bg-zinc-950/75 border border-zinc-800/90 overflow-hidden">
                <div className="p-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span>
                        {lang === "en"
                          ? `Platform BIOS Checklist (${effectiveChecklistVendor === "amd" ? (isX3dCpu ? "AMD Ryzen X3D" : "AMD Ryzen") : "Intel Core"})`
                          : `Checklist Dinâmico de BIOS (${effectiveChecklistVendor === "amd" ? (isX3dCpu ? "AMD Ryzen X3D" : "AMD Ryzen") : "Intel Core"})`}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {lang === "en"
                        ? "Recommended firmware settings tailored for your detected CPU architecture."
                        : "Ajustes recomendados no setup da placa-mãe para extrair performance e estabilidade sem degradação."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    {(
                      [
                        { id: "auto", label: "Auto" },
                        { id: "amd", label: "AMD / X3D" },
                        { id: "intel", label: "Intel Core" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setChecklistOverride(opt.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          checklistOverride === opt.id
                            ? "bg-sky-500 text-zinc-950"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900/70 border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
                        <th className="py-2.5 px-4">{lang === "en" ? "BIOS Option" : "Parâmetro na BIOS"}</th>
                        <th className="py-2.5 px-4">{lang === "en" ? "Target" : "Recomendado"}</th>
                        <th className="py-2.5 px-4">{lang === "en" ? "Engineering Reason" : "Motivo Técnico"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {checklistRows.map((row) => (
                        <tr key={row.setting} className="hover:bg-zinc-900/40">
                          <td className="py-2.5 px-4 font-bold text-zinc-100 whitespace-nowrap">
                            {row.setting}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                            {row.recommended}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-300">
                            {lang === "en" ? row.whyEn : row.whyPt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 4: PROCESSOR (CPU) */}
          {effectivePill === "cpu" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-base font-bold text-zinc-100">
                      {diagnostics?.cpu?.name || "Processador"}
                    </p>
                    <p className="text-zinc-400">
                      Socket {diagnostics?.cpu?.socket || "CPU"} •{" "}
                      {diagnostics?.cpu?.manufacturer}
                    </p>
                  </div>
                  {diagnostics?.cpu?.boostActive && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                      Turbo Boost / OC Ativo
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/70">
                  <div>
                    <span className="text-zinc-400 block">Núcleos / Threads</span>
                    <span className="font-mono font-bold text-sm text-zinc-100">
                      {diagnostics?.cpu?.physicalCores || 8}C /{" "}
                      {diagnostics?.cpu?.logicalThreads || 16}T
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Clock Base</span>
                    <span className="font-mono font-bold text-sm text-zinc-100">
                      {diagnostics?.cpu?.baseClockGhz?.toFixed(2) || "3.80"} GHz
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Clock Atual</span>
                    <span className="font-mono font-bold text-sm text-sky-400">
                      {diagnostics?.cpu?.currentClockGhz?.toFixed(2) || "4.60"} GHz
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Cache L3</span>
                    <span className="font-mono font-bold text-sm text-zinc-100">
                      {diagnostics?.cpu?.l3CacheMb || 32} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 5: DEEP RAM AUDIT (Module 1.2) */}
          {effectivePill === "ram" && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                <div>
                  <p className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <MemoryStick className="w-4 h-4 text-sky-400" />
                    <span>
                      {Math.round(diagnostics?.memory?.totalGb || 16)} GB{" "}
                      {diagnostics?.memory?.memoryType || "DDR4"}
                    </span>
                  </p>
                  <p className="text-zinc-400 mt-0.5">
                    {diagnostics?.memory?.moduleCount || 1}{" "}
                    {lang === "en" ? "active module(s)" : "módulo(s) ativo(s)"} •{" "}
                    {lang === "en" ? "In use" : "Em uso"}:{" "}
                    {diagnostics?.memory?.usedGb?.toFixed(1)} GB (
                    {diagnostics?.memory?.usagePercent?.toFixed(1)}%)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full font-bold text-[11px] border ${
                      diagnostics?.memory?.dualChannel
                        ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                        : "bg-red-500/15 border-red-500/35 text-red-300"
                    }`}
                  >
                    {diagnostics?.memory?.channelMode ||
                      (diagnostics?.memory?.dualChannel ? "Dual Channel" : "Single Channel")}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full font-bold text-[11px] border ${
                      diagnostics?.memory?.xmpActive
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {diagnostics?.memory?.xmpStatus || "Standard"}
                  </span>
                </div>
              </div>

              {/* Dual Channel & A2/B2 Warning */}
              {diagnostics?.memory && !diagnostics.memory.dualChannel && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/35 text-red-200 space-y-1.5">
                  <p className="font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      {lang === "en"
                        ? "Single Channel Detected (~8% to 15% loss in 1% Low FPS!)"
                        : "Single Channel Detectado (~8% a 15% de perda em 1% Low FPS!)"}
                    </span>
                  </p>
                  <p className="text-[11px] text-red-200/80">
                    {diagnostics.memory.moduleCount >= 2
                      ? lang === "en"
                        ? "You have 2 modules installed in wrong adjacent slots! Move sticks to slots A2 & B2 (2nd and 4th from CPU socket) for Dual Channel."
                        : "Você possui 2 módulos em slots adjacentes errados! Mova os pentes para os slots A2 e B2 (2º e 4º slot a partir da CPU) para ativar o Dual Channel."
                      : lang === "en"
                      ? "Only 1 RAM stick installed. Adding a matching stick in slot A2+B2 doubles memory bandwidth and cuts frame-time spikes."
                      : "Apenas 1 pente instalado. Adicionar um segundo pente compatível em A2+B2 dobra a largura de banda e reduz stuttering."}
                  </p>
                </div>
              )}

              {/* 4x DDR5 IMC Instability Warning */}
              {diagnostics?.memory?.ddr5FourDimmWarning && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {lang === "en"
                        ? "4x DDR5 Configuration Detected — High IMC Load Warning"
                        : "4 Pentes DDR5 Detectados — Aviso de Sobrecarga no IMC (Controladora)"}
                    </p>
                    <p className="text-[11px] text-amber-200/85 mt-0.5">
                      {lang === "en"
                        ? "Running 4 DDR5 DIMMs forces the CPU memory controller to lower frequencies (3600–4800 MT/s) and may cause XMP/EXPO training failure. Prefer 2 higher-capacity sticks in A2/B2."
                        : "Usar 4 módulos DDR5 sobrecarrega a controladora de memória (IMC) da CPU, reduzindo clocks (3600–4800 MT/s) e causando falhas de boot XMP/EXPO. Prefira 2 pentes maiores em A2/B2."}
                    </p>
                  </div>
                </div>
              )}

              {/* Mismatched Modules Warning */}
              {diagnostics?.memory?.mismatchedModules && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {lang === "en"
                        ? "Mismatched RAM Modules Detected (Mixed PartNumber / Speed / Capacity)"
                        : "Módulos de RAM Misturados Detectados (PartNumbers / Capacidades / Clocks diferentes)"}
                    </p>
                    <p className="text-[11px] text-amber-200/85 mt-0.5">
                      {lang === "en"
                        ? "All modules run constrained to the slowest stick timings, risking WHEA memory errors."
                        : "Todos os pentes operam limitados pelo módulo mais lento e podem gerar erros de instabilidade/WHEA."}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommended Slot Diagram */}
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  {lang === "en"
                    ? "Optimal Dual-Channel Slot Topology:"
                    : "Topologia Ideal de Slots Dual-Channel (2 Pentes):"}
                </span>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                    A1
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold">
                    A2 ★
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
                    B1
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold">
                    B2 ★
                  </span>
                </div>
              </div>

              {diagnostics?.memory?.ramWarnings &&
                diagnostics.memory.ramWarnings.length > 0 && (
                  <div className="space-y-1.5">
                    {diagnostics.memory.ramWarnings.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-amber-300 flex items-center gap-2"
                      >
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(diagnostics?.memory?.modules || []).map((m, i) => (
                  <div
                    key={`${m.slot}-${i}`}
                    className="p-3.5 rounded-xl bg-zinc-950/75 border border-zinc-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-100">
                        {m.slot} {m.bank ? `(${m.bank})` : ""}
                      </span>
                      <span className="font-mono text-sky-400 font-semibold">
                        {m.capacityGb} GB {m.memoryType} @ {m.speedMhz} MHz
                      </span>
                    </div>
                    <p className="text-zinc-400 font-mono text-[11px]">
                      {m.manufacturer} • {m.partNumber || "DIMM"} • {m.voltage}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 6: GRAPHICS CARD, PCIE & MSI MODE (Module 1.3) */}
          {effectivePill === "gpu" && (
            <div className="space-y-4 text-xs">
              {msiFeedback && (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300">
                  {msiFeedback}
                </div>
              )}

              {(diagnostics?.allGpus && diagnostics.allGpus.length > 0
                ? diagnostics.allGpus
                : diagnostics?.gpu
                ? [diagnostics.gpu]
                : []
              ).map((g, i) => (
                <div
                  key={`${g.name}-${i}`}
                  className={`p-4 rounded-xl bg-zinc-950/75 border space-y-3 ${
                    g.connectedToIgpuWarning || g.laneSharingWarning
                      ? "border-amber-500/50"
                      : "border-zinc-800/90"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-4 h-4 text-sky-400" />
                      <span className="text-base font-bold text-zinc-100">
                        {g.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border font-semibold ${
                          g.resizableBar
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                            : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        Resizable BAR: {g.resizableBar ? "ON" : "OFF"}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full border font-semibold ${
                          g.msiSupported
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-300"
                        }`}
                      >
                        MSI Mode: {g.msiSupported ? `ON (${g.msiPriority || "Normal"})` : "IRQ Padrão"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono font-bold">
                        {g.vramGb} GB VRAM
                      </span>
                    </div>
                  </div>

                  {/* Display Cable Check (iGPU vs dGPU) */}
                  {g.connectedToIgpuWarning && (
                    <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          {lang === "en"
                            ? "Display Cable May Be Plugged Into Motherboard (iGPU)!"
                            : "Cabo de Vídeo Conectado na Placa-Mãe (iGPU) em vez da GPU Dedicada!"}
                        </p>
                        <p className="text-[11px] text-red-200/85 mt-0.5">
                          {lang === "en"
                            ? "An active monitor appears attached to integrated graphics instead of your dedicated GPU. Plug HDMI/DisplayPort directly into the dedicated card outputs."
                            : "Um monitor ativo foi detectado na placa integrada enquanto há GPU dedicada presente. Conecte o cabo HDMI/DisplayPort diretamente atrás da placa de vídeo dedicada."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PCIe Lane Sharing Warning */}
                  {g.laneSharingWarning && (
                    <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          {lang === "en"
                            ? `PCIe Lane Width Reduced (${g.pcieLanes || "Sub-optimal"})`
                            : `Largura de Banda PCIe Reduzida (${g.pcieLanes || "Abaixo do Máximo"})`}
                        </p>
                        <p className="text-[11px] text-amber-200/85 mt-0.5">
                          {lang === "en"
                            ? "Your GPU link width is lower than its hardware maximum. Ensure the GPU sits in the top x16 slot closest to the CPU and check motherboard M.2 lane-sharing rules."
                            : "A GPU está operando com menos pistas PCIe que o máximo suportado. Confirme se ela está no 1º slot x16 acima e revise o manual da placa sobre divisão de lanes com slots M.2."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/70">
                    <div>
                      <span className="text-zinc-400 block">Driver Version</span>
                      <span className="font-mono text-zinc-200 font-semibold">
                        {g.driverVersion || "WHQL"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">
                        {lang === "en" ? "PCIe Link" : "Barramento PCIe"}
                      </span>
                      <span className="font-mono text-sky-400 font-semibold">
                        {g.pcieGeneration || "PCIe"} • {g.pcieLanes || "x16"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">
                        {lang === "en" ? "Resolution & Hz" : "Resolução & Taxa"}
                      </span>
                      <span className="font-mono text-zinc-200 font-semibold">
                        {g.resolution || "1920x1080"} @ {g.refreshRateHz || 60}Hz
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">
                        {lang === "en" ? "Signature" : "Assinatura"}
                      </span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> WHQL Signed
                      </span>
                    </div>
                  </div>

                  {/* MSI Mode Toggle */}
                  <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-400">
                      {lang === "en"
                        ? "Message Signaled Interrupts (MSI Mode) lowers DPC latency spikes in DX12/Vulkan."
                        : "Message Signaled Interrupts (MSI Mode) elimina fila IRQ legada e reduz picos de latência DPC."}
                    </span>
                    <button
                      onClick={() => handleToggleMsiMode(!g.msiSupported)}
                      disabled={msiBusy}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                        g.msiSupported
                          ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300"
                          : "bg-sky-500 hover:bg-sky-400 border-sky-400 text-zinc-950"
                      }`}
                    >
                      {msiBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {g.msiSupported
                          ? lang === "en"
                            ? "Revert MSI Mode to Legacy IRQ"
                            : "Reverter MSI Mode para Padrão"
                          : lang === "en"
                          ? "Enable MSI Mode (Apply)"
                          : "Ativar MSI Mode (Aplicar)"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-tab 7: DISPLAYS & PERIPHERALS */}
          {effectivePill === "peripherals" && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {lang === "en" ? "DISPLAYS / MONITORS" : "MONITORES CONECTADOS"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(diagnostics?.displays || []).map((d, idx) => (
                    <div
                      key={`${d.name}-${idx}`}
                      className="p-3.5 rounded-xl bg-zinc-950/75 border border-zinc-800/80"
                    >
                      <p className="font-bold text-zinc-100">{d.name}</p>
                      <p className="text-zinc-400 font-mono mt-0.5">
                        {d.inches}&quot; • {d.resolution} @ {d.refreshRateHz}Hz
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-zinc-950/75 border border-zinc-800/80">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {lang === "en" ? "AUDIO DEVICES" : "DISPOSITIVOS DE ÁUDIO"}
                  </h4>
                  <ul className="space-y-1 text-zinc-300">
                    {(diagnostics?.peripherals?.audioDevices || []).map((a, i) => (
                      <li key={i} className="truncate">
                        • {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/75 border border-zinc-800/80">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {lang === "en" ? "INPUT PERIPHERALS" : "PERIFÉRICOS DE ENTRADA"}
                  </h4>
                  <ul className="space-y-1 text-zinc-300">
                    {(diagnostics?.peripherals?.inputDevices || []).map((inp, i) => (
                      <li key={i} className="truncate">
                        • {inp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Reboot Directly to BIOS (UEFI Firmware) */}
      {biosModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {lang === "en"
                      ? "Reboot Directly into UEFI BIOS?"
                      : "Reiniciar Direto na BIOS (UEFI Firmware)?"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {lang === "en"
                      ? "Executes Windows firmware reboot (`shutdown /r /fw /t 0`)."
                      : "Executa reinicialização imediata para o setup UEFI (`shutdown /r /fw /t 0`)."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBiosModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs text-amber-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {lang === "en"
                    ? "DisplayPort Black-Screen & Unsaved Work Warning"
                    : "Aviso Importante: Tela Preta em DisplayPort & Arquivos Abertos"}
                </span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-100/85">
                <li>
                  {lang === "en"
                    ? "Save all open documents and close running applications immediately — the PC will restart without delay."
                    : "Salve todos os seus trabalhos antes de confirmar — o computador reiniciará imediatamente."}
                </li>
                <li>
                  {lang === "en"
                    ? "Some GPUs on older DisplayPort cables/monitors show a black screen inside UEFI BIOS. If that happens, force power off once or temporarily connect via HDMI."
                    : "Algumas placas de vídeo em cabos DisplayPort sem firmware GOP atualizado podem exibir tela preta na BIOS. Tenha um cabo HDMI caso não dê vídeo no setup."}
                </li>
              </ul>
            </div>

            {biosMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/35 text-xs text-red-300">
                {biosMsg}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBiosModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                {lang === "en" ? "Cancel" : "Cancelar"}
              </button>

              {!isAdmin ? (
                <button
                  onClick={() => restartAsAdmin()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    {lang === "en"
                      ? "Restart App as Admin First"
                      : "Elevar App como Admin Primeiro"}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleConfirmRebootToBios}
                  disabled={biosRebooting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black cursor-pointer"
                >
                  {biosRebooting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {lang === "en"
                      ? "Confirm & Reboot to BIOS Now"
                      : "Confirmar e Reiniciar na BIOS"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
