"use client";

import React, { useEffect, useState } from "react";
import {
  Wrench,
  Usb,
  PackagePlus,
  HardDriveDownload,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Trash2,
  HardDrive,
  AlertTriangle,
  UserCheck,
  Cpu,
  Zap,
  Sparkles,
  Download,
} from "lucide-react";
import {
  getDriverInventory,
  backupDrivers,
  getMakerDrivers,
  installMakerDriver,
  cleanArduinoCache,
  getWingetCatalog,
  installWingetBatch,
  openExternalUrl,
  generateCleanInstallUsb,
  openAccountControlPanel,
  runAppPostProcessing,
  DriverInventoryItem,
  MakerDriverInfo,
  WingetAppItem,
  CleanInstallUsbResult,
  AppPostProcessResult,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { useHardware } from "../lib/HardwareContext";
import ExternalToolsModule from "./ExternalToolsModule";

interface DriversAndAppsModuleProps {
  subTab: string; // "drv-auditor" | "drv-maker" | "drv-winget" | "drv-hub"
  onChangeSubTab?: (sub: string) => void;
}

const PORTABLE_PRECISION_TOOLS = [
  {
    id: "logitech-omm",
    name: "Logitech Onboard Memory Manager (OMM)",
    category: "Periféricos / Mouse",
    descPt: "Configure DPI, polling rate e perfis diretamente na memória do mouse Logitech sem instalar o pesado G HUB.",
    descEn: "Configure DPI, polling rate, and onboard profiles directly without heavy Logitech G HUB background bloat.",
    url: "https://support.logi.com/hc/en-us/articles/360059641133-Onboard-Memory-Manager",
  },
  {
    id: "moreclocktool",
    name: "MoreClockTool (MCT)",
    category: "AMD Radeon Tuning",
    descPt: "Alternativa ultraleve sem telemetria para ajustar clocks, tensão V/F e curva de fans em GPUs AMD Radeon.",
    descEn: "Lightweight telemetry-free alternative for tuning clocks, voltage, and fan curves on AMD Radeon GPUs.",
    url: "https://www.igorlabs.de/en/download-area-new-version-of-morepowertool-mpt-and-final-release-of-redbioseditor-rbe/",
  },
  {
    id: "cru",
    name: "Custom Resolution Utility (CRU)",
    category: "Monitor / Display EDID",
    descPt: "Crie resoluções esticadas (4:3 / 16:10) em escala nativa no monitor e remova resoluções indesejadas do EDID.",
    descEn: "Create Display-Scaled stretched resolutions and strip unused EDID timings directly without GPU scaling overhead.",
    url: "https://www.monitortests.com/forum/Thread-Custom-Resolution-Utility-CRU",
  },
  {
    id: "nvpi",
    name: "NVIDIA Profile Inspector",
    category: "NVIDIA Driver Flags",
    descPt: "Ajuste fino de flags internas do driver NVIDIA (Low Latency, Silk Smoothness, rBAR, Force P-State, Shader Cache).",
    descEn: "Fine-grained NVIDIA driver flag editor (Low Latency, ReBAR, Shader Cache, frame limiter, power states).",
    url: "https://github.com/Orbmu2k/nvidiaProfileInspector/releases",
  },
];

export default function DriversAndAppsModule({
  subTab,
}: DriversAndAppsModuleProps) {
  const { lang } = useLanguage();
  const { diagnostics, requireRestorePoint } = useHardware();

  // Driver Auditor state
  const [drivers, setDrivers] = useState<DriverInventoryItem[]>([]);
  const [drvLoading, setDrvLoading] = useState(true);
  const [drvCategory, setDrvCategory] = useState("ALL");
  const [backingUp, setBackingUp] = useState(false);
  const [drvFeedback, setDrvFeedback] = useState<string | null>(null);

  // Maker Drivers state
  const [makerList, setMakerList] = useState<MakerDriverInfo[]>([]);
  const [installingChip, setInstallingChip] = useState<string | null>(null);
  const [cleaningArduino, setCleaningArduino] = useState(false);
  const [makerFeedback, setMakerFeedback] = useState<string | null>(null);

  // Winget & App Post-Processing state (Module 4)
  const [wingetApps, setWingetApps] = useState<WingetAppItem[]>([]);
  const [selectedWinget, setSelectedWinget] = useState<string[]>([]);
  const [installingWinget, setInstallingWinget] = useState(false);
  const [wingetFeedback, setWingetFeedback] = useState<string | null>(null);
  const [ppFlattenShortcuts, setPpFlattenShortcuts] = useState(true);
  const [ppOptimizeBrowsers, setPpOptimizeBrowsers] = useState(true);
  const [ppOptimizeDiscordSpotify, setPpOptimizeDiscordSpotify] = useState(true);
  const [ppDisableBrowserHwAccel, setPpDisableBrowserHwAccel] = useState(false);
  const [ppRunning, setPpRunning] = useState(false);
  const [ppResult, setPpResult] = useState<AppPostProcessResult | null>(null);

  // Clean Install & Boot USB Generator state (Module 2)
  const [usbTargetPath, setUsbTargetPath] = useState("E:\\");
  const [usbUsername, setUsbUsername] = useState("Gamer");
  const [bypassWin11Reqs, setBypassWin11Reqs] = useState(true);
  const [skipOobeTelemetry, setSkipOobeTelemetry] = useState(true);
  const [injectOemDriverBlock, setInjectOemDriverBlock] = useState(true);
  const [generatingUsb, setGeneratingUsb] = useState(false);
  const [usbFeedback, setUsbFeedback] = useState<string | null>(null);
  const [usbResult, setUsbResult] = useState<CleanInstallUsbResult | null>(null);
  const [acctChecklist, setAcctChecklist] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  const loadAll = async () => {
    setDrvLoading(true);
    const [dRes, mRes, wRes] = await Promise.all([
      getDriverInventory(),
      getMakerDrivers(),
      getWingetCatalog(),
    ]);
    if (dRes.data) setDrivers(dRes.data);
    if (mRes.data) setMakerList(mRes.data);
    if (wRes.data) setWingetApps(wRes.data);
    setDrvLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleBackupDrivers = async () => {
    setBackingUp(true);
    setDrvFeedback(null);
    const res = await backupDrivers();
    setDrvFeedback(res.message);
    setBackingUp(false);
  };

  const handleInstallMaker = async (chipId: string) => {
    setInstallingChip(chipId);
    setMakerFeedback(null);
    const res = await installMakerDriver(chipId);
    setMakerFeedback(res.message);
    const mRes = await getMakerDrivers();
    if (mRes.data) setMakerList(mRes.data);
    setInstallingChip(null);
  };

  const handleCleanArduino = async () => {
    setCleaningArduino(true);
    setMakerFeedback(null);
    const res = await cleanArduinoCache();
    setMakerFeedback(res.message);
    setCleaningArduino(false);
  };

  const toggleWingetSelection = (id: string) => {
    setSelectedWinget((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleInstallSelectedWinget = async () => {
    if (selectedWinget.length === 0) return;
    setInstallingWinget(true);
    setWingetFeedback(null);
    const res = await installWingetBatch(selectedWinget);
    setWingetFeedback(res.message);
    const wRes = await getWingetCatalog();
    if (wRes.data) setWingetApps(wRes.data);
    setSelectedWinget([]);
    setInstallingWinget(false);
  };

  const handleRunPostProcessing = () => {
    requireRestorePoint(
      lang === "en"
        ? "Smart App Post-Processing (Start Menu, Browsers & Discord/Spotify)"
        : "Pós-Processamento Inteligente (Menu Iniciar, Navegadores & Discord/Spotify)",
      "medium",
      async () => {
        setPpRunning(true);
        setPpResult(null);
        setWingetFeedback(null);
        const res = await runAppPostProcessing(
          ppFlattenShortcuts,
          ppOptimizeBrowsers,
          ppOptimizeDiscordSpotify,
          ppDisableBrowserHwAccel
        );
        setWingetFeedback(res.message);
        if (res.data) setPpResult(res.data);
        setPpRunning(false);
      }
    );
  };

  const handleGenerateUsbKit = async () => {
    setGeneratingUsb(true);
    setUsbFeedback(null);
    setUsbResult(null);
    const res = await generateCleanInstallUsb(
      usbTargetPath,
      usbUsername,
      bypassWin11Reqs,
      skipOobeTelemetry,
      injectOemDriverBlock
    );
    setUsbFeedback(res.message);
    if (res.data) setUsbResult(res.data);
    setGeneratingUsb(false);
  };

  const handleOpenAccountTool = async (tool: "netplwiz" | "lusrmgr") => {
    const res = await openAccountControlPanel(tool);
    setUsbFeedback(res.message);
  };

  const filteredDrivers =
    drvCategory === "ALL"
      ? drivers
      : drivers.filter((d) => d.category === drvCategory);

  const cpuName = diagnostics?.cpu?.name || "CPU";
  const isDualCcdX3d = /7900X3D|7950X3D|9900X3D|9950X3D/i.test(cpuName);

  const wingetCategories = Array.from(
    new Set(wingetApps.map((a) => a.category))
  );

  return (
    <div className="space-y-5">
      {/* Header (Sidebar controls category navigation directly — no duplicate pills) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-400" />
            <span>
              {subTab === "drv-hub"
                ? lang === "en"
                  ? "Clean Install USB (autounattend.xml + $OEM$) & Community Hub"
                  : "Formatação Limpa USB (autounattend.xml + $OEM$) & Ferramentas"
                : subTab === "drv-maker"
                ? lang === "en"
                  ? "Serial Maker Drivers (CH340, CP210x, FTDI, Arduino)"
                  : "Drivers Maker Serial (CH340, CP210x, FTDI, Arduino)"
                : subTab === "drv-winget"
                ? lang === "en"
                  ? "Smart App Installer & Post-Processing Engine"
                  : "Smart App Installer & Pós-Processamento Inteligente"
                : lang === "en"
                ? "Signed Driver & DDU Integrity Auditor"
                : "Auditor de Drivers Assinados & Guia DDU"}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {subTab === "drv-hub"
              ? lang === "en"
                ? "Generate zero-bloat Windows USB answer files, convert Microsoft accounts to Local, and follow the Golden Motherboard Driver rule."
                : "Gere mídia limpa do Windows com autounattend.xml + bloqueio pré-boot $OEM$, converta conta Microsoft para Local e siga a Regra de Ouro de drivers."
              : lang === "en"
              ? "Audit WHQL drivers, install CH340/CP210x/FTDI/Arduino drivers offline, and batch-install essential post-format apps."
              : "Audite versões e assinaturas WHQL, instale drivers seriais CH340/CP210x/FTDI/Arduino offline e pacotes essenciais via Winget."}
          </p>
        </div>

        <button
          onClick={loadAll}
          disabled={drvLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${drvLoading ? "animate-spin" : ""}`} />
          <span>{lang === "en" ? "Refresh" : "Atualizar"}</span>
        </button>
      </div>

      {/* 1. DRIVER AUDITOR */}
      {subTab === "drv-auditor" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "ALL",
                "Vídeo / GPU",
                "Rede / Wi-Fi",
                "Áudio",
                "Armazenamento",
                "Chipset / Sistema",
                "USB / Serial",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setDrvCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    drvCategory === c
                      ? "bg-sky-500 text-zinc-950 font-bold"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                  }`}
                >
                  {c === "ALL" ? "Todos" : c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadAll}
                disabled={drvLoading}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${drvLoading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={handleBackupDrivers}
                disabled={backingUp}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {backingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HardDriveDownload className="w-4 h-4" />
                )}
                <span>Exportar Backup DISM (C:\DriversBackup)</span>
              </button>
            </div>
          </div>

          {drvFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {drvFeedback}
            </div>
          )}

          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-800 text-[11px] uppercase text-zinc-400">
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Versão</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredDrivers.map((d, idx) => (
                    <tr
                      key={`${d.deviceName}-${idx}`}
                      className="hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-zinc-100">
                        {d.deviceName}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400">{d.category}</td>
                      <td className="py-2.5 px-4 text-zinc-300">{d.provider}</td>
                      <td className="py-2.5 px-4 font-mono text-sky-400">
                        {d.version}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400">
                        {d.date}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === "OK"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : d.status === "Antigo"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAKER SERIAL DRIVERS */}
      {subTab === "drv-maker" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Pacotes INF Seriais Embarcados (Instalação Offline via PnPUtil)
              </h3>
              <p className="text-xs text-zinc-400">
                Instale os drivers de comunicação USB-UART para placas ESP32, ESP8266 e Arduino diretamente na DriverStore do Windows.
              </p>
            </div>
            <button
              onClick={handleCleanArduino}
              disabled={cleaningArduino}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
            >
              {cleaningArduino ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Limpar Cache Arduino15</span>
            </button>
          </div>

          {makerFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {makerFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {makerList.map((m) => {
              const busy = installingChip === m.id;
              return (
                <div
                  key={m.id}
                  className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300">
                        {m.chipFamily}
                      </span>
                      {m.installedInStore && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Na DriverStore
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-zinc-100">
                      {m.name}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {m.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInstallMaker(m.id)}
                      disabled={busy}
                      className="flex-1 py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Usb className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {m.installedInStore
                          ? "Reinstalar Driver INF"
                          : "Instalar Driver INF"}
                      </span>
                    </button>
                    <button
                      onClick={() => openExternalUrl(m.vendorUrl)}
                      title="Site Oficial do Fabricante"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. WINGET BATCH APP INSTALLER & MODULE 4 POST-PROCESSING */}
      {subTab === "drv-winget" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {lang === "en"
                  ? "Batch Post-Format Installer (Microsoft Winget)"
                  : "Instalador Pós-Formatação em Lote (Microsoft Winget)"}
              </h3>
              <p className="text-xs text-zinc-400">
                {lang === "en"
                  ? "Select essential browsers, media tools, hardware utilities, and runtimes for silent installation."
                  : "Selecione navegadores enxutos, mídia, runtimes e diagnósticos de hardware para instalação silenciosa sem adwares."}
              </p>
            </div>

            <button
              onClick={handleInstallSelectedWinget}
              disabled={installingWinget || selectedWinget.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {installingWinget ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackagePlus className="w-4 h-4" />
              )}
              <span>
                {lang === "en"
                  ? `Install ${selectedWinget.length} Selected via Winget`
                  : `Instalar ${selectedWinget.length} Selecionado(s) via Winget`}
              </span>
            </button>
          </div>

          {wingetFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {wingetFeedback}
            </div>
          )}

          {/* Categorized Winget App Grid */}
          <div className="space-y-5">
            {wingetCategories.map((cat) => (
              <div key={cat} className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 px-1">
                  {cat}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {wingetApps
                    .filter((a) => a.category === cat)
                    .map((app) => {
                      const checked = selectedWinget.includes(app.id);
                      return (
                        <label
                          key={app.id}
                          className={`p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer ${
                            checked
                              ? "bg-zinc-900 border-sky-500/80"
                              : "bg-zinc-900/75 border-zinc-800/90 hover:border-zinc-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleWingetSelection(app.id)}
                            className="mt-1 accent-sky-500 w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-zinc-100 truncate">
                                {app.name}
                              </span>
                              {app.installed && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 shrink-0">
                                  {lang === "en" ? "Installed" : "Instalado"}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-sky-400 block">
                              {app.id}
                            </span>
                            <p className="text-xs text-zinc-400 mt-1">
                              {app.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Portable Precision Tools (OMM, MCT, CRU, NVPI) */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-sky-400" />
                <span>
                  {lang === "en"
                    ? "Portable Precision Tools (Zero Telemetry & Zero Installer Bloat)"
                    : "Ferramentas Portáteis de Precisão (Download Oficial Direto)"}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === "en"
                  ? "Standalone utilities that require no background services."
                  : "Utilitários portáteis leves que substituem suítes pesadas de fabricantes sem deixar serviços em segundo plano."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PORTABLE_PRECISION_TOOLS.map((tool) => (
                <div
                  key={tool.id}
                  className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/90 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-sky-400 uppercase">
                      {tool.category}
                    </span>
                    <div className="text-sm font-bold text-zinc-100">
                      {tool.name}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {lang === "en" ? tool.descEn : tool.descPt}
                    </p>
                  </div>
                  <button
                    onClick={() => openExternalUrl(tool.url)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-xs font-bold border border-sky-500/30 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{lang === "en" ? "Official" : "Baixar"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Smart App Post-Processing Engine */}
          <div className="rounded-2xl bg-zinc-900/80 border border-sky-500/30 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === "en"
                      ? "Smart App Post-Processing Engine"
                      : "Motor de Pós-Processamento Inteligente nos Apps Instalados"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === "en"
                    ? "Flatten Start Menu nested shortcuts, disable browser background telemetry/updaters, and harden Discord & Spotify."
                    : "Nivela atalhos aninhados do Menu Iniciar, aplica GPOs em Brave/Chrome/Edge e remove auto-boot + tray do Discord/Spotify."}
                </p>
              </div>
              <button
                onClick={handleRunPostProcessing}
                disabled={ppRunning}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {ppRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>
                  {lang === "en"
                    ? "Apply Smart App Post-Processing"
                    : "Aplicar Pós-Processamento Inteligente nos Apps Instalados"}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ppFlattenShortcuts}
                  onChange={(e) => setPpFlattenShortcuts(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    {lang === "en"
                      ? "Flatten Start Menu Shortcuts"
                      : "Nivelar Atalhos do Menu Iniciar"}
                  </div>
                  <div className="text-zinc-400">
                    {lang === "en"
                      ? "Moves .lnk files out of nested folders (preserves Windows system folders)."
                      : "Tira atalhos .lnk de subpastas extras mantendo Acessórios e Ferramentas do Windows."}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ppOptimizeBrowsers}
                  onChange={(e) => setPpOptimizeBrowsers(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    {lang === "en"
                      ? "Optimize Browsers (Brave / Chrome / Edge)"
                      : "Otimizar Navegadores (Brave / Chrome / Edge)"}
                  </div>
                  <div className="text-zinc-400">
                    {lang === "en"
                      ? "BackgroundModeEnabled=0, HighEfficiencyModeEnabled=1, disables background updater tasks."
                      : "Aplica BackgroundMode=0, HighEfficiencyMode=1 e desativa updaters em segundo plano."}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ppOptimizeDiscordSpotify}
                  onChange={(e) => setPpOptimizeDiscordSpotify(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    {lang === "en"
                      ? "Optimize Discord & Spotify"
                      : "Otimizar Discord & Spotify"}
                  </div>
                  <div className="text-zinc-400">
                    {lang === "en"
                      ? "Removes Run auto-start and disables Discord minimize-to-tray + hardware acceleration."
                      : "Remove inicialização automática no Run e desativa Minimize to Tray + HW Accel no settings.json do Discord."}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ppDisableBrowserHwAccel}
                  onChange={(e) => setPpDisableBrowserHwAccel(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    {lang === "en"
                      ? "Disable Browser Hardware Acceleration (Optional)"
                      : "Desativar Aceleração de Hardware nos Navegadores (Opcional)"}
                  </div>
                  <div className="text-zinc-400">
                    {lang === "en"
                      ? "Prevents browser tabs on a 2nd monitor from locking GPU clocks or causing MPO stutter."
                      : "Evita que abas em 2º monitor disputem recursos da GPU ou causem stuttering em jogos."}
                  </div>
                </div>
              </label>
            </div>

            {ppResult && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                {ppResult.details.map((line, i) => (
                  <div key={i}>• {line}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODULE 2 — CLEAN INSTALL USB (autounattend.xml + $OEM$) & ACCOUNTS + HUB */}
      {subTab === "drv-hub" && (
        <div className="space-y-6">
          {/* Card 1: Clean Install USB & $OEM$ Pre-Boot Generator */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === "en"
                      ? "Native Clean Install Generator (autounattend.xml + $OEM$)"
                      : "Gerador Nativo de Formatação Limpa (autounattend.xml + $OEM$)"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === "en"
                    ? "Export autounattend.xml + $OEM$\\$$\\Setup\\Scripts\\SetupComplete.cmd directly to your Windows USB installer or local folder."
                    : "Grava autounattend.xml e injeta a árvore $OEM$\\$$\\Setup\\Scripts\\SetupComplete.cmd no pendrive de instalação ou pasta local."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {lang === "en"
                    ? "USB Drive Letter or Output Folder"
                    : "Unidade USB ou Pasta de Destino"}
                </label>
                <input
                  type="text"
                  value={usbTargetPath}
                  onChange={(e) => setUsbTargetPath(e.target.value)}
                  placeholder="E:\ ou C:\CleanInstallUSB"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {lang === "en"
                    ? "Local Administrator Account Name"
                    : "Nome da Conta Local (Administrador)"}
                </label>
                <input
                  type="text"
                  value={usbUsername}
                  onChange={(e) => setUsbUsername(e.target.value)}
                  placeholder="Gamer"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bypassWin11Reqs}
                  onChange={(e) => setBypassWin11Reqs(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    Bypass Windows 11 Hardware Requirements
                  </div>
                  <div className="text-zinc-400 font-mono text-[10px] mt-0.5">
                    BypassTPMCheck • SecureBoot • RAM • CPU
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipOobeTelemetry}
                  onChange={(e) => setSkipOobeTelemetry(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    Skip OOBE Telemetry & Force Local Account
                  </div>
                  <div className="text-zinc-400 mt-0.5">
                    {lang === "en"
                      ? "Skips Microsoft login prompts and disables privacy telemetry screens (ProtectYourPC=3)."
                      : "Pula perguntas de privacidade, ignora conta Microsoft (BypassNRO) e cria a conta local direto."}
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={injectOemDriverBlock}
                  onChange={(e) => setInjectOemDriverBlock(e.target.checked)}
                  className="mt-0.5 accent-sky-500"
                />
                <div>
                  <div className="font-bold text-zinc-200">
                    Pre-Boot Driver & OEM Bloatware Block ($OEM$)
                  </div>
                  <div className="text-zinc-400 mt-0.5">
                    {lang === "en"
                      ? "Creates SetupComplete.cmd setting ExcludeWUDriversInQualityUpdate=1 before first desktop load."
                      : "Gera SetupComplete.cmd gravando ExcludeWUDriversInQualityUpdate=1 e bloqueando instaladores OEM antes do 1º login."}
                  </div>
                </div>
              </label>
            </div>

            {/* Windows Home Technical Warning */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-amber-300">
                  {lang === "en"
                    ? "Technical Notice — Windows 10/11 Home Edition:"
                    : "Aviso Técnico — Edições Windows 10/11 Home:"}
                </strong>
                <span>
                  {lang === "en"
                    ? "Windows Home does not enforce Local Group Policy objects natively. Install completely offline (unplug Ethernet / skip Wi-Fi), run the Home-to-Pro upgrade or apply Windows Update blocks BEFORE connecting to the internet."
                    : "Edições Home não aplicam Políticas de Grupo (GPO) nativamente. Recomenda-se instalar desconectado da internet, usar o auxiliar Home to Pro ou aplicar o bloqueio de drivers via Registro antes de plugar o cabo de rede ou conectar no Wi-Fi."}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleGenerateUsbKit}
                disabled={generatingUsb}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                {generatingUsb ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HardDriveDownload className="w-4 h-4" />
                )}
                <span>
                  {lang === "en"
                    ? "Generate autounattend.xml + $OEM$ Kit"
                    : "Gerar autounattend.xml + Estrutura $OEM$"}
                </span>
              </button>

              {usbResult && (
                <div className="text-[11px] font-mono text-emerald-300">
                  XML: {usbResult.autounattendPath}
                  {usbResult.setupCompletePath ? ` • CMD: ${usbResult.setupCompletePath}` : ""}
                </div>
              )}
            </div>

            {usbFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                {usbFeedback}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 2: Microsoft Account -> Local Account Wizard */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <span>
                    {lang === "en"
                      ? "Microsoft Account -> Local Account Wizard (No Format)"
                      : "Conversão Conta Microsoft -> Conta Local (Sem Formatar)"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === "en"
                    ? "Switch to an offline Local Administrator account cleanly while preserving user files."
                    : "Migre para uma Conta Local Administrador limpa sem telemetria de sincronização da Microsoft."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenAccountTool("netplwiz")}
                  className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-bold text-sky-300 cursor-pointer"
                >
                  {lang === "en" ? "Open netplwiz" : "Abrir netplwiz (Contas de Usuário)"}
                </button>
                <button
                  onClick={() => handleOpenAccountTool("lusrmgr")}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
                >
                  {lang === "en" ? "Open lusrmgr.msc" : "Abrir lusrmgr.msc (Pro/Estendido)"}
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  {
                    key: "step1",
                    pt: "1. Criar nova Conta Local sem email/senha no netplwiz ou lusrmgr.msc",
                    en: "1. Create a new Local Account without email in netplwiz / lusrmgr.msc",
                  },
                  {
                    key: "step2",
                    pt: "2. Definir membro do grupo 'Administradores' / 'Administrators'",
                    en: "2. Add the local user to the 'Administrators' security group",
                  },
                  {
                    key: "step3",
                    pt: "3. Fazer backup/cópia de Documentos/Área de Trabalho de C:\\Users\\<ContaAntiga>",
                    en: "3. Back up files from C:\\Users\\<OldAccount> to the new Local Profile",
                  },
                  {
                    key: "step4",
                    pt: "4. Reiniciar na nova Conta Local e remover o perfil residual antigo",
                    en: "4. Sign in with the new Local Account and remove the residual MSA profile",
                  },
                ].map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(acctChecklist[s.key])}
                      onChange={(e) =>
                        setAcctChecklist((prev) => ({
                          ...prev,
                          [s.key]: e.target.checked,
                        }))
                      }
                      className="accent-sky-500"
                    />
                    <span
                      className={
                        acctChecklist[s.key]
                          ? "line-through text-zinc-500"
                          : "text-zinc-300"
                      }
                    >
                      {lang === "en" ? s.en : s.pt}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Card 3: Motherboard Driver Golden Rule */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>
                      {lang === "en"
                        ? "Golden Rule — Motherboard Drivers"
                        : "Regra de Ouro — Drivers de Placa-Mãe"}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    CPU: {cpuName}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    isDualCcdX3d
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {isDualCcdX3d
                    ? "AMD Dual-CCD X3D (Exceção Ativa)"
                    : lang === "en"
                    ? "Standard CPU Profile"
                    : "Chipset Dispensável"}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <strong className="text-sky-300 block mb-1">
                    {lang === "en" ? "ONLY Install Essential Drivers:" : "Instale APENAS Drivers Essenciais:"}
                  </strong>
                  {lang === "en"
                    ? "Install only LAN/Wi-Fi and Bluetooth drivers from your motherboard vendor. Keep Windows native Audio driver (avoid heavy Realtek UWP bloatware / Sonic Studio / Nahimic)."
                    : "Instale somente drivers de Rede (LAN/Wi-Fi) e Bluetooth. Mantenha o áudio nativo do Windows sem suítes Realtek UWP / Sonic Studio / Nahimic."}
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isDualCcdX3d
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-300"
                  }`}
                >
                  <strong className="block mb-1">
                    {isDualCcdX3d
                      ? lang === "en"
                        ? "Dual-CCD X3D Detected (7900X3D / 7950X3D / 9900X3D / 9950X3D): Chipset Required!"
                        : "CPU AMD Dual-CCD X3D Detectado: Exceção Obrigatória de Chipset!"
                      : lang === "en"
                      ? "Do NOT Install Chipset Drivers (Except Dual-CCD X3D):"
                      : "NÃO Instalar Driver de Chipset (Exceto Ryzen Dual-CCD X3D):"}
                  </strong>
                  {isDualCcdX3d
                    ? lang === "en"
                      ? "Your Dual-CCD X3D processor REQUIRES the official AMD Chipset driver exclusively for 3D V-Cache Performance Optimizer & Core Parking between CCD0 (V-Cache) and CCD1."
                      : "Seu processador possui 2 CCDs (Dual-CCD X3D) e EXIGE o driver oficial de Chipset AMD exclusivamente para o Core Parking do 3D V-Cache Optimizer alocar jogos no CCD certo."
                    : lang === "en"
                    ? "Do NOT install heavy Motherboard Chipset packages on Intel or single-CCD CPUs. Chipset drivers are ONLY mandatory for AMD Ryzen Dual-CCD X3D models (7900X3D, 7950X3D, 9950X3D) to enable 3D V-Cache Core Parking."
                    : "Não instale pacotes de Chipset de placa-mãe em CPUs comuns. A ÚNICA exceção são processadores AMD Ryzen Dual-CCD X3D (7900X3D, 7950X3D, 9950X3D) para ativação do Core Parking do 3D V-Cache."}
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Community Tools & WinUtil / O&O / AdwCleaner */}
          <div className="pt-2 border-t border-zinc-800/80">
            <ExternalToolsModule />
          </div>
        </div>
      )}
    </div>
  );
}
