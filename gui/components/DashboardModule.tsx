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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-neutral-100">{t('dash_title')}</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {isLaptop ? t('home_device_laptop') : t('home_device_desktop')}
            </span>
          </div>
          <p className="text-xs text-neutral-400">{t('dash_subtitle')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={!diagnostics}
            className="px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors active:scale-95"
            title={t('dash_export_setup')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('dash_copied_short')}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('dash_export_setup')}</span>
              </>
            )}
          </button>

          <button
            onClick={() => refreshDiagnostics()}
            disabled={loadingDiagnostics}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/20 active:scale-95"
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

      {/* Loading or Error State (Instant 0ms if diagnostics is cached) */}
      {loadingDiagnostics && !diagnostics ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-xs font-medium text-neutral-400">{t('dash_loading')}</p>
        </div>
      ) : errorDiagnostics && !diagnostics ? (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-red-300">{t('dash_error_title')}</h4>
            <p className="text-xs mt-1 text-red-400/90">{errorDiagnostics}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Laptop Battery Card (Shown when Laptop or battery detected) */}
          {battery && (
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">{t('dash_battery_title')}</h4>
                  <span className="text-xs text-amber-400 font-medium">
                    {battery.isCharging ? t('dash_battery_charging') : t('dash_battery_discharging')} • {battery.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_battery_charge')}</span>
                  <span className="font-extrabold text-emerald-400">{battery.chargePercent}%</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_battery_health')}</span>
                  <span className="font-extrabold text-cyan-400">{battery.healthPercent}%</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_battery_wear')}</span>
                  <span className="font-extrabold text-amber-400">{battery.wearLevelPercent}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid: CPU, GPU, Motherboard, RAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU Card */}
            {cpu && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200">{t('dash_cpu')}</h4>
                        <span className="text-[10px] text-neutral-400">{cpu.manufacturer || 'CPU'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cpu.boostActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {t('dash_boost_active')}
                        </span>
                      )}
                      {cpu.usagePercent !== undefined && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {cpu.usagePercent.toFixed(1)}% {t('dash_usage')}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-100 mb-2">{cpu.name}</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_cores')}</span>
                      <span className="font-bold text-neutral-200">{cpu.physicalCores} {t('dash_physical')}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_threads')}</span>
                      <span className="font-bold text-neutral-200">{cpu.logicalThreads} {t('dash_threads')}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_current_clock')}</span>
                      <span className="font-bold text-emerald-400">
                        {(cpu.currentClockGhz || cpu.maxClockGhz)?.toFixed(2)} GHz
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_cache')}</span>
                      <span className="font-bold text-neutral-200">{cpu.l3CacheMb || 16} MB</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span>
                    {t('dash_socket')}: <strong className="text-neutral-200">{cpu.socket || 'N/A'}</strong>
                  </span>
                  <span>
                    {t('dash_base_clock')}: <strong className="text-neutral-200">{(cpu.baseClockGhz || cpu.maxClockGhz)?.toFixed(2)} GHz</strong>
                  </span>
                </div>
              </div>
            )}

            {/* GPU Card */}
            {gpu && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200">{t('dash_gpu')}</h4>
                        <span className="text-[10px] text-neutral-400">Driver {gpu.driverVersion || 'WHQL'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {gpu.vramGb > 0 ? `${gpu.vramGb.toFixed(1)} GB VRAM` : `${Math.round(gpu.vramMb / 1024)} GB VRAM`}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-100 mb-2">{gpu.name}</h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_resolution')}</span>
                      <span className="font-bold text-neutral-200">{gpu.resolution || '1920x1080'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_refresh_rate')}</span>
                      <span className="font-bold text-neutral-200">{gpu.refreshRateHz ? `${gpu.refreshRateHz} Hz` : '60 Hz'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span>
                    {t('dash_vram_real')} (64-bit):{' '}
                    <strong className="text-neutral-200">
                      {gpu.vramGb > 0 ? `${gpu.vramGb.toFixed(1)} GB` : `${gpu.vramMb} MB`}
                    </strong>
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {gpu.resizableBar ? 'Resizable BAR ✓' : t('dash_primary_active')}
                  </span>
                </div>
              </div>
            )}

            {/* Motherboard & BIOS Card */}
            {mb && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Component className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">{t('dash_motherboard')}</h4>
                      <span className="text-[10px] text-neutral-400">{mb.manufacturer}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-100 mb-2">{mb.product}</h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_bios_version')}</span>
                      <span className="font-bold text-cyan-400">{mb.biosVersion}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_bios_date')}</span>
                      <span className="font-bold text-neutral-200">{mb.biosReleaseDate}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span>
                    SMBIOS: <span className="text-neutral-300 font-medium">{mb.manufacturer}</span>
                  </span>
                  <span className="text-cyan-400 font-semibold">{sec?.biosMode || 'UEFI'}</span>
                </div>
              </div>
            )}

            {/* RAM Memory Card (Deduplicated Bank + Slot, DDR Type, Voltage) */}
            {memory && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-200">{t('dash_ram')}</h4>
                        <span className="text-[10px] text-neutral-400">
                          {memory.moduleCount} {t('dash_modules_installed')}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {memory.usedGb ? `${memory.usedGb.toFixed(1)} / ` : ''}{memory.totalGb?.toFixed(1)} GB
                    </span>
                  </div>

                  {/* Modules per slot */}
                  <div className="space-y-1.5 pt-1">
                    {memory.modules?.map((slot, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <span className="font-bold text-neutral-200 shrink-0">{slot.slot}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-400 truncate">
                            {slot.manufacturer} {slot.partNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {slot.memoryType && (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[9px] font-bold">
                              {slot.memoryType}
                            </span>
                          )}
                          {slot.voltage && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold">
                              {slot.voltage}
                            </span>
                          )}
                          <span className="font-semibold text-emerald-400">
                            {slot.capacityGb} GB @ {slot.speedMhz} MHz
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* XMP Warning */}
                  {memory.xmpAlert && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{t('dash_xmp_alert')}</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span>
                    {t('dash_current_usage')}: <strong className="text-neutral-200">{memory.usagePercent?.toFixed(1)}%</strong>
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {memory.moduleCount >= 2 ? t('dash_channel_dual') : t('dash_channel_single')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Row: Overclock/Boost Card + Security/Firmware/Boot Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Overclock, Boost & Tunings Card */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-100">{t('dash_overclock_title')}</h4>
                  <p className="text-[10px] text-neutral-400">{t('dash_overclock_sub')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_cpu_boost_label')}</span>
                  <span className={`font-bold ${cpu?.boostActive ? 'text-emerald-400' : 'text-neutral-200'}`}>
                    {cpu?.boostActive ? t('dash_boost_active') : t('dash_boost_normal')} ({(cpu?.currentClockGhz || cpu?.maxClockGhz)?.toFixed(2)} GHz)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_ram_xmp_label')}</span>
                  <span className={`font-bold ${memory?.xmpActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {memory?.xmpActive ? t('dash_xmp_enabled') : t('dash_xmp_jedec')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_rebar_label')}</span>
                  <span className={`font-bold ${gpu?.resizableBar ? 'text-emerald-400' : 'text-neutral-300'}`}>
                    {gpu?.resizableBar ? t('dash_rebar_enabled') : t('dash_rebar_disabled')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_whql_label')}</span>
                  <span className="font-bold text-cyan-400">
                    {gpu?.whqlSigned !== false ? 'WHQL Verified ✓' : 'Custom Driver'}
                  </span>
                </div>
              </div>
            </div>

            {/* Security, Firmware & Boot Card */}
            {sec && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{t('dash_security_title')}</h4>
                    <p className="text-[10px] text-neutral-400">{t('dash_security_sub')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 block">{t('dash_bios_mode')}</span>
                    <span className="font-bold text-cyan-400">{sec.biosMode}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 block">{t('dash_secure_boot')}</span>
                    <span className={`font-bold ${sec.secureBoot ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sec.secureBoot ? t('home_status_active') : t('home_status_inactive')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 block">{t('dash_tpm_module')}</span>
                    <span className={`font-bold ${sec.tpmActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sec.tpmVersion}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-400 block">{t('dash_vbs_hvci')}</span>
                    <span className={`font-bold ${!sec.vbsActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {sec.vbsActive ? t('home_status_active') : 'Off (Max FPS)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Windows Activation & Product Key Card */}
          {lic && (
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-100">{t('dash_license_title')}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {lic.activationStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{t('dash_license_sub')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs font-bold tracking-wider text-neutral-200">
                  {showProductKey ? lic.productKey : lic.maskedKey}
                </div>

                <button
                  onClick={() => setShowProductKey(!showProductKey)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {showProductKey ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{showProductKey ? t('dash_hide_key') : t('dash_show_key')}</span>
                </button>

                <button
                  onClick={handleCopyProductKey}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {keyCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{keyCopied ? t('dash_key_copied') : t('dash_copy_key')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Storage Disks Section (Exact per-disk partition mapping & usage bar) */}
          {storage.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t('dash_storage')} ({storage.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {storage.map((disk, idx) => {
                  const usedPct = disk.usagePercent ?? (disk.sizeGb > 0 ? Math.round(((disk.sizeGb - disk.freeGb) / disk.sizeGb) * 100) : 0);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-neutral-950 flex items-center justify-center text-blue-400 border border-neutral-800 shrink-0">
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-neutral-100 truncate">{disk.model}</h5>
                            <span className="text-[10px] text-cyan-400 font-semibold">
                              {Array.isArray(disk.driveLetters)
                                ? disk.driveLetters.length > 0
                                  ? `${t('dash_disks_volumes')}: ${disk.driveLetters.join(', ')}`
                                  : `Disk #${disk.diskNumber ?? idx}`
                                : disk.driveLetters
                                ? `${t('dash_disks_volumes')}: ${disk.driveLetters}`
                                : `Disk #${disk.diskNumber ?? idx}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {disk.mediaType} • {disk.busType}
                          </span>
                          <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {disk.healthStatus === 'Healthy' ? t('dash_health_healthy') : disk.healthStatus}
                          </span>
                        </div>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-neutral-300 font-medium">
                            <strong className="text-emerald-400">{disk.freeGb} GB</strong> {t('dash_free')} {disk.sizeGb} GB
                          </span>
                          <span className="text-neutral-400 font-semibold">{usedPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              usedPct > 85 ? 'bg-red-500' : usedPct > 70 ? 'bg-amber-400' : 'bg-blue-500'
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

          {/* Displays (Dynamic Title for Laptop vs Desktop) & Peripherals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Displays Card */}
            {displays.length > 0 && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {isLaptop ? t('dash_displays_laptop') : t('dash_displays')} ({displays.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {displays.map((mon, i) => {
                    const isInternal = mon.isInternal || (isLaptop && i === 0);
                    const diagInches = mon.inches ?? mon.diagonalInches ?? 24;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-neutral-200 flex items-center gap-2">
                            <span>{mon.name}</span>
                            {isLaptop && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {isInternal ? t('dash_display_internal') : t('dash_display_external')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            {mon.manufacturer} • {diagInches}&quot; {mon.connection ? `• ${mon.connection}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-cyan-400 block">{mon.resolution}</span>
                          <span className="text-[10px] text-neutral-400">{mon.refreshRateHz} Hz</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Peripherals & Audio */}
            {peripherals && (
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {t('dash_peripherals')}
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  {peripherals.audioDevices?.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">
                        {t('dash_audio_devices')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {peripherals.audioDevices.map((aud, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 text-[11px]">
                            {aud}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {((peripherals.inputDevices && peripherals.inputDevices.length > 0) ||
                    (peripherals.mice && peripherals.mice.length > 0) ||
                    (peripherals.keyboards && peripherals.keyboards.length > 0)) && (
                    <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase block mb-1">
                        {t('dash_mice_keyboards')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(peripherals.inputDevices?.length
                          ? peripherals.inputDevices
                          : [...(peripherals.mice || []), ...(peripherals.keyboards || [])]
                        )
                          .slice(0, 8)
                          .map((inp, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px]">
                              {inp}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* OS & Uptime Footer */}
          {os && (
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-neutral-200">{os.caption}</span>
                <span>•</span>
                <span>{os.architecture || '64-bit'} (Build {os.buildNumber})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('dash_uptime')}: <strong className="text-neutral-200">{os.formattedUptime || os.uptimeFormatted}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Format Setup Exporter Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-neutral-950 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-700/80 bg-neutral-900 p-0.5">
                  <img src={monoLogo} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('dash_export_modal_title', 'Exportar Especificações do Setup')}</h3>
                  <p className="text-[10px] text-neutral-400">{t('dash_export_modal_sub', 'Copie ou baixe o diagnóstico de hardware nos formatos desejados.')}</p>
                </div>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Option 1: Discord / Stylized Summary */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-neutral-100 block">
                      {t('dash_export_discord', 'Resumo Rápido')}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
                      {t('dash_export_discord_desc', 'Ideal para Discord, fóruns e mensagens.')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyDiscord}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Resumo.txt', generateStylizedText(), 'text/plain;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Full TXT Report */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-neutral-100 block">
                      {t('dash_export_txt', 'Relatório em Texto (.TXT)')}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
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
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Hardware.txt', generateFullTxtReport(), 'text/plain;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Full Markdown Report */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-neutral-100 block">
                      {t('dash_export_md', 'Documento Técnico (.MD)')}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
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
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Hardware.md', generateMarkdownReport(), 'text/markdown;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Option 4: Full JSON */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-neutral-100 block">
                      {t('dash_export_json', 'Dados Estruturados (.JSON)')}
                    </span>
                    <span className="text-[10px] text-neutral-400 block truncate">
                      {t('dash_export_json_desc', 'Payload completo de sensores e barramentos.')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
                      setCopied(true);
                      setExportModalOpen(false);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerDownload('Meu-Setup-Hardware.json', JSON.stringify(diagnostics, null, 2), 'application/json;charset=utf-8');
                      setExportModalOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Baixar</span>
                  </button>
                </div>
              </div>

              {/* Master Button: Download All Reports */}
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
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
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
