'use client';

import React, { useState } from 'react';
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
  DnsBenchmarkResult
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
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
  ShieldCheck,
  RotateCcw,
  Menu,
  Gauge
} from 'lucide-react';

export default function SystemModule() {
  const { t } = useLanguage();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [takeOwnershipActive, setTakeOwnershipActive] = useState<boolean>(false);
  const [classicMenuActive, setClassicMenuActive] = useState<boolean>(false);
  const [restoreDesc, setRestoreDesc] = useState<string>('Ponto de Restauração - System Optimizer');
  const [dnsBenchmark, setDnsBenchmark] = useState<DnsBenchmarkResult | null>(null);
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);

  const handleAction = async (id: string, fn: () => Promise<any>) => {
    setActiveActions(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fn();
      setResults(prev => ({
        ...prev,
        [id]: { success: res.success, message: res.message }
      }));
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [id]: { success: false, message: err?.message || 'Erro de comunicação.' }
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleBenchmarkDns = async () => {
    setActiveActions(prev => ({ ...prev, dns_bench: true }));
    try {
      const res = await benchmarkDns();
      if (res.success && res.data) {
        setDnsBenchmark(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setActiveActions(prev => ({ ...prev, dns_bench: false }));
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

  const handleToggleClassicMenu = async (enable: boolean) => {
    await handleAction('classic_menu', async () => {
      const res = await toggleClassicContextMenu(enable);
      if (res.success) {
        setClassicMenuActive(enable);
      }
      return res;
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">
            {t('sys_title')}
          </h2>
        </div>
        <p className="text-xs text-neutral-400">
          {t('sys_subtitle')}
        </p>
      </div>

      {/* Grid of System Tools */}
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_restore_desc')}
            </p>

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
                  action: 'Habilita a proteção do sistema na unidade C: e invoca Checkpoint-Computer -RestorePointType MODIFY_SETTINGS.',
                  targetArea: 'VSS (Volume Shadow Copy Service) e Registro do Windows',
                  expectedBenefit: 'Garante que você pode desfazer qualquer mudança no sistema a qualquer momento com o Restauração do Sistema nativo.',
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_dns_bench_desc')}
            </p>

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
                  action: 'Testa latência por sockets TCP na porta 53 para 1.1.1.1, 8.8.8.8, 9.9.9.9 e 208.67.222.222. Ao aplicar, injeta Set-DnsClientServerAddress na interface ativa.',
                  targetArea: 'Pilha TCP/IP e resolvedor DNS do adaptador ativo',
                  expectedBenefit: 'Reduz o tempo de resposta no carregamento de sites, resolução de servidores de jogos e navegação.',
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_net_reset_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_net_reset_title'),
                  securityRating: 'safe',
                  action: 'Executa netsh winsock reset, netsh int ip reset, ipconfig /release, ipconfig /renew e ipconfig /flushdns.',
                  targetArea: 'Catálogo Winsock e Drivers de Interface de Rede',
                  expectedBenefit: 'Restaura a conectividade com a internet após corrupções causadas por VPNs desinstaladas ou malwares.',
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_classic_menu_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_classic_menu_title'),
                  securityRating: 'safe',
                  action: 'Cria a chave HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32 com valor vazio e reinicia o explorer.exe.',
                  targetArea: 'HKCU\\Software\\Classes\\CLSID e Shell do Windows Explorer',
                  expectedBenefit: 'Abre o menu de clique direito completo imediatamente, sem atraso de animação e sem submenu intermediário.',
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
              onClick={() => handleToggleClassicMenu(true)}
              disabled={activeActions['classic_menu']}
              className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 active:scale-[0.98]"
            >
              {activeActions['classic_menu'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Menu className="w-4 h-4" />}
              <span>{t('sys_classic_menu_btn_on')}</span>
            </button>

            <button
              onClick={() => handleToggleClassicMenu(false)}
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
                <span className="text-[10px] text-purple-400 font-medium">DiagTrack & Políticas</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_tel_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_tel_title'),
                  securityRating: 'safe',
                  action: 'Desativa os serviços DiagTrack e dmwappushservice e define AllowTelemetry=0 em Policies\\Microsoft\\Windows\\DataCollection.',
                  targetArea: 'Serviços do Windows e HKLM\\SOFTWARE\\Policies',
                  expectedBenefit: 'Economiza ciclos ociosos de CPU, reduz leituras constantes em disco e impede o upload de logs e dados para a Microsoft.',
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_bloat_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_bloat_title'),
                  securityRating: 'safe',
                  action: 'Desinstala pacotes de usuário e provisionados não essenciais (Cortana, BingWeather, 3DViewer, Solitaire, YourPhone).',
                  targetArea: 'Windows AppX Package Manager',
                  expectedBenefit: 'Limpa o menu Iniciar e impede que dezenas de processos em segundo plano continuem consumindo memória RAM.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-red-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
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

        {/* Card 7: Clean Orphan Tasks (Strictly Here!) */}
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_orphans_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_orphans_title'),
                  securityRating: 'safe',
                  action: 'Varre todas as tarefas do Agendador de Tarefas do Windows e remove aquelas cujos executáveis não existem mais no disco rígido.',
                  targetArea: 'Windows Task Scheduler (schtasks)',
                  expectedBenefit: 'Elimina erros recorrentes no log de eventos e impede o agendador de tentar disparar arquivos inexistentes.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-amber-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_wu_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_wu_title'),
                  securityRating: 'safe',
                  action: 'Interrompe os serviços wuauserv, bits e cryptsvc, apaga as pastas de cache corrompidas e reinicia os serviços em estado limpo.',
                  targetArea: 'C:\\Windows\\SoftwareDistribution e catroot2',
                  expectedBenefit: 'Resolve códigos de erro recorrentes (0x80070002, 0x80240034) e destrava downloads emperrados.',
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

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('sys_sfc_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('sys_sfc_title'),
                  securityRating: 'safe',
                  action: 'Executa sfc /scannow e dism /Online /Cleanup-Image /RestoreHealth de forma oculta.',
                  targetArea: 'Arquivos protegidos do Windows (WRP) e Repositório de Componentes',
                  expectedBenefit: 'Restaura arquivos de sistema corrompidos por travamentos ou quedas de energia, garantindo estabilidade máxima.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors pt-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t('tech_btn')}</span>
            </button>
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

        {/* Card 10: Store & OneDrive & Drivers */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Utilitários do Sistema</h3>
                <span className="text-[10px] text-purple-400 font-medium">Store, OneDrive & Drivers</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Restaure a loja do Windows, remova o OneDrive ou faça backup completo dos drivers instalados.
            </p>
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
                <h3 className="text-sm font-bold text-neutral-100">Ajustes Rápidos de Cache & Permissões</h3>
                <span className="text-[10px] text-cyan-400 font-medium">Fontes, Bluetooth & Menu de Contexto</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Corrija falhas de tipografia, resolva quedas de fones Bluetooth e assuma controle total de permissões NTFS de arquivos travados.
            </p>
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

      {/* Results Banner */}
      {Object.entries(results).map(([id, res]) => (
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

      {/* Tech Details Modal */}
      <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
    </div>
  );
}
