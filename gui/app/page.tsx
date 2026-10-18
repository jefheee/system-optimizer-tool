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
  ExternalLink,
} from 'lucide-react';

import { openExternalUrl } from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';

// Modules
import HomeModule from '../components/HomeModule';
import DashboardModule from '../components/DashboardModule';
import PresetsModule from '../components/PresetsModule';
import CleanModule from '../components/CleanModule';
import GamerModule from '../components/GamerModule';
import SystemModule from '../components/SystemModule';
import ExternalToolsModule from '../components/ExternalToolsModule';
import DocsAndAboutModule from '../components/DocsAndAboutModule';
import SettingsModule from '../components/SettingsModule';
import Titlebar from '../components/Titlebar';
import LiveProgressDrawer from '../components/LiveProgressDrawer';

export type Tab =
  | 'home'
  | 'dashboard'
  | 'presets'
  | 'clean'
  | 'gamer'
  | 'system'
  | 'external'
  | 'docs'
  | 'settings';

export default function Page() {
  const { t } = useLanguage();
  const { theme } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const menuItems = [
    { id: 'home', label: t('nav_home'), icon: Home, color: 'text-blue-400' },
    { id: 'dashboard', label: t('nav_dashboard'), icon: Cpu, color: 'text-primary' },
    { id: 'presets', label: t('nav_presets'), icon: Sparkles, color: 'text-amber-400' },
    { id: 'clean', label: t('nav_clean'), icon: Trash2, color: 'text-orange-400' },
    { id: 'gamer', label: t('nav_gamer'), icon: Gamepad2, color: 'text-cyan-400' },
    { id: 'system', label: t('nav_system'), icon: Wrench, color: 'text-blue-400' },
    { id: 'external', label: t('nav_external'), icon: Briefcase, color: 'text-indigo-400' },
    { id: 'docs', label: t('nav_docs'), icon: BookOpen, color: 'text-emerald-400' },
  ] as const;

  const sidebarLogo =
    theme === 'light'
      ? '/assets/branding/logo-primary-white-bg.jpg'
      : '/assets/branding/logo-transparent.png';

  const renderModule = () => {
    switch (activeTab) {
      case 'home':
        return <HomeModule onNavigate={(tab) => setActiveTab(tab)} />;
      case 'dashboard':
        return <DashboardModule />;
      case 'presets':
        return <PresetsModule />;
      case 'clean':
        return <CleanModule />;
      case 'gamer':
        return <GamerModule />;
      case 'system':
        return <SystemModule />;
      case 'external':
        return <ExternalToolsModule />;
      case 'docs':
        return <DocsAndAboutModule />;
      case 'settings':
        return <SettingsModule />;
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-[#050505] text-[#e5e2e1] font-sans selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Top Frameless Titlebar */}
      <Titlebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Background Neon Glow Orbs (automatically hidden in Performance Mode via CSS) */}
        <div className="bg-glow-orb absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-soft" />
        <div className="bg-glow-orb absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

        {/* Collapsible Sidebar */}
        <aside
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className={`absolute left-0 top-0 bottom-0 bg-neutral-950/90 backdrop-blur-3xl border-r border-neutral-800/80 flex flex-col py-4 transition-all duration-300 z-40 overflow-hidden shadow-[0_0_30px_rgba(76,215,246,0.05)] ${
            sidebarExpanded ? 'w-64' : 'w-[72px]'
          }`}
        >
          {/* Sidebar Brand Header */}
          <div className="px-3.5 pb-4 mb-2 border-b border-neutral-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-neutral-700/80 bg-neutral-900 shrink-0 flex items-center justify-center">
              <img
                src={sidebarLogo}
                alt="System Optimizer Tool"
                className="w-full h-full object-contain"
              />
            </div>
            <div
              className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
              }`}
            >
              <span className="text-xs font-extrabold text-neutral-100 block">System Optimizer</span>
              <span className="text-[10px] text-cyan-400 font-bold">V5.0 Pro Edition</span>
            </div>
          </div>

          {/* Sidebar Primary Navigation */}
          <nav className="flex-1 flex flex-col gap-1.5 px-3 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 relative group/btn hover:scale-[1.01] border-l-2 ${
                    isActive
                      ? 'text-primary border-primary bg-primary/10 shadow-[0_0_15px_rgba(76,215,246,0.1)] font-semibold'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:scale-110 ${
                      isActive ? 'text-primary' : 'text-neutral-400'
                    }`}
                  />
                  <span
                    className={`ml-4 text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap ${
                      sidebarExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-4 pointer-events-none'
                    }`}
                  >
                    {item.label}
                  </span>

                  {isActive && sidebarExpanded && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#4cd7f6]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer: Official GitHub + Settings Button (No redundant green shield!) */}
          <div className="px-3 mt-auto shrink-0 pt-3 border-t border-neutral-800/80 space-y-1.5">
            <button
              onClick={() => openExternalUrl('https://github.com/jefheee/system-optimizer-tool')}
              title={t('sidebar_github')}
              className="w-full flex items-center p-2.5 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 transition-all"
            >
              <ExternalLink className="w-4 h-4 shrink-0 text-blue-400" />
              <span
                className={`ml-4 text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                }`}
              >
                {t('sidebar_github')}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              title={t('nav_settings')}
              className={`w-full flex items-center p-2.5 rounded-xl transition-all border-l-2 ${
                activeTab === 'settings'
                  ? 'text-primary border-primary bg-primary/10 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 border-transparent'
              }`}
            >
              <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-primary' : 'text-neutral-400'}`} />
              <span
                className={`ml-4 text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  sidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                }`}
              >
                {t('nav_settings')}
              </span>
            </button>
          </div>
        </aside>

        {/* Content Pane */}
        <section className="flex-1 flex flex-col min-w-0 pl-[72px] overflow-y-auto">
          <div className="px-6 sm:px-8 py-7 max-w-6xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
              >
                {renderModule()}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* Real-time Step-by-Step Execution Console Drawer */}
      <LiveProgressDrawer />
    </main>
  );
}
