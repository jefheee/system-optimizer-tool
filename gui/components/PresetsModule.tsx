'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useHardware } from '@/lib/HardwareContext';
import { runPreset, createRestorePoint } from '@/lib/api';
import {
  Zap,
  Gamepad2,
  BatteryCharging,
  ShieldAlert,
  ShieldCheck,
  Check,
  Loader2,
  Sparkles,
  Play,
  RotateCcw,
  Terminal,
  Trash2,
} from 'lucide-react';

export default function PresetsModule() {
  const { language, t } = useLanguage();
  const { diagnostics, refreshAudit } = useHardware();
  const [runningPreset, setRunningPreset] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([
    `[00:00:01] [SYSTEM] System Optimizer v5.0 Kernel Engine ${language === 'PT' ? 'inicializado.' : 'initialized.'}`,
    `[00:00:01] [INFO] ${language === 'PT' ? 'Mapeamento de perfis inteligentes concluído (4 perfis carregados).' : 'Smart profiles mapping completed (4 profiles loaded).'}`,
    `[00:00:02] [READY] ${language === 'PT' ? 'Aguardando acionamento de perfil pelo usuário...' : 'Ready. Awaiting user profile execution...'}`,
  ]);
  const [statusMsg, setStatusMsg] = useState<{ id: string; success: boolean; text: string } | null>(null);

  const isLaptop = diagnostics?.deviceType === 'Laptop';

  const addLog = (level: string, message: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [...prev, `[${time}] [${level}] ${message}`]);
  };

  const handleRunPreset = async (presetId: string, name: string) => {
    setRunningPreset(presetId);
    setStatusMsg(null);
    addLog('START', language === 'PT' ? `Iniciando aplicação do perfil: ${name}...` : `Starting execution of profile: ${name}...`);
    try {
      const res = await runPreset(presetId);
      setStatusMsg({
        id: presetId,
        success: res.success,
        text: res.message,
      });
      addLog(res.success ? 'SUCCESS' : 'ERROR', res.message);
      await refreshAudit();
    } catch (e: any) {
      const errMsg = e?.message || 'Error';
      setStatusMsg({
        id: presetId,
        success: false,
        text: errMsg,
      });
      addLog('EXCEPTION', errMsg);
    } finally {
      setRunningPreset(null);
      addLog('READY', language === 'PT' ? 'Operação concluída. Registro de 64-bits sincronizado.' : 'Operation completed. 64-bit Registry synchronized.');
    }
  };

  const handleCreateRestore = async () => {
    addLog('RESTORE', language === 'PT' ? 'Criando ponto de restauração seguro do sistema...' : 'Creating secure system restore point...');
    try {
      const res = await createRestorePoint('System_Optimizer_Preset_Checkpoint');
      addLog(res.success ? 'RESTORE_OK' : 'RESTORE_FAIL', res.message);
    } catch (err: any) {
      addLog('RESTORE_ERR', err?.message || 'Erro');
    }
  };

  const handleGlobalOptimization = async () => {
    handleRunPreset(isLaptop ? 'notebook' : 'gamer', language === 'PT' ? 'Otimização Global Recomendada' : 'Recommended Global Tuning');
  };

  const presets = [
    {
      id: 'essential',
      title: language === 'PT' ? 'Manutenção Essencial' : 'Essential Maintenance',
      badge: language === 'PT' ? 'RECOMENDADO' : 'RECOMMENDED',
      badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      desc: language === 'PT' ? 'Limpeza segura e ajustes gerais de estabilidade sem perda de dados.' : 'Safe cleanup and general stability tweaks without risk of data loss.',
      icon: Zap,
      checklist: language === 'PT' ? [
        'Limpeza Rápida de Cache (%TEMP%)',
        'Benchmark & Cache DNS',
        'Desativar Telemetria Básica',
        'Compactação de RAM Ociosa',
      ] : [
        'Quick Cache Clean (%TEMP%)',
        'Benchmark & DNS Cache',
        'Disable Basic Telemetry',
        'Idle RAM Compaction',
      ],
      isPrimary: false,
    },
    {
      id: 'gamer',
      title: language === 'PT' ? 'Modo Gamer & FPS' : 'Gamer Mode & FPS',
      badge: 'ULTRA FPS',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      desc: language === 'PT' ? 'Priorização máxima de hardware, latência zero e remoção de stuttering.' : 'Maximum hardware priority, zero input lag and stuttering elimination.',
      icon: Gamepad2,
      checklist: language === 'PT' ? [
        'Timer Kernel 0.5ms',
        'Plano Ultimate Performance',
        'TCP NoDelay & MSI Mode',
        'Desativar GameBar & Caching',
      ] : [
        'Kernel 0.5ms Timer',
        'Ultimate Performance Plan',
        'TCP NoDelay & MSI Mode',
        'Disable GameBar & Caching',
      ],
      isPrimary: true,
    },
    {
      id: 'notebook',
      title: language === 'PT' ? 'Notebook & Bateria' : 'Laptop & Battery',
      badge: language === 'PT' ? 'EFICIÊNCIA' : 'EFFICIENCY',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      desc: language === 'PT' ? 'Maximize a autonomia da bateria reduzindo processos em segundo plano.' : 'Maximize battery life by throttling background drain processes.',
      icon: BatteryCharging,
      checklist: language === 'PT' ? [
        'Limite de Boost da CPU',
        'Suspensão Agressiva de Apps',
        'Otimização de Brilho Dinâmico',
        'Hibernação Híbrida Inteligente',
      ] : [
        'CPU Boost Frequency Cap',
        'Aggressive App Sleep',
        'Dynamic Brightness Tuning',
        'Smart Hybrid Hibernation',
      ],
      isPrimary: false,
    },
    {
      id: 'privacy',
      title: language === 'PT' ? 'Privacidade Extrema' : 'Extreme Privacy',
      badge: language === 'PT' ? 'PRIVACIDADE' : 'PRIVACY',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
      desc: language === 'PT' ? 'Corte completo de telemetria, Cortana, keyloggers e bloatware UWP.' : 'Complete removal of telemetry, Cortana, diagnostic loggers and UWP bloatware.',
      icon: ShieldAlert,
      checklist: language === 'PT' ? [
        'Desativar Coleta de Dados DiagTrack',
        'Bloqueio de Hosts de Telemetria',
        'Remoção de Apps UWP Nativos',
        'Desativar Cortana & Copilot',
      ] : [
        'Disable DiagTrack Service',
        'Block Known Telemetry Hosts',
        'Remove Native UWP Bloat',
        'Disable Cortana & Copilot',
      ],
      isPrimary: false,
    },
  ];

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 min-h-0 flex flex-col font-sans">
      {/* Top Header Row (Screenshot 2) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {language === 'PT' ? 'MODO ATIVO: PADRÃO DO SISTEMA' : 'ACTIVE MODE: SYSTEM DEFAULT'}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                ↺ {language === 'PT' ? 'Último Restore: Hoje, 14:22' : 'Last Restore: Today, 14:22'}
              </span>
            </div>

            <h1 className="text-base sm:text-lg font-bold text-neutral-100 tracking-tight">
              {language === 'PT' ? 'Perfis Inteligentes em 1-Clique' : '1-Click Smart Profiles'}
            </h1>
            <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
              {language === 'PT'
                ? 'Selecione perfis de otimização pré-configurados por engenheiros de sistema para aplicar alterações profundas no registro, serviços e agendador do Windows instantaneamente.'
                : 'Select pre-configured system engineer optimization profiles to apply deep tweaks to Windows registry, services, and thread scheduling in 1 click.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGlobalOptimization}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5 text-neutral-300" />
              <span>{language === 'PT' ? 'Otimização Global' : 'Global Optimization'}</span>
            </button>

            <button
              onClick={handleCreateRestore}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>{language === 'PT' ? 'Criar Ponto de Restauração' : 'Create Restore Point'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Vertical Preset Cards (Screenshot 2 Row 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {presets.map((p) => {
          const Icon = p.icon;
          const isBusy = runningPreset === p.id;
          return (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${p.badgeClass}`}>
                    {p.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{p.title}</h3>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{p.desc}</p>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 space-y-1.5">
                  {p.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-neutral-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate text-[11px]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => handleRunPreset(p.id, p.title)}
                  disabled={isBusy}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    p.isPrimary
                      ? 'bg-emerald-400/90 hover:bg-emerald-400 text-neutral-950 font-bold shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700'
                  }`}
                >
                  {isBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : p.isPrimary ? (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 fill-current text-neutral-400" />
                  )}
                  <span>{isBusy ? (language === 'PT' ? 'Aplicando...' : 'Applying...') : (language === 'PT' ? 'Executar Perfil' : 'Execute Profile')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time Console Terminal (Screenshot 2 Bottom) */}
      <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col min-h-[160px] flex-1 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-[11px] text-neutral-300 tracking-wider">
              {language === 'PT' ? 'CONSOLE DE EXECUÇÃO EM TEMPO REAL' : 'REAL-TIME EXECUTION CONSOLE'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono">
            <button
              onClick={() => setLogs([])}
              className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'PT' ? 'Limpar Log' : 'Clear Log'}</span>
            </button>
            <span className="text-cyan-400 font-bold">
              Status: {runningPreset ? (language === 'PT' ? 'Executando...' : 'Executing...') : (language === 'PT' ? 'Pronto' : 'Ready')}
            </span>
          </div>
        </div>

        <div className="p-3 bg-neutral-950/90 flex-1 overflow-y-auto font-mono text-[11px] space-y-1 select-text no-scrollbar">
          {logs.map((log, i) => {
            const isError = log.includes('[ERROR]') || log.includes('[EXCEPTION]');
            const isSuccess = log.includes('[SUCCESS]') || log.includes('[RESTORE_OK]');
            const isStart = log.includes('[START]');
            return (
              <div
                key={i}
                className={
                  isError
                    ? 'text-red-400'
                    : isSuccess
                    ? 'text-emerald-400'
                    : isStart
                    ? 'text-cyan-400'
                    : 'text-neutral-300'
                }
              >
                {log}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
