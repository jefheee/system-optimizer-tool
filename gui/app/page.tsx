'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, 
  Trash2, 
  Gamepad2, 
  Settings as SysIcon, 
  Info,
  Shield,
  Briefcase
} from "lucide-react";

// Módulos
import DashboardModule from "../components/DashboardModule";
import GamerModule from "../components/GamerModule";
import SystemModule from "../components/SystemModule";
import CleanModule from "../components/CleanModule";
import ExternalToolsModule from "../components/ExternalToolsModule";
import AboutModule from "../components/AboutModule";

type Tab = "dashboard" | "clean" | "gamer" | "system" | "external" | "about";

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Performance", icon: Cpu, color: "text-primary" },
    { id: "clean", label: "Limpeza de Disco", icon: Trash2, color: "text-orange-400" },
    { id: "gamer", label: "Gamer Latency", icon: Gamepad2, color: "text-tertiary" },
    { id: "system", label: "Sistema & Reparos", icon: SysIcon, color: "text-secondary" },
    { id: "external", label: "Ferramentas", icon: Briefcase, color: "text-primary" },
    { id: "about", label: "Sobre o App", icon: Info, color: "text-zinc-400" }
  ] as const;

  const renderModule = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardModule />;
      case "clean":
        return <CleanModule />;
      case "gamer":
        return <GamerModule />;
      case "system":
        return <SystemModule />;
      case "external":
        return <ExternalToolsModule />;
      case "about":
        return <AboutModule />;
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#e5e2e1] font-sans selection:bg-primary/30 selection:text-primary flex relative overflow-hidden">
      
      {/* Luzes decorativas de fundo (Neon Glow Orbs) */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-soft" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Sidebar Esquerda (Fixa + Expansível) */}
      <aside 
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`fixed left-0 top-0 h-full bg-zinc-950/60 backdrop-blur-3xl border-r border-white/5 flex flex-col py-6 transition-all duration-300 z-50 overflow-hidden shadow-[0_0_30px_rgba(76,215,246,0.05)] ${
          sidebarExpanded ? "w-64" : "w-[72px]"
        }`}
      >
        {/* Header da Sidebar */}
        <div className="px-4 mb-8 flex items-center shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary p-[1px] shrink-0 flex items-center justify-center shadow-lg shadow-primary/20">
            <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center text-primary font-black text-sm">
              S
            </div>
          </div>
          <div className={`ml-4 transition-all duration-300 whitespace-nowrap ${
            sidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
          }`}>
            <h1 className="font-bold text-primary tracking-tight leading-none text-sm">System Optimizer</h1>
            <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase block mt-1">Core Control Deck</span>
          </div>
        </div>

        {/* Menu de Navegação */}
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
                    ? "text-primary border-primary bg-primary/10 shadow-[0_0_15px_rgba(76,215,246,0.1)]" 
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

        {/* Footer da Sidebar */}
        <div className="px-4 mt-auto shrink-0 flex items-center gap-3 text-[10px] font-semibold text-zinc-500">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            Privilégios de Administrador
          </span>
        </div>
      </aside>

      {/* Área de Conteúdo Direita */}
      <section className="flex-1 flex flex-col min-w-0 pl-[72px]">
        
        {/* Top Header Barra */}
        <header className="h-16 border-b border-white/5 bg-transparent backdrop-blur-md flex justify-between items-center px-8 z-40 transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(76,215,246,0.05)]">
          <h2 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary text-sm md:text-base">
            System Optimizer &bull; Control Panel
          </h2>
          <div className="text-[10px] text-[#bcc9cd] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
            Tauri Connect Live
          </div>
        </header>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto px-8 py-8 max-w-5xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

    </main>
  );
}
