'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { StepEvent, listenToOptimizationSteps } from '@/lib/api';
import { Terminal, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';

interface StepItem extends StepEvent {
  timestamp: string;
}

export default function LiveProgressDrawer() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [currentStep, setCurrentStep] = useState<StepItem | null>(null);

  const isRunning = currentStep?.status === 'running';

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    listenToOptimizationSteps((step: StepEvent) => {
      const now = new Date().toLocaleTimeString();
      const item: StepItem = { ...step, timestamp: now };

      setIsOpen(true);
      if (step.status === 'running') {
        setIsMinimized(false);
      }
      setCurrentStep(item);
      setSteps((prev) => {
        const existingIdx = prev.findIndex((s) => s.stepId === step.stepId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = item;
          return updated;
        }
        return [...prev, item];
      });
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Auto-minimize 4 seconds after completion
  useEffect(() => {
    if (isOpen && currentStep && !isRunning) {
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep, isRunning]);

  if (!isOpen) return null;

  const progressPercent = currentStep && currentStep.total > 0
    ? Math.min(100, Math.round((currentStep.current / currentStep.total) * 100))
    : 100;

  // Compact Floating Pill when Minimized
  if (isMinimized) {
    return (
      <aside
        aria-label={t('drawer_title')}
        onClick={() => setIsMinimized(false)}
        title={t('drawer_expand')}
        className={`fixed bottom-4 right-4 z-50 w-auto max-w-[260px] px-4 py-2.5 rounded-full cursor-pointer select-none shadow-2xl border transition-all duration-300 flex items-center gap-2.5 ${
          isRunning
            ? 'bg-gradient-to-r from-blue-950/95 via-cyan-950/95 to-emerald-950/95 border-cyan-500/40 animate-pulse'
            : 'bg-neutral-900/95 hover:bg-neutral-800/95 border-neutral-700/80'
        }`}
      >
        <span className="shrink-0">
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : currentStep?.status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
        </span>
        <span className="text-xs font-semibold text-neutral-100 truncate">
          {isRunning
            ? `${currentStep?.stepName || t('drawer_status_running')} (${progressPercent}%)`
            : `${t('drawer_finished_pill')} (${steps.length})`}
        </span>
        <ChevronUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          title={t('drawer_close')}
          className="ml-0.5 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label={t('drawer_title')}
      className="fixed bottom-3 right-3 z-50 w-[420px] max-w-[calc(100vw-24px)] bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-2xl transition-all duration-300 overflow-hidden max-h-[500px]"
    >
      {/* Drawer Header - Clicking anywhere toggles minimize */}
      <div
        onClick={() => setIsMinimized((prev) => !prev)}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-800/80 select-none cursor-pointer transition-colors ${
          isRunning
            ? 'bg-gradient-to-r from-neutral-950 via-blue-950/40 to-neutral-950'
            : 'bg-neutral-950/80 hover:bg-neutral-900/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : currentStep?.status === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-neutral-200">
              {t('drawer_title')}
            </h4>
            {currentStep && currentStep.total > 0 && (
              <p className="text-[10px] text-neutral-400">
                {t('drawer_step')} {currentStep.current} {t('drawer_of')} {currentStep.total} ({progressPercent}%)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized((prev) => !prev);
            }}
            className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            title={t('drawer_minimize')}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            title={t('drawer_close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-neutral-800">
        <div
          className={`h-full transition-all duration-300 ${
            isRunning
              ? 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Body: Step List & Log Console */}
      <div className="p-3 space-y-2.5 max-h-[420px] overflow-y-auto font-mono text-[11px]">
        {/* Active Step Highlight */}
        {currentStep && (
          <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800 flex items-start gap-2">
            <span className="mt-0.5">
              {currentStep.status === 'running' ? (
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              ) : currentStep.status === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </span>
            <div className="flex-1">
              <div className="font-semibold text-neutral-200">
                {currentStep.stepName}
              </div>
              {currentStep.details && (
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {currentStep.details}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Steps Timeline Log */}
        <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
          {steps.map((st, i) => (
            <div
              key={`${st.stepId}-${i}`}
              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-neutral-800/40 text-neutral-300"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span>
                  {st.status === 'running' ? (
                    <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
                  ) : st.status === 'error' ? (
                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                </span>
                <span className="truncate">{st.stepName}</span>
              </div>
              <span className="text-[9px] text-neutral-400 shrink-0">{st.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
