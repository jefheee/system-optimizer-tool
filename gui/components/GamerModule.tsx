'use client';

import { useEffect, useRef, useState } from "react";
import { 
  getGamerStatus, 
  toggleTimerResolution, 
  toggleRamAutoclean,
  setGamePriority,
  disableFullscreenOptimizations,
  optimizeMouse,
  optimizeKeyboard,
  optimizeTcpNetwork,
  addDefenderExclusion,
  resetShaderCache
} from "../lib/api";
import { useLanguage } from "../lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gamepad2, 
  Cpu, 
  MousePointer, 
  Keyboard, 
  Activity, 
  Wifi, 
  ShieldAlert, 
  Zap, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  FolderOpen,
  FileCode
} from "lucide-react";

export default function GamerModule() {
  const { t } = useLanguage();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { status: "Success" | "Error"; message: string }>>({});
  
  // Inputs states
  const [processName, setProcessName] = useState("");
  const [exclusionPath, setExclusionPath] = useState("");

  // Toggles states
  const [latencyEnabled, setLatencyEnabled] = useState(false);
  const [latencyResolution, setLatencyResolution] = useState<number>(15.6);
  const [ramCleanEnabled, setRamCleanEnabled] = useState(false);

  // Hidden input refs for file/folder pickers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Carrega status real do backend ao inicializar
  useEffect(() => {
    getGamerStatus().then(res => {
      if (res.success && res.data) {
        setLatencyEnabled(res.data.timerResolutionActive);
        setLatencyResolution(res.data.currentResolutionMs);
        setRamCleanEnabled(res.data.ramAutocleanActive);
      }
    });
  }, []);

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
        [id]: { status: "Error", message: err?.message || "Falha na comunicação." }
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleTimer = async () => {
    const nextState = !latencyEnabled;
    await handleAction("latency", async () => {
      const res = await toggleTimerResolution(nextState);
      if (res.success && res.data) {
        setLatencyEnabled(res.data.timerResolutionActive);
        setLatencyResolution(res.data.currentResolutionMs);
      }
      return res;
    });
  };

  const handleToggleRam = async () => {
    const nextState = !ramCleanEnabled;
    await handleAction("ramclean", async () => {
      const res = await toggleRamAutoclean(nextState);
      if (res.success && res.data) {
        setRamCleanEnabled(res.data.ramAutocleanActive);
      }
      return res;
    });
  };

  return (
    <div className="space-y-8 animate-card-entry">
      <div>
        <h2 className="text-xl font-bold font-headline-lg text-[#e5e2e1] tracking-tight flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-tertiary" />
          {t('gamer_title')}
        </h2>
        <p className="text-xs text-[#bcc9cd] mt-1">
          {t('gamer_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Temporizador de Latência (toggleTimerResolution) */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('gamer_timer_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('gamer_timer_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-xs font-semibold text-zinc-400">
              Status: {latencyEnabled ? `${t('gamer_timer_active')} (${latencyResolution.toFixed(2)}ms)` : t('gamer_timer_default')}
            </span>
            <button
              onClick={handleToggleTimer}
              disabled={activeActions["latency"]}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
                latencyEnabled 
                  ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30" 
                  : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200"
              }`}
            >
              {activeActions["latency"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : latencyEnabled ? (
                t('gamer_timer_btn_off')
              ) : (
                t('gamer_timer_btn_on')
              )}
            </button>
          </div>
        </div>

        {/* Auto-Limpeza de RAM (toggleRamAutoclean) */}
        <div className="p-6 rounded-xl glass-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-tertiary/10 rounded-lg text-tertiary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('gamer_ram_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('gamer_ram_desc')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            <span className="text-xs font-semibold text-zinc-400">
              Status: {ramCleanEnabled ? t('gamer_ram_active') : t('gamer_ram_inactive')}
            </span>
            <button
              onClick={handleToggleRam}
              disabled={activeActions["ramclean"]}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
                ramCleanEnabled 
                  ? "bg-tertiary/20 border border-tertiary/40 text-tertiary hover:bg-tertiary/30" 
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800"
              }`}
            >
              {activeActions["ramclean"] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : ramCleanEnabled ? (
                t('gamer_ram_btn_off')
              ) : (
                t('gamer_ram_btn_on')
              )}
            </button>
          </div>
        </div>

        {/* Otimização de Mouse e Teclado */}
        <div className="p-6 rounded-xl glass-card hover:border-primary/20 transition-all duration-300 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg text-secondary">
              <MousePointer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('gamer_input_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('gamer_input_desc')}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleAction("mouse", () => optimizeMouse(true))}
              disabled={activeActions["mouse"]}
              className="flex-1 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 text-zinc-200"
            >
              {activeActions["mouse"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_mouse_btn')}
            </button>
            <button
              onClick={() => handleAction("keyboard", () => optimizeKeyboard())}
              disabled={activeActions["keyboard"]}
              className="flex-1 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 text-zinc-200"
            >
              {activeActions["keyboard"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_kbd_btn')}
            </button>
          </div>
        </div>

        {/* Rede TCP, DVR e Shaders */}
        <div className="p-6 rounded-xl glass-card hover:border-primary/20 transition-all duration-300 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 text-sm">{t('gamer_net_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('gamer_net_desc')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => handleAction("network", () => optimizeTcpNetwork())}
              disabled={activeActions["network"]}
              className="flex-1 min-w-[110px] py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-all hover:scale-105 flex items-center justify-center gap-1.5 text-zinc-200"
            >
              {activeActions["network"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_tcp_btn')}
            </button>
            <button
              onClick={() => handleAction("gamedvr", () => disableFullscreenOptimizations(true))}
              disabled={activeActions["gamedvr"]}
              className="flex-1 min-w-[110px] py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-all hover:scale-105 flex items-center justify-center gap-1.5 text-zinc-200"
            >
              {activeActions["gamedvr"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_fso_btn')}
            </button>
            <button
              onClick={() => handleAction("directx", () => resetShaderCache())}
              disabled={activeActions["directx"]}
              className="flex-1 min-w-[110px] py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-all hover:scale-105 flex items-center justify-center gap-1.5 text-zinc-200"
            >
              {activeActions["directx"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_shader_btn')}
            </button>
          </div>
        </div>

        {/* Prioridade do Processo de Jogo */}
        <div className="p-6 rounded-xl glass-card hover:border-primary/20 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="w-full">
              <h4 className="font-bold text-zinc-100 text-sm">{t('gamer_prio_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('gamer_prio_desc')}
              </p>
              
              {/* Input assistido com seletor de arquivo */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".exe"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setProcessName(f.name);
                }}
              />

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder={t('gamer_prio_placeholder')}
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-xs text-[#e5e2e1] outline-none transition-all placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={t('gamer_prio_select')}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all"
                >
                  <FileCode className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction("priority", () => setGamePriority(processName))}
                  disabled={activeActions["priority"] || !processName}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  {activeActions["priority"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_prio_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Exclusão do Windows Defender */}
        <div className="p-6 rounded-xl glass-card hover:border-primary/20 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg text-orange-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="w-full">
              <h4 className="font-bold text-zinc-100 text-sm">{t('gamer_def_title')}</h4>
              <p className="text-xs text-[#bcc9cd] mt-1 leading-relaxed">
                {t('gamer_def_desc')}
              </p>

              {/* Input assistido com seletor de pasta */}
              <input
                type="file"
                ref={folderInputRef}
                // @ts-ignore
                webkitdirectory=""
                directory=""
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const fullPath = (f as any).path ? (f as any).path.replace(/[\\/][^\\/]+$/, '') : f.name;
                    setExclusionPath(fullPath);
                  }
                }}
              />

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder={t('gamer_def_placeholder')}
                  value={exclusionPath}
                  onChange={(e) => setExclusionPath(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-xs text-[#e5e2e1] outline-none transition-all placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  title={t('gamer_def_select')}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAction("exclusion", () => addDefenderExclusion(exclusionPath))}
                  disabled={activeActions["exclusion"] || !exclusionPath}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-zinc-950 text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  {activeActions["exclusion"] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('gamer_def_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Seção de feedback de resultados */}
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
