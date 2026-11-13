'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Cpu,
  Monitor,
  MemoryStick,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Zap,
  MonitorCog,
} from 'lucide-react';

import {
  getLiveSensors,
  LiveSensorSnapshot,
  toggleHudOverlay,
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';
import { useHardware } from '../lib/HardwareContext';

// Level 1 & Level 2 Navigation
import TopNavbar, { SysTopTabId } from '../components/TopNavbar';
import LeftSidebar, { SIDEBAR_ITEMS_BY_TOP_TAB } from '../components/LeftSidebar';
import LightRays from '../components/ui/LightRays';
import RestorePointModal from '../components/RestorePointModal';

// Level 3 & Content Modules
import HomeModule from '../components/HomeModule';
import SysCoreSystemView from '../components/SysCoreSystemView';
import SensorsAndStressModule from '../components/SensorsAndStressModule';
import PresetsModule from '../components/PresetsModule';
import CleanModule from '../components/CleanModule';
import GamerModule from '../components/GamerModule';
import SystemModule from '../components/SystemModule';
import BenchmarksModule from '../components/BenchmarksModule';
import TuningModule from '../components/TuningModule';
import SyncAndUsbModule from '../components/SyncAndUsbModule';
import GamesLibraryModule from '../components/GamesLibraryModule';
import DriversAndAppsModule from '../components/DriversAndAppsModule';
import ExternalToolsModule from '../components/ExternalToolsModule';
import DocsAndAboutModule from '../components/DocsAndAboutModule';
import SettingsModule from '../components/SettingsModule';
import LiveProgressDrawer from '../components/LiveProgressDrawer';

export type Tab =
  | 'home'
  | 'presets'
  | 'clean'
  | 'gamer'
  | 'system'
  | 'dashboard'
  | 'external'
  | 'docs'
  | 'settings';

const SUBPAGE_DESCRIPTIONS: Record<string, { pt: string; en: string }> = {
  'core-overview': {
    pt: 'Visão geral de status, score de otimização e painel rápido de ajustes ao vivo no Registro',
    en: 'System status overview, optimization score, and live Windows Registry tweak switches',
  },
  'core-system': {
    pt: 'Auditoria profunda de BIOS, UEFI/TPM, RAM Dual-Channel, GPU PCIe/ReBAR/MSI e Saúde S.M.A.R.T.',
    en: 'Deep BIOS, UEFI/TPM, Dual-Channel RAM, GPU PCIe/ReBAR/MSI, and S.M.A.R.T. storage audit',
  },
  'core-sensors': {
    pt: 'Sensores térmicos em tempo real, stress test CPU/RAM, monitor WHEA/Kernel-Power e protocolos OCCT/FurMark',
    en: 'Live thermal sensors, CPU/RAM stress test, WHEA/Kernel-Power monitor, and OCCT/FurMark protocols',
  },
  'core-benchmarks': {
    pt: 'Benchmarks de disco NVMe/SSD, largura de banda RAM, simulador FPS e calculadora de gargalo GPU/CPU',
    en: 'NVMe/SSD disk benchmarks, RAM bandwidth, FPS simulator, and 1080p/1440p/4K bottleneck calculator',
  },
  'opt-presets': {
    pt: 'Perfis 1-Clique completos (Gamer, Produtividade, Notebook Bateria) protegidos por Ponto de Restauração',
    en: 'Complete 1-Click presets (Gaming, Productivity, Laptop Battery) guarded by System Restore Points',
  },
  'opt-system': {
    pt: 'Checklist pós-formatação, menu de contexto clássico, telemetria e políticas essenciais do Windows',
    en: 'Post-format checklist, classic context menu, telemetry controls, and essential Windows policies',
  },
  'opt-debloat': {
    pt: 'Remoção segura de AppX/Bloatware e recursos de IA preservando WebView2, Loja e VBScript',
    en: 'Safe UWP/Bloatware and AI cleanup while preserving EdgeWebView2, Store, and VBScript runtime',
  },
  'opt-clean': {
    pt: 'Limpeza de caches temporários, shaders DirectX/NVIDIA/AMD, WinSxS e otimização segura de disco',
    en: 'Temporary files, DirectX/GPU shader caches, WinSxS cleanup, and safe SSD/NVMe space recovery',
  },
  'opt-network': {
    pt: 'Calibração de DNS ICMP, reset Winsock/TCP-IP, buffers de rede e ajustes de estabilidade de áudio',
    en: 'ICMP DNS calibration, Winsock/TCP-IP stack reset, network tuning, and audio stability tweaks',
  },
  'opt-startup': {
    pt: 'Gerenciador completo de aplicativos na inicialização (HKCU/HKLM/Startup) e serviços pesados',
    en: 'Startup applications manager (HKCU/HKLM/Startup) and background service controller',
  },
  'gaming-library': {
    pt: 'Biblioteca unificada Steam, Epic, Riot, GOG e Xbox com inicialização priorizada',
    en: 'Unified Steam, Epic, Riot, GOG, and Xbox game library with boosted launch pipeline',
  },
  'gaming-gpu': {
    pt: 'Inspeção de Flip Models DX12, Resizable BAR, MSI Mode por GPU e checagem do cabo de vídeo (iGPU vs dGPU)',
    en: 'DX12 Flip Models, Resizable BAR, per-GPU MSI Mode toggle, and display cable (iGPU vs dGPU) audit',
  },
  'gaming-latency': {
    pt: 'Timer de Kernel 0.5ms, standby RAM auto-clean, congelador de processos e prioridade de CPU para jogos',
    en: '0.5ms Kernel Timer resolution, standby RAM auto-clean, process freezer, and game CPU priority',
  },
  'gaming-overlay': {
    pt: 'HUD Overlay flutuante Always-on-Top com telemetria ao vivo, FPS e monitoramento estilo RTSS',
    en: 'Always-on-Top floating HUD Overlay with live temperatures, load, and RTSS-style frame telemetry',
  },
  'tuning-power': {
    pt: 'Planos de energia (Alto/Desempenho Máximo), scanner de clocks Boost/OC e saúde da bateria ACPI',
    en: 'Power plans (High/Ultimate Performance), Boost/OC clock scanner, and ACPI battery health',
  },
  'tuning-peripherals': {
    pt: 'Calibração de fila Mouse/Teclado, perfis XMP/DOCP/EXPO e ajustes de resposta para periféricos',
    en: 'Mouse/Keyboard interrupt queue tuning, XMP/DOCP/EXPO verification, and peripheral responsiveness',
  },
  'tuning-sync': {
    pt: 'Scanner USB de 3 camadas sem Admin, removedor de USB fantasmas, portas COM e controle RGB universal',
    en: 'Admin-free 3-layer USB scanner, ghost device cleaner, COM port arbiter, and universal RGB sync',
  },
  'tuning-whea': {
    pt: 'Auditoria de erros críticos WHEA-Logger, Kernel-Power 41, Sandbox de diagnóstico e Modo de Segurança',
    en: 'WHEA-Logger & Kernel-Power 41 audit, diagnostic sandbox, and safe troubleshooting recovery',
  },
  'drv-auditor': {
    pt: 'Inventário completo de drivers assinados, backup preventivo em pasta segura e orientações DDU',
    en: 'Signed driver inventory, automated driver backup, and DDU clean-reinstall workflows',
  },
  'drv-winget': {
    pt: 'Instalador inteligente via Winget para runtimes (VCRedist, DirectX, .NET) e utilitários essenciais',
    en: 'Smart Winget installer for essential runtimes (VCRedist, DirectX, .NET) and core utilities',
  },
  'drv-hub': {
    pt: 'Preparação para formatação limpa, criação de USB bootável, WinUtil, OOShutUp10 e ferramentas externas',
    en: 'Clean OS install prep, bootable USB tools, WinUtil, OOShutUp10, and external maintenance utilities',
  },
  'drv-maker': {
    pt: 'Drivers Maker Serial (CH340, FTDI, CP210x, Arduino) e limpeza de caches de compilação IDE',
    en: 'Serial Maker Drivers (CH340, FTDI, CP210x, Arduino) and IDE build cache cleanup',
  },
  'docs-encyclopedia': {
    pt: 'Enciclopédia técnica detalhando cada chave de Registro, risco, ganho real e forma de reversão',
    en: 'Technical encyclopedia explaining every Registry key, risk level, real impact, and revert method',
  },
  'docs-bios': {
    pt: 'Guia prático de BIOS AMD X3D/Intel, DDR5 >55°C, pressão de cooler, IMC e fluxo pós-crash WHEA',
    en: 'Practical BIOS guide for AMD X3D/Intel, DDR5 >55°C, cooler mount pressure, IMC, and WHEA recovery',
  },
  'docs-about': {
    pt: 'Arquitetura Rust + Tauri v2, política Zero-Telemetry e auditoria de integridade da suíte V6.0',
    en: 'Rust + Tauri v2 architecture, Zero-Telemetry policy, and V6.0 suite integrity verification',
  },
};

export default function Page() {
  const { lang } = useLanguage();
  const { theme, performanceMode, hasManualPerformanceOverride } = useSettings();
  const { diagnostics, hardwareTier, restoreStatus } = useHardware();

  const [activeTopTab, setActiveTopTab] = useState<SysTopTabId>('sys-core');
  const [activeSubTab, setActiveSubTab] = useState<string>('core-overview');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [liveSensors, setLiveSensors] = useState<LiveSensorSnapshot | null>(null);
  const [isOverlayWindow, setIsOverlayWindow] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('overlay=1')) {
      setIsOverlayWindow(true);
    }
  }, []);

  const pollSensors = useCallback(async () => {
    try {
      const res = await getLiveSensors();
      if (res.success && res.data) {
        setLiveSensors(res.data);
      }
    } catch {
      // Ignore transient polling errors
    }
  }, []);

  useEffect(() => {
    pollSensors();
    const interval = setInterval(pollSensors, 2000);
    return () => clearInterval(interval);
  }, [pollSensors]);

  const handleSelectTopTab = (topTab: SysTopTabId) => {
    setShowSettingsModal(false);
    setActiveTopTab(topTab);
    const items = SIDEBAR_ITEMS_BY_TOP_TAB[topTab];
    if (items && items.length > 0) {
      setActiveSubTab(items[0].id);
    }
  };

  const handleLegacyNavigate = (tab: Tab) => {
    setShowSettingsModal(false);
    switch (tab) {
      case 'home':
        setActiveTopTab('sys-core');
        setActiveSubTab('core-overview');
        break;
      case 'dashboard':
        setActiveTopTab('sys-core');
        setActiveSubTab('core-system');
        break;
      case 'presets':
        setActiveTopTab('sys-optimize');
        setActiveSubTab('opt-presets');
        break;
      case 'clean':
        setActiveTopTab('sys-optimize');
        setActiveSubTab('opt-clean');
        break;
      case 'gamer':
        setActiveTopTab('sys-gaming');
        setActiveSubTab('gaming-latency');
        break;
      case 'system':
        setActiveTopTab('sys-optimize');
        setActiveSubTab('opt-system');
        break;
      case 'external':
        setActiveTopTab('sys-drivers');
        setActiveSubTab('drv-hub');
        break;
      case 'docs':
        setActiveTopTab('sys-docs');
        setActiveSubTab('docs-encyclopedia');
        break;
      case 'settings':
        setShowSettingsModal(true);
        break;
    }
  };

  // Dedicated In-Game HUD Overlay Window (?overlay=1)
  if (isOverlayWindow) {
    const cpuTemp = liveSensors?.cpuTempC ?? 48;
    const cpuLoad = liveSensors?.cpuLoadPercent ?? 18;
    const gpuTemp = liveSensors?.gpuTempC ?? 52;
    const gpuLoad = liveSensors?.gpuLoadPercent ?? 24;
    const ramPct = liveSensors?.ramLoadPercent ?? 45;
    const estFps = Math.max(60, Math.round(240 - cpuLoad * 0.65 - gpuLoad * 0.45));
    const frametimeMs = (1000 / estFps).toFixed(1);

    return (
      <div
        data-tauri-drag-region
        className="w-screen h-screen bg-zinc-950/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 text-zinc-100 font-mono select-none flex flex-col justify-between overflow-hidden shadow-2xl"
      >
        <div
          data-tauri-drag-region
          className="flex items-center justify-between border-b border-zinc-800 pb-1.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider text-cyan-400">
              SYS HUD OVERLAY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-emerald-400">
              {estFps} FPS <span className="text-[10px] text-zinc-400">({frametimeMs}ms)</span>
            </span>
            <button
              onClick={() => toggleHudOverlay(false)}
              className="p-0.5 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Fechar Overlay"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1.5 text-[11px]">
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2 py-1.5">
            <div className="flex items-center gap-1 text-[9px] text-zinc-400">
              <Cpu className="w-3 h-3 text-cyan-400" /> CPU
            </div>
            <div className="font-bold text-zinc-100">
              {cpuLoad.toFixed(0)}% <span className="text-amber-300">{cpuTemp.toFixed(0)}°C</span>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2 py-1.5">
            <div className="flex items-center gap-1 text-[9px] text-zinc-400">
              <Monitor className="w-3 h-3 text-emerald-400" /> GPU
            </div>
            <div className="font-bold text-zinc-100">
              {gpuLoad.toFixed(0)}% <span className="text-emerald-300">{gpuTemp.toFixed(0)}°C</span>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg px-2 py-1.5">
            <div className="flex items-center gap-1 text-[9px] text-zinc-400">
              <MemoryStick className="w-3 h-3 text-purple-400" /> RAM
            </div>
            <div className="font-bold text-zinc-100">
              {ramPct.toFixed(0)}%{' '}
              <span className="text-zinc-400 text-[10px]">
                {liveSensors?.ramUsedGb?.toFixed(1) ?? '7.2'}G
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    if (showSettingsModal) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
              {lang === 'pt' ? 'Configurações Globais V6.0' : 'Global Settings V6.0'}
            </span>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              {lang === 'pt' ? '← Voltar ao Painel' : '← Back to Panel'}
            </button>
          </div>
          <SettingsModule />
        </div>
      );
    }

    switch (activeTopTab) {
      case 'sys-core': {
        switch (activeSubTab) {
          case 'core-overview':
            return <HomeModule onNavigate={handleLegacyNavigate} />;
          case 'core-system':
            return <SysCoreSystemView directMode="system" initialPill="storage" />;
          case 'core-sensors':
            return (
              <SensorsAndStressModule
                mode="sensors"
                liveSensors={liveSensors}
                onRefreshSensors={pollSensors}
              />
            );
          case 'core-benchmarks':
            return <BenchmarksModule subTab="bench-disk" onChangeSubTab={setActiveSubTab} />;
          default:
            return <HomeModule onNavigate={handleLegacyNavigate} />;
        }
      }

      case 'sys-optimize': {
        switch (activeSubTab) {
          case 'opt-presets':
            return <PresetsModule />;
          case 'opt-system':
            return <SystemModule initialSubView="checklist" />;
          case 'opt-debloat':
            return <SystemModule initialSubView="maintenance" />;
          case 'opt-clean':
            return <CleanModule />;
          case 'opt-network':
            return <SystemModule initialSubView="general" />;
          case 'opt-startup':
            return <SystemModule initialSubView="startup" />;
          default:
            return <PresetsModule />;
        }
      }

      case 'sys-gaming': {
        switch (activeSubTab) {
          case 'gaming-library':
            return <GamesLibraryModule />;
          case 'gaming-gpu':
            return <SysCoreSystemView directMode="gpu" />;
          case 'gaming-latency':
            return <GamerModule />;
          case 'gaming-overlay':
            return (
              <SensorsAndStressModule
                mode="overlay"
                liveSensors={liveSensors}
                onRefreshSensors={pollSensors}
              />
            );
          default:
            return <GamesLibraryModule />;
        }
      }

      case 'sys-tuning': {
        switch (activeSubTab) {
          case 'tuning-power':
            return <TuningModule subTab="tuning-power" onChangeSubTab={setActiveSubTab} />;
          case 'tuning-peripherals':
            return <TuningModule subTab="tuning-peripherals" onChangeSubTab={setActiveSubTab} />;
          case 'tuning-sync':
            return <SyncAndUsbModule subTab="sync-usb" onChangeSubTab={setActiveSubTab} />;
          case 'tuning-whea':
            return <TuningModule subTab="tuning-whea" onChangeSubTab={setActiveSubTab} />;
          default:
            return <TuningModule subTab="tuning-power" onChangeSubTab={setActiveSubTab} />;
        }
      }

      case 'sys-drivers':
        if (activeSubTab === 'drv-hub') {
          return <ExternalToolsModule />;
        }
        return <DriversAndAppsModule subTab={activeSubTab} onChangeSubTab={setActiveSubTab} />;

      case 'sys-docs':
        return (
          <DocsAndAboutModule
            initialSubTab={
              activeSubTab === 'docs-about'
                ? 'about'
                : activeSubTab === 'docs-bios'
                ? 'bios'
                : 'wiki'
            }
          />
        );

      default:
        return <HomeModule onNavigate={handleLegacyNavigate} />;
    }
  };

  const currentSidebarItem = (SIDEBAR_ITEMS_BY_TOP_TAB[activeTopTab] || []).find(
    (item) => item.id === activeSubTab
  );
  const activeSubTitle = currentSidebarItem
    ? lang === 'pt'
      ? currentSidebarItem.labelPt
      : currentSidebarItem.labelEn
    : 'Overview';
  const activeSubDesc = SUBPAGE_DESCRIPTIONS[activeSubTab]
    ? lang === 'pt'
      ? SUBPAGE_DESCRIPTIONS[activeSubTab].pt
      : SUBPAGE_DESCRIPTIONS[activeSubTab].en
    : '';
  const hasRecentRestore = Boolean(restoreStatus?.hasRecentRestorePoint);
  const osTierLabel = diagnostics?.osCompat?.osTier || diagnostics?.operatingSystem?.caption || 'Windows';

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans overflow-hidden relative transition-colors ${
        theme === 'light' ? 'bg-[#eef2f6] text-[#0f172a]' : 'bg-[#050608] text-[#f1f5f9]'
      }`}
    >
      {/* Global React Bits "Light Rays" WebGL2 Background (auto-disabled on low hardware tier) */}
      {!performanceMode && (
        <LightRays
          raysOrigin="top-center"
          raysColor={theme === 'light' ? '#0284c7' : '#38bdf8'}
          raysSpeed={0.95}
          lightSpread={1.4}
          rayLength={2.1}
          pulsating={true}
          fadeDistance={1.0}
          saturation={theme === 'light' ? 1.0 : 0.95}
          followMouse={true}
          mouseInfluence={0.10}
          intensity={theme === 'light' ? 0.65 : 0.72}
          opacity={theme === 'light' ? 0.55 : 0.62}
          lightMode={theme === 'light'}
        />
      )}

      {/* Level 1: TopNavbar strictly at top, shrink-0, z-20 */}
      <TopNavbar
        activeTopTab={activeTopTab}
        onSelectTopTab={handleSelectTopTab}
        onOpenSettings={() => setShowSettingsModal((prev) => !prev)}
      />

      {/* Level 2 + Level 3 Workspace Area: z-10 flex flex-1 min-h-0 overflow-hidden */}
      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        {/* Level 2: Contextual Left Sidebar */}
        <LeftSidebar
          activeTopTab={activeTopTab}
          activeSubTab={activeSubTab}
          onSelectSubTab={(sub) => {
            setShowSettingsModal(false);
            setActiveSubTab(sub);
          }}
          liveSensors={liveSensors}
        />

        {/* Level 3: Main Content Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 md:p-6">
          <div className="w-full min-h-0 max-w-[1600px] mx-auto flex flex-col">
            {/* Single Clean Subpage Header + Restore Point Guard + Auto Hardware Tier + OS Compat */}
            {!showSettingsModal && (
              <div
                className={`mb-4 pb-3 border-b ${
                  theme === 'light' ? 'border-slate-200' : 'border-zinc-800/70'
                } flex flex-wrap items-center justify-between gap-3`}
              >
                <div className="min-w-0">
                  <h1
                    className={`font-black text-xl tracking-tight ${
                      theme === 'light' ? 'text-slate-900' : 'text-zinc-100'
                    }`}
                  >
                    {activeSubTitle}
                  </h1>
                  {activeSubDesc && (
                    <p
                      className={`text-xs mt-0.5 ${
                        theme === 'light' ? 'text-slate-500 font-medium' : 'text-zinc-400'
                      }`}
                    >
                      {activeSubDesc}
                    </p>
                  )}
                </div>

                {/* Status Badges Bar */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Restore Point Guard Pill */}
                  <button
                    onClick={() => setShowRestoreModal(true)}
                    title={
                      lang === 'pt'
                        ? 'Clique para gerenciar ou criar Ponto de Restauração'
                        : 'Click to manage or create a System Restore Point'
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                      hasRecentRestore
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    }`}
                  >
                    {hasRecentRestore ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {hasRecentRestore
                        ? lang === 'pt'
                          ? 'Restore Point OK (<24h)'
                          : 'Restore Point Ready (<24h)'
                        : lang === 'pt'
                        ? 'Criar Ponto de Restauração'
                        : 'Create Restore Point'}
                    </span>
                  </button>

                  {/* Auto Hardware Tier Badge */}
                  <span
                    title={
                      lang === 'pt'
                        ? 'Detecção automática de tier para animações WebGL/CSS'
                        : 'Automatic hardware tier detection for WebGL/CSS animations'
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      hardwareTier === 'low' || performanceMode
                        ? theme === 'light'
                          ? 'bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                    }`}
                  >
                    {hardwareTier === 'low' || performanceMode ? (
                      <Zap className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-sky-400" />
                    )}
                    <span>
                      {lang === 'pt'
                        ? `Hardware Tier: ${
                            hardwareTier === 'low'
                              ? 'Eco (Modo Leve)'
                              : hardwareTier === 'high'
                              ? 'High (Animações Ativas)'
                              : 'Mid (Animações Ativas)'
                          }${performanceMode && hardwareTier !== 'low' ? ' • Eco' : ''}${
                            hasManualPerformanceOverride ? ' (Manual)' : ''
                          }`
                        : `Hardware Tier: ${
                            hardwareTier === 'low'
                              ? 'Eco (Light Mode)'
                              : hardwareTier === 'high'
                              ? 'High (Animations On)'
                              : 'Mid (Animations On)'
                          }${performanceMode && hardwareTier !== 'low' ? ' • Eco' : ''}${
                            hasManualPerformanceOverride ? ' (Manual)' : ''
                          }`}
                    </span>
                  </span>

                  {/* OS Compatibility Tier Badge */}
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                      theme === 'light'
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <MonitorCog className="w-3 h-3 text-sky-400" />
                    <span>{osTierLabel}</span>
                  </span>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={showSettingsModal ? 'settings-modal' : `${activeTopTab}-${activeSubTab}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mandatory & Manual Restore Point Interceptor Modal */}
      <RestorePointModal
        manualOpen={showRestoreModal}
        onCloseManual={() => setShowRestoreModal(false)}
      />

      {/* Step-by-Step Real-Time Execution Console Drawer */}
      <LiveProgressDrawer />
    </div>
  );
}
