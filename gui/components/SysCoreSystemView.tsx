"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  HardDrive,
  Monitor,
  ShieldCheck,
  BatteryCharging,
  Wifi,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useHardware } from "../lib/HardwareContext";
import { useLanguage } from "../lib/LanguageContext";
import { useSettings } from "../lib/SettingsContext";
import {
  benchmarkDns,
  optimizeDns,
  generateBatteryOrEnergyReport,
  DnsBenchmarkResult,
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

function CircularDonut({ percent }: { percent: number }) {
  const safePct = Math.min(100, Math.max(0, Math.round(percent)));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePct / 100) * circumference;
  const strokeColor =
    safePct >= 90 ? "#ef4444" : safePct >= 75 ? "#38bdf8" : "#10b981";

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
      <span className="absolute text-xs font-bold font-mono text-zinc-100">
        {safePct}%
      </span>
    </div>
  );
}

export default function SysCoreSystemView({
  initialPill = "storage",
  directMode = "system",
}: SysCoreSystemViewProps) {
  const { diagnostics, loading, refreshDiagnostics } = useHardware();
  const { lang } = useLanguage();
  const { theme } = useSettings();
  const [activePill, setActivePill] = useState<SystemCategoryPill>(initialPill);
  const [copiedReport, setCopiedReport] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Power & Network sub-states when directMode === "power" or "network"
  const [powerReportLoading, setPowerReportLoading] = useState(false);
  const [powerReportMsg, setPowerReportMsg] = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsBenchmarkResult | null>(null);
  const [dnsOptMsg, setDnsOptMsg] = useState<string | null>(null);

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

  const handleExportReport = async () => {
    if (!diagnostics?.setupExport) return;
    await navigator.clipboard.writeText(diagnostics.setupExport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
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

  // Build logical volumes from diagnostics.logicalVolumes or fallback from diagnostics.storage
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
            physicalDiskModel: d.model,
            physicalDiskType: `${d.mediaType} (${d.busType})`,
          };
        });

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      {/* Level 3 Left Column: Vertical Category Pills (only in full 'system' mode) */}
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

      {/* Right Main Card (Matches Reference Image Layout + EXPORTAR RELATÓRIO button) */}
      <div className="flex-1 w-full rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/70 p-6 shadow-2xl">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-zinc-800/80">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {effectivePill === "storage"
                ? lang === "en"
                  ? "Storage"
                  : "Armazenamento"
                : effectivePill === "os"
                ? lang === "en"
                  ? "Operating System & License"
                  : "Sistema Operacional & Licença"
                : effectivePill === "motherboard"
                ? lang === "en"
                  ? "Motherboard, BIOS & Security"
                  : "Placa-mãe, BIOS & Segurança"
                : effectivePill === "cpu"
                ? lang === "en"
                  ? "Processor (CPU)"
                  : "Processador (CPU)"
                : effectivePill === "ram"
                ? lang === "en"
                  ? "RAM Memory & Channels"
                  : "Memória RAM & Slots"
                : effectivePill === "gpu"
                ? lang === "en"
                  ? "Graphics Card (GPU)"
                  : "Placa de Vídeo (GPU)"
                : lang === "en"
                ? "Displays & Peripherals"
                : "Monitores & Periféricos"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {effectivePill === "storage"
                ? lang === "en"
                  ? "Logical volumes and installed physical drives"
                  : "Unidades lógicas e discos físicos instalados"
                : lang === "en"
                ? "Real-time hardware telemetry collected natively via WMI & Registry"
                : "Telemetria de hardware coletada nativamente via WMI e Registro do Windows"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshDiagnostics()}
              disabled={loading}
              title={lang === "en" ? "Refresh Hardware" : "Atualizar Hardware"}
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleExportReport}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800'
                  : 'bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700 text-zinc-100'
              } text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer`}
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === "en" ? "COPIED!" : "RELATÓRIO COPIADO!"}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {lang === "en" ? "EXPORT REPORT" : "EXPORTAR RELATÓRIO"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-tab 1: STORAGE (Exact visual match to reference screenshot) */}
        {effectivePill === "storage" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                {lang === "en" ? "LOGICAL DRIVES" : "UNIDADES LÓGICAS"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {logicalVolumes.map((vol) => (
                  <div
                    key={vol.letter}
                    className="rounded-xl bg-zinc-950/75 border border-zinc-800/90 p-4 flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <CircularDonut percent={vol.usagePercent} />
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
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {lang === "en" ? "Free" : "Livre"}: {vol.freeGb} GB ·{" "}
                          {vol.fileSystem} ({vol.kind})
                        </p>
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400 truncate">
                      {vol.physicalDiskModel} —{" "}
                      <span className="text-zinc-300 font-medium">
                        {vol.physicalDiskType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Physical Disks Table */}
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
                {lang === "en" ? "PHYSICAL DISKS" : "DISCOS FÍSICOS"}
              </h3>
              <div className="space-y-3">
                {(diagnostics?.storage || []).map((disk) => (
                  <div
                    key={disk.diskNumber}
                    className="rounded-xl bg-zinc-950/75 border border-zinc-800/90 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-sky-400" />
                        <span className="text-sm font-bold text-zinc-100">
                          {disk.model}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                        {disk.mediaType} ({disk.busType})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-zinc-800/60">
                        <span className="text-zinc-400">
                          {lang === "en" ? "Capacity" : "Capacidade"}
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold">
                          {disk.sizeGb} GB
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
                              ? "Healthy (100%)"
                              : "Saudável (OK)"
                            : disk.healthStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
                  WINDOWS
                </span>
                <p className="text-base font-bold text-zinc-100">
                  {diagnostics?.operatingSystem?.caption || "Windows 11"}
                </p>
                <p className="text-zinc-400 font-mono">
                  Build {diagnostics?.operatingSystem?.buildNumber || "26100"} • Uptime:{" "}
                  {diagnostics?.operatingSystem?.formattedUptime || "0d 0h"}
                </p>
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

        {/* Sub-tab 3: MOTHERBOARD & BIOS */}
        {effectivePill === "motherboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {lang === "en" ? "MOTHERBOARD" : "PLACA-MÃE"}
              </span>
              <p className="text-base font-bold text-zinc-100">
                {diagnostics?.motherboard?.product || "Placa-mãe Padrão"}
              </p>
              <p className="text-zinc-400">
                {diagnostics?.motherboard?.manufacturer || "OEM"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                BIOS & SEGURANÇA
              </span>
              <p className="text-base font-bold text-zinc-100 font-mono">
                BIOS {diagnostics?.motherboard?.biosVersion || "N/A"} (
                {diagnostics?.motherboard?.biosReleaseDate || "N/A"})
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-semibold">
                  {diagnostics?.security?.biosMode || "UEFI"}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                  Secure Boot: {diagnostics?.security?.secureBoot ? "ON" : "OFF"}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-semibold">
                  {diagnostics?.security?.tpmVersion || "TPM 2.0"}
                </span>
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

        {/* Sub-tab 5: RAM MEMORY */}
        {effectivePill === "ram" && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div>
                <p className="text-base font-bold text-zinc-100">
                  {Math.round(diagnostics?.memory?.totalGb || 16)} GB{" "}
                  {diagnostics?.memory?.memoryType || "DDR4"}
                </p>
                <p className="text-zinc-400">
                  {diagnostics?.memory?.moduleCount || 1} módulo(s) ativo(s) • Uso atual:{" "}
                  {diagnostics?.memory?.usedGb?.toFixed(1)} GB (
                  {diagnostics?.memory?.usagePercent?.toFixed(1)}%)
                </p>
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(diagnostics?.memory?.modules || []).map((m, i) => (
                <div
                  key={`${m.slot}-${i}`}
                  className="p-3.5 rounded-xl bg-zinc-950/75 border border-zinc-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100">{m.slot}</span>
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

        {/* Sub-tab 6: GRAPHICS CARD (GPU) */}
        {effectivePill === "gpu" && (
          <div className="space-y-4 text-xs">
            {(diagnostics?.allGpus && diagnostics.allGpus.length > 0
              ? diagnostics.allGpus
              : diagnostics?.gpu
              ? [diagnostics.gpu]
              : []
            ).map((g, i) => (
              <div
                key={`${g.name}-${i}`}
                className="p-4 rounded-xl bg-zinc-950/75 border border-zinc-800/90 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-4 h-4 text-sky-400" />
                    <span className="text-base font-bold text-zinc-100">
                      {g.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.resizableBar && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                        Resizable BAR ON
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono font-bold">
                      {g.vramGb} GB VRAM
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/70">
                  <div>
                    <span className="text-zinc-400 block">Driver Version</span>
                    <span className="font-mono text-zinc-200 font-semibold">
                      {g.driverVersion || "WHQL"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Resolução & Taxa</span>
                    <span className="font-mono text-zinc-200 font-semibold">
                      {g.resolution || "1920x1080"} @ {g.refreshRateHz || 60}Hz
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Assinatura</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> WHQL Signed
                    </span>
                  </div>
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
  );
}
