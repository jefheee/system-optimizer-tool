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
  Layers,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Share2,
  Lock,
} from 'lucide-react';

export default function DashboardModule() {
  const { language, t } = useLanguage();
  const { diagnostics, loadingDiagnostics, refreshDiagnostics } = useHardware();

  const [copiedKey, setCopiedKey] = useState(false);

  const cpu = diagnostics?.cpu;
  const gpu = diagnostics?.gpu;
  const mem = diagnostics?.memory;
  const sec = diagnostics?.security || diagnostics?.securityAndBoot;
  const lic = diagnostics?.license || diagnostics?.windowsLicense;
  const storage = diagnostics?.storage || [];

  const handleCopyKey = () => {
    const key = lic?.productKey || 'XXXXX-OEM-89214-PROD-99182';
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const coreList = [
    { id: '00', clock: '5.40 GHz', volt: '1.28V', isE: false },
    { id: '01', clock: '5.42 GHz', volt: '1.29V', isE: false },
    { id: '02', clock: '5.38 GHz', volt: '1.27V', isE: false },
    { id: '03', clock: '5.40 GHz', volt: '1.28V', isE: false },
    { id: '04', clock: '4.30 GHz', volt: '1.12V', isE: true },
    { id: '05', clock: '4.30 GHz', volt: '1.12V', isE: true },
    { id: '06', clock: '4.30 GHz', volt: '1.12V', isE: true },
    { id: '07', clock: '4.30 GHz', volt: '1.12V', isE: true },
  ];

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 min-h-0 flex flex-col font-sans select-none">
      {/* Header Row (Screenshot 5) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-neutral-100 tracking-tight">
                  Hardware Profiler HUD
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  HUD v5.2 ACTIVE
                </span>
              </div>
              <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
                {language === 'PT'
                  ? 'Monitoramento tático em tempo real, telemetria de clocks avançados e diagnóstico de subsistemas.'
                  : 'Tactical real-time monitoring, advanced clocks telemetry and subsystem diagnostics.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right font-mono text-[11px]">
              <div className="text-[9px] uppercase text-neutral-400">
                {language === 'PT' ? 'LATÊNCIA DO KERNEL' : 'KERNEL LATENCY'}
              </div>
              <div className="text-emerald-400 font-bold tabular-nums">
                0.48ms <span className="text-neutral-400">[{language === 'PT' ? 'ESTÁVEL' : 'STABLE'}]</span>
              </div>
            </div>

            <button
              onClick={() => refreshDiagnostics()}
              disabled={loadingDiagnostics}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
              <span>{language === 'PT' ? 'Atualizar HUD' : 'Refresh HUD'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 8 cols (CPU, GPU, RAM, Storage) + Right 4 cols (Firmware, License) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-2.5 flex flex-col">
          {/* CPU Clocks & Core Matrix Card */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-200">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>PROCESSADOR // TELEMETRIA DE CLOCKS</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ● Boost Ativo: 5.45 GHz
              </span>
            </div>

            {/* 3 Telemetry Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5 font-mono">
                <div className="text-[9px] uppercase text-neutral-400">CPU PACKAGE TEMP</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-neutral-100 tabular-nums">54°C</span>
                  <span className="text-[10px] text-emerald-400">Delta: -12°C</span>
                </div>
                <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '54%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5 font-mono">
                <div className="text-[9px] uppercase text-neutral-400">CONSUMO DE ENERGIA</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-neutral-100 tabular-nums">142 W</span>
                  <span className="text-[10px] text-cyan-400">TDP: 250W</span>
                </div>
                <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: '56%' }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1.5 font-mono">
                <div className="text-[9px] uppercase text-neutral-400">USO DO SISTEMA</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-neutral-100 tabular-nums">18.4%</span>
                  <span className="text-[10px] text-neutral-400">24 Core / 32 Thread</span>
                </div>
                <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: '18%' }} />
                </div>
              </div>
            </div>

            {/* Core Matrix */}
            <div className="pt-2 border-t border-neutral-800/80 space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span>MATRIZ DE CORES (P-CORE / E-CORE)</span>
                <span>CLOCK REAL / TENSÃO</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {coreList.map((c) => (
                  <div
                    key={c.id}
                    className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/90 flex items-center justify-between text-[10px]"
                  >
                    <span className="text-neutral-400">CORE {c.id}{c.isE ? ' (E)' : ''}:</span>
                    <span className="text-cyan-400 font-bold tabular-nums">{c.clock}</span>
                    <span className="text-neutral-500 tabular-nums">/ {c.volt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2 Side-by-Side Cards: GPU + RAM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
            {/* GPU Card */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-200">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>UNIDADE GRÁFICA (GPU)</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-cyan-400 border border-neutral-700">
                    PCIe 4.0 x16
                  </span>
                </div>

                <h3 className="text-xs font-bold text-neutral-100 truncate">
                  {gpu?.name || 'NVIDIA GeForce RTX 4090'}
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 truncate">
                  Driver v551.86 Studio Ready • VRAM 24GB GDDR6X
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 space-y-1 font-mono text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">CLOCK DE CORE:</span>
                  <span className="text-neutral-200 font-bold tabular-nums">2,790 MHz</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">CLOCK DE VRAM:</span>
                  <span className="text-neutral-200 font-bold tabular-nums">21,200 MHz</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">HOTSPOT TEMP:</span>
                  <span className="text-emerald-400 font-bold tabular-nums">68.2°C</span>
                </div>
              </div>
            </div>

            {/* RAM Card */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-200">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>MEMÓRIA RAM (DUAL-CHANNEL)</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-cyan-400 border border-neutral-700">
                    64 GB DDR5
                  </span>
                </div>

                <h3 className="text-xs font-bold text-neutral-100 truncate">
                  Corsair Vengeance RGB 6000MHz
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 truncate">
                  Timings: 30-36-36-76 • Command Rate: 1T
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 space-y-1 font-mono text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">USO ATUAL:</span>
                  <span className="text-neutral-200 font-bold tabular-nums">18.2 GB / 64 GB (28%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">INFRAESTRUTURA:</span>
                  <span className="text-cyan-400 font-bold">Quad-Rank / Dual-Channel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">XMP / EXPO PROFILE:</span>
                  <span className="text-emerald-400 font-bold">EXPO I [ATIVO]</span>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Telemetry Card */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-200">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>UNIDADES DE ARMAZENAMENTO // SMART TELEMETRY</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                ● 100% Saúde Geral (NVMe Gen5/Gen4)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 font-mono space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold">NVMe 01 (OS DRIVE)</span>
                  <span className="text-emerald-400">Temperatura: 38°C</span>
                </div>
                <div className="text-xs font-bold text-neutral-100">Samsung 990 PRO 2TB NVMe M.2</div>
                <div className="text-[10px] text-neutral-400">Leitura: 7,450 MB/s • Escrita: 6,900 MB/s</div>
                <div className="flex items-center justify-between text-[10px] text-neutral-300 pt-1 border-t border-neutral-850">
                  <span>VIDA ÚTIL RESTANTE: <strong className="text-emerald-400">99%</strong></span>
                  <span>ESCRITAS TOTAIS: 4.2 TB</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 font-mono space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold">NVMe 02 (SCRATCH DISK)</span>
                  <span className="text-emerald-400">Temperatura: 42°C</span>
                </div>
                <div className="text-xs font-bold text-neutral-100">WD_BLACK SN850X 4TB NVMe</div>
                <div className="text-[10px] text-neutral-400">Leitura: 7,300 MB/s • Escrita: 6,600 MB/s</div>
                <div className="flex items-center justify-between text-[10px] text-neutral-300 pt-1 border-t border-neutral-850">
                  <span>VIDA ÚTIL RESTANTE: <strong className="text-emerald-400">100%</strong></span>
                  <span>ESCRITAS TOTAIS: 1.8 TB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-2.5 flex flex-col">
          {/* Firmware & Segurança */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-200">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>FIRMWARE & SEGURANÇA</span>
            </div>

            <div className="space-y-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase text-neutral-400">VERSÃO DA BIOS</div>
                  <div className="text-neutral-100 font-bold">AMI UEFI v2404</div>
                  <div className="text-[9px] text-neutral-500">Data de Lançamento: 14/02/2024</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  ÚLTIMA
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-400">SECURE BOOT:</span>
                <span className="text-emerald-400 font-bold">● ATIVADO</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">TPM 2.0 HARDWARE:</span>
                <span className="text-emerald-400 font-bold">● OPERACIONAL</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">VBS / HYPERVISOR:</span>
                <span className="text-cyan-400 font-bold">ISOLAMENTO ATIVO</span>
              </div>
            </div>
          </div>

          {/* Licenciamento do Sistema */}
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-200">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <span>LICENCIAMENTO DO SISTEMA</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-snug">
                Chave de ativação digital vinculada ao hardware UEFI (OEM-SLP).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2 font-mono text-xs">
              <span className="text-cyan-400 font-bold truncate">
                {lic?.productKey || 'XXXXX-OEM-89214-PROD-99182'}
              </span>
              <button
                onClick={handleCopyKey}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors shrink-0"
                title="Copiar Chave Digital"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span className="text-emerald-400 font-bold">Status: Licença Digital Ativa</span>
              <span>Windows 11 Pro Workstation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
