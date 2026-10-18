'use client';

import React, { useEffect, useState } from 'react';
import {
  createRestorePoint,
  benchmarkDns,
  optimizeDns,
  resetNetworkStack,
  toggleClassicContextMenu,
  disableTelemetry,
  removeBloatware,
  repairWindowsUpdate,
  runSfcScan,
  cleanOrphanTasks,
  restoreWindowsStore,
  removeOneDrive,
  resetFontCache,
  fixBluetoothCache,
  toggleTakeOwnershipMenu,
  backupDrivers,
  togglePostFormatTweak,
  getStartupApps,
  removeStartupApp,
  generateBatteryOrEnergyReport,
  DnsBenchmarkResult,
  StartupAppItem,
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useHardware } from '../lib/HardwareContext';
import TechDetailsModal, { TechDetailsData } from './TechDetailsModal';
import {
  Settings,
  RefreshCw,
  Wifi,
  ShieldAlert,
  Trash2,
  FileText,
  Loader2,
  CheckCircle2,
  Store,
  FolderMinus,
  Type,
  Bluetooth,
  KeyRound,
  Archive,
  Info,
  RotateCcw,
  Menu,
  Gauge,
  CheckSquare,
  Layers,
  BatteryCharging,
  Zap,
} from 'lucide-react';

