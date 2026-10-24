"use client";

import React from "react";
import {
  Activity,
  Cpu,
  Thermometer,
  Monitor,
  HardDrive,
  BatteryCharging,
  Wifi,
  Scale,
  Layers,
  Flame,
  Zap,
  Sparkles,
  Gamepad2,
  Wand2,
  ShieldCheck,
  Rocket,
  Gauge,
  MemoryStick,
  AlertTriangle,
  Usb,
  Palette,
  FolderSearch,
  Wrench,
  PackagePlus,
  Users,
  BookOpen,
  Info,
} from "lucide-react";
import { LiveSensorSnapshot, openExternalUrl } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { useSettings } from "../lib/SettingsContext";
import { SysTopTabId } from "./TopNavbar";

export interface SidebarSubItem {
  id: string;
  labelPt: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SIDEBAR_ITEMS_BY_TOP_TAB: Record<SysTopTabId, SidebarSubItem[]> = {
  "sys-core": [
    { id: "core-overview", labelPt: "Início / Checkup", labelEn: "Home / Checkup", icon: Activity },
    { id: "core-system", labelPt: "Sistema", labelEn: "System", icon: Cpu },
    { id: "core-sensors", labelPt: "Sensores", labelEn: "Sensors", icon: Thermometer },
    { id: "core-gpu", labelPt: "Placa de vídeo", labelEn: "Graphics Card", icon: Monitor },
    { id: "core-disks", labelPt: "Discos", labelEn: "Storage Disks", icon: HardDrive },
    { id: "core-power", labelPt: "Energia", labelEn: "Power & Battery", icon: BatteryCharging },
    { id: "core-network", labelPt: "Rede", labelEn: "Network & DNS", icon: Wifi },
    { id: "core-bottleneck", labelPt: "Gargalo", labelEn: "Bottleneck", icon: Scale },
    { id: "core-overlay", labelPt: "Overlay", labelEn: "HUD Overlay", icon: Layers },
    { id: "core-stress", labelPt: "Stress test", labelEn: "Stress Test", icon: Flame },
  ],
  "sys-otimiza": [
    { id: "opt-presets", labelPt: "Presets 1-Clique", labelEn: "1-Click Presets", icon: Zap },
    { id: "opt-clean", labelPt: "Limpeza SSD/HDD", labelEn: "SSD/HDD Clean", icon: Sparkles },
    { id: "opt-gamer", labelPt: "Gamer 0.5ms", labelEn: "Gamer 0.5ms", icon: Gamepad2 },
    { id: "opt-postformat", labelPt: "Pós-Formatação", labelEn: "Post-Format", icon: Wand2 },
    { id: "opt-system", labelPt: "Sistema & Privacidade", labelEn: "System & Privacy", icon: ShieldCheck },
    { id: "opt-startup", labelPt: "Inicialização", labelEn: "Startup Apps", icon: Rocket },
  ],
  "sys-bench": [
    { id: "bench-disk", labelPt: "Benchmark de Disco", labelEn: "Disk Benchmark", icon: HardDrive },
    { id: "bench-ram", labelPt: "Benchmark de RAM", labelEn: "RAM Benchmark", icon: MemoryStick },
    { id: "bench-cpu", labelPt: "CPU & Simulador FPS", labelEn: "CPU & FPS Simulator", icon: Gauge },
  ],
  "sys-tuning": [
    { id: "tuning-oc", labelPt: "Overclock & XMP", labelEn: "Overclock & XMP", icon: Cpu },
    { id: "tuning-power", labelPt: "Planos de Energia", labelEn: "Power Plans", icon: BatteryCharging },
    { id: "tuning-whea", labelPt: "Erros WHEA & Kernel", labelEn: "WHEA & Kernel Errors", icon: AlertTriangle },
  ],
  "sys-sync": [
    { id: "sync-usb", labelPt: "Limpador USB Fantasmas", labelEn: "Ghost USB Cleaner", icon: Usb },
    { id: "sync-rgb", labelPt: "Sincronização RGB", labelEn: "RGB Sync", icon: Palette },
  ],
  "sys-jogos": [
    { id: "games-library", labelPt: "Biblioteca de Jogos", labelEn: "Game Library", icon: FolderSearch },
    { id: "games-booster", labelPt: "Game Booster & Timer", labelEn: "Game Booster & Timer", icon: Gamepad2 },
  ],
  "sys-drivers": [
    { id: "drv-auditor", labelPt: "Auditor de Drivers", labelEn: "Driver Auditor", icon: Wrench },
    { id: "drv-maker", labelPt: "Drivers Maker Serial", labelEn: "Maker Serial Drivers", icon: Usb },
    { id: "drv-winget", labelPt: "Instalador Winget", labelEn: "Winget App Installer", icon: PackagePlus },
    { id: "drv-hub", labelPt: "Hub da Comunidade", labelEn: "Community Hub", icon: Users },
  ],
  "sys-docs": [
    { id: "docs-encyclopedia", labelPt: "Enciclopédia Técnica", labelEn: "Technical Encyclopedia", icon: BookOpen },
    { id: "docs-about", labelPt: "Sobre o Projeto", labelEn: "About Project", icon: Info },
  ],
};

interface LeftSidebarProps {
  activeTopTab: SysTopTabId;
  activeSubTab: string;
  onSelectSubTab: (subId: string) => void;
  liveSensors: LiveSensorSnapshot | null;
}

export default function LeftSidebar({
  activeTopTab,
  activeSubTab,
  onSelectSubTab,
  liveSensors,
}: LeftSidebarProps) {
  const { lang } = useLanguage();
  const { theme } = useSettings();
  const items = SIDEBAR_ITEMS_BY_TOP_TAB[activeTopTab] || [];

  const fmtComma = (num: number | undefined, decimals = 1) => {
    if (num === undefined || Number.isNaN(num)) return "0,0";
    return num.toFixed(decimals).replace(".", ",");
  };

  const cpuTemp = liveSensors ? `${fmtComma(liveSensors.cpuTempC, 1)} °C` : "-- °C";
  const cpuLoad = liveSensors ? `${Math.round(liveSensors.cpuLoadPercent)} %` : "-- %";
  const gpuTemp = liveSensors ? `${fmtComma(liveSensors.gpuTempC, 1)} °C` : "-- °C";
  const gpuLoad = liveSensors ? `${Math.round(liveSensors.gpuLoadPercent)} %` : "-- %";
  const ramLoad = liveSensors ? `${Math.round(liveSensors.ramLoadPercent)} %` : "-- %";
  const stressRunning = Boolean(liveSensors?.stressRunning);

  return (
    <aside
      className={`w-56 shrink-0 ${
        theme === "light"
          ? "bg-white/95 border-r border-slate-200 text-slate-800 shadow-sm"
          : "bg-zinc-950/80 border-r border-zinc-800/80 text-zinc-100"
      } backdrop-blur-xl flex flex-col justify-between select-none z-20`}
    >
      {/* Contextual Navigation Items */}
      <div className="p-2.5 space-y-1 overflow-y-auto flex-1 no-scrollbar">
        <div className="px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span className="text-sky-500 font-black text-sm tracking-widest drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">
            SYS
          </span>
          <span
            className={
              theme === "light"
                ? "text-slate-800 font-black text-sm"
                : "text-zinc-200 font-black text-sm"
            }
          >
            {activeTopTab.replace("sys-", "").toUpperCase()}
          </span>
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSubTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                active
                  ? theme === "light"
                    ? "bg-sky-50 text-sky-800 font-bold border border-sky-200 shadow-sm"
                    : "bg-zinc-800/95 text-white font-semibold border border-zinc-700/80 shadow-sm"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  active ? "text-sky-500" : theme === "light" ? "text-slate-400" : "text-zinc-500"
                }`}
              />
              <span className="truncate">
                {lang === "en" ? item.labelEn : item.labelPt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fixed "AO VIVO" Telemetry Footer Widget */}
      <div
        className={`p-2.5 pt-1.5 ${
          theme === "light" ? "border-t border-slate-200" : "border-t border-zinc-800/60"
        } space-y-2`}
      >
        <div
          className={`rounded-xl ${
            theme === "light"
              ? "bg-slate-50 border border-slate-200 shadow-sm"
              : "bg-zinc-900/90 border border-zinc-800/90 shadow-inner"
          } p-3`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${
                theme === "light" ? "text-slate-600 font-extrabold" : "text-zinc-400"
              }`}
            >
              {lang === "en" ? "LIVE" : "AO VIVO"}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-500 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              POLL
            </span>
          </div>

