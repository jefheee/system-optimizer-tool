'use client';

import { useState } from "react";
import { launchWinUtil, launchMasActivator } from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Monitor, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Briefcase, 
  ExternalLink 
} from "lucide-react";

export default function ExternalToolsModule() {
  const { t } = useLanguage();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { status: "Success" | "Error"; message: string }>>({});

  const handleAction = async (id: string, fn: () => Promise<any>) => {
    setActiveActions(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fn();
      if (res.success) {
        setResults(prev => ({
          ...prev,
          [id]: { status: "Success", message: res.message }
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [id]: { status: "Error", message: res.message }
        }));
      }
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [id]: { status: "Error", message: err?.message || "Erro ao invocar a ferramenta." }
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          {t('ext_title')}
        </h2>
        <p className="text-xs text-[#bcc9cd] mt-1">
          {t('ext_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WinUtil (Chris Titus) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-100">{t('sys_winutil_title')}</h3>
            </div>
            <p className="text-xs text-[#bcc9cd] leading-relaxed">
              {t('sys_winutil_desc')}
            </p>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              Console Externo
            </span>
            <button
              onClick={() => handleAction("winutil", launchWinUtil)}
              disabled={activeActions["winutil"]}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold transition-all hover:scale-105 flex items-center gap-2"
            >
              {activeActions["winutil"] ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('btn_executing')}
                </>
              ) : (
                t('sys_winutil_btn')
              )}
            </button>
          </div>
        </div>

        {/* Ativador Windows e Office (MAS) */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/10 transition-all" />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-zinc-100">{t('ext_mas_title')}</h3>
            </div>
            <p className="text-xs text-[#bcc9cd] leading-relaxed">
              {t('ext_mas_desc')}
            </p>
          </div>
          <div className="mt-8 border-t border-white/5 pt-4 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-semibold">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              Console Interativo
            </span>
            <button
              onClick={() => handleAction("mas", launchMasActivator)}
              disabled={activeActions["mas"]}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold transition-all hover:scale-105 flex items-center gap-2"
            >
              {activeActions["mas"] ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('btn_executing')}
                </>
              ) : (
                t('ext_mas_btn')
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Resultados de feedback */}
      <AnimatePresence>
        {Object.keys(results).length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                {t('msg_status_report')}
              </h3>
              <button 
                onClick={() => setResults({})}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase font-bold"
              >
                {t('btn_clear_log')}
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(results).map(([key, value]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl border flex gap-3 text-xs ${
                    value.status === "Success"
                      ? "bg-tertiary/10 border-tertiary/20 text-tertiary"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}
                >
                  {value.status === "Success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold capitalize text-zinc-200 block">
                      {key === "winutil" ? "Chris Titus WinUtil" : "Microsoft Activation Scripts (MAS)"}: {value.status}
                    </span>
                    <span className="text-zinc-300 mt-1 block">{value.message}</span>
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
