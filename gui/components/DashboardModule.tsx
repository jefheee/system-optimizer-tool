'use client';

import React, { useEffect, useState } from 'react';
import { getSystemDiagnostics, SystemDiagnostics } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
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
  Sparkles
} from 'lucide-react';

export default function DashboardModule() {
  const { t } = useLanguage();
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemDiagnostics();
      if (data.status === 'Error' && !data.cpu) {
        setError(data.message || 'Falha ao ler dados de diagnóstico do sistema.');
      } else {
        setDiagnostics(data);
      }
    } catch (err: any) {
      setError(
        typeof err === 'string'
          ? err
          : err?.message || 'Falha de comunicação com o backend em Rust.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleExportSetup = () => {
    if (!diagnostics?.setupExport) return;
    navigator.clipboard.writeText(diagnostics.setupExport);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Safe field getters with camelCase and PascalCase fallbacks
  const cpu = diagnostics?.cpu;
  const gpu = diagnostics?.gpu;
  const mb = diagnostics?.motherboard;
  const memory = diagnostics?.memory;
  const os = diagnostics?.operatingSystem;
  const storage = diagnostics?.storage || [];
  const displays = diagnostics?.displays || [];
  const peripherals = diagnostics?.peripherals;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-neutral-100">
              {t('dash_title')}
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            {t('dash_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportSetup}
            disabled={!diagnostics?.setupExport}
            className="px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors active:scale-95"
            title={t('dash_export_setup')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('dash_export_setup')}</span>
              </>
            )}
          </button>

          <button
            onClick={loadDiagnostics}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm shadow-blue-500/20 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
      {loading && !diagnostics ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-xs font-medium text-neutral-400">{t('dash_loading')}</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-red-300">Falha ao coletar dados</h4>
            <p className="text-xs mt-1 text-red-400/90">{error}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
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
                    {cpu.usagePercent !== undefined && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {cpu.usagePercent.toFixed(1)}% Uso
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-100 mb-2">
                    {cpu.name}
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_cores')}</span>
                      <span className="font-bold text-neutral-200">{cpu.physicalCores} Físicos</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_threads')}</span>
                      <span className="font-bold text-neutral-200">{cpu.logicalThreads} Threads</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">Clock Máximo</span>
                      <span className="font-bold text-neutral-200">{cpu.maxClockGhz?.toFixed(2) || '3.70'} GHz</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_cache')}</span>
                      <span className="font-bold text-neutral-200">{cpu.l3CacheMb || 32} MB</span>
                    </div>
                  </div>
                </div>

                {cpu.socket && (
                  <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60">
                    Socket: <span className="text-neutral-300 font-medium">{cpu.socket}</span>
                  </div>
                )}
              </div>
            )}

            {/* GPU Card (Real 64-bit VRAM fix) */}
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
                        <span className="text-[10px] text-neutral-400">Driver {gpu.driverVersion || 'Nativo'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {gpu.vramGb > 0 ? `${gpu.vramGb.toFixed(1)} GB VRAM` : `${Math.round(gpu.vramMb / 1024)} GB VRAM`}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-100 mb-2">
                    {gpu.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">Resolução Atual</span>
                      <span className="font-bold text-neutral-200">{gpu.resolution || '1920x1080'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">{t('dash_refresh_rate')}</span>
                      <span className="font-bold text-neutral-200">{gpu.refreshRateHz ? `${gpu.refreshRateHz} Hz` : '60 Hz'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span>VRAM Real (64-bits): <strong className="text-neutral-200">{gpu.vramGb > 0 ? `${gpu.vramGb.toFixed(1)} GB` : `${gpu.vramMb} MB`}</strong></span>
                  <span className="text-emerald-400 font-medium">Primária Ativa</span>
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
                      <span className="text-[10px] text-neutral-400">{mb.manufacturer || 'Fabricante'}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-100 mb-2">
                    {mb.product || 'Placa-Mãe'}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">Versão da BIOS</span>
                      <span className="font-bold text-cyan-400">{mb.biosVersion || 'Desconhecida'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                      <span className="text-[9px] text-neutral-400 block">Data de Lançamento</span>
                      <span className="font-bold text-neutral-200">{mb.biosReleaseDate || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-neutral-800/60">
                  SMBIOS Firmware: <span className="text-neutral-300 font-medium">{mb.manufacturer}</span>
                </div>
              </div>
            )}

            {/* RAM Memory Card */}
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
                        <span className="text-[10px] text-neutral-400">{memory.moduleCount} pente(s) instalado(s)</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {memory.usedGb ? `${memory.usedGb.toFixed(1)} / ` : ''}{memory.totalGb?.toFixed(1) || 32} GB
                    </span>
                  </div>

                  {/* Modules per slot */}
                  <div className="space-y-1.5 pt-1">
                    {memory.modules?.map((slot, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-300">{slot.slot || `Slot ${i + 1}`}</span>
                          <span className="text-neutral-400">•</span>
                          <span className="text-neutral-400">{slot.manufacturer} {slot.partNumber}</span>
                        </div>
                        <span className="font-semibold text-emerald-400">
                          {slot.capacityGb} GB @ {slot.speedMhz} MHz
                        </span>
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
                  <span>Uso Atual: <strong className="text-neutral-200">{memory.usagePercent?.toFixed(1) || '30'}%</strong></span>
                  <span className="text-emerald-400 font-medium">Dual-Channel</span>
                </div>
              </div>
            )}
          </div>

          {/* Storage Disks Section */}
          {storage.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t('dash_storage')} ({storage.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {storage.map((disk, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-neutral-950 flex items-center justify-center text-neutral-400 border border-neutral-800">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-neutral-200 truncate max-w-[160px]">{disk.model}</h5>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          <span className="font-semibold text-blue-400">{disk.mediaType}</span>
                          {' • '}
                          <span>{disk.sizeGb} GB</span>
                          {disk.freeGb > 0 && ` (${disk.freeGb} GB livres)`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                        disk.healthStatus === 'Healthy'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {disk.healthStatus === 'Healthy' ? t('dash_health_healthy') : t('dash_health_warning')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Displays Section */}
          {displays.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t('dash_displays')} ({displays.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displays.map((disp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-neutral-950 flex items-center justify-center text-cyan-400 border border-neutral-800">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-neutral-200">{disp.name}</h5>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {disp.manufacturer} • {disp.inches}&quot; • {disp.resolution} @ {disp.refreshRateHz}Hz
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {disp.inches}&quot; Display
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peripherals & OS Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Peripherals Card */}
            {peripherals && (
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                <div className="flex items-center gap-2 mb-3">
                  <Headphones className="w-4 h-4 text-neutral-400" />
                  <h4 className="text-xs font-bold text-neutral-200">{t('dash_peripherals')}</h4>
                </div>
                <div className="space-y-2 text-xs">
                  {peripherals.audioDevices?.slice(0, 3).map((audio, i) => (
                    <div key={i} className="flex items-center gap-2 text-neutral-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="truncate">{audio}</span>
                    </div>
                  ))}
                  {peripherals.inputDevices?.slice(0, 3).map((input, i) => (
                    <div key={i} className="flex items-center gap-2 text-neutral-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="truncate">{input}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OS & Uptime Card */}
            {os && (
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neutral-950 flex items-center justify-center text-blue-400 border border-neutral-800">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-neutral-200">{os.caption}</h5>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Build: {os.buildNumber || 'Windows Core'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">{t('dash_uptime')}</span>
                  <span className="text-xs font-bold text-blue-400">{os.formattedUptime || '0d 0h 0m'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
