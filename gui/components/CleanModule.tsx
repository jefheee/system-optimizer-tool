'use client';

import { useState } from "react";
import { runDeepClean, runLiteClean, cleanOrphanTasks, CleanResult } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
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
  const { t } = useLanguage();
  const [running, setRunning] = useState<string | null>(null);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [orphansResult, setOrphansResult] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeepClean = async () => {
    setRunning("deep");
    setCleanResult(null);
    setOrphansResult(null);
    setErrorMessage(null);
    try {
      const res = await runDeepClean();
      if (res.success && res.data) {
        setCleanResult(res.data);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao executar limpeza profunda.");
    } finally {
      setRunning(null);
    }
  };

  const handleLiteClean = async () => {
    setRunning("lite");
    setCleanResult(null);
    setOrphansResult(null);
    setErrorMessage(null);
    try {
      const res = await runLiteClean();
      if (res.success && res.data) {
        setCleanResult(res.data);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao executar limpeza lite.");
    } finally {
      setRunning(null);
    }
  };

  const handleCleanOrphans = async () => {
    setRunning("orphans");
    setCleanResult(null);
    setOrphansResult(null);
    setErrorMessage(null);
    try {
      const res = await cleanOrphanTasks();
      if (res.success && res.data !== undefined) {
        setOrphansResult(res.data);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao limpar tarefas órfãs.");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-primary" />
          {t('clean_title')}
        </h2>
        <p className="text-xs text-[#bcc9cd] mt-1">
          {t('clean_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Limpeza Profunda (runDeepClean) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-100">{t('clean_deep_title')}</h3>
            </div>
            <p className="text-xs text-[#bcc9cd] leading-relaxed">
              {t('clean_deep_desc')}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              100% Rust Win32 Native
            </span>
            <button
              onClick={handleDeepClean}
              disabled={running !== null}
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold hover:shadow-[0_0_15px_rgba(76,215,246,0.4)] transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50"
            >
              {running === "deep" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('clean_deep_loading')}
                </>
              ) : (
                t('clean_deep_btn')
              )}
            </button>
          </div>
        </div>

        {/* Limpeza Rápida (runLiteClean) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#d0bcff]/10 rounded-lg text-secondary">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-100">{t('clean_lite_title')}</h3>
            </div>
            <p className="text-xs text-[#bcc9cd] leading-relaxed">
              {t('clean_lite_desc')}
            </p>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={handleLiteClean}
              disabled={running !== null}
              className="px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-bold text-[#e5e2e1] transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
            >
              {running === "lite" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('btn_executing')}
                </>
              ) : (
                t('clean_lite_btn')
              )}
            </button>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Limpeza de Tarefas Agendadas Órfãs */}
        <div className="p-5 rounded-xl glass-card hover:border-primary/20 transition-all duration-300 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('clean_orphans_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1">
                {t('clean_orphans_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={handleCleanOrphans}
            disabled={running !== null}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-bold text-[#e5e2e1] transition-all hover:scale-105 shrink-0 ml-4 disabled:opacity-50 flex items-center gap-2"
          >
            {running === "orphans" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('btn_executing')}
              </>
            ) : (
              t('clean_orphans_btn')
            )}
          </button>
        </div>
      </div>

      {/* Resultados e Detalhamento da Limpeza */}
      <AnimatePresence>
        {cleanResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="p-5 rounded-xl border bg-tertiary/10 border-tertiary/20 text-tertiary flex gap-4">
              <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-zinc-100 text-sm">{t('msg_status_report')}</h4>
                <p className="text-xs text-[#bcc9cd] mt-1 leading-snug">{cleanResult.Message}</p>
                
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <p className="text-sm font-bold text-tertiary flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    {t('clean_freed')}: {cleanResult.TotalFreedMb} MB
                  </p>
                  <span className="text-xs text-zinc-400">
                    &bull; {cleanResult.TotalFilesDeleted} arquivos excluídos com sucesso
                  </span>
                </div>

                {cleanResult.Categories && cleanResult.Categories.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-3 border-t border-white/10">
                    {cleanResult.Categories.map((cat, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-zinc-950/70 border border-white/5 text-[11px]">
                        <span className="font-semibold text-zinc-300 block truncate">{cat.Name}</span>
                        <span className="text-tertiary font-bold mt-1 block">
                          {cat.MbFreed > 0 ? `${cat.MbFreed} MB` : cat.Status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {orphansResult !== null && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-5 rounded-xl border bg-tertiary/10 border-tertiary/20 text-tertiary flex gap-4"
          >
            <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('clean_orphans_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1">
                Varredura concluída: {orphansResult} tarefa(s) agendada(s) órfã(s) foram excluídas com sucesso.
              </p>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-5 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 flex gap-4"
          >
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('msg_error')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-snug">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
