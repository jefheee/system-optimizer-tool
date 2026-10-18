'use client';

import { useLanguage } from "../lib/LanguageContext";
import { 
  Info, 
  Terminal, 
  ShieldCheck, 
  Globe, 
  Heart,
  Cpu,
  Layers,
  Zap
} from "lucide-react";

export default function AboutModule() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Info className="w-5 h-5 text-zinc-400" />
          {t('nav_about')}
        </h2>
        <p className="text-xs text-[#bcc9cd] mt-1">
          Informações sobre o software, tecnologia empregada e licenciamento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Info principal */}
        <div className="p-6 rounded-2xl glass-card md:col-span-2 space-y-6 hover:border-zinc-700/30 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary p-[1px] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-primary/20 shrink-0">
              <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center text-primary font-black text-sm">
                S
              </div>
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">System Optimizer Core</h3>
              <p className="text-[10px] text-zinc-500 font-semibold">Versão 3.0.0 &bull; 100% Rust Nativo (x64 Windows)</p>
            </div>
          </div>

          <p className="text-xs text-[#bcc9cd] leading-relaxed">
            O System Optimizer é um centro de comando de alto desempenho para Windows 10 e 11. Todo o motor de diagnóstico, limpeza e tweaks foi totalmente reescrito em <strong>Rust nativo (Win32 API pura)</strong>, eliminando 100% das dependências de scripts e janelas externas de console.
          </p>

          <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Arquitetura Backend</span>
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Rust Tauri v2 + Win32 API
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Interface Frontend</span>
              <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Next.js 16 + React 19 + Tailwind
              </span>
            </div>
          </div>
        </div>

        {/* Informações de Requisitos / Licença */}
        <div className="p-6 rounded-2xl glass-card space-y-6 hover:border-zinc-700/30 transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-tertiary" />
              Segurança & Performance
            </h4>
            <p className="text-xs text-[#bcc9cd] leading-relaxed">
              O aplicativo opera 100% em memória local via chamadas nativas de sistema, sem dependência de interpretadores externos, scripts PowerShell em runtime ou telemetria invasiva.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
            <a 
              href="https://github.com/jefheee/System-Optimizer-Tool" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs font-semibold text-[#bcc9cd] hover:text-[#e5e2e1] transition-colors p-2 rounded-lg hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Repositório GitHub
              </span>
              &rarr;
            </a>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 px-2">
              <span>Licença</span>
              <span className="font-bold text-[#bcc9cd]">MIT Open Source</span>
            </div>
          </div>
        </div>

      </div>

      {/* Créditos Rodapé */}
      <div className="p-5 rounded-xl bg-zinc-950/40 border border-white/5 flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-zinc-500 flex items-center gap-1.5 font-semibold">
          Desenvolvido com <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> para a comunidade Open Source.
        </p>
        <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
          <span className="flex items-center gap-1.5 text-tertiary">
            <Terminal className="w-3.5 h-3.5" />
            CREATE_NO_WINDOW Silent Exec
          </span>
          &bull;
          <span className="flex items-center gap-1.5 text-primary">
            <Cpu className="w-3.5 h-3.5" />
            Direct Kernel Timer (0.5ms)
          </span>
        </div>
      </div>

    </div>
  );
}
