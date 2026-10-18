'use client';

import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import { ShieldCheck, ShieldAlert, X } from 'lucide-react';

export interface TechDetailsData {
  title: string;
  securityRating: 'safe' | 'advanced';
  action: string;
  targetArea: string;
  expectedBenefit: string;
}

interface TechDetailsModalProps {
  data: TechDetailsData | null;
  onClose: () => void;
}

export default function TechDetailsModal({ data, onClose }: TechDetailsModalProps) {
  const { t } = useLanguage();
  const { theme } = useSettings();

  if (!data) return null;

  const isSafe = data.securityRating === 'safe';
  const monoLogo = theme === 'light'
    ? '/assets/branding/logo-monochrome-black.jpg'
    : '/assets/branding/logo-monochrome-white.jpg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with official monochrome badge */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-950/80 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-700/80 bg-neutral-900 flex items-center justify-center">
              <img
                src={monoLogo}
                alt="Badge"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">{data.title}</h3>
              <p className="text-[10px] text-neutral-400">{t('tech_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Security Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="font-semibold text-neutral-300">{t('tech_security')}:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isSafe
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {isSafe ? t('tech_safe') : t('tech_advanced')}
            </span>
          </div>

          {/* Section 1: What it does */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              {t('tech_what')}
            </h4>
            <p className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-neutral-200 leading-relaxed font-mono text-[11px]">
              {data.action}
            </p>
          </div>

          {/* Section 2: Where it acts */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              {t('tech_where')}
            </h4>
            <p className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 leading-relaxed font-mono text-[11px] text-blue-300">
              {data.targetArea}
            </p>
          </div>

          {/* Section 3: Expected benefit */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              {t('tech_benefit')}
            </h4>
            <p className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 leading-relaxed font-mono text-[11px]">
              {data.expectedBenefit}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-950/80 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
          >
            {t('tech_understood')}
          </button>
        </div>
      </div>
    </div>
  );
}
