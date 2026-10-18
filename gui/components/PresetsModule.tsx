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
      gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
      borderColor: 'border-blue-500/30 hover:border-blue-500/60',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
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
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
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
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'border-amber-500/30 hover:border-amber-500/60',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
      gradient: 'from-purple-500/20 via-violet-500/10 to-transparent',
      borderColor: 'border-purple-500/30 hover:border-purple-500/60',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">{t('presets_title')}</h2>
        </div>
        <p className="text-sm text-neutral-400">{t('presets_subtitle')}</p>
      </div>

      {/* Grid of 4 Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isRunning = runningPreset === preset.id;
          const result = statusMsg?.id === preset.id ? statusMsg : null;

          return (
            <div
              key={preset.id}
              className={`p-5 rounded-2xl bg-neutral-900/60 border ${preset.borderColor} transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
            >
              {/* Background Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${preset.gradient} opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`}
              />

              <div className="relative z-10 space-y-3">
                {/* Header card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center text-white shadow-inner">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-neutral-100">{preset.title}</h3>
                        {preset.recommended && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            ★ {t('home_recommended_for_you')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {preset.tags.map((tag, i) => (
                          <span
                            key={i}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${preset.badgeColor}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-300 leading-relaxed">{preset.desc}</p>

                {/* Tweaks list */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
                  <div className="text-[11px] font-semibold text-neutral-400">
                    {t('preset_what_applied')}
                  </div>
                  <ul className="space-y-1">
                    {preset.tweaks.map((tw, idx) => (
                      <li key={idx} className="text-xs text-neutral-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span>{tw}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button & Status */}
              <div className="relative z-10 pt-4 mt-2">
                {result && (
                  <div
                    className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                      result.success
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{result.text}</span>
                  </div>
                )}

                <button
                  onClick={() => handleRunPreset(preset.id)}
                  disabled={runningPreset !== null}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('preset_running')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('preset_run_btn')}</span>
                      <ArrowRight className="w-4 h-4" />
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
