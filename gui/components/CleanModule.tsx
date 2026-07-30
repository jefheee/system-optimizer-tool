'use client';

import { useState } from "react";
import { invokePowerShell, ActionResponse } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  Trash2, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Database,
  HardDrive
} from "lucide-react";

export default function CleanModule() {
  const [running, setRunning] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<ActionResponse | null>(null);

  const handleClean = async (type: "OptimizeDeep" | "OptimizeLite" | "RemoveOrphans") => {
    setRunning(type);
    setSummaryResult(null);
    try {
      const res = await invokePowerShell<ActionResponse>(type);
      setSummaryResult(res);
    } catch (err: any) {
      setSummaryResult({
        Status: "Error",
        Message: err?.message || "Ocorreu um erro ao executar a limpeza."
      });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-primary" />
          Central de Limpeza & Otimização
        </h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Libere espaço valioso de armazenamento e elimine lixo acumulado do sistema de forma segura.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Limpeza Profunda (OptimizeDeep) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-200">Limpeza Profunda (Recomendado para SSD)</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Remove caches de atualizações do Windows, arquivos prefetch, logs de diagnóstico, caches de navegadores (Chrome/Edge), esvazia a lixeira e executa o comando nativo TRIM para consolidar blocos livres no SSD.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Requer privilégios de Administrador
            </span>
            <button
              onClick={() => handleClean("OptimizeDeep")}
              disabled={running !== null}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold hover:shadow-[0_0_15px_rgba(76,215,246,0.4)] transition-all hover:scale-105 flex items-center gap-2"
            >
              {running === "OptimizeDeep" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Limpando Sistema...
                </>
              ) : (
                "Executar Limpeza Profunda"
              )}
            </button>
          </div>
        </div>

        {/* Limpeza Rápida (OptimizeLite) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#d0bcff]/10 rounded-lg text-secondary">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-200">Limpeza Lite (HDD)</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Ação rápida e sem riscos que limpa arquivos temporários do usuário e do Windows, logs leves e a lixeira. Livre de otimização de bloco SSD.
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleClean("OptimizeLite")}
              disabled={running !== null}
              className="px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-white/10 text-xs font-bold text-[#e5e2e1] transition-all hover:scale-105"
            >
              {running === "OptimizeLite" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Limpeza Lite"
              )}
            </button>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Limpeza de Tarefas Agendadas (RemoveOrphans) */}
        <div className="p-5 rounded-xl glass-card hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-200 text-sm">Remover Tarefas Agendadas Órfãs</h4>
              <p className="text-xs text-on-surface-variant mt-1">
                Varre o Windows Task Scheduler e apaga as tarefas criadas por apps que já foram desinstalados e não possuem mais executáveis válidos.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleClean("RemoveOrphans")}
            disabled={running !== null}
            className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-white/10 text-xs font-bold text-[#e5e2e1] transition-all hover:scale-105 shrink-0 ml-4"
          >
            {running === "RemoveOrphans" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Remover Órfãs"
            )}
          </button>
        </div>
      </div>

      {/* Resultados do Log */}
      <AnimatePresence>
        {summaryResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className={`p-5 rounded-xl border flex gap-4 ${
              summaryResult.Status === "Success"
                ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
                : "bg-error-container/20 border-error/20 text-error"
            }`}>
              {summaryResult.Status === "Success" ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-zinc-100 text-sm">Status do Processamento</h4>
                <p className="text-xs text-[#bcc9cd] mt-1 leading-snug">{summaryResult.Message}</p>
                {summaryResult.BytesFreed !== undefined && summaryResult.BytesFreed > 0 && (
                  <p className="text-sm font-bold text-tertiary mt-2 flex items-center gap-1">
                    <Database className="w-4 h-4" />
                    Espaço Total Liberado: {summaryResult.BytesFreed} MB
                  </p>
                )}
                {summaryResult.DeletedCount !== undefined && (
                  <p className="text-sm font-bold text-tertiary mt-2">
                    Tarefas deletadas: {summaryResult.DeletedCount}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
