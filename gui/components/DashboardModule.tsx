'use client';

import React, { useState } from 'react';
import { useHardware } from '../lib/HardwareContext';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';
import {
  Cpu,
  HardDrive,
  RefreshCw,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Monitor,
  Headphones,
  Component,
  Layers,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Download,
  FileText,
  FileCode,
  Share2,
  BatteryCharging,
  Zap,
  X,
} from 'lucide-react';

export default function DashboardModule() {
  const { t } = useLanguage();
  const { theme } = useSettings();
  const { diagnostics, loadingDiagnostics, errorDiagnostics, refreshDiagnostics } = useHardware();

  const [copied, setCopied] = useState<boolean>(false);
  const [showProductKey, setShowProductKey] = useState<boolean>(false);
  const [keyCopied, setKeyCopied] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  const cpu = diagnostics?.cpu;
  const gpu = diagnostics?.gpu;
  const mb = diagnostics?.motherboard;
  const memory = diagnostics?.memory;
  const os = diagnostics?.operatingSystem;
  const storage = diagnostics?.storage || [];
  const displays = diagnostics?.displays || [];
  const peripherals = diagnostics?.peripherals;
  const battery = diagnostics?.battery;
  const sec = diagnostics?.security || diagnostics?.securityAndBoot;
  const lic = diagnostics?.license || diagnostics?.windowsLicense;
  const isLaptop = diagnostics?.deviceType === 'Laptop';

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateStylizedText = () => {
    if (diagnostics?.setupExport) return diagnostics.setupExport;
    const roundedRam = Math.round(memory?.totalGb || 0);
    return `💻 MEU SETUP — SYSTEM OPTIMIZER TOOL\nCPU: ${cpu?.name}\nGPU: ${gpu?.name}\nRAM: ${roundedRam} GB`;
  };

  const generateFullTxtReport = () => {
    const roundedRam = Math.round(memory?.totalGb || 0);
    const lines: string[] = [
      '====================================================================',
      '             SYSTEM OPTIMIZER TOOL - RELATÓRIO DE HARDWARE          ',
      '====================================================================',
      `Data de Geração : ${new Date().toLocaleString()}`,
      `Tipo de Máquina : ${diagnostics?.deviceType || 'Desktop'}`,
      '',
      '[ PROCESSADOR (CPU) ]',
      `Modelo          : ${cpu?.name || 'N/A'}`,
      `Fabricante      : ${cpu?.manufacturer || 'N/A'}`,
      `Núcleos/Threads : ${cpu?.physicalCores || 0} Físicos / ${cpu?.logicalThreads || 0} Threads`,
      `Clock Base/Máx  : ${cpu?.baseClockGhz?.toFixed(2) || cpu?.maxClockGhz?.toFixed(2)} GHz / ${cpu?.maxClockGhz?.toFixed(2)} GHz`,
      `Clock Atual     : ${cpu?.currentClockGhz?.toFixed(2) || cpu?.maxClockGhz?.toFixed(2)} GHz (${cpu?.boostActive ? 'Boost Ativo' : 'Normal'})`,
      `Cache L3/Socket : ${cpu?.l3CacheMb || 0} MB / ${cpu?.socket || 'N/A'}`,
      '',
      '[ PLACA DE VÍDEO (GPU) ]',
      `Modelo          : ${gpu?.name || 'N/A'}`,
      `VRAM Real 64-bit: ${gpu?.vramGb?.toFixed(1) || 0} GB (${gpu?.vramMb || 0} MB)`,
      `Driver          : ${gpu?.driverVersion || 'N/A'} (WHQL: ${gpu?.whqlSigned ? 'Sim' : 'Não'})`,
      `Resizable BAR   : ${gpu?.resizableBar ? 'Ativo' : 'Padrão'}`,
      `Resolução/Taxa  : ${gpu?.resolution || 'N/A'} @ ${gpu?.refreshRateHz || 60} Hz`,
      '',
      '[ PLACA-MÃE & BIOS ]',
      `Modelo          : ${mb?.manufacturer || ''} ${mb?.product || ''}`,
      `BIOS            : ${mb?.biosVersion || 'N/A'} (${mb?.biosReleaseDate || 'N/A'})`,
      '',
      '[ MEMÓRIA RAM ]',
      `Total Instalado : ${roundedRam} GB (${memory?.moduleCount || 0} módulos)`,
      `Perfil XMP/EXPO : ${memory?.xmpStatus || (memory?.xmpActive ? 'Ativo' : 'JEDEC')}`,
      ...(memory?.modules || []).map(
        (m) =>
          `  - ${m.slot}: ${m.capacityGb} GB ${m.memoryType || 'DDR'} @ ${m.speedMhz} MHz (${m.voltage || '1.20V'}) [${m.manufacturer} ${m.partNumber}]`
      ),
      '',
      '[ UNIDADES DE ARMAZENAMENTO ]',
      ...storage.map(
        (d) =>
          `  - Disco #${d.diskNumber ?? 0} (${d.driveLetters || 'S/ Letra'}): ${d.model} [${d.mediaType} / ${d.busType}] -> ${d.freeGb} GB livres de ${d.sizeGb} GB (Uso: ${d.usagePercent?.toFixed(1) || 0}%, Saúde: ${d.healthStatus})`
      ),
      '',
      '[ MONITORES & DISPLAYS ]',
      ...displays.map(
        (m) =>
          `  - ${m.name} (${m.manufacturer}): ${m.diagonalInches}" | ${m.resolution} @ ${m.refreshRateHz} Hz | ${m.connection}`
      ),
      '',
      '[ SEGURANÇA, FIRMWARE & SISTEMA OPERACIONAL ]',
      `Sistema         : ${os?.caption || 'Windows'} (${os?.architecture || '64-bit'} - Build ${os?.buildNumber || ''})`,
      `Modo da BIOS    : ${sec?.biosMode || 'UEFI'}`,
      `Secure Boot     : ${sec?.secureBoot ? 'Ativo' : 'Desativado'}`,
      `Módulo TPM      : ${sec?.tpmVersion || 'TPM 2.0'}`,
      `Isolamento VBS  : ${sec?.vbsActive ? 'Ativo' : 'Desativado'}`,
      `Licença Windows : ${lic?.activationStatus || 'N/A'} (${lic?.maskedKey || 'N/A'})`,
      '====================================================================',
    ];
    return lines.join('\r\n');
  };

  const generateMarkdownReport = () => {
    const roundedRam = Math.round(memory?.totalGb || 0);
    const lines: string[] = [
      `# 💻 Relatório Técnico de Setup — System Optimizer Tool`,
      `> Gerado em ${new Date().toLocaleString()} • Tipo: **${diagnostics?.deviceType || 'Desktop'}**`,
      '',
      '## 🧠 Componentes Principais',
      '| Componente | Especificação Principal | Detalhes Técnicos |',
      '| :--- | :--- | :--- |',
      `| **Processador (CPU)** | ${cpu?.name || 'N/A'} | ${cpu?.physicalCores}C/${cpu?.logicalThreads}T • ${cpu?.maxClockGhz?.toFixed(2)} GHz • ${cpu?.l3CacheMb} MB L3 (${cpu?.socket}) |`,
      `| **Placa de Vídeo (GPU)** | ${gpu?.name || 'N/A'} | ${gpu?.vramGb?.toFixed(1)} GB VRAM • Driver ${gpu?.driverVersion} • ReBAR: ${gpu?.resizableBar ? 'Ativo' : 'Padrão'} |`,
      `| **Placa-Mãe** | ${mb?.manufacturer} ${mb?.product} | BIOS ${mb?.biosVersion} (${mb?.biosReleaseDate}) |`,
      `| **Memória RAM** | ${roundedRam} GB (${memory?.moduleCount}x) | ${memory?.xmpStatus || 'Dual-Channel'} |`,
      `| **Sistema Operacional** | ${os?.caption} | Build ${os?.buildNumber} |`,
      '',
      '## 🧩 Módulos de Memória RAM',
      '| Slot / Canal | Capacidade | Tipo & Clock | Tensão | Fabricante / Part Number |',
      '| :--- | :--- | :--- | :--- | :--- |',
      ...(memory?.modules || []).map(
        (m) => `| ${m.slot} | ${m.capacityGb} GB | ${m.memoryType || 'DDR'} @ ${m.speedMhz} MHz | ${m.voltage || '1.20V'} | ${m.manufacturer} ${m.partNumber} |`
      ),
      '',
      '## 💾 Armazenamento Físico',
      '| Disco & Unidades | Modelo | Tipo / Barramento | Total | Livre | Uso | Saúde |',
      '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
      ...storage.map(
        (d) =>
          `| #${d.diskNumber ?? 0} (${d.driveLetters || '-'}) | ${d.model} | ${d.mediaType} (${d.busType}) | ${d.sizeGb} GB | ${d.freeGb} GB | ${d.usagePercent?.toFixed(1) || 0}% | ${d.healthStatus} |`
      ),
      '',
      '## 🛡️ Segurança & Firmware',
      `- **Modo da BIOS:** ${sec?.biosMode || 'UEFI'}`,
      `- **Secure Boot:** ${sec?.secureBoot ? 'Ativo' : 'Desativado'}`,
      `- **TPM:** ${sec?.tpmVersion || 'TPM 2.0'}`,
      `- **Isolamento de Núcleo (VBS):** ${sec?.vbsActive ? 'Ativo' : 'Desativado'}`,
    ];
    return lines.join('\n');
  };

  const handleCopyDiscord = () => {
    navigator.clipboard.writeText(generateStylizedText());
    setCopied(true);
    setExportModalOpen(false);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyProductKey = () => {
    if (!lic?.productKey) return;
    navigator.clipboard.writeText(lic.productKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  };

  const monoLogo = theme === 'light'
    ? '/assets/branding/logo-monochrome-black.jpg'
    : '/assets/branding/logo-monochrome-white.jpg';

  return (
    <div className="space-y-4 max-w-7xl w-full mx-auto">
      {/* Top Banner (Neutral Gray Styling) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-neutral-300" />
            <h2 className="text-lg sm:text-xl font-bold text-neutral-100">{t('dash_title')}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
              {isLaptop ? t('home_device_laptop') : t('home_device_desktop')}
            </span>
          </div>
          <p className="text-xs text-neutral-400">{t('dash_subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={!diagnostics}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors active:scale-95"
            title={t('dash_export_setup')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('dash_copied_short')}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-neutral-300" />
                <span>{t('dash_export_setup')}</span>
              </>
            )}
          </button>

          <button
            onClick={() => refreshDiagnostics()}
            disabled={loadingDiagnostics}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 text-neutral-100 text-xs font-semibold flex items-center gap-2 transition-colors border border-neutral-700 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
            <span>{t('dash_reload')}</span>
          </button>
        </div>
      </div>

      {/* Copied Toast Banner */}
      {copied && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t('dash_export_copied')}</span>
        </div>
      )}

      {/* Loading or Error State */}
      {loadingDiagnostics && !diagnostics ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800">
          <RefreshCw className="w-7 h-7 text-neutral-400 animate-spin" />
          <p className="text-xs text-neutral-400">{t('dash_loading')}</p>
        </div>
      ) : errorDiagnostics && !diagnostics ? (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorDiagnostics}</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Primary Hardware Quad Grid (CPU, GPU, Motherboard, RAM) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* CPU Card */}
            {cpu && (
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200">{t('dash_cpu')}</h4>
                        <span className="text-[10px] text-neutral-400">{cpu.manufacturer || 'CPU'}</span>
                      </div>
                    </div>
                    {cpu.usagePercent !== undefined && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono tabular-nums">
                        {cpu.usagePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-neutral-100 mb-2 truncate" title={cpu.name}>
                    {cpu.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_cores')}</span>
                      <span className="font-bold text-neutral-200 font-mono tabular-nums">
                        {cpu.physicalCores}C / {cpu.logicalThreads}T
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_current_clock')}</span>
                      <span className="font-bold text-emerald-400 font-mono tabular-nums">
                        {(cpu.currentClockGhz || cpu.maxClockGhz)?.toFixed(2)} GHz
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between font-mono tabular-nums">
                  <span>{cpu.socket || 'Socket'}</span>
                  <span>L3: {cpu.l3CacheMb || 16} MB</span>
                </div>
              </div>
            )}

            {/* GPU Card */}
            {gpu && (
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200">{t('dash_gpu')}</h4>
                        <span className="text-[10px] text-neutral-400">Driver {gpu.driverVersion || 'WHQL'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono tabular-nums">
                      {gpu.vramGb > 0 ? `${gpu.vramGb.toFixed(1)} GB` : `${Math.round(gpu.vramMb / 1024)} GB`}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-neutral-100 mb-2 truncate" title={gpu.name}>
                    {gpu.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_resolution')}</span>
                      <span className="font-bold text-neutral-200 font-mono tabular-nums">{gpu.resolution || '1920x1080'}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_refresh_rate')}</span>
                      <span className="font-bold text-neutral-200 font-mono tabular-nums">{gpu.refreshRateHz ? `${gpu.refreshRateHz} Hz` : '60 Hz'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span className="font-mono tabular-nums">VRAM 64-bit</span>
                  <span className="text-emerald-400 font-medium">{gpu.resizableBar ? 'ReBAR ✓' : 'Ativo'}</span>
                </div>
              </div>
            )}

            {/* Motherboard & BIOS Card */}
            {mb && (
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                      <Component className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">{t('dash_motherboard')}</h4>
                      <span className="text-[10px] text-neutral-400 truncate">{mb.manufacturer}</span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-neutral-100 mb-2 truncate" title={mb.product}>
                    {mb.product}
                  </h3>

                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_bios_version')}</span>
                      <span className="font-bold text-neutral-200 font-mono tabular-nums">{mb.biosVersion}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_bios_date')}</span>
                      <span className="font-bold text-neutral-300 font-mono tabular-nums">{mb.biosReleaseDate}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between font-mono">
                  <span>SMBIOS</span>
                  <span className="text-neutral-200 font-semibold">{sec?.biosMode || 'UEFI'}</span>
                </div>
              </div>
            )}

            {/* RAM Memory Card */}
            {memory && (
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200">{t('dash_ram')}</h4>
                        <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                          {memory.moduleCount} {t('dash_modules_installed')}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 font-mono tabular-nums">
                      {Math.round(memory.totalGb || 0)} GB
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {memory.modules?.slice(0, 2).map((slot, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between text-[10px]"
                      >
                        <span className="font-bold text-neutral-300 font-mono">{slot.slot}</span>
                        <span className="font-semibold text-emerald-400 font-mono tabular-nums">
                          {slot.capacityGb}GB @ {slot.speedMhz}MHz
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between font-mono tabular-nums">
                  <span>Uso: {memory.usagePercent?.toFixed(0)}%</span>
                  <span className="text-emerald-400 font-medium">
                    {memory.moduleCount >= 2 ? t('dash_channel_dual') : t('dash_channel_single')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Overclock & Security Bento Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Overclock & Hardware Tuning */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">{t('dash_overclock_title')}</h4>
                  <p className="text-[10px] text-neutral-400">{t('dash_overclock_sub')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block">{t('dash_cpu_boost_label')}</span>
                  <span className={`font-bold font-mono tabular-nums text-xs ${cpu?.boostActive ? 'text-emerald-400' : 'text-neutral-200'}`}>
                    {(cpu?.currentClockGhz || cpu?.maxClockGhz)?.toFixed(2)} GHz
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block">{t('dash_ram_xmp_label')}</span>
                  <span className={`font-bold text-xs ${memory?.xmpActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {memory?.xmpActive ? t('dash_xmp_enabled') : t('dash_xmp_jedec')}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block">{t('dash_rebar_label')}</span>
                  <span className={`font-bold text-xs ${gpu?.resizableBar ? 'text-emerald-400' : 'text-neutral-300'}`}>
                    {gpu?.resizableBar ? t('dash_rebar_enabled') : t('dash_rebar_disabled')}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[9px] text-neutral-400 block">{t('dash_whql_label')}</span>
                  <span className="font-bold text-neutral-200 text-xs">
                    {gpu?.whqlSigned !== false ? 'WHQL ✓' : 'Custom'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security, Firmware & Boot */}
            {sec && (
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('dash_security_title')}</h4>
                    <p className="text-[10px] text-neutral-400">{t('dash_security_sub')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[9px] text-neutral-400 block">{t('dash_bios_mode')}</span>
                    <span className="font-bold text-neutral-200 text-xs font-mono">{sec.biosMode}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[9px] text-neutral-400 block">{t('dash_secure_boot')}</span>
                    <span className={`font-bold text-xs ${sec.secureBoot ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sec.secureBoot ? t('home_status_active') : t('home_status_inactive')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[9px] text-neutral-400 block">{t('dash_tpm_module')}</span>
                    <span className={`font-bold text-xs font-mono tabular-nums ${sec.tpmActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sec.tpmVersion}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[9px] text-neutral-400 block">{t('dash_vbs_hvci')}</span>
                    <span className={`font-bold text-xs ${!sec.vbsActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sec.vbsActive ? t('home_status_active') : 'Off (Max FPS)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Windows Activation & Product Key Card */}
          {lic && (
            <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-100">{t('dash_license_title')}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {lic.activationStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{t('dash_license_sub')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs font-bold tracking-wider text-neutral-200 tabular-nums">
                  {showProductKey ? lic.productKey : lic.maskedKey}
                </div>

                <button
                  onClick={() => setShowProductKey(!showProductKey)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  {showProductKey ? <EyeOff className="w-3.5 h-3.5 text-neutral-400" /> : <Eye className="w-3.5 h-3.5 text-neutral-400" />}
                  <span>{showProductKey ? t('dash_hide_key') : t('dash_show_key')}</span>
                </button>

                <button
                  onClick={handleCopyProductKey}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  {keyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-300" />}
                  <span>{keyCopied ? t('dash_key_copied') : t('dash_copy_key')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Row 4: Storage Disks Strip */}
          {storage.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
                {t('dash_storage')} ({storage.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {storage.map((disk, idx) => {
                  const usedPct = disk.usagePercent ?? (disk.sizeGb > 0 ? Math.round(((disk.sizeGb - disk.freeGb) / disk.sizeGb) * 100) : 0);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                            <HardDrive className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-neutral-100 truncate">{disk.model}</h5>
                            <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                              {disk.driveLetters ? `Volumes: ${disk.driveLetters}` : `Disco #${disk.diskNumber ?? idx}`}
                            </span>
                          </div>
                        </div>

                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 shrink-0 font-mono">
                          {disk.mediaType}
                        </span>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono tabular-nums">
                          <span className="text-neutral-300">
                            <strong className="text-emerald-400">{disk.freeGb} GB</strong> livres de {disk.sizeGb} GB
                          </span>
                          <span className="text-neutral-400">{usedPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              usedPct > 85 ? 'bg-red-500' : usedPct > 70 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, usedPct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 5: Displays & Audio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2">
            {displays.length > 0 && (
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-neutral-300" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {isLaptop ? t('dash_displays_laptop') : t('dash_displays')} ({displays.length})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {displays.map((mon, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-neutral-200">{mon.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                          {mon.manufacturer} • {mon.diagonalInches || 24}&quot; {mon.connection ? `• ${mon.connection}` : ''}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="font-bold text-neutral-100 block">{mon.resolution}</span>
                        <span className="text-[10px] text-neutral-400">{mon.refreshRateHz} Hz</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {peripherals && (
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-neutral-300" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {t('dash_peripherals')}
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  {peripherals.audioDevices?.length > 0 && (
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 font-semibold uppercase block mb-1">
                        {t('dash_audio_devices')}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {peripherals.audioDevices.slice(0, 4).map((aud, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-[10px] truncate max-w-[200px]">
                            {aud}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Setup Modal (max-w-xl with concise descriptions to prevent text clipping) */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-neutral-950 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-neutral-700">
                  <img src={monoLogo} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-sm font-bold text-neutral-100">{t('dash_export_modal_title')}</h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              {/* Option 1: Discord / Stylized Summary */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-neutral-100 block truncate">
                      {t('dash_export_discord', 'Resumo Rápido')}
                    </span>
                    <span className="text-[11px] text-neutral-400 block truncate">
                      {t('dash_export_discord_desc', 'Ideal para Discord, fóruns e suporte técnico.')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyDiscord}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-700"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{t('btn_copy', 'Copiar')}</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Resumo.txt', generateStylizedText(), 'text/plain;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-700"
                  >
                    <Download className="w-3 h-3" />
                    <span>{t('btn_download', 'Baixar')}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Full TXT Report */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-neutral-100 block truncate">
                      {t('dash_export_txt', 'Relatório em Texto (.TXT)')}
                    </span>
                    <span className="text-[11px] text-neutral-400 block truncate">
                      {t('dash_export_txt_desc', 'Auditoria completa em texto puro.')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateFullTxtReport());
                      setCopied(true);
                      setExportModalOpen(false);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-700"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{t('btn_copy', 'Copiar')}</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Hardware.txt', generateFullTxtReport(), 'text/plain;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-700"
                  >
                    <Download className="w-3 h-3" />
                    <span>{t('btn_download', 'Baixar')}</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Full Markdown Report */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-neutral-100 block truncate">
                      {t('dash_export_md', 'Documento Markdown (.MD)')}
                    </span>
                    <span className="text-[11px] text-neutral-400 block truncate">
                      {t('dash_export_md_desc', 'Tabelas formatadas para GitHub.')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateMarkdownReport());
                      setCopied(true);
                      setExportModalOpen(false);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-700"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{t('btn_copy', 'Copiar')}</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Hardware.md', generateMarkdownReport(), 'text/markdown;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-700"
                  >
                    <Download className="w-3 h-3" />
                    <span>{t('btn_download', 'Baixar')}</span>
                  </button>
                </div>
              </div>

              {/* Master Button: Download All Reports (Neutral Styling) */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    triggerDownload('Meu-Setup-Hardware.txt', generateFullTxtReport(), 'text/plain;charset=utf-8');
                    setTimeout(() => {
                      triggerDownload('Meu-Setup-Hardware.md', generateMarkdownReport(), 'text/markdown;charset=utf-8');
                    }, 300);
                    setTimeout(() => {
                      triggerDownload('Meu-Setup-Hardware.json', JSON.stringify(diagnostics, null, 2), 'application/json;charset=utf-8');
                    }, 600);
                    setExportModalOpen(false);
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4 text-neutral-300" />
                  <span>{t('dash_export_download_all', 'Baixar Todos os Relatórios (.TXT, .MD, .JSON)')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
