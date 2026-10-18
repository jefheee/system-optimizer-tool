'use client';

import { useState } from "react";
import { 
  launchWinUtil, 
  optimizeDns, 
  disableTelemetry, 
  removeBloatware, 
  repairWindowsUpdate, 
  runSfcScan, 
  cleanOrphanTasks,
  restoreWindowsStore,
  removeOneDrive,
  resetFontCache,
  fixBluetoothCache,
  toggleTakeOwnershipMenu,
  backupDrivers
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  RefreshCw, 
  Wifi, 
  Search, 
  ShieldAlert, 
  Trash2, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Terminal,
  Store,
  FolderMinus,
  Type,
  Bluetooth,
  KeyRound,
  Archive,
  Layers
} from "lucide-react";

export default function SystemModule() {
  const { t } = useLanguage();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { status: "Success" | "Error"; message: string }>>({});
  const [takeOwnershipActive, setTakeOwnershipActive] = useState<boolean>(false);

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
        [id]: { status: "Error", message: err?.message || "Erro de comunicação." }
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleTakeOwnership = async () => {
    const nextState = !takeOwnershipActive;
    await handleAction("ownership", async () => {
      const res = await toggleTakeOwnershipMenu(nextState);
      if (res.success) {
        setTakeOwnershipActive(nextState);
      }
      return res;
    });
  };

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-secondary" />
          {t('sys_title')}
        </h2>
        <p className="text-xs text-[#bcc9cd] mt-1">
          {t('sys_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WinUtil (Chris Titus) */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#06b6d4]/10 rounded-lg text-[#06b6d4]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_winutil_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_winutil_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("winutil", launchWinUtil)}
              disabled={activeActions["winutil"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold transition-all hover:scale-105"
            >
              {activeActions["winutil"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('sys_winutil_btn')
              )}
            </button>
          </div>
        </div>

        {/* Otimizar DNS (Ping Cloudflare vs Google) */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_dns_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_dns_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("dns", optimizeDns)}
              disabled={activeActions["dns"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all hover:scale-105"
            >
              {activeActions["dns"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('sys_dns_btn')
              )}
            </button>
          </div>
        </div>

        {/* Desativar Telemetria & Rastreamento */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_tel_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_tel_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("telemetry", disableTelemetry)}
              disabled={activeActions["telemetry"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all hover:scale-105"
            >
              {activeActions["telemetry"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('sys_tel_btn')
              )}
            </button>
          </div>
        </div>

        {/* Remover Bloatware do Windows */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#d0bcff]/10 rounded-lg text-secondary">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_bloat_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_bloat_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("bloatware", removeBloatware)}
              disabled={activeActions["bloatware"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all hover:scale-105"
            >
              {activeActions["bloatware"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('sys_bloat_btn')
              )}
            </button>
          </div>
        </div>

        {/* Reparar Windows Update */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_wupd_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_wupd_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("wupdate", repairWindowsUpdate)}
              disabled={activeActions["wupdate"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all hover:scale-105"
            >
              {activeActions["wupdate"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('sys_wupd_btn')
              )}
            </button>
          </div>
        </div>

        {/* Verificador de Arquivos SFC & DISM */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_sfc_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_sfc_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("scan", runSfcScan)}
              disabled={activeActions["scan"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all hover:scale-105"
            >
              {activeActions["scan"] ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('btn_executing')}
                </span>
              ) : (
                t('sys_sfc_btn')
              )}
            </button>
          </div>
        </div>

        {/* Limpar Tarefas Órfãs */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-secondary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('clean_orphans_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('clean_orphans_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4 flex justify-end">
            <button
              onClick={() => handleAction("orphans", cleanOrphanTasks)}
              disabled={activeActions["orphans"]}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all hover:scale-105"
            >
              {activeActions["orphans"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t('clean_orphans_btn')
              )}
            </button>
          </div>
        </div>

        {/* Ferramentas Avançadas: Store, OneDrive, Fontes, Bluetooth, Tomar Posse, Backup */}
        <div className="p-6 rounded-xl glass-card hover:border-secondary/20 transition-all duration-300 flex flex-col justify-between md:col-span-2">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('sys_adv_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('sys_adv_desc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-6 border-t border-white/5 mt-6">
            <button
              onClick={() => handleAction("store", restoreWindowsStore)}
              disabled={activeActions["store"]}
              className="py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 text-zinc-200"
            >
              <Store className="w-4 h-4 text-primary" />
              <span>{activeActions["store"] ? "..." : t('sys_store_btn')}</span>
            </button>

            <button
              onClick={() => handleAction("onedrive", removeOneDrive)}
              disabled={activeActions["onedrive"]}
              className="py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 text-zinc-200"
            >
              <FolderMinus className="w-4 h-4 text-red-400" />
              <span>{activeActions["onedrive"] ? "..." : t('sys_onedrive_btn')}</span>
            </button>

            <button
              onClick={() => handleAction("font", resetFontCache)}
              disabled={activeActions["font"]}
              className="py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 text-zinc-200"
            >
              <Type className="w-4 h-4 text-amber-400" />
              <span>{activeActions["font"] ? "..." : t('sys_font_btn')}</span>
            </button>

            <button
              onClick={() => handleAction("bluetooth", fixBluetoothCache)}
              disabled={activeActions["bluetooth"]}
              className="py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 text-zinc-200"
            >
              <Bluetooth className="w-4 h-4 text-cyan-400" />
              <span>{activeActions["bluetooth"] ? "..." : t('sys_blue_btn')}</span>
            </button>

            <button
              onClick={handleTakeOwnership}
              disabled={activeActions["ownership"]}
              className="py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 text-zinc-200"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>{activeActions["ownership"] ? "..." : takeOwnershipActive ? "Remover Posse" : t('sys_own_btn')}</span>
            </button>

            <button
              onClick={() => handleAction("backup", backupDrivers)}
              disabled={activeActions["backup"]}
              className="py-2.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold transition-all hover:scale-105 flex flex-col items-center justify-center gap-1.5 text-zinc-200"
            >
              <Archive className="w-4 h-4 text-secondary" />
              <span>{activeActions["backup"] ? "..." : t('sys_drv_btn')}</span>
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
                    <span className="font-bold capitalize text-zinc-200 block">{key}: {value.status}</span>
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
