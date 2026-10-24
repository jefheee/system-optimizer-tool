"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Minus,
  Square,
  X,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import {
  checkAdmin,
  restartAsAdmin,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { useSettings } from "../lib/SettingsContext";

export type SysTopTabId =
  | "sys-core"
  | "sys-otimiza"
  | "sys-bench"
  | "sys-tuning"
  | "sys-sync"
  | "sys-jogos"
  | "sys-drivers"
  | "sys-docs";

interface TopNavbarProps {
  activeTopTab: SysTopTabId;
  onSelectTopTab: (tab: SysTopTabId) => void;
  onOpenSettings: () => void;
}

export const SYS_TOP_TABS: {
  id: SysTopTabId;
  name: string;
  label: string;
  subtitlePt: string;
  subtitleEn: string;
}[] = [
  {
    id: "sys-core",
    name: "CORE",
    label: "SYS CORE",
    subtitlePt: "Diagnóstico, Sensores, Gargalo, Overlay & Stress",
    subtitleEn: "Diagnostics, Sensors, Bottleneck, Overlay & Stress",
  },
  {
    id: "sys-otimiza",
    name: "OTIMIZA",
    label: "SYS OTIMIZA",
    subtitlePt: "Presets 1-Clique, Limpeza SSD/HDD, Gamer 0.5ms & Sistema",
    subtitleEn: "1-Click Presets, SSD/HDD Clean, Gamer 0.5ms & System",
  },
  {
    id: "sys-bench",
    name: "BENCH",
    label: "SYS BENCH",
    subtitlePt: "Benchmarks Reais de Disco, RAM, CPU & Simulador de FPS",
    subtitleEn: "Real Disk, RAM, CPU Benchmarks & FPS Simulator",
  },
  {
    id: "sys-tuning",
    name: "TUNING",
    label: "SYS TUNING",
    subtitlePt: "Scanner Overclock XMP/Boost, Energia & WHEA Errors",
    subtitleEn: "Overclock XMP/Boost Scanner, Power & WHEA Errors",
  },
  {
    id: "sys-sync",
    name: "SYNC",
    label: "SYS SYNC",
    subtitlePt: "Integração RGB, Limpador de USB Fantasmas & Portas COM",
    subtitleEn: "RGB Integration, Ghost USB Cleaner & COM Ports",
  },
  {
    id: "sys-jogos",
    name: "JOGOS",
    label: "SYS JOGOS",
    subtitlePt: "Biblioteca Automática Steam/Epic/Riot & Game Booster",
    subtitleEn: "Auto Steam/Epic/Riot Library & Game Booster",
  },
  {
    id: "sys-drivers",
    name: "DRIVERS",
    label: "SYS DRIVERS",
    subtitlePt: "Auditor de Drivers, Maker CH340/FTDI, Winget & Hub",
    subtitleEn: "Driver Auditor, Maker CH340/FTDI, Winget & Hub",
  },
  {
    id: "sys-docs",
    name: "DOCS",
    label: "SYS DOCS",
    subtitlePt: "Enciclopédia Técnica Completa & Sobre o Projeto",
    subtitleEn: "Full Technical Encyclopedia & About Project",
  },
];

export default function TopNavbar({
  activeTopTab,
  onSelectTopTab,
  onOpenSettings,
}: TopNavbarProps) {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useSettings();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [elevating, setElevating] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkAdmin()
      .then((res) => {
        if (mounted) setIsAdmin(Boolean(res));
      })
      .catch(() => {
        if (mounted) setIsAdmin(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleElevate = async () => {
    try {
      setElevating(true);
      await restartAsAdmin();
    } catch {
      setElevating(false);
    }
  };

  return (
    <header
      data-tauri-drag-region
      className={`h-12 w-full ${
        theme === "light"
          ? "bg-white/80 border-b border-slate-200/80 text-slate-800 shadow-sm"
          : "bg-zinc-950/60 border-b border-zinc-800/60 text-zinc-100"
      } backdrop-blur-md flex items-center justify-between px-3 select-none z-50 shrink-0`}
    >
      {/* Left: Brand Logo + Horizontal SYS Tabs */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar"
      >
        <div
          data-tauri-drag-region
          className={`flex items-center gap-2 pr-2.5 ${
            theme === "light" ? "border-r border-slate-200" : "border-r border-zinc-800/80"
          } shrink-0`}
        >
          <img
            src="/assets/branding/logo-transparent.png"
            alt="System Optimizer Logo"
            className="w-7 h-7 object-contain pointer-events-none drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]"
          />
          <div className="hidden xl:flex flex-col pointer-events-none leading-none">
            <span
              className={`text-[11px] font-black tracking-wider ${
                theme === "light" ? "text-slate-900" : "text-zinc-100"
              }`}
            >
              SYSTEM OPTIMIZER
            </span>
            <span className="text-[9px] font-mono text-sky-500 font-bold tracking-widest">
              SUITE V6.0
            </span>
          </div>
        </div>

        {/* 8 Horizontal SYS Tabs */}
        <nav className="flex items-center gap-1 shrink-0">
          {SYS_TOP_TABS.map((tab) => {
            const active = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTopTab(tab.id)}
                title={lang === "en" ? tab.subtitleEn : tab.subtitlePt}
                className={`relative px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  active
                    ? theme === "light"
                      ? "bg-sky-600 text-white shadow-md border border-sky-600 font-extrabold"
                      : "bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-inner font-extrabold"
                    : theme === "light"
                    ? "text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-transparent"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent"
                }`}
              >
                <span
                  className={
                    active
                      ? theme === "light"
                        ? "text-sky-100 font-black text-xs tracking-wider"
                        : "text-sky-400 font-black text-xs tracking-wider"
                      : "text-sky-500 font-black text-xs tracking-wider"
                  }
                >
                  SYS
                </span>
                <span className={active ? "font-extrabold" : "font-semibold"}>
                  {tab.name}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Admin Badge, Lang, Theme, Settings, Window Controls */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        {isAdmin === true ? (
          <div
            title={
              lang === "en"
                ? "Running with Administrator privileges"
                : "Executando com privilégios de Administrador"
            }
            className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>ADMIN</span>
          </div>
        ) : isAdmin === false ? (
          <button
            onClick={handleElevate}
            disabled={elevating}
            className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-semibold transition-all cursor-pointer"
          >
            {elevating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-amber-400" />
            )}
            <span>{lang === "en" ? "Elevate" : "Elevar Admin"}</span>
          </button>
        ) : null}

        {/* Language Selector (PT / EN only) */}
        <div
          className={`flex items-center ${
            theme === "light"
              ? "bg-slate-100 border border-slate-200"
              : "bg-zinc-900/90 border border-zinc-800"
          } rounded-md p-0.5`}
        >
          {(["pt", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${
                lang === l
                  ? "bg-sky-500 text-white shadow-sm"
                  : theme === "light"
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={
            theme === "dark"
              ? lang === "en"
                ? "Switch to Light Mode"
                : "Alternar para Tema Claro"
              : lang === "en"
              ? "Switch to Dark Mode"
              : "Alternar para Tema Escuro"
          }
          className={`h-7 w-7 inline-flex items-center justify-center rounded-md ${
            theme === "light"
              ? "bg-slate-100 border border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-slate-200"
              : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800"
          } transition-colors cursor-pointer`}
        >
          {theme === "dark" ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-sky-600" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title={lang === "en" ? "Settings" : "Configurações"}
          className={`h-7 w-7 inline-flex items-center justify-center rounded-md ${
            theme === "light"
              ? "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          } transition-colors cursor-pointer`}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Window Controls */}
        <div
          className={`flex items-center gap-0.5 ml-0.5 pl-1.5 ${
            theme === "light" ? "border-l border-slate-200" : "border-l border-zinc-800/80"
          }`}
        >
          <button
            onClick={() => minimizeWindow()}
            aria-label="Minimize"
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md ${
              theme === "light"
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
            } transition-colors cursor-pointer`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMaximizeWindow()}
            aria-label="Maximize"
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md ${
              theme === "light"
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
            } transition-colors cursor-pointer`}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeWindow()}
            aria-label="Close"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-red-500/90 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