export default function SystemModule() {
  const { t } = useLanguage();
  const { diagnostics, audit, refreshAudit } = useHardware();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [takeOwnershipActive, setTakeOwnershipActive] = useState<boolean>(false);
  const [restoreDesc, setRestoreDesc] = useState<string>('System Optimizer V5.0 Restore Point');
  const [dnsBenchmark, setDnsBenchmark] = useState<DnsBenchmarkResult | null>(null);
  const [startupApps, setStartupApps] = useState<StartupAppItem[]>([]);
  const [loadingStartup, setLoadingStartup] = useState<boolean>(false);
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  const isLaptop = diagnostics?.deviceType === 'Laptop';

  const loadStartupList = async () => {
    setLoadingStartup(true);
    try {
      const res = await getStartupApps();
      if (res.success && res.data) {
        setStartupApps(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStartup(false);
    }
  };

  useEffect(() => {
    loadStartupList();
  }, []);

  const handleAction = async (id: string, fn: () => Promise<any>) => {
    setActiveActions((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fn();
      setResults((prev) => ({
        ...prev,
        [id]: { success: res.success, message: res.message },
      }));
      await refreshAudit();
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [id]: { success: false, message: err?.message || 'Communication error' },
      }));
    } finally {
      setActiveActions((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleChecklistSwitch = async (tweakId: string, currentValue: boolean) => {
    const nextValue = !currentValue;
    await handleAction(`chk_${tweakId}`, async () => {
      if (tweakId === 'classic_context_menu') {
        return await toggleClassicContextMenu(nextValue);
      }
      if (tweakId === 'telemetry_disabled' && nextValue) {
        return await disableTelemetry();
      }
      return await togglePostFormatTweak(tweakId, nextValue);
    });
  };

  const handleRemoveStartup = async (item: StartupAppItem) => {
    const key = `rm_${item.name}`;
    setActiveActions((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await removeStartupApp(item.name, item.location);
      setResults((prev) => ({
        ...prev,
        [key]: { success: res.success, message: res.message },
      }));
      await loadStartupList();
      await refreshAudit();
    } finally {
      setActiveActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleBenchmarkDns = async () => {
    setActiveActions((prev) => ({ ...prev, dns_bench: true }));
    try {
      const res = await benchmarkDns();
      if (res.success && res.data) {
        setDnsBenchmark(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setActiveActions((prev) => ({ ...prev, dns_bench: false }));
    }
  };

  const handleTakeOwnership = async () => {
    const nextState = !takeOwnershipActive;
    await handleAction('ownership', async () => {
      const res = await toggleTakeOwnershipMenu(nextState);
      if (res.success) {
        setTakeOwnershipActive(nextState);
      }
      return res;
    });
  };

  const checklistItems = [
    {
      id: 'show_file_extensions',
      title: t('sys_chk_ext_title'),
      desc: t('sys_chk_ext_desc'),
      active: !!audit?.showFileExtensions,
    },
    {
      id: 'show_hidden_files',
      title: t('sys_chk_hidden_title'),
      desc: t('sys_chk_hidden_desc'),
      active: !!audit?.showHiddenFiles,
    },
    {
      id: 'bing_search_disabled',
      title: t('sys_chk_bing_title'),
      desc: t('sys_chk_bing_desc'),
      active: !!audit?.bingSearchDisabled,
    },
    {
      id: 'classic_context_menu',
      title: t('sys_chk_classic_title'),
      desc: t('sys_chk_classic_desc'),
      active: !!audit?.classicContextMenu,
    },
    {
      id: 'telemetry_disabled',
      title: t('sys_chk_tel_title'),
      desc: t('sys_chk_tel_desc'),
      active: !!audit?.telemetryDisabled,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">{t('sys_title')}</h2>
        </div>
        <p className="text-xs text-neutral-400">{t('sys_subtitle')}</p>
      </div>

      {/* Results Toast */}
      {Object.entries(results).slice(-2).map(([id, res]) => (
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

      {/* V5.0 Section 1: Post-Format & Usability Checklist (Real-Time Switches) */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('sys_checklist_title')}</h3>
            <p className="text-xs text-neutral-400">{t('sys_checklist_sub')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {checklistItems.map((item) => {
            const busy = !!activeActions[`chk_${item.id}`];
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-neutral-100">{item.title}</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>

                <button
                  onClick={() => handleChecklistSwitch(item.id, item.active)}
                  disabled={busy}
                  aria-pressed={item.active}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 shrink-0 flex items-center ${
                    item.active ? 'bg-emerald-600 justify-end' : 'bg-neutral-700 justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
                    {busy && <Loader2 className="w-3 h-3 text-neutral-900 animate-spin" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* V5.0 Section 2: Startup Apps Manager */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">
                {t('sys_startup_title')} ({startupApps.length})
              </h3>
              <p className="text-xs text-neutral-400">{t('sys_startup_sub')}</p>
            </div>
          </div>

          <button
            onClick={loadStartupList}
            disabled={loadingStartup}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingStartup ? 'animate-spin' : ''}`} />
            <span>{t('sys_startup_refresh')}</span>
          </button>
        </div>

        {startupApps.length === 0 ? (
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 text-center">
            {t('sys_startup_empty')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">{t('sys_startup_col_name')}</th>
                  <th className="py-2.5 px-3">{t('sys_startup_col_loc')}</th>
                  <th className="py-2.5 px-3">{t('sys_startup_col_cmd')}</th>
                  <th className="py-2.5 px-3 text-right">{t('sys_startup_col_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70 bg-neutral-950/40">
                {startupApps.map((app, i) => {
                  const busy = !!activeActions[`rm_${app.name}`];
                  return (
                    <tr key={`${app.location}-${app.name}-${i}`} className="hover:bg-neutral-900/50">
                      <td className="py-2.5 px-3 font-bold text-neutral-200">{app.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                          {app.location}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-neutral-400 max-w-xs truncate" title={app.command}>
                        {app.command}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveStartup(app)}
                          disabled={busy}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          <span>{t('sys_startup_remove')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* V5.0 Section 3: Official HTML Power & Battery Report */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            {isLaptop ? <BatteryCharging className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">{t('sys_energy_title')}</h3>
            <p className="text-xs text-neutral-300 mt-0.5">
              {isLaptop ? t('sys_energy_desc_laptop') : t('sys_energy_desc_desktop')}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleAction('energy_report', () => generateBatteryOrEnergyReport(isLaptop))}
          disabled={activeActions['energy_report']}
          className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-2 shrink-0 transition-all"
        >
          {activeActions['energy_report'] ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isLaptop ? (
            <BatteryCharging className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{isLaptop ? t('sys_energy_btn_laptop') : t('sys_energy_btn_desktop')}</span>
        </button>
      </div>

      {/* Grid of System, Network & Privacy Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Restore Point */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_restore_title')}</h3>
                <span className="text-[10px] text-blue-400 font-medium">Checkpoint-Computer</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_restore_desc')}</p>

            <input
              type="text"
              value={restoreDesc}
              onChange={(e) => setRestoreDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
            />

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_restore_title'),
                  securityRating: 'safe',
                  action: 'Enable-ComputerRestore C: & Checkpoint-Computer -RestorePointType MODIFY_SETTINGS.',
                  targetArea: 'VSS (Volume Shadow Copy Service) & Windows Registry',
                  expectedBenefit: t('sys_restore_desc'),
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
              onClick={() => handleAction('restore', () => createRestorePoint(restoreDesc))}
              disabled={activeActions['restore']}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {activeActions['restore'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{t('sys_restore_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 2: DNS Benchmark & Optimization */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_dns_bench_title')}</h3>
                <span className="text-[10px] text-cyan-400 font-medium">Cloudflare, Google, Quad9, OpenDNS</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_dns_bench_desc')}</p>

            {dnsBenchmark && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {dnsBenchmark.providers.map((p, i) => (
                  <div key={i} className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-300">{p.name}</span>
                    <span className="font-bold text-cyan-400">{p.pingMs} ms</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_dns_bench_title'),
                  securityRating: 'safe',
                  action: 'TCP socket latency benchmark on port 53 (1.1.1.1, 8.8.8.8, 9.9.9.9, 208.67.222.222) + Set-DnsClientServerAddress.',
                  targetArea: 'Active Network Interface TCP/IP DNS Resolver',
                  expectedBenefit: t('sys_dns_bench_desc'),
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
              onClick={handleBenchmarkDns}
              disabled={activeActions['dns_bench']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              {activeActions['dns_bench'] ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Gauge className="w-4 h-4 text-cyan-400" />}
              <span>{t('sys_dns_bench_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('dns_opt', optimizeDns)}
              disabled={activeActions['dns_opt']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 active:scale-[0.98]"
            >
              {activeActions['dns_opt'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              <span>{t('sys_dns_opt_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Network Stack Reset */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_net_reset_title')}</h3>
                <span className="text-[10px] text-blue-400 font-medium">netsh winsock & int ip reset</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_net_reset_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_net_reset_title'),
                  securityRating: 'safe',
                  action: 'netsh winsock reset, netsh int ip reset, ipconfig /release, ipconfig /renew, ipconfig /flushdns.',
                  targetArea: 'Winsock Catalog & Network Interface Drivers',
                  expectedBenefit: t('sys_net_reset_desc'),
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
              onClick={() => handleAction('net_reset', resetNetworkStack)}
              disabled={activeActions['net_reset']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['net_reset'] ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Wifi className="w-4 h-4 text-blue-400" />}
              <span>{t('sys_net_reset_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 4: Classic Context Menu (Win11) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Menu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_classic_menu_title')}</h3>
                <span className="text-[10px] text-cyan-400 font-medium">{"CLSID {86ca1aa0...}"}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_classic_menu_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_classic_menu_title'),
                  securityRating: 'safe',
                  action: 'HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32',
                  targetArea: 'HKCU\\Software\\Classes\\CLSID & Windows Explorer Shell',
                  expectedBenefit: t('sys_classic_menu_desc'),
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
              onClick={() => handleAction('classic_menu', () => toggleClassicContextMenu(true))}
              disabled={activeActions['classic_menu']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 active:scale-[0.98]"
            >
              {activeActions['classic_menu'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Menu className="w-4 h-4" />}
              <span>{t('sys_classic_menu_btn_on')}</span>
            </button>

            <button
              onClick={() => handleAction('classic_menu', () => toggleClassicContextMenu(false))}
              disabled={activeActions['classic_menu']}
              className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-all active:scale-[0.98]"
            >
              {t('sys_classic_menu_btn_off')}
            </button>
          </div>
        </div>

        {/* Card 5: Disable Telemetry */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_tel_title')}</h3>
                <span className="text-[10px] text-purple-400 font-medium">DiagTrack & Policies</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_tel_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('telemetry', disableTelemetry)}
              disabled={activeActions['telemetry']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['telemetry'] ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <ShieldAlert className="w-4 h-4 text-purple-400" />}
              <span>{t('sys_tel_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 6: Remove Bloatware */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-red-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_bloat_title')}</h3>
                <span className="text-[10px] text-red-400 font-medium">AppX Package Manager</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_bloat_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('bloatware', removeBloatware)}
              disabled={activeActions['bloatware']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['bloatware'] ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
              <span>{t('sys_bloat_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 7: Clean Orphan Tasks */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_orphans_title')}</h3>
                <span className="text-[10px] text-amber-400 font-medium">Task Scheduler Cleaner</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_orphans_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('orphans', cleanOrphanTasks)}
              disabled={activeActions['orphans']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['orphans'] ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Trash2 className="w-4 h-4 text-amber-400" />}
              <span>{t('sys_orphans_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 8: Repair Windows Update */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_wu_title')}</h3>
                <span className="text-[10px] text-blue-400 font-medium">SoftwareDistribution & Catroot2</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_wu_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('wu', repairWindowsUpdate)}
              disabled={activeActions['wu']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['wu'] ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <RefreshCw className="w-4 h-4 text-blue-400" />}
              <span>{t('sys_wu_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 9: SFC & DISM */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_sfc_title')}</h3>
                <span className="text-[10px] text-emerald-400 font-medium">sfc /scannow & dism /restorehealth</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_sfc_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('sfc', runSfcScan)}
              disabled={activeActions['sfc']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['sfc'] ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <FileText className="w-4 h-4 text-emerald-400" />}
              <span>{t('sys_sfc_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 10: Store, OneDrive & Drivers */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('sys_store_title')} / {t('sys_drivers_title')}</h3>
                <span className="text-[10px] text-purple-400 font-medium">Store, OneDrive & Drivers</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_drivers_desc')}</p>
          </div>

          <div className="pt-4 mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => handleAction('store', restoreWindowsStore)}
              disabled={activeActions['store']}
              className="flex-1 min-w-[120px] py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('sys_store_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('onedrive', removeOneDrive)}
              disabled={activeActions['onedrive']}
              className="flex-1 min-w-[120px] py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <FolderMinus className="w-3.5 h-3.5 text-red-400" />
              <span>{t('sys_onedrive_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('drivers', backupDrivers)}
              disabled={activeActions['drivers']}
              className="w-full py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Archive className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('sys_drivers_btn')}</span>
            </button>
          </div>
        </div>

        {/* Card 11: Fonts, Bluetooth & Take Ownership */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between md:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">
                  {t('sys_font_title')} • {t('sys_bt_title')} • {t('sys_ownership_title')}
                </h3>
                <span className="text-[10px] text-cyan-400 font-medium">FontCache, Bluetooth & NTFS</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('sys_ownership_desc')}</p>
          </div>

          <div className="pt-4 mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => handleAction('font', resetFontCache)}
              disabled={activeActions['font']}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('sys_font_btn')}</span>
            </button>

            <button
              onClick={() => handleAction('bt', fixBluetoothCache)}
              disabled={activeActions['bt']}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('sys_bt_btn')}</span>
            </button>

            <button
              onClick={handleTakeOwnership}
              disabled={activeActions['ownership']}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>{takeOwnershipActive ? t('sys_ownership_btn_off') : t('sys_ownership_btn_on')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tech Details Modal */}
      <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
    </div>
  );
}
