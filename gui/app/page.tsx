'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, 
  Sparkles,
  Trash2, 
  Gamepad2, 
  Settings as SysIcon, 
  Briefcase,
  BookOpen,
  Shield, 
  ShieldAlert,
} from "lucide-react";

import { checkAdmin } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";

// Modules
import DashboardModule from "../components/DashboardModule";
import PresetsModule from "../components/PresetsModule";
import CleanModule from "../components/CleanModule";
import GamerModule from "../components/GamerModule";
import SystemModule from "../components/SystemModule";
import ExternalToolsModule from "../components/ExternalToolsModule";
import DocsAndAboutModule from "../components/DocsAndAboutModule";
import Titlebar from "../components/Titlebar";
import LiveProgressDrawer from "../components/LiveProgressDrawer";

type Tab = "dashboard" | "presets" | "clean" | "gamer" | "system" | "external" | "docs";

export default function Page() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin().then((elevated) => {
      setIsAdmin(elevated);
    });
  }, []);

  const menuItems = [
    { id: "dashboard", label: t('nav_dashboard'), icon: Cpu, color: "text-primary" },
    { id: "presets", label: t('nav_presets'), icon: Sparkles, color: "text-amber-400" },
    { id: "clean", label: t('nav_clean'), icon: Trash2, color: "text-orange-400" },
    { id: "gamer", label: t('nav_gamer'), icon: Gamepad2, color: "text-cyan-400" },
    { id: "system", label: t('nav_system'), icon: SysIcon, color: "text-blue-400" },
    { id: "external", label: t('nav_external'), icon: Briefcase, color: "text-indigo-400" },
    { id: "docs", label: t('nav_docs'), icon: BookOpen, color: "text-emerald-400" },
  ] as const;

  const renderModule = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardModule />;
      case "presets":
        return <PresetsModule />;
      case "clean":
        return <CleanModule />;
      case "gamer":
        return <GamerModule />;
      case "system":
        return <SystemModule />;
      case "external":
        return <ExternalToolsModule />;
      case "docs":
        return <DocsAndAboutModule />;
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-[#050505] text-[#e5e2e1] font-sans selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Top Frameless Titlebar with drag region, logo, admin badge, language picker & window controls */}
      <Titlebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Background Neon Glow Orbs */}
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-soft" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

        {/* Collapsible Sidebar */}
        <aside 
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className={`absolute left-0 top-0 bottom-0 bg-zinc-950/85 backdrop-blur-3xl border-r border-white/5 flex flex-col py-6 transition-all duration-300 z-40 overflow-hidden shadow-[0_0_30px_rgba(76,215,246,0.05)] ${
            sidebarExpanded ? "w-64" : "w-[72px]"
          }`}
        >
          {/* Sidebar Navigation */}
          <nav className="flex-1 flex flex-col gap-2 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 relative group/btn hover:scale-[1.02] border-l-2 ${
                    isActive 
                      ? "text-primary border-primary bg-primary/10 shadow-[0_0_15px_rgba(76,215,246,0.1)] font-semibold" 
                      : "text-[#bcc9cd] hover:text-[#e5e2e1] hover:bg-white/5 border-transparent hover:border-white/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:scale-110 ${isActive ? 'text-primary' : 'text-zinc-500'}`} />
                  <span className={`ml-4 text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap ${
                    sidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                  }`}>
                    {item.label}
                  </span>
                  
                  {isActive && sidebarExpanded && (
                    <motion.div 
                      layoutId="sidebar-active-indicator" 
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#4cd7f6]"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer with Admin status */}
          <div className="px-4 mt-auto shrink-0 flex items-center gap-3 text-[10px] font-semibold text-zinc-500 pt-3 border-t border-white/5">
            {isAdmin ? (
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              {isAdmin ? t('titlebar_admin_badge') : t('titlebar_user_badge')}
            </span>
          </div>
        </aside>

        {/* Content Pane */}
        <section className="flex-1 flex flex-col min-w-0 pl-[72px] overflow-y-auto">
          <div className="px-8 py-8 max-w-6xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
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
