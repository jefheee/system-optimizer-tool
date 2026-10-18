'use client';

import { useEffect, useState } from "react";
import { getSystemDiagnostics, SystemDiagnostics } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  Activity as RamIcon, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function DashboardModule() {
  const { t } = useLanguage();
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemDiagnostics();
      if (data.Status === "Error") {
        setError(data.Message);
      } else {
        setDiagnostics(data);
      }
    } catch (err: any) {
      setError(
        typeof err === "string" 
          ? err 
          : err?.message || "Falha de comunicação com o backend em Rust."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  return (
    <div className="space-y-8 animate-card-entry">
      
      {/* Hero Header Section */}
      <section className="glass-card rounded-2xl p-8 relative overflow-hidden min-h-[220px] flex flex-col justify-end">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 z-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center z-0 opacity-80 pointer-events-none">
          <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-primary to-secondary blur-[85px] animate-pulse-soft opacity-30" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold font-headline-lg tracking-tight mb-2 text-[#e5e2e1]">
              {t('dash_title')}
            </h3>
            <p className="text-xs text-[#bcc9cd]">
              {t('dash_subtitle')}
            </p>
          </div>
          <div className="flex gap-8 md:text-right items-center">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Status Geral
              </p>
              <div className="flex items-center gap-2 text-tertiary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                </span>
                <span className="font-semibold text-sm">{t('status_optimized')}</span>
              </div>
            </div>
            
            <button 
              onClick={loadDiagnostics}
              disabled={loading}
              className="p-2.5 rounded-lg border border-white/10 hover:border-white/20 bg-zinc-950/60 transition-all flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              {t('dash_reload')}
            </button>
          </div>
        </div>
      </section>

      {/* Diagnostics Grid */}
      <AnimatePresence mode="wait">
        {loading && !diagnostics ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-20 flex flex-col items-center justify-center gap-4 glass-card rounded-2xl"
          >
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-semibold text-zinc-400">{t('dash_loading')}</p>
          </motion.div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 text-red-400"
          >
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">Falha de Diagnóstico</h4>
              <p className="text-xs mt-1 leading-snug">{error}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* CPU Card */}
            {diagnostics?.Cpu && (
              <div className="glass-card rounded-xl p-6 relative group hover:border-primary/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Cpu className="w-4 h-4" />
                    </span>
                    <h4 className="font-bold text-zinc-200 text-sm">{t('dash_cpu')}</h4>
                  </div>
                  {diagnostics.Cpu.UsagePercent !== undefined && (
                    <span className="text-xs font-bold text-primary">
                      {diagnostics.Cpu.UsagePercent.toFixed(1)}% Uso
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-zinc-100 leading-tight mb-2">{diagnostics.Cpu.Name}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {diagnostics.Cpu.PhysicalCores ? `${diagnostics.Cpu.PhysicalCores} Núcleos Físicos &bull; ` : ''}
                  {t('dash_cpu_sub')}
                </p>
              </div>
            )}

            {/* GPU Card */}
            {diagnostics?.Gpu && (
              <div className="glass-card rounded-xl p-6 relative group hover:border-secondary/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-secondary/10 rounded-lg text-secondary">
                      <Activity className="w-4 h-4" />
                    </span>
                    <h4 className="font-bold text-zinc-200 text-sm">{t('dash_gpu')}</h4>
                  </div>
                  {diagnostics.Gpu.VramMb !== undefined && diagnostics.Gpu.VramMb > 0 && (
                    <span className="text-xs font-bold text-secondary">
                      {Math.round(diagnostics.Gpu.VramMb / 1024)} GB VRAM
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-zinc-100 leading-tight mb-2">{diagnostics.Gpu.Name}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{t('dash_gpu_sub')}</p>
              </div>
            )}

            {/* RAM Card */}
            {diagnostics?.Memory && (
              <div className="glass-card rounded-xl p-6 relative group hover:border-tertiary/30 transition-all duration-300 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
                      <RamIcon className="w-4 h-4" />
                    </span>
                    <h4 className="font-bold text-zinc-200 text-sm">{t('dash_ram')}</h4>
                  </div>
                  <span className="text-xs font-bold text-tertiary">
                    {diagnostics.Memory.UsedGB !== undefined ? `${diagnostics.Memory.UsedGB} / ` : ''}
                    {diagnostics.Memory.TotalGB} GB
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {diagnostics.Memory.Modules.map((mod, i) => (
                    <span key={i} className="text-[10px] font-semibold bg-zinc-950/80 border border-white/10 text-zinc-300 px-2.5 py-1 rounded">
                      Slot {i + 1}: {mod.CapacityGB}GB @ {mod.SpeedMHz}MHz
                    </span>
                  ))}
                </div>

                {diagnostics.Memory.XmpAlert && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{t('dash_xmp_alert')}</span>
                  </div>
                )}
              </div>
            )}

            {/* OS Uptime Card */}
            {diagnostics?.OperatingSystem && (
              <div className="glass-card rounded-xl p-6 relative group hover:border-zinc-700/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                      <Clock className="w-4 h-4" />
                    </span>
                    <h4 className="font-bold text-zinc-200 text-sm">{t('dash_uptime')}</h4>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400">
                    {diagnostics.OperatingSystem.Uptime.Days}d {diagnostics.OperatingSystem.Uptime.Hours}h {diagnostics.OperatingSystem.Uptime.Minutes}m
                  </span>
                </div>
                <h3 className="text-sm font-bold text-zinc-100 leading-tight mb-2">
                  {diagnostics.OperatingSystem.Caption}
                </h3>
                <p className="text-[10px] text-zinc-500 truncate">
                  Build: {diagnostics.OperatingSystem.BuildNumber || "Windows Core"}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Armazenamento */}
      {diagnostics && diagnostics.Storage && diagnostics.Storage.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">
            {t('dash_storage')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {diagnostics.Storage.map((disk, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-xl glass-card flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-zinc-950 rounded-lg text-zinc-500">
                    <HardDrive className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="font-bold text-xs text-zinc-200 leading-snug">{disk.Model}</h5>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {disk.MediaType} &bull; {disk.SizeGB} GB {disk.FreeGB ? `(${disk.FreeGB} GB livres)` : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                  disk.HealthStatus === 'Healthy' 
                    ? 'bg-tertiary/10 border-tertiary/20 text-tertiary' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {disk.HealthStatus === 'Healthy' ? t('dash_health_healthy') : t('dash_health_warning')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
