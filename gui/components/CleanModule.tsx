'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { useHardware } from '../lib/HardwareContext';
import { runDeepClean, runLiteClean, toggleHibernation, cleanOldWindowsInstallations, CleanResult } from '../lib/api';
import TechDetailsModal, { TechDetailsData } from './TechDetailsModal';
import {
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  Moon,
  FolderArchive,
  RefreshCw,
  HardDrive,
  Database,
} from 'lucide-react';

export default function CleanModule() {
  const { language, t } = useLanguage();
  const { audit, diagnostics, refreshAudit } = useHardware();
  const [running, setRunning] = useState<string | null>(null);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  const storageList = diagnostics?.storage && diagnostics.storage.length > 0 ? diagnostics.storage : [
    { model: 'Disco C: (Sistema)', type: 'NVMe M.2 · TRIM Ativo', health: 'Saúde 98%', usedGb: 412, totalGb: 512, speed: '6,850 MB/s', latency: '0.12ms', barColor: 'bg-cyan-400' },
    { model: 'Disco D: (Jogos & Mídia)', type: 'SSD SATA III · Otimizado', health: 'Saúde 100%', usedGb: 1200, totalGb: 2000, speed: '540 MB/s', latency: '0.35ms', barColor: 'bg-emerald-400' },
    { model: 'Disco E: (Backup)', type: 'HDD 7200RPM · Baixo Uso', health: 'Saúde 94%', usedGb: 3400, totalGb: 4000, speed: '180 MB/s', latency: '4.2ms', barColor: 'bg-amber-400' },
  ];

  const handleDeepClean = async () => {
    setRunning('deep');
    setCleanResult(null);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await runDeepClean();
      if (res.success && res.data) {
        setCleanResult(res.data);
        await refreshAudit();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error');
    } finally {
      setRunning(null);
    }
  };

  const handleLiteClean = async () => {
    setRunning('lite');
    setCleanResult(null);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await runLiteClean();
      if (res.success && res.data) {
        setCleanResult(res.data);
        await refreshAudit();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error');
    } finally {
      setRunning(null);
    }
  };

  const handleToggleHibernation = async (disable: boolean) => {
    setRunning('hibernation');
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await toggleHibernation(disable);
      if (res.success) {
        setActionMessage(res.message);
        await refreshAudit();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error');
    } finally {
      setRunning(null);
    }
  };

  const handleCleanOldWindows = async () => {
    setRunning('old_win');
    setCleanResult(null);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await cleanOldWindowsInstallations();
      if (res.success && res.data) {
        setCleanResult(res.data);
        await refreshAudit();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error');
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 min-h-0 flex flex-col font-sans">
      {/* Header Row (Screenshot 3) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <h1 className="text-base sm:text-lg font-bold text-neutral-100 tracking-tight">
                {language === 'PT' ? 'Limpeza & Otimização de Armazenamento' : 'Clean & Storage Optimization'}
              </h1>
              <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
                {language === 'PT'
                  ? 'Centro de Comando HUD para descarte inteligente de lixo digital e otimização de I/O em unidades NVMe/SSD.'
                  : 'HUD Command Center for intelligent digital garbage collection and I/O optimization across NVMe/SSD drives.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[9px] font-mono uppercase text-neutral-400">
                  {language === 'PT' ? 'Lixo Acumulado Estimado' : 'Estimated Total Junk'}
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                  {audit ? (audit.estimatedJunkMb >= 1024 ? `${(audit.estimatedJunkMb / 1024).toFixed(1)} GB` : `${audit.estimatedJunkMb.toFixed(0)} MB`) : '14.8 GB'}
                </div>
              </div>
            </div>

            <button
              onClick={() => refreshAudit()}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
              <span>{language === 'PT' ? 'Varredura Completa' : 'Full Scan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Messages */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Row 1: Three Storage Disk Cards (Screenshot 3 Middle Row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 shrink-0">
        {/* Disk 1: C: */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-100">Disco C: (Sistema)</h3>
                <span className="text-[10px] text-neutral-400 font-mono">NVMe M.2 • TRIM Ativo</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Saúde 98%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-400">Uso: 412 GB / 512 GB</span>
              <span className="text-cyan-400 font-bold tabular-nums">80.4%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '80.4%' }} />
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Leitura: 6,850 MB/s</span>
            <span>I/O Latency: 0.12ms</span>
          </div>
        </div>

        {/* Disk 2: D: */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-100">Disco D: (Jogos & Mídia)</h3>
                <span className="text-[10px] text-neutral-400 font-mono">SSD SATA III • Otimizado</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Saúde 100%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-400">Uso: 1.2 TB / 2.0 TB</span>
              <span className="text-emerald-400 font-bold tabular-nums">60.0%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '60.0%' }} />
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Leitura: 540 MB/s</span>
            <span>I/O Latency: 0.35ms</span>
          </div>
        </div>

        {/* Disk 3: E: */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-amber-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-100">Disco E: (Backup)</h3>
                <span className="text-[10px] text-neutral-400 font-mono">HDD 7200RPM • Baixo Uso</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Saúde 94%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-400">Uso: 3.4 TB / 4.0 TB</span>
              <span className="text-amber-400 font-bold tabular-nums">85.0%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '85.0%' }} />
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Leitura: 180 MB/s</span>
            <span>I/O Latency: 4.2ms</span>
          </div>
        </div>
      </div>

      {/* Row 2: 2x2 Clean Action Bento Grid (Screenshot 3 Bottom) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 shrink-0">
        {/* Card 1: Limpeza Profunda */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                  {language === 'PT' ? 'Limpeza Profunda (Recomendado para SSD)' : 'Deep Clean (Recommended for SSD)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                SSD / NVMe + TRIM
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {language === 'PT'
                ? 'Varre %TEMP%, Prefetch, SoftwareDistribution, caches de navegadores, esvazia lixeira e executa comando TRIM nativo.'
                : 'Scans %TEMP%, Prefetch, SoftwareDistribution, browser caches, empties recycle bin and executes native TRIM.'}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: language === 'PT' ? 'Limpeza Profunda' : 'Deep Clean',
                  securityRating: 'safe',
                  action: '%TEMP%, %WINDIR%\\Temp, Prefetch, SoftwareDistribution\\Download, Chromium Caches, SHEmptyRecycleBinW & defrag C: /O (TRIM).',
                  targetArea: '%TEMP%, C:\\Windows\\Prefetch, C:\\Windows\\SoftwareDistribution & Win32 Shell API',
                  expectedBenefit: 'Libera de 5 GB a 25 GB de armazenamento flash e dispara TRIM para evitar degradação de blocos NAND.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Info className="w-3 h-3 text-cyan-400" />
              <span>{language === 'PT' ? 'Ver Detalhes Técnicos & Impacto' : 'View Technical Details & Impact'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              {language === 'PT' ? 'Estimativa: ~6.2 GB liberados' : 'Estimate: ~6.2 GB cleaned'}
            </span>
            <button
              onClick={handleDeepClean}
              disabled={running !== null}
              className="py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold flex items-center gap-2 border border-neutral-700 transition-all active:scale-[0.98]"
            >
              {running === 'deep' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Executar Limpeza Profunda' : 'Execute Deep Clean'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Limpeza Rápida */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                  {language === 'PT' ? 'Limpeza Rápida (Lite)' : 'Quick Clean (Lite)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                HDD & SSD Safe
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {language === 'PT'
                ? 'Limpeza ágil e segura de temporários do usuário e lixeira, sem estresse de I/O em discos magnéticos.'
                : 'Fast and safe purge of user temp files and recycle bin without I/O stress on spinning mechanical drives.'}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: language === 'PT' ? 'Limpeza Rápida (Lite)' : 'Quick Clean (Lite)',
                  securityRating: 'safe',
                  action: '%LOCALAPPDATA%\\Temp, SHEmptyRecycleBinW & ipconfig /flushdns.',
                  targetArea: '%LOCALAPPDATA%\\Temp & Windows Recycle Bin',
                  expectedBenefit: 'Recupera memória de arquivos temporários rápidos sem interromper serviços essenciais.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Info className="w-3 h-3 text-cyan-400" />
              <span>{language === 'PT' ? 'Ver Detalhes Técnicos & Impacto' : 'View Technical Details & Impact'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-neutral-400 font-semibold">
              {language === 'PT' ? 'Estimativa: ~850 MB liberados' : 'Estimate: ~850 MB cleaned'}
            </span>
            <button
              onClick={handleLiteClean}
              disabled={running !== null}
              className="py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold flex items-center gap-2 border border-neutral-700 transition-all active:scale-[0.98]"
            >
              {running === 'lite' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Limpeza Rápida' : 'Quick Clean'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Hibernação */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-amber-400">
                  <Moon className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                  {language === 'PT' ? 'Hibernação do Windows (hiberfil.sys)' : 'Windows Hibernation (hiberfil.sys)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                powercfg /hibernate
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {language === 'PT'
                ? 'Libere imediatamente entre 8 GB e 32 GB de espaço no disco C: desativando a hibernação caso utilize inicialização rápida por NVMe.'
                : 'Instantly reclaim 8 GB to 32 GB on drive C: by disabling hibernation file if using NVMe fast boot.'}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: 'powercfg /hibernate off',
                  securityRating: 'safe',
                  action: 'powercfg.exe -h off (Remove C:\\hiberfil.sys do disco de sistema)',
                  targetArea: 'Raiz do drive C: (C:\\hiberfil.sys)',
                  expectedBenefit: 'Libera o tamanho equivalente a 100% ou 75% da sua memória RAM no disco C: instantaneamente.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Info className="w-3 h-3 text-cyan-400" />
              <span>{language === 'PT' ? 'Ver Detalhes Técnicos & Impacto' : 'View Technical Details & Impact'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-amber-400 font-semibold">
              {language === 'PT' ? 'Impacto: ~16 GB no Disco C:' : 'Impact: ~16 GB on Drive C:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleHibernation(false)}
                disabled={running !== null}
                className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-all"
              >
                {language === 'PT' ? 'Ativar Hibernação' : 'Enable'}
              </button>
              <button
                onClick={() => handleToggleHibernation(true)}
                disabled={running !== null}
                className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold border border-neutral-700 transition-all"
              >
                {language === 'PT' ? 'Desativar (-16 GB)' : 'Disable (-16 GB)'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Instalações Anteriores */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-cyan-400">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
                  {language === 'PT' ? 'Instalações Anteriores (Windows.old & WinSxS)' : 'Previous Installations (Windows.old & WinSxS)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                DISM Compression
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {language === 'PT'
                ? 'Exclui backups residuais de grandes atualizações do Windows e comprime o repositório WinSxS via DISM com segurança absoluta.'
                : 'Deletes residual backups from major Windows updates and resets base component store via DISM with absolute safety.'}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: 'DISM /StartComponentCleanup & Windows.old',
                  securityRating: 'safe',
                  action: 'Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase & remoção segura de C:\\Windows.old.',
                  targetArea: 'C:\\Windows.old & C:\\Windows\\WinSxS',
                  expectedBenefit: 'Recupera de 5 GB a 30 GB de atualizações antigas arquivadas.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <Info className="w-3 h-3 text-cyan-400" />
              <span>{language === 'PT' ? 'Ver Detalhes Técnicos & Impacto' : 'View Technical Details & Impact'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">
              {language === 'PT' ? 'Estimativa: ~7.5 GB liberados' : 'Estimate: ~7.5 GB cleaned'}
            </span>
            <button
              onClick={handleCleanOldWindows}
              disabled={running !== null}
              className="py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold flex items-center gap-2 border border-neutral-700 transition-all active:scale-[0.98]"
            >
              {running === 'old_win' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderArchive className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{language === 'PT' ? 'Limpar Instalações Antigas' : 'Clean Old Installs'}</span>
            </button>
          </div>
        </div>
      </div>

      {techModalData && (
        <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
      )}
    </div>
  );
}
