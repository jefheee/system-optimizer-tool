'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { runDeepClean, runLiteClean, toggleHibernation, cleanOldWindowsInstallations, CleanResult } from '../lib/api';
import TechDetailsModal, { TechDetailsData } from './TechDetailsModal';
import { 
  Trash2, 
  Sparkles, 
  Zap, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Info,
  Moon,
  FolderArchive
} from 'lucide-react';

export default function CleanModule() {
  const { t } = useLanguage();
  const [running, setRunning] = useState<string | null>(null);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  const handleDeepClean = async () => {
    setRunning('deep');
    setCleanResult(null);
    setActionMessage(null);
    setErrorMessage(null);
    try {
      const res = await runDeepClean();
      if (res.success && res.data) {
        setCleanResult(res.data);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao executar limpeza profunda.');
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
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao executar limpeza rápida.');
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
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao alterar hibernação.');
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
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao limpar instalações anteriores.');
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">
            {t('clean_title')}
          </h2>
        </div>
        <p className="text-xs text-neutral-400">
          {t('clean_subtitle')}
        </p>
      </div>

      {/* Action Banners */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Clean Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deep Clean Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_deep_title')}</h3>
                  <span className="text-[10px] text-blue-400 font-medium">Recomendado para SSD/NVMe</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('clean_deep_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_deep_title'),
                  securityRating: 'safe',
                  action: 'Varre e remove recursivamente arquivos de log, temporários de usuário e de sistema (%TEMP%, %WINDIR%\\Temp, Prefetch, SoftwareDistribution\\Download, Caches de Chrome/Edge/Brave/Opera). Esvazia a Lixeira via SHEmptyRecycleBinW e roda defrag C: /O (TRIM).',
                  targetArea: '%TEMP%, C:\\Windows\\Prefetch, C:\\Windows\\SoftwareDistribution, Caches do Chromium e Win32 Shell API',
                  expectedBenefit: 'Recuperação imediata de 2 GB a 25 GB de armazenamento em disco, redução de fragmentação no master file table e ganho de velocidade de escrita.',
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
              onClick={handleDeepClean}
              disabled={running !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {running === 'deep' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Limpando Sistema...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('clean_deep_btn')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lite Clean Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_lite_title')}</h3>
                  <span className="text-[10px] text-cyan-400 font-medium">Seguro para HDDs e SSDs</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('clean_lite_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_lite_title'),
                  securityRating: 'safe',
                  action: 'Limpa a pasta de arquivos temporários do usuário (%TEMP%), esvazia a Lixeira do Windows e limpa a tabela DNS local.',
                  targetArea: '%LOCALAPPDATA%\\Temp e Lixeira do Windows',
                  expectedBenefit: 'Limpeza instantânea sem desgaste de I/O em discos rígidos mecânicos e sem interferência em caches de navegação.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={handleLiteClean}
              disabled={running !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {running === 'lite' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Limpando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>{t('clean_lite_btn')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hibernation Toggle Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_hibernation_title')}</h3>
                  <span className="text-[10px] text-amber-400 font-medium">Recupere de 8 a 32 GB no C:</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('clean_hibernation_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_hibernation_title'),
                  securityRating: 'safe',
                  action: 'Invoca powercfg.exe /hibernate off para excluir o arquivo C:\\hiberfil.sys, cujo tamanho é proporcional a 75% da sua memória RAM instalada.',
                  targetArea: 'C:\\hiberfil.sys e gerenciador de energia do Windows',
                  expectedBenefit: 'Liberação imediata de 8 GB a 32 GB de espaço no disco C: que ficava permanentemente reservado para a hibernação.',
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
              onClick={() => handleToggleHibernation(true)}
              disabled={running !== null}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {running === 'hibernation' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{t('clean_hibernation_btn_off')}</span>
            </button>

            <button
              onClick={() => handleToggleHibernation(false)}
              disabled={running !== null}
              className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-all active:scale-[0.98]"
            >
              {t('clean_hibernation_btn_on')}
            </button>
          </div>
        </div>

        {/* Previous Windows Clean Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_old_win_title')}</h3>
                  <span className="text-[10px] text-purple-400 font-medium">Windows.old & WinSxS</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('clean_old_win_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_old_win_title'),
                  securityRating: 'safe',
                  action: 'Varre e remove as pastas C:\\Windows.old, C:\\$Windows.~BT e C:\\$Windows.~WS geradas por grandes atualizações do sistema, e executa dism.exe /Online /Cleanup-Image /StartComponentCleanup para descartar versões antigas de DLLs.',
                  targetArea: 'C:\\Windows.old e C:\\Windows\\WinSxS',
                  expectedBenefit: 'Pode liberar entre 10 GB e 40 GB de espaço que o Windows mantém desnecessariamente após atualizações estáveis.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-purple-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={handleCleanOldWindows}
              disabled={running !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {running === 'old_win' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Limpando Atualizações Antigas...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 text-purple-400" />
                  <span>{t('clean_old_win_btn')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Clean Results Panel */}
      {cleanResult && (
        <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-neutral-100">Resultado da Limpeza</h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block">{t('clean_freed')}</span>
              <span className="text-base font-extrabold text-emerald-400">
                {(cleanResult.totalFreedMb ?? cleanResult.bytesFreed ?? 0).toFixed(1)} MB
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {cleanResult.categories?.map((cat, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-neutral-200">{cat.name}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{cat.filesDeleted} arquivos</div>
                </div>
                <span className="font-bold text-cyan-400">{cat.mbFreed.toFixed(1)} MB</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tech Details Modal */}
      <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
    </div>
  );
}
