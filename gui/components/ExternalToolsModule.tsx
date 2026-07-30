'use client';

import { useState } from "react";
import { invokePowerShell, ActionResponse } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Monitor, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Briefcase,
  ExternalLink
} from "lucide-react";

export default function ExternalToolsModule() {
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, ActionResponse>>({});

  const runAction = async (actionId: string, actionName: string) => {
    setActiveActions(prev => ({ ...prev, [actionId]: true }));
    try {
      const res = await invokePowerShell<ActionResponse>(actionName);
      setResults(prev => ({ ...prev, [actionId]: res }));
    } catch (err: any) {
      setResults(prev => ({ 
        ...prev, 
        [actionId]: { Status: "Error", Message: err?.message || "Erro ao invocar a ferramenta." } 
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [actionId]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Ferramentas Externas & Utilidades
        </h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Acesse utilitários de terceiros para debloating do sistema ou ativação automatizada do Windows e Office em consoles separados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WinUtil (Chris Titus) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-200">WinUtil (Chris Titus)</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Utilitário avançado do Chris Titus Tech para debloating do Windows, instalação simplificada de softwares e gerenciamento avançado de atualizações.
            </p>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              Console Externo
            </span>
            <button
              onClick={() => runAction("winutil", "RunWinUtil")}
              disabled={activeActions["winutil"]}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold transition-all hover:scale-105"
            >
              {activeActions["winutil"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Abrir WinUtil"
              )}
            </button>
          </div>
        </div>

        {/* Ativar Windows (ActivateWindows) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-200">Ativar Windows</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Associa uma licença digital definitiva (HWID) ao hardware da máquina através do script seguro e amplamente auditado do Microsoft Activation Scripts.
            </p>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              Console Externo
            </span>
            <button
              onClick={() => runAction("winact", "ActivateWindows")}
              disabled={activeActions["winact"]}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold transition-all hover:scale-105"
            >
              {activeActions["winact"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Ativar Windows"
              )}
            </button>
          </div>
        </div>

        {/* Ativar Office (ActivateOffice) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-200">Ativar Office</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Ativa de forma automatizada e definitiva todas as versões locais instaladas do Microsoft Office (KMS38) utilizando o console integrado do MAS.
            </p>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              Console Externo
            </span>
            <button
              onClick={() => runAction("offact", "ActivateOffice")}
              disabled={activeActions["offact"]}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold transition-all hover:scale-105"
            >
              {activeActions["offact"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Ativar Office"
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Resultados de feedback */}
      <AnimatePresence>
        {Object.keys(results).length > 0 && (
          <div className="mt-8 space-y-3">
            <h3 className="text-xs font-bold text-on-surface-variant tracking-wider uppercase flex items-center justify-between">
              <span>Status das Utilitários</span>
              <button 
                onClick={() => setResults({})}
                className="text-[10px] text-on-surface-variant/60 hover:text-on-surface-variant transition-colors uppercase font-bold"
              >
                Limpar Log
              </button>
            </h3>
            <div className="space-y-2">
              {Object.entries(results).map(([key, value]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl border flex gap-3 text-xs ${
                    value.Status === "Success"
                      ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
                      : "bg-error-container/20 border-error/20 text-error"
                  }`}
                >
                  {value.Status === "Success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold capitalize text-zinc-200 block">
                      {key === "winutil" ? "Chris Titus WinUtil" : key === "winact" ? "Ativação Windows" : "Ativação Office"}: {value.Status}
                    </span>
                    <span className="text-zinc-400 mt-1 block">{value.Message}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
