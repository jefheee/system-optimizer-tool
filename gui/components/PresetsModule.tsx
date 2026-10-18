'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useHardware } from '@/lib/HardwareContext';
import { runPreset } from '@/lib/api';
import { Zap, Gamepad2, BatteryCharging, ShieldAlert, CheckCircle2, Loader2, Sparkles, ArrowRight } from 'lucide-react';

export default function PresetsModule() {
  const { t } = useLanguage();
  const { diagnostics, refreshAudit } = useHardware();
  const [runningPreset, setRunningPreset] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ id: string; success: boolean; text: string } | null>(null);

  const isLaptop = diagnostics?.deviceType === 'Laptop';

  const handleRunPreset = async (presetId: string) => {
    setRunningPreset(presetId);
    setStatusMsg(null);
    try {
      const res = await runPreset(presetId);
      setStatusMsg({
        id: presetId,
        success: res.success,
        text: res.message,
      });
      await refreshAudit();
    } catch (e: any) {
      setStatusMsg({
        id: presetId,
        success: false,
        text: e?.message || 'Error',
      });
    } finally {
      setRunningPreset(null);
    }
  };

  const presets = [
    {
      id: 'essential',
      title: t('preset_essential_title'),
      desc: t('preset_essential_desc'),
      icon: Zap,
      recommended: !isLaptop,
      tags: [t('preset_tag_cleanup'), t('preset_tag_security')],
      tweaks: [
        t('clean_lite_title'),
        t('sys_dns_bench_title'),
        t('sys_tel_title'),
        t('gamer_flush_ram_title'),
      ],
    },
    {
      id: 'gamer',
      title: t('preset_gamer_title'),
      desc: t('preset_gamer_desc'),
      icon: Gamepad2,
      recommended: !isLaptop,
      tags: [t('preset_tag_fps'), t('preset_tag_latency')],
      tweaks: [
        t('gamer_timer_title'),
        t('gamer_power_title'),
        t('gamer_net_title'),
        t('gamer_input_title'),
        t('gamer_flush_ram_title'),
      ],
    },
    {
      id: 'notebook',
      title: t('preset_notebook_title'),
      desc: t('preset_notebook_desc'),
      icon: BatteryCharging,
      recommended: isLaptop,
      tags: [t('preset_tag_battery'), t('preset_tag_cleanup')],
      tweaks: [
        t('clean_lite_title'),
        t('sys_tel_title'),
        t('gamer_flush_ram_title'),
      ],
    },
    {
      id: 'privacy',
      title: t('preset_privacy_title'),
      desc: t('preset_privacy_desc'),
      icon: ShieldAlert,
      recommended: false,
      tags: [t('preset_tag_security'), t('preset_tag_cleanup')],
      tweaks: [
        t('sys_tel_title'),
        t('sys_bloat_title'),
        t('sys_orphans_title'),
        t('sys_onedrive_title'),
      ],
    },
  ];

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-neutral-300" />
          <h2 className="text-xl font-bold text-neutral-100">{t('presets_title')}</h2>
        </div>
        <p className="text-xs text-neutral-400">{t('presets_subtitle')}</p>
      </div>

      {/* Bento Grid: 4 Dynamic Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isRunning = runningPreset === preset.id;
          const result = statusMsg?.id === preset.id ? statusMsg : null;

          return (
            <div
              key={preset.id}
              className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Header card */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-neutral-100 truncate">{preset.title}</h3>
                      {preset.recommended && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          ★ {t('home_recommended_for_you')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {preset.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800/80 text-neutral-300 border border-neutral-700/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">{preset.desc}</p>

                {/* Tweaks list */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {t('preset_what_applied')}
                  </div>
                  <ul className="space-y-1">
                    {preset.tweaks.map((tw, idx) => (
                      <li key={idx} className="text-xs text-neutral-300 flex items-center gap-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
                        <span className="truncate">{tw}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button & Status */}
              <div className="pt-4 mt-2">
                {result && (
                  <div
                    className={`mb-2.5 p-2 rounded-lg text-xs flex items-center gap-2 border ${
                      result.success
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[11px]">{result.text}</span>
                  </div>
                )}

                <button
                  onClick={() => handleRunPreset(preset.id)}
                  disabled={runningPreset !== null}
                  className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('preset_running')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('preset_run_btn')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