          <div className="space-y-1 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <span className={theme === "light" ? "text-slate-500" : "text-zinc-400"}>CPU temp</span>
              <span className={theme === "light" ? "text-slate-800 font-bold" : "text-zinc-100 font-semibold"}>
                {cpuTemp}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={theme === "light" ? "text-slate-500" : "text-zinc-400"}>
                {lang === "en" ? "CPU load" : "CPU carga"}
              </span>
              <span className={theme === "light" ? "text-slate-800 font-bold" : "text-zinc-100 font-semibold"}>
                {cpuLoad}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={theme === "light" ? "text-slate-500" : "text-zinc-400"}>GPU temp</span>
              <span className={theme === "light" ? "text-slate-800 font-bold" : "text-zinc-100 font-semibold"}>
                {gpuTemp}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={theme === "light" ? "text-slate-500" : "text-zinc-400"}>
                {lang === "en" ? "GPU load" : "GPU carga"}
              </span>
              <span className={theme === "light" ? "text-slate-800 font-bold" : "text-zinc-100 font-semibold"}>
                {gpuLoad}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={theme === "light" ? "text-slate-500" : "text-zinc-400"}>
                {lang === "en" ? "RAM use" : "RAM uso"}
              </span>
              <span className={theme === "light" ? "text-slate-800 font-bold" : "text-zinc-100 font-semibold"}>
                {ramLoad}
              </span>
            </div>
            <div
              className={`flex items-center justify-between pt-0.5 ${
                theme === "light" ? "border-t border-slate-200" : "border-t border-zinc-800/70"
              }`}
            >
              <span className={theme === "light" ? "text-slate-500" : "text-zinc-400"}>Stress</span>
              <span
                className={`font-semibold ${
                  stressRunning
                    ? "text-amber-500 animate-pulse font-bold"
                    : theme === "light"
                    ? "text-slate-400"
                    : "text-zinc-400"
                }`}
              >
                {stressRunning
                  ? lang === "en"
                    ? "running"
                    : "em execução"
                  : lang === "en"
                  ? "stopped"
                  : "parado"}
              </span>
            </div>
          </div>
        </div>

        {/* Version + Discrete GitHub Icon */}
        <div
          className={`flex items-center justify-between px-1 text-[11px] ${
            theme === "light" ? "text-slate-500" : "text-zinc-500"
          }`}
        >
          <span className="font-mono font-medium">v6.0</span>
          <button
            onClick={() =>
              openExternalUrl("https://github.com/Jefherson/System-Optimizer-Tool")
            }
            title="GitHub Repository"
            className={`p-1 rounded-md ${
              theme === "light"
                ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
            } transition-colors cursor-pointer`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
