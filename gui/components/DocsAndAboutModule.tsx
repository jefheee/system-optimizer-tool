'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';
import { openExternalUrl } from '../lib/api';
import {
  BookOpen,
  Search,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Code2,
  Layers,
  Info,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Cpu,
  ArrowRight,
  HardDrive,
  Activity,
  Wrench,
  Wand2,
} from 'lucide-react';

interface WikiItemDef {
  id: string;
  category: 'clean' | 'gamer' | 'system' | 'tools';
  securityRating: 'safe' | 'advanced';
}

const WIKI_ITEMS_DEF: WikiItemDef[] = [
  // CLEAN (6)
  { id: 'deep_clean', category: 'clean', securityRating: 'safe' },
  { id: 'lite_clean', category: 'clean', securityRating: 'safe' },
  { id: 'hibernation', category: 'clean', securityRating: 'safe' },
  { id: 'windows_old', category: 'clean', securityRating: 'safe' },
  { id: 'trim_ssd', category: 'clean', securityRating: 'safe' },
  { id: 'junk_scanner', category: 'clean', securityRating: 'safe' },

  // GAMER (12)
  { id: 'timer_res', category: 'gamer', securityRating: 'safe' },
  { id: 'ultimate_plan', category: 'gamer', securityRating: 'safe' },
  { id: 'ram_flush', category: 'gamer', securityRating: 'safe' },
  { id: 'ram_autoclean', category: 'gamer', securityRating: 'safe' },
  { id: 'process_freezer', category: 'gamer', securityRating: 'safe' },
  { id: 'vbs_toggle', category: 'gamer', securityRating: 'advanced' },
  { id: 'mouse_opt', category: 'gamer', securityRating: 'safe' },
  { id: 'kbd_opt', category: 'gamer', securityRating: 'safe' },
  { id: 'tcp_nodelay', category: 'gamer', securityRating: 'advanced' },
  { id: 'fso_gamedvr', category: 'gamer', securityRating: 'safe' },
  { id: 'shader_cache', category: 'gamer', securityRating: 'safe' },
  { id: 'game_prio_defender', category: 'gamer', securityRating: 'advanced' },
  { id: 'afterburner_1percent_low', category: 'gamer', securityRating: 'safe' },
  { id: 'gpu_p0_state', category: 'gamer', securityRating: 'advanced' },
  { id: 'ofwg_hags', category: 'gamer', securityRating: 'safe' },
  { id: 'mpo_ulps_guard', category: 'gamer', securityRating: 'advanced' },
  { id: 'cpu_affinity_smt_core0', category: 'gamer', securityRating: 'safe' },
  { id: 'mmcss_win32prio', category: 'gamer', securityRating: 'safe' },
  { id: 'mouse_dpi_linear', category: 'gamer', securityRating: 'safe' },
  { id: 'hidusbf_overclock', category: 'gamer', securityRating: 'safe' },
  { id: 'anticheat_matrix', category: 'gamer', securityRating: 'safe' },

  // SYSTEM (20)
  { id: 'post_format_ext', category: 'system', securityRating: 'safe' },
  { id: 'post_format_hidden', category: 'system', securityRating: 'safe' },
  { id: 'post_format_bing', category: 'system', securityRating: 'safe' },
  { id: 'startup_manager', category: 'system', securityRating: 'safe' },
  { id: 'energy_battery_report', category: 'system', securityRating: 'safe' },
  { id: 'restore_point', category: 'system', securityRating: 'safe' },
  { id: 'dns_bench', category: 'system', securityRating: 'safe' },
  { id: 'net_reset', category: 'system', securityRating: 'safe' },
  { id: 'classic_menu', category: 'system', securityRating: 'safe' },
  { id: 'telemetry', category: 'system', securityRating: 'safe' },
  { id: 'bloatware', category: 'system', securityRating: 'safe' },
  { id: 'orphan_tasks', category: 'system', securityRating: 'safe' },
  { id: 'win_update', category: 'system', securityRating: 'safe' },
  { id: 'sfc_dism', category: 'system', securityRating: 'safe' },
  { id: 'store_onedrive_drivers', category: 'system', securityRating: 'safe' },
  { id: 'font_bt_ownership', category: 'system', securityRating: 'safe' },
  { id: 'autounattend_usb', category: 'system', securityRating: 'safe' },
  { id: 'bitlocker_off', category: 'system', securityRating: 'safe' },
  { id: 'loudness_eq_inject', category: 'system', securityRating: 'safe' },
  { id: 'ipv4_only_mode', category: 'system', securityRating: 'safe' },
  { id: 'usb_nic_power_off', category: 'system', securityRating: 'safe' },

  // TOOLS (6)
  { id: 'winutil', category: 'tools', securityRating: 'safe' },
  { id: 'mas_activator', category: 'tools', securityRating: 'safe' },
  { id: 'ooshutup', category: 'tools', securityRating: 'safe' },
  { id: 'winget_all', category: 'tools', securityRating: 'safe' },
  { id: 'adwcleaner', category: 'tools', securityRating: 'safe' },
  { id: 'hw_monitors', category: 'tools', securityRating: 'safe' },
];

