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

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    listenToOptimizationSteps((step: StepEvent) => {
      const now = new Date().toLocaleTimeString();
      const item: StepItem = { ...step, timestamp: now };

      setIsOpen(true);
      setCurrentStep(item);
      setSteps((prev) => {
        // Atualiza ou insere o passo
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

  if (!isOpen) return null;

  const progressPercent = currentStep && currentStep.total > 0
    ? Math.min(100, Math.round((currentStep.current / currentStep.total) * 100))
    : 100;

  return (
    <aside
      aria-label={t('drawer_title')}
      className={`fixed bottom-3 right-3 z-50 w-[420px] max-w-[calc(100vw-24px)] bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-2xl transition-all duration-300 overflow-hidden ${
        isMinimized ? 'h-14' : 'max-h-[500px]'
      }`}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-950/80 border-b border-neutral-800/80 select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
            {currentStep?.status === 'running' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : currentStep?.status === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Terminal className="w-3.5 h-3.5" />
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
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            title={isMinimized ? 'Expandir' : t('drawer_minimize')}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
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
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Body: Step List & Log Console */}
      {!isMinimized && (
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
      )}
    </aside>
  );
}
