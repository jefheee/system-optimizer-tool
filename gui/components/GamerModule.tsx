'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  getGamerStatus, 
  toggleTimerResolution, 
  toggleRamAutoclean,
  flushRamNow,
  enableUltimatePerformancePlan,
  toggleVbs,
  setGamePriority,
  disableFullscreenOptimizations,
  optimizeMouse,
  optimizeKeyboard,
  optimizeTcpNetwork,
  addDefenderExclusion,
  resetShaderCache
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import TechDetailsModal, { TechDetailsData } from './TechDetailsModal';
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
  FolderOpen,
  FileCode,
  Info,
  Clock,
  Layers,
  ShieldCheck
} from 'lucide-react';

export default function GamerModule() {
  const { t } = useLanguage();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  
  // Inputs states
  const [processName, setProcessName] = useState('');
  const [exclusionPath, setExclusionPath] = useState('');

  // Toggles states
  const [latencyEnabled, setLatencyEnabled] = useState(false);
  const [latencyResolution, setLatencyResolution] = useState<number>(15.6);
  const [ramCleanEnabled, setRamCleanEnabled] = useState(false);
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  // Hidden input refs for file/folder pickers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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
      setResults(prev => ({
        ...prev,
        [id]: { success: res.success, message: res.message }
      }));
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [id]: { success: false, message: err?.message || 'Falha na comunicação.' }
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleTimer = async () => {
    const nextState = !latencyEnabled;
    await handleAction('latency', async () => {
      const res = await toggleTimerResolution(nextState);
      if (res.success && res.data) {
        setLatencyEnabled(res.data.timerResolutionActive);
        setLatencyResolution(res.data.currentResolutionMs);
      }
      return res;
    });
  };

  const handleToggleRamJob = async () => {
    const nextState = !ramCleanEnabled;
    await handleAction('ram_job', async () => {
      const res = await toggleRamAutoclean(nextState);
      if (res.success && res.data) {
        setRamCleanEnabled(res.data.ramAutocleanActive);
      }
      return res;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setProcessName(file.name);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const path = (e.target.files[0] as any).path || e.target.files[0].name;
      setExclusionPath(path);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hidden file & folder pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".exe"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
        onChange={handleFolderSelect}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gamepad2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-neutral-100">
            {t('gamer_title')}
          </h2>
        </div>
        <p className="text-xs text-neutral-400">
          {t('gamer_subtitle')}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Timer Resolution */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_timer_title')}</h3>
                  <span className="text-[10px] text-emerald-400 font-medium">NtSetTimerResolution</span>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {latencyResolution.toFixed(2)} ms
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_timer_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_timer_title'),
                  securityRating: 'safe',
                  action: 'Chama a função não documentada NtSetTimerResolution em ntdll.dll com valor 5000 (0.5 milissegundos).',
                  targetArea: 'ntdll.dll / Kernel Interrupt Timer',
                  expectedBenefit: 'Reduz o atraso de agendamento entre frames e o delay entre clique do mouse e resposta na tela.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={handleToggleTimer}
              disabled={activeActions['latency']}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                latencyEnabled
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              }`}
            >
              {activeActions['latency'] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              <span>{latencyEnabled ? t('gamer_timer_btn_off') : t('gamer_timer_btn_on')}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Ultimate Performance Power Plan */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_power_title')}</h3>
                  <span className="text-[10px] text-emerald-400 font-medium">powercfg -duplicatescheme</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_power_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_power_title'),
                  securityRating: 'safe',
                  action: 'Duplica o esquema OEM e9a42b02-d5df-448d-aa00-03f14749eb61 via powercfg e o ativa imediatamente como plano ativo do sistema operacional.',
                  targetArea: 'powercfg.exe e subsistema de gerenciamento de energia ACPI',
                  expectedBenefit: 'Impede núcleos de CPU de entrarem em C-States profundos, travando frequências máximas e eliminando oscilações de clock em momentos de alta carga gráfica.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('power_plan', enableUltimatePerformancePlan)}
              disabled={activeActions['power_plan']}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
            >
              {activeActions['power_plan'] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{t('gamer_power_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 3: RAM Working Set Flush (Instant) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_flush_ram_title')}</h3>
                  <span className="text-[10px] text-blue-400 font-medium">K32EmptyWorkingSet</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_flush_ram_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_flush_ram_title'),
                  securityRating: 'safe',
                  action: 'Varre a tabela de processos ativos com EnumProcesses e executa K32EmptyWorkingSet em cada PID para liberar páginas de memória ociosas.',
                  targetArea: 'Win32 Process Status API / Gerenciador de Memória do Windows',
                  expectedBenefit: 'Libera imediatamente centenas de megabytes de RAM consumidos por processos em segundo plano, deixando a memória física desimpedida para jogos pesados.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('ram_flush', flushRamNow)}
              disabled={activeActions['ram_flush']}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {activeActions['ram_flush'] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              <span>{t('gamer_flush_ram_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 4: RAM Auto-Clean Background Job */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_ram_job_title')}</h3>
                  <span className="text-[10px] text-blue-400 font-medium">Ciclo assíncrono de 10 min</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                ramCleanEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>
                {ramCleanEnabled ? t('gamer_ram_active') : t('gamer_ram_inactive')}
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_ram_job_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_ram_job_title'),
                  securityRating: 'safe',
                  action: 'Dispara um canal Tokio assíncrono em Rust que executa a cada 600 segundos a rotina de Working Set Flush sem exibir janelas.',
                  targetArea: 'Tokio Async Runtime & Win32 Memory Management',
                  expectedBenefit: 'Evita vazamento de memória em sessões longas de jogo sem intervenção manual do usuário.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-blue-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={handleToggleRamJob}
              disabled={activeActions['ram_job']}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                ramCleanEnabled
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
              }`}
            >
              {activeActions['ram_job'] ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              <span>{ramCleanEnabled ? t('gamer_ram_btn_off') : t('gamer_ram_btn_on')}</span>
            </button>
          </div>
        </div>

        {/* Card 5: Core Isolation / VBS Toggle */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_vbs_title')}</h3>
                  <span className="text-[10px] text-amber-400 font-medium">bcdedit /set hypervisorlaunchtype</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_vbs_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_vbs_title'),
                  securityRating: 'advanced',
                  action: 'Configura o parâmetro hypervisorlaunchtype como off no Boot Configuration Data (BCD) do Windows via bcdedit.',
                  targetArea: 'BCD (Boot Configuration Data) / Hyper-V Root Security',
                  expectedBenefit: 'Gera ganhos de 5% a 15% em 1% low FPS em jogos competitivos ao eliminar a virtualização aninhada de memória do Windows Defender.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-amber-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={() => handleAction('vbs', () => toggleVbs(true))}
              disabled={activeActions['vbs']}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {activeActions['vbs'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{t('gamer_vbs_btn_off')}</span>
            </button>

            <button
              onClick={() => handleAction('vbs', () => toggleVbs(false))}
              disabled={activeActions['vbs']}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-all active:scale-[0.98]"
            >
              {t('gamer_vbs_btn_on')}
            </button>
          </div>
        </div>

        {/* Card 6: Mouse 1:1 & Keyboard 150ms */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <MousePointer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_input_title')}</h3>
                  <span className="text-[10px] text-cyan-400 font-medium">Control Panel\\Mouse & Accessibility</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_input_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_input_title'),
                  securityRating: 'safe',
                  action: 'Zera MouseSpeed, MouseThreshold1 e MouseThreshold2 no registro para resposta 1:1 linear, e define AutoRepeatDelay em 150ms.',
                  targetArea: 'HKCU\\Control Panel\\Mouse e Keyboard Response',
                  expectedBenefit: 'Precisão muscular idêntica em miras de FPS e resposta mais ágil em strafing e teclas repetidas.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={() => handleAction('mouse', () => optimizeMouse(true))}
              disabled={activeActions['mouse']}
              className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {activeActions['mouse'] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <MousePointer className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{t('gamer_mouse_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('kbd', optimizeKeyboard)}
              disabled={activeActions['kbd']}
              className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {activeActions['kbd'] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Keyboard className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{t('gamer_kbd_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 7: TCP NoDelay, FSO & Shaders */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_net_title')}</h3>
                  <span className="text-[10px] text-cyan-400 font-medium">TcpAckFrequency & TCPNoDelay</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_net_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('gamer_net_title'),
                  securityRating: 'safe',
                  action: 'Configura TcpAckFrequency=1 e TCPNoDelay=1 nas interfaces de rede para despachar pacotes imediatamente, e limpa D3DSCache e drivers DX.',
                  targetArea: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces e %LOCALAPPDATA%\\D3DSCache',
                  expectedBenefit: 'Reduz o atraso de transmissão de pacotes TCP e elimina travamentos por compilação de shaders corrompidos.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={() => handleAction('tcp', optimizeTcpNetwork)}
              disabled={activeActions['tcp']}
              className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
            >
              {activeActions['tcp'] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Wifi className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{t('gamer_tcp_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('fso', () => disableFullscreenOptimizations(true))}
              disabled={activeActions['fso']}
              className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
            >
              {activeActions['fso'] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Zap className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{t('gamer_fso_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('shader', resetShaderCache)}
              disabled={activeActions['shader']}
              className="py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
            >
              {activeActions['shader'] ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Activity className="w-3.5 h-3.5 text-cyan-400" />}
              <span>Shaders</span>
            </button>
          </div>
        </div>

        {/* Card 8: CPU Priority per Game Exe */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_prio_title')}</h3>
                  <span className="text-[10px] text-emerald-400 font-medium">Image File Execution Options</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_prio_desc')}
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                placeholder={t('gamer_prio_placeholder')}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                title="Escolher arquivo .exe"
              >
                <FileCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('prio', () => setGamePriority(processName))}
              disabled={!processName.trim() || activeActions['prio']}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
            >
              {activeActions['prio'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              <span>{t('gamer_prio_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 9: Windows Defender Exclusion */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between md:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('gamer_def_title')}</h3>
                  <span className="text-[10px] text-purple-400 font-medium">Add-MpPreference -ExclusionPath</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('gamer_def_desc')}
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={exclusionPath}
                onChange={(e) => setExclusionPath(e.target.value)}
                placeholder={t('gamer_def_placeholder')}
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={() => folderInputRef.current?.click()}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                title="Escolher pasta de jogo"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('defender', () => addDefenderExclusion(exclusionPath))}
              disabled={!exclusionPath.trim() || activeActions['defender']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['defender'] ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <ShieldAlert className="w-4 h-4 text-purple-400" />}
              <span>{t('gamer_def_btn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Banner */}
      {Object.entries(results).map(([id, res]) => (
        <div
          key={id}
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-fade-in ${
            res.success
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{res.message}</span>
        </div>
      ))}

      {/* Tech Details Modal */}
      <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
    </div>
  );
}
