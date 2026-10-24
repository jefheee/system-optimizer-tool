'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Monitor, MemoryStick } from 'lucide-react';

import {
  getLiveSensors,
  LiveSensorSnapshot,
  toggleHudOverlay,
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';

// Level 1 & Level 2 Navigation
import TopNavbar, { SysTopTabId } from '../components/TopNavbar';
import LeftSidebar, { SIDEBAR_ITEMS_BY_TOP_TAB } from '../components/LeftSidebar';
import LightRays from '../components/ui/LightRays';

// Level 3 & Content Modules
import HomeModule from '../components/HomeModule';
import SysCoreSystemView from '../components/SysCoreSystemView';
import BottleneckModule from '../components/BottleneckModule';
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

const PAGE_TITLES: Record<SysTopTabId, { name: string; descPt: string; descEn: string }> = {
  'sys-core': {
    name: 'CORE',
    descPt: 'Diagnóstico profundo de hardware, sensores térmicos e análise de gargalo',
    descEn: 'Deep hardware diagnostics, thermal telemetry, and bottleneck analysis',
  },
  'sys-otimiza': {
    name: 'OTIMIZA',
    descPt: 'Presets 1-clique, limpeza de armazenamento SSD/NVMe, gamer 0.5ms e debloat',
    descEn: '1-click presets, NVMe/SSD storage cleanup, gamer 0.5ms timer, and debloat',
  },
  'sys-bench': {
    name: 'BENCH',
    descPt: 'Benchmarks reais sequenciais e aleatórios de disco, RAM e simulador de FPS',
    descEn: 'Real sequential/random storage benchmarks, memory bandwidth, and FPS sim',
  },
  'sys-tuning': {
    name: 'TUNING',
    descPt: 'Overclock, perfil XMP/EXPO, esquemas de energia e erros de estabilidade WHEA',
    descEn: 'Overclock, XMP/EXPO verification, power schemes, and WHEA stability logs',
  },
  'sys-sync': {
    name: 'SYNC',
    descPt: 'Limpador de dispositivos USB fantasmas, árbitro de portas COM e iluminação RGB',
    descEn: 'Ghost USB peripheral cleaner, COM port arbiter, and universal RGB sync',
  },
  'sys-jogos': {
    name: 'JOGOS',
    descPt: 'Biblioteca unificada Steam/Epic/Riot/Xbox e Game Booster com timer 0.5ms',
    descEn: 'Unified Steam/Epic/Riot/Xbox game library and low-latency Game Booster',
  },
  'sys-drivers': {
    name: 'DRIVERS',
    descPt: 'Auditoria de drivers, instalador Maker CH340/FTDI/Arduino e pacotes Winget',
    descEn: 'Driver inventory audit, Maker CH340/FTDI/Arduino drivers, and Winget hub',
  },
  'sys-docs': {
    name: 'DOCS',
    descPt: 'Enciclopédia técnica de otimizações, transparência de kernel e sobre o projeto',
    descEn: 'Technical encyclopedia, kernel optimization transparency, and about suite',
  },
};

export default function Page() {
  const { lang } = useLanguage();
  const { theme, performanceMode } = useSettings();

  const [activeTopTab, setActiveTopTab] = useState<SysTopTabId>('sys-core');
  const [activeSubTab, setActiveSubTab] = useState<string>('core-overview');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
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
        setActiveTopTab('sys-otimiza');
        setActiveSubTab('opt-presets');
        break;
      case 'clean':
        setActiveTopTab('sys-otimiza');
        setActiveSubTab('opt-clean');
        break;
      case 'gamer':
        setActiveTopTab('sys-otimiza');
        setActiveSubTab('opt-gamer');
        break;
      case 'system':
        setActiveTopTab('sys-otimiza');
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
          case 'core-gpu':
            return <SysCoreSystemView directMode="gpu" />;
          case 'core-disks':
            return <SysCoreSystemView directMode="disks" />;
          case 'core-power':
            return <SysCoreSystemView directMode="power" />;
          case 'core-network':
            return <SysCoreSystemView directMode="network" />;
          case 'core-bottleneck':
            return <BottleneckModule />;
          case 'core-overlay':
            return (
              <SensorsAndStressModule
                mode="overlay"
                liveSensors={liveSensors}
                onRefreshSensors={pollSensors}
              />
            );
          case 'core-stress':
            return (
              <SensorsAndStressModule
                mode="stress"
                liveSensors={liveSensors}
                onRefreshSensors={pollSensors}
              />
            );
          default:
            return <SysCoreSystemView directMode="system" initialPill="storage" />;
        }
      }

      case 'sys-otimiza': {
        switch (activeSubTab) {
          case 'opt-presets':
            return <PresetsModule />;
          case 'opt-clean':
            return <CleanModule />;
          case 'opt-gamer':
            return <GamerModule />;
          case 'opt-postformat':
          case 'opt-system':
          case 'opt-startup':
            return <SystemModule />;
          default:
            return <PresetsModule />;
        }
      }

      case 'sys-bench':
        return <BenchmarksModule subTab={activeSubTab} onChangeSubTab={setActiveSubTab} />;

      case 'sys-tuning':
        return <TuningModule subTab={activeSubTab} onChangeSubTab={setActiveSubTab} />;

      case 'sys-sync':
        return <SyncAndUsbModule subTab={activeSubTab} onChangeSubTab={setActiveSubTab} />;

      case 'sys-jogos':
        if (activeSubTab === 'games-booster') {
          return <GamerModule />;
        }
        return <GamesLibraryModule />;

      case 'sys-drivers':
        if (activeSubTab === 'drv-hub') {
          return <ExternalToolsModule />;
        }
        return <DriversAndAppsModule subTab={activeSubTab} onChangeSubTab={setActiveSubTab} />;

      case 'sys-docs':
        return (
          <DocsAndAboutModule
            initialSubTab={activeSubTab === 'docs-about' ? 'about' : 'wiki'}
          />
        );

      default:
        return <HomeModule onNavigate={handleLegacyNavigate} />;
    }
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans overflow-hidden relative transition-colors ${
        theme === 'light' ? 'bg-[#eef2f6] text-[#0f172a]' : 'bg-[#07080c] text-[#f1f5f9]'
      }`}
    >
      {/* Global React Bits "Light Rays" WebGL2 Background (Spotlight Top Origin) */}
      {!performanceMode && (
        <LightRays
          raysOrigin="top-center"
          raysColor={theme === 'light' ? '#0284c7' : '#38bdf8'}
          raysSpeed={0.85}
          lightSpread={1.15}
          rayLength={1.85}
          pulsating={true}
          fadeDistance={1.0}
          saturation={theme === 'light' ? 1.0 : 0.9}
          followMouse={true}
          mouseInfluence={0.08}
          intensity={theme === 'light' ? 0.45 : 0.4}
          opacity={theme === 'light' ? 0.35 : 0.38}
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
            {/* Prominent Page Header with Stylized "SYS" Written Logo */}
            {!showSettingsModal && (
              <div
                className={`mb-4 pb-3 border-b ${
                  theme === 'light' ? 'border-slate-200' : 'border-zinc-800/70'
                } flex flex-wrap items-center justify-between gap-2`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sky-500 font-black text-2xl tracking-widest select-none drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                      SYS
                    </span>
                    <span
                      className={`font-black text-2xl tracking-tight ${
                        theme === 'light' ? 'text-slate-900' : 'text-zinc-100'
                      }`}
                    >
                      {PAGE_TITLES[activeTopTab].name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/25">
                    V6.0
                  </span>
                </div>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500 font-medium' : 'text-zinc-400'}`}>
                  {lang === 'pt' ? PAGE_TITLES[activeTopTab].descPt : PAGE_TITLES[activeTopTab].descEn}
                </p>
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

      {/* Step-by-Step Real-Time Execution Console Drawer */}
      <LiveProgressDrawer />
    </div>
  );
}
