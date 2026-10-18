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
        <aside
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className={`absolute left-0 top-0 bottom-0 flex flex-col py-3 transition-all duration-300 z-40 no-scrollbar overflow-hidden border-r ${
            sidebarExpanded ? 'w-60' : 'w-[72px]'
          } ${
            theme === 'light'
              ? 'bg-white/95 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
              : 'bg-neutral-950/95 border-neutral-800/80 shadow-[0_0_30px_rgba(0,0,0,0.4)]'
          }`}
        >
          {/* Sidebar Top Header (No duplicate logo box!) */}
          <div className="h-6 px-4 mb-2 flex items-center justify-between shrink-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 transition-opacity duration-200 ${
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
                  className={`w-full flex items-center py-2.5 rounded-xl transition-all duration-150 border-l-2 ${
                    sidebarExpanded ? 'px-3' : 'justify-center px-0'
                  } ${
                    isActive
                      ? theme === 'light'
                        ? 'bg-blue-50 text-blue-600 border-blue-600 font-semibold'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500 font-semibold'
                      : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60 border-transparent'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`ml-3.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 ${
                      sidebarExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-3 pointer-events-none'
                    }`}
                  >
                    {item.label}
                  </span>

                  {isActive && sidebarExpanded && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer: Official GitHub + Settings Button */}
          <div
            className={`px-2.5 mt-auto shrink-0 pt-2 border-t space-y-1 ${
              theme === 'light' ? 'border-slate-200' : 'border-neutral-800/80'
            }`}
          >
            {/* Official GitHub Link Button */}
            <button
              onClick={() => openExternalUrl('https://github.com/jefheee/system-optimizer-tool')}
              title={t('sidebar_github')}
              className={`w-full flex items-center py-2.5 rounded-xl transition-all duration-150 ${
                sidebarExpanded ? 'px-3' : 'justify-center px-0'
              } ${
                theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
              <span
                className={`ml-3.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  sidebarExpanded
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                {t('sidebar_github')}
              </span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setActiveTab('settings')}
              title={t('nav_settings')}
              className={`w-full flex items-center py-2.5 rounded-xl transition-all duration-150 border-l-2 ${
                sidebarExpanded ? 'px-3' : 'justify-center px-0'
              } ${
                activeTab === 'settings'
                  ? theme === 'light'
                    ? 'bg-blue-50 text-blue-600 border-blue-600 font-semibold'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500 font-semibold'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                  : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60 border-transparent'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <span
                className={`ml-3.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  sidebarExpanded
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-3 pointer-events-none'
                }`}
              >
                {t('nav_settings')}
              </span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <section className="flex-1 flex flex-col min-w-0 pl-[72px] overflow-y-auto">
          <div className="px-6 sm:px-8 py-7 max-w-6xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
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
