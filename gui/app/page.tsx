'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Cpu,
  Sparkles,
  Trash2,
  Gamepad2,
  Wrench,
  Briefcase,
  BookOpen,
  Settings,
} from 'lucide-react';

import { openExternalUrl } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';

// Modules
import HomeModule from '../components/HomeModule';
import PresetsModule from '../components/PresetsModule';
import CleanModule from '../components/CleanModule';
import GamerModule from '../components/GamerModule';
import SystemModule from '../components/SystemModule';
import DashboardModule from '../components/DashboardModule';
import ExternalToolsModule from '../components/ExternalToolsModule';
import DocsAndAboutModule from '../components/DocsAndAboutModule';
import SettingsModule from '../components/SettingsModule';
import Titlebar from '../components/Titlebar';
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

export default function Page() {
  const { t } = useLanguage();
  const { theme } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Logical order: Home -> 1-Click Presets -> Clean -> Gamer -> System -> Hardware -> External -> Docs
  const menuItems = [
    { id: 'home', label: t('nav_home'), icon: Home },
    { id: 'presets', label: t('nav_presets'), icon: Sparkles },
    { id: 'clean', label: t('nav_clean'), icon: Trash2 },
    { id: 'gamer', label: t('nav_gamer'), icon: Gamepad2 },
    { id: 'system', label: t('nav_system'), icon: Wrench },
    { id: 'dashboard', label: t('nav_dashboard'), icon: Cpu },
    { id: 'external', label: t('nav_external'), icon: Briefcase },
    { id: 'docs', label: t('nav_docs'), icon: BookOpen },
  ] as const;

  const renderModule = () => {
    switch (activeTab) {
      case 'home':
        return <HomeModule onNavigate={(tab) => setActiveTab(tab)} />;
      case 'presets':
        return <PresetsModule />;
      case 'clean':
        return <CleanModule />;
      case 'gamer':
        return <GamerModule />;
      case 'system':
        return <SystemModule />;
      case 'dashboard':
        return <DashboardModule />;
      case 'external':
        return <ExternalToolsModule />;
      case 'docs':
        return <DocsAndAboutModule />;
      case 'settings':
        return <SettingsModule />;
    }
  };

  return (
    <main
      className={`h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors ${
        theme === 'light' ? 'bg-[#f4f6f9] text-[#0f172a]' : 'bg-[#08080a] text-[#f1f5f9]'
      }`}
    >
      {/* Top Frameless Titlebar */}
      <Titlebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Subtle Background Glow Orbs */}
        <div className="bg-glow-orb absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-soft" />
        <div className="bg-glow-orb absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

        {/* Collapsible Sidebar Rail */}
        {/* Collapsible Sidebar Rail */}
        <aside
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className={`absolute left-0 top-0 bottom-0 flex flex-col py-3 z-40 no-scrollbar overflow-hidden border-r transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            sidebarExpanded ? 'w-72' : 'w-[72px]'
          } ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
              : 'bg-neutral-950/95 border-neutral-800/80 shadow-[0_0_30px_rgba(0,0,0,0.4)]'
          }`}
        >
          {/* Sidebar Top Header */}
          <div className="h-6 px-4 mb-2 flex items-center justify-between shrink-0 overflow-hidden">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 whitespace-nowrap transition-opacity duration-200 ${
                sidebarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {t('sidebar_menu', 'Menu')}
            </span>
          </div>

          {/* Primary Navigation List */}
          <nav className="flex-1 flex flex-col gap-1 px-2.5 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={!sidebarExpanded ? item.label : undefined}
                  className={`w-full flex items-center h-10 px-3.5 rounded-xl transition-colors duration-150 relative ${
                    isActive
                      ? theme === 'light'
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'bg-blue-500/10 text-blue-400 font-semibold'
                      : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-semibold tracking-wide whitespace-nowrap overflow-hidden text-left ml-3 min-w-0 flex-1 transition-opacity duration-200 ${
                      sidebarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {item.label}
                  </span>

                  {isActive && sidebarExpanded && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-2"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer: Kernel Status Pill + Action Bar */}
          <div
            className={`px-2.5 mt-auto shrink-0 pt-2 border-t space-y-2 ${
              theme === 'light' ? 'border-slate-200' : 'border-neutral-800/80'
            }`}
          >
            {/* Kernel 0.5ms Timer Live Status Card */}
            <div
              className={`rounded-xl border p-2 transition-all ${
                theme === 'light'
                  ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                  : 'bg-neutral-950/80 border-neutral-800/90 text-neutral-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                {sidebarExpanded ? (
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold tracking-tight text-emerald-400 truncate">
                      Kernel: 0.5ms Timer
                    </div>
                    <div className="text-[9px] font-mono text-neutral-400 truncate">
                      Status Ativo
                    </div>
                  </div>
                ) : (
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">0.5ms</span>
                )}
              </div>
            </div>

            {/* Bottom Controls Bar (<> and Settings) */}
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                title="Expandir / Recolher Sidebar"
                className={`flex-1 flex items-center justify-center h-8 rounded-lg text-xs font-mono transition-colors border ${
                  theme === 'light'
                    ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span className="text-[11px] font-mono tracking-tighter">&lt;/&gt;</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                title={t('nav_settings')}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors border shrink-0 ${
                  activeTab === 'settings'
                    ? theme === 'light'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-neutral-800 text-neutral-100 border-neutral-600'
                    : theme === 'light'
                    ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport (Edge-to-edge Bento Grid with minimal breathing margin) */}
        <section className="flex-1 flex flex-col min-w-0 pl-[72px] overflow-y-auto no-scrollbar">
          <div className="p-2 sm:p-2.5 md:p-3 w-full min-h-0 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderModule()}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* Step-by-Step Execution Console Drawer */}
      <LiveProgressDrawer />
    </main>
  );
}