export default function DocsAndAboutModule({
  initialSubTab = 'wiki',
}: {
  initialSubTab?: 'wiki' | 'bios' | 'about';
}) {
  const { t, language } = useLanguage();
  const { theme } = useSettings();
  const [subTab, setSubTab] = useState<'wiki' | 'bios' | 'about'>(initialSubTab);

  React.useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string>('deep_clean');

  // Filtered list of items
  const filteredItems = useMemo(() => {
    return WIKI_ITEMS_DEF.filter((item) => {
      const matchCat = filterCategory === 'all' || item.category === filterCategory;
      const name = t(`wiki_${item.id}_name`);
      const where = t(`wiki_${item.id}_where`);
      const benefit = t(`wiki_${item.id}_benefit`);
      const action = t(`wiki_${item.id}_action`);

      const q = search.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        name.toLowerCase().includes(q) ||
        where.toLowerCase().includes(q) ||
        benefit.toLowerCase().includes(q) ||
        action.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [search, filterCategory, t]);

  // Keep selected item valid
  const activeItem = useMemo(() => {
    const found = filteredItems.find((i) => i.id === selectedId);
    return found || filteredItems[0] || WIKI_ITEMS_DEF[0];
  }, [filteredItems, selectedId]);

  const activeName = t(`wiki_${activeItem.id}_name`);
  const activeAction = t(`wiki_${activeItem.id}_action`);
  const activeWhere = t(`wiki_${activeItem.id}_where`);
  const activeBenefit = t(`wiki_${activeItem.id}_benefit`);
  const activeRevert = t(`wiki_${activeItem.id}_revert`);
  const activeCategoryLabel = t(`docs_filter_${activeItem.category}`);
  const isSafe = activeItem.securityRating === 'safe';

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-3 max-w-7xl w-full mx-auto overflow-hidden">
      {/* Top Header (Controlled by LeftSidebar — redundant top-right subtab pills removed) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-200 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100 leading-tight">
              {subTab === 'wiki'
                ? t('wiki_title')
                : subTab === 'bios'
                  ? language === 'PT'
                    ? 'Guia Técnico de BIOS & Recuperação de Hardware'
                    : 'Technical BIOS Guide & Hardware Troubleshooting'
                  : t('about_title')}
            </h2>
            <p className="text-xs text-neutral-400">
              {subTab === 'wiki'
                ? t('wiki_subtitle')
                : subTab === 'bios'
                  ? language === 'PT'
                    ? 'Checklists específicos para AMD Ryzen/X3D vs Intel, DDR5 >55°C, montagem de cooler, DisplayPort UEFI e recuperação WHEA/TDR.'
                    : 'Platform checklists for AMD Ryzen/X3D vs Intel, DDR5 >55°C thermal errors, cooler mounting pressure, DisplayPort UEFI and WHEA/TDR recovery.'
                  : t('about_desc')}
            </p>
          </div>
        </div>
      </div>

      {subTab === 'wiki' ? (
        /* Master-Detail Zero-Scroll Engineering Workbench */
        <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
          {/* Search Bar & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('wiki_search')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0">
              {[
                { id: 'all', label: t('docs_filter_all') },
                { id: 'clean', label: t('docs_filter_clean') },
                { id: 'gamer', label: t('docs_filter_gamer') },
                { id: 'system', label: t('docs_filter_system') },
                { id: 'tools', label: t('docs_filter_tools') },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    filterCategory === cat.id
                      ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                      : 'bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Master-Detail Split: Left List + Right Inspector Card */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
            {/* Left Column (Master List): 5 cols */}
            <div className="lg:col-span-5 flex flex-col min-h-0 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 overflow-hidden">
              <div className="px-3.5 py-2 border-b border-neutral-800/80 bg-neutral-950/40 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
                <span>
                  {t('docs_showing')} <strong className="text-neutral-200 font-mono tabular-nums">{filteredItems.length}</strong> {t('wiki_count')}
                </span>
                <span className="text-[10px] text-neutral-500">Selecione para inspecionar</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-500">
                    Nenhuma otimização encontrada com esse termo.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = activeItem.id === item.id;
                    const itemIsSafe = item.securityRating === 'safe';
                    const name = t(`wiki_${item.id}_name`);
                    const where = t(`wiki_${item.id}_where`);
                    const catLabel = t(`docs_filter_${item.category}`);

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border text-left group ${
                          isSelected
                            ? 'bg-neutral-800/90 border-neutral-600 shadow-sm'
                            : 'bg-neutral-950/60 hover:bg-neutral-800/50 border-neutral-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                            {catLabel}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              itemIsSafe
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {itemIsSafe ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                            {itemIsSafe ? t('docs_risk_safe') : t('docs_risk_advanced')}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-neutral-100 group-hover:text-white transition-colors truncate">
                          {name}
                        </h4>

                        <p className="text-[10px] text-neutral-400 font-mono tabular-nums truncate mt-0.5">
                          {where}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column (Inspector Dossier): 7 cols */}
            <div className="lg:col-span-7 flex flex-col min-h-0 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 overflow-hidden">
              <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/40 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {activeCategoryLabel}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isSafe
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {isSafe ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      <span>{isSafe ? t('docs_risk_safe') : t('docs_risk_advanced')}</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-100 leading-snug">{activeName}</h3>
                </div>

                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300 shrink-0">
                  <Code2 className="w-4 h-4" />
                </div>
              </div>

              {/* Bento 4-Field Dossier */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
                {/* Field 1: O Que Faz Exatamente */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-neutral-300" />
                    <span>{t('docs_field_action')}</span>
                  </span>
                  <p className="text-xs text-neutral-200 leading-relaxed">{activeAction}</p>
                </div>

                {/* Field 2: Onde Atua no Windows */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-neutral-300" />
                    <span>{t('docs_field_where')}</span>
                  </span>
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[11px] tabular-nums text-neutral-300 break-all select-all">
                    {activeWhere}
                  </div>
                </div>

                {/* Field 3: Benefício Prático Esperado */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('docs_field_benefit')}</span>
                  </span>
                  <p className="text-xs text-emerald-300/90 leading-relaxed font-medium">{activeBenefit}</p>
                </div>

                {/* Field 4: Como Reverter */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
                    <span>{t('docs_field_revert')}</span>
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">{activeRevert}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'bios' ? (
        /* SubTab 2: Hardware BIOS Setup & Troubleshooting Knowledge Base */
        <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto no-scrollbar pr-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* AMD Ryzen / X3D Checklist */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">
                  AMD Ryzen / X3D AM4 & AM5
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300">
                  BIOS Checklist
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300">
                <li>• <strong>EXPO / D.O.C.P / XMP:</strong> {language === 'PT' ? 'Obrigatório para tirar a RAM de 2133/4800 MT/s padrão (JEDEC).' : 'Mandatory to run RAM at advertised frequency instead of JEDEC fallback.'}</li>
                <li>• <strong>Above 4G Decoding + Resizable BAR:</strong> {language === 'PT' ? 'Ative ambos para ganhos de até 10% em jogos DX12/Vulkan.' : 'Enable both for full PCIe BAR mapping and up to +10% DX12/Vulkan gains.'}</li>
                <li>• <strong>X3D / PBO / Curve Optimizer:</strong> {language === 'PT' ? 'CPUs X3D possuem V-Cache empilhado sensível a voltagem fixa; use apenas PBO / CO negativo leve (-15 a -25).' : 'X3D stacked V-Cache cannot tolerate unsafe fixed Vcore; prefer PBO + mild negative Curve Optimizer (-15 to -25).'}</li>
                <li>• <strong>Memory Context Restore (AM5):</strong> {language === 'PT' ? 'Reduz boot lento de DDR5 para menos de 15s (mantenha Power Down Enable em Auto/Enabled em conjunto).' : 'Cuts AM5 DDR5 POST times under 15s (keep Power Down Enable paired to avoid BSOD).'}</li>
              </ul>
            </div>

            {/* Intel Core 12th-14th / Core Ultra Checklist */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
                  Intel Core LGA 1700 / 1851
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] font-mono text-sky-300">
                  BIOS Checklist
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-neutral-300">
                <li>• <strong>Intel Default Settings / Microcode 0x12B+:</strong> {language === 'PT' ? 'Essencial em 13ª/14ª Geração para evitar degradação por picos de VID (Vmin Shift).' : 'Critical on 13th/14th Gen K-CPUs to clamp transient voltage spikes (Vmin Shift).'}</li>
                <li>• <strong>XMP II / XMP I:</strong> {language === 'PT' ? 'Prefira XMP I (subtimings da placa-mãe) ou XMP II (timings completos do kit).' : 'Enable XMP I or XMP II to achieve rated DRAM throughput and lower latency.'}</li>
                <li>• <strong>Above 4G + Resizable BAR + CSM Off:</strong> {language === 'PT' ? 'Desative o CSM (Legacy) para boot UEFI puro, Fast Boot e ReBAR ativo.' : 'Disable CSM legacy mode to enforce UEFI GOP boot, Fast Boot and ReBAR.'}</li>
                <li>• <strong>VT-x / VT-d vs Core Isolation (VBS):</strong> {language === 'PT' ? 'Desative Integridade de Memória (HVCI) no Windows se buscar menor latência sem VMs.' : 'Disable Memory Integrity (HVCI) inside Windows Security for lowest frametime overhead.'}</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* DDR5 Thermal & 4-DIMM IMC */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-amber-500/25 space-y-2">
              <span className="text-[11px] font-bold font-mono text-amber-400 uppercase">
                {language === 'PT' ? 'DDR5 > 55°C & Regra dos 4 Pentes' : 'DDR5 > 55°C & 4-DIMM IMC Limits'}
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {language === 'PT'
                  ? 'Módulos DDR5 aquecem com o controlador de energia (PMIC) integrado. Acima de 55°C durante jogos pesados com tREFI elevado surgem erros silenciosos de memória e fechamento de jogos. Além disso, usar 4 pentes em AM5/LGA1700 força o IMC a cair para ~3600–4800 MT/s — prefira sempre 2 pentes nos slots A2 e B2.'
                  : 'DDR5 PMICs run hot; exceeding 55°C with aggressive tREFI triggers random crashes. Populating 4 DDR5 DIMMs also overloads the dual-channel IMC, dropping clocks to 3600–4800 MT/s — always prefer 2 sticks in A2/B2.'}
              </p>
            </div>

            {/* Cooler Mounting & RAM Detection */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-cyan-500/25 space-y-2">
              <span className="text-[11px] font-bold font-mono text-cyan-400 uppercase">
                {language === 'PT' ? 'Pressão do Cooler & Slots A2/B2' : 'Cooler Pressure & A2/B2 Topology'}
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {language === 'PT'
                  ? 'Aperto excessivo ou desigual do Water Cooler/Air Cooler no soquete entorta levemente o PCB/pinos do IMC e faz um canal inteiro de memória (ou o XMP) parar de reconhecer. Reinstale os parafusos em X com aperto firme sem força extrema.'
                  : 'Uneven or over-torqued CPU cooler brackets flex socket pins connected to memory channels, causing single-channel drops or XMP boot failures. Re-seat in an X pattern with even torque.'}
              </p>
            </div>

            {/* DisplayPort Black Screen & WHEA/TDR */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-rose-500/25 space-y-2">
              <span className="text-[11px] font-bold font-mono text-rose-400 uppercase">
                {language === 'PT' ? 'DisplayPort Preta na BIOS & WHEA vs TDR' : 'DisplayPort BIOS Blackout & WHEA/TDR'}
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {language === 'PT'
                  ? 'Se a tela ficar preta ao reiniciar para a UEFI via DisplayPort (GPUs antigas DP 1.3/1.4 sem update GOP), conecte via HDMI temporariamente. Erros WHEA ID 18/19 apontam CPU/RAM instável (remova undervolt); Event ID 4101 aponta TDR de driver/GPU.'
                  : 'If DisplayPort shows no video inside UEFI pre-OS screens, switch to HDMI or update GPU DisplayID/GOP firmware. WHEA 18/19 indicates unstable CPU/RAM Vcore or FCLK; Event ID 4101 indicates GPU driver TDR reset.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* SubTab 3: About Project, Evolution Timeline & Architecture Bento */
        <div className="flex-1 flex flex-col min-h-0 space-y-3 overflow-y-auto no-scrollbar">
          {/* Top Row: Hero Branding + Open-Source Credentials */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shrink-0">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl overflow-hidden border p-1.5 shrink-0 flex items-center justify-center ${
                  theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <img
                  src={
                    theme === 'light'
                      ? '/assets/branding/logo-primary-white-bg.jpg'
                      : '/assets/branding/logo-transparent.png'
                  }
                  alt="System Optimizer Tool Official Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-100">System Optimizer Tool</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono tabular-nums">
                    {t('about_version')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t('about_license')}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                  {t('about_hero_tagline')}
                </p>
                <div className="text-[11px] text-neutral-400 pt-0.5">
                  {t('about_author_label')}: <strong className="text-neutral-200">{t('about_author_name')}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => openExternalUrl('https://github.com/jefheee/system-optimizer-tool')}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-300" />
              <span>{t('about_repo_btn')}</span>
            </button>
          </div>

          {/* Middle Row: Evolution Timeline (3 Bento Columns) */}
          <div className="space-y-2 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
              {t('about_evolution_title')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Era 1 */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col justify-between space-y-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono tabular-nums">
                    {t('about_evo_1_year')}
                  </div>
                  <h5 className="text-xs font-bold text-neutral-200 mt-1">{t('about_evo_1_title')}</h5>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{t('about_evo_1_desc')}</p>
                </div>
                <div className="pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-500 font-mono">
                  Batch Scripting & CMD
                </div>
              </div>

              {/* Era 2 */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col justify-between space-y-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono tabular-nums">
                    {t('about_evo_2_year')}
                  </div>
                  <h5 className="text-xs font-bold text-neutral-200 mt-1">{t('about_evo_2_title')}</h5>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{t('about_evo_2_desc')}</p>
                </div>
                <div className="pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-500 font-mono">
                  PowerShell + C# WinForms
                </div>
              </div>

              {/* Era 3 */}
              <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-700/80 flex flex-col justify-between space-y-2 shadow-sm">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono tabular-nums">
                    {t('about_evo_3_year')}
                  </div>
                  <h5 className="text-xs font-bold text-neutral-100 mt-1">{t('about_evo_3_title')}</h5>
                  <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">{t('about_evo_3_desc')}</p>
                </div>
                <div className="pt-2 border-t border-neutral-800/60 text-[10px] text-emerald-400 font-mono">
                  Rust + Tauri v2 + Next.js 16
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Core Technical Principles (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0 pb-2">
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-neutral-200">100% Win32 & Rust Nativo</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Compilado diretamente em código de máquina x86_64 com acesso de ultra-baixa latência a ntdll.dll e WMI.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-neutral-200">0% Telemetria & Zero Daemons</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Nenhum serviço residente em segundo plano. Quando fechado, 0 MB de RAM e 0% de uso de CPU.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-neutral-200">Reversibilidade em 1 Clique</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Cada ajuste possui auditoria prévia, valor padrão documentado e botão de restauração nativa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
