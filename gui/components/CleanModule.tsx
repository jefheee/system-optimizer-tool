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
} from 'lucide-react';

export default function CleanModule() {
  const { t } = useLanguage();
  const { audit, refreshAudit } = useHardware();
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
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trash2 className="w-5 h-5 text-neutral-300" />
            <h2 className="text-xl font-bold text-neutral-100">{t('clean_title')}</h2>
          </div>
          <p className="text-xs text-neutral-400">{t('clean_subtitle')}</p>
        </div>

        {audit && (
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs flex items-center gap-2 self-start sm:self-center">
            <Trash2 className="w-4 h-4 text-neutral-400" />
            <span className="text-neutral-400">{t('home_junk_title')}:</span>
            <strong className="text-neutral-200 font-bold">
              {audit.estimatedJunkMb >= 1024
                ? `${(audit.estimatedJunkGb ?? audit.estimatedJunkMb / 1024).toFixed(2)} GB`
                : `${audit.estimatedJunkMb.toFixed(0)} MB`}
            </strong>
          </div>
        )}
      </div>

      {/* Action Banners */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Deep Clean (Bento Hero - spans 2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_deep_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">SSD / NVMe + TRIM</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('clean_deep_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_deep_title'),
                  securityRating: 'safe',
                  action: '%TEMP%, %WINDIR%\\Temp, Prefetch, SoftwareDistribution\\Download, Chromium Caches, SHEmptyRecycleBinW & defrag C: /O (TRIM).',
                  targetArea: '%TEMP%, C:\\Windows\\Prefetch, C:\\Windows\\SoftwareDistribution & Win32 Shell API',
                  expectedBenefit: t('clean_deep_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={handleDeepClean}
              disabled={running !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-500 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {running === 'deep' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('drawer_status_running')}</span>
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

        {/* Card 2: Lite Clean (Bento 1 col) */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_lite_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">HDD & SSD Safe</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('clean_lite_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_lite_title'),
                  securityRating: 'safe',
                  action: '%LOCALAPPDATA%\\Temp, SHEmptyRecycleBinW & ipconfig /flushdns.',
                  targetArea: '%LOCALAPPDATA%\\Temp & Windows Recycle Bin',
                  expectedBenefit: t('clean_lite_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors pt-1"
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
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  <span>{t('drawer_status_running')}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-neutral-300" />
                  <span>{t('clean_lite_btn')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Hibernation Toggle (Bento 1 col) */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_hibernation_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">powercfg /hibernate</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('clean_hibernation_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_hibernation_title'),
                  securityRating: 'safe',
                  action: 'powercfg.exe /hibernate off -> C:\\hiberfil.sys',
                  targetArea: 'C:\\hiberfil.sys & ACPI Power Manager',
                  expectedBenefit: t('clean_hibernation_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={() => handleToggleHibernation(true)}
              disabled={running !== null}
              className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {running === 'hibernation' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{t('clean_hibernation_btn_off')}</span>
            </button>

            <button
              onClick={() => handleToggleHibernation(false)}
              disabled={running !== null}
              className="py-2 px-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium border border-neutral-700/60 transition-all active:scale-[0.98]"
            >
              {t('clean_hibernation_btn_on')}
            </button>
          </div>
        </div>

        {/* Card 4: Previous Windows Clean (Bento 2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('clean_old_win_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">Windows.old & WinSxS</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('clean_old_win_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('clean_old_win_title'),
                  securityRating: 'safe',
                  action: 'C:\\Windows.old, C:\\$Windows.~BT & dism.exe /Online /Cleanup-Image /StartComponentCleanup.',
                  targetArea: 'C:\\Windows.old & C:\\Windows\\WinSxS',
                  expectedBenefit: t('clean_old_win_desc'),
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors pt-1"
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
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  <span>{t('drawer_status_running')}</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 text-neutral-300" />
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
              <h4 className="text-sm font-bold text-neutral-100">{t('drawer_status_success')}</h4>
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
                  <div className="text-[10px] text-neutral-400 mt-0.5">{cat.filesDeleted} files</div>
                </div>
                <span className="font-bold text-neutral-200">{cat.mbFreed.toFixed(1)} MB</span>
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
