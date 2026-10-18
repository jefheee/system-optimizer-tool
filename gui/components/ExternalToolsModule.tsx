'use client';

import React, { useEffect, useState } from 'react';
import {
  launchWinUtil,
  launchMasActivator,
  launchOoShutup10,
  runWingetUpgrade,
  launchAdwCleaner,
  checkInstalledTools,
  launchOrInstallTool,
  InstalledToolsStatus,
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
import { useSettings } from '../lib/SettingsContext';
import TechDetailsModal, { TechDetailsData } from './TechDetailsModal';
import {
  Briefcase,
  Terminal,
  Key,
  ShieldCheck,
  ArrowUpCircle,
  ShieldAlert,
  Cpu,
  Activity,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Info,
  Download,
  BookOpen,
  X,
  Play,
} from 'lucide-react';

interface TutorialStepData {
  title: string;
  subtitle: string;
  steps: string[];
  tip: string;
}

export default function ExternalToolsModule() {
  const { t } = useLanguage();
  const { theme } = useSettings();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [techModalData, setTechModalData] = useState<TechDetailsData | null>(null);
  const [tutorialData, setTutorialData] = useState<TutorialStepData | null>(null);
  const [installedTools, setInstalledTools] = useState<InstalledToolsStatus | null>(null);

  const refreshInstalledStatus = async () => {
    try {
      const res = await checkInstalledTools();
      if (res.success && res.data) {
        setInstalledTools(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshInstalledStatus();
  }, []);

  const handleAction = async (id: string, fn: () => Promise<any>) => {
    setActiveActions((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fn();
      setResults((prev) => ({
        ...prev,
        [id]: { success: res.success, message: res.message },
      }));
      await refreshInstalledStatus();
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [id]: { success: false, message: err?.message || 'Error' },
      }));
    } finally {
      setActiveActions((prev) => ({ ...prev, [id]: false }));
    }
  };

  const tutorials: Record<string, TutorialStepData> = {
    winutil: {
      title: 'Chris Titus Tech WinUtil',
      subtitle: 'christitus.com/win • Open-Source Windows Toolbox',
      steps: [
        t('tut_winutil_step1', '1. Clique em "Abrir WinUtil" e aguarde alguns segundos até a janela gráfica do utilitário carregar.'),
        t('tut_winutil_step2', '2. Na aba "Install", marque os programas que deseja instalar ou atualizar e clique em "Install/Upgrade Selected".'),
        t('tut_winutil_step3', '3. Na aba "Tweaks", clique no botão "Standard" (Desktop) ou "Laptop" no topo para selecionar apenas recomendações seguras.'),
        t('tut_winutil_step4', '4. Clique em "Run Tweaks" na parte inferior e aguarde a mensagem de conclusão.'),
      ],
      tip: t('tut_winutil_tip', 'Evite marcar opções avançadas como "Remove All MS Store Apps" caso você utilize o aplicativo Xbox ou a Microsoft Store.'),
    },
    mas: {
      title: 'Microsoft Activation Scripts (MAS)',
      subtitle: 'get.activated.win • Massgrave Open-Source',
      steps: [
        t('tut_mas_step1', '1. Clique em "Abrir MAS" e aguarde a janela azul/preta do script abrir.'),
        t('tut_mas_step2', '2. Para ativar o Windows 10/11 permanentemente com Licença Digital, pressione a tecla [1] (HWID) no teclado.'),
        t('tut_mas_step3', '3. Para ativar o pacote Office, pressione a tecla [2] (Ohook).'),
        t('tut_mas_step4', '4. Aguarde a mensagem verde de confirmação e pressione qualquer tecla para fechar.'),
      ],
      tip: t('tut_mas_tip', 'O método HWID grava a licença digital vinculada ao hardware nos servidores oficiais e permanece ativo mesmo após formatar.'),
    },
    ooshutup: {
      title: 'O&O ShutUp10++',
      subtitle: 'O&O Software GmbH • Controle Cirúrgico de Privacidade',
      steps: [
        t('tut_ooshutup_step1', '1. Clique em "Abrir ShutUp10++" (o executável portátil oficial será baixado e aberto automaticamente).'),
        t('tut_ooshutup_step2', '2. No menu superior, clique em "Actions" (Ações) -> "Apply only recommended settings" (Aplicar apenas configurações recomendadas - Verdes).'),
        t('tut_ooshutup_step3', '3. Aceite criar um ponto de restauração quando o programa perguntar.'),
        t('tut_ooshutup_step4', '4. Feche a janela e reinicie o Windows quando desejar.'),
      ],
      tip: t('tut_ooshutup_tip', 'Mantenha apenas os itens Verdes (Recomendados). Itens Vermelhos podem desativar a câmera, microfone ou Windows Update.'),
    },
    winget: {
      title: t('ext_winget_title'),
      subtitle: 'Windows Package Manager (winget upgrade --all)',
      steps: [
        t('tut_winget_step1', '1. Clique no botão "Atualizar Apps via Winget".'),
        t('tut_winget_step2', '2. O gerenciador oficial da Microsoft verificará todos os programas instalados (Chrome, Discord, VS Code, 7-Zip, etc.).'),
        t('tut_winget_step3', '3. Cada aplicativo desatualizado será baixado e atualizado silenciosamente em sequência.'),
      ],
      tip: t('tut_winget_tip', 'Você pode continuar usando o computador normalmente enquanto o Winget atualiza seus programas.'),
    },
    adwcleaner: {
      title: 'Malwarebytes AdwCleaner',
      subtitle: 'Malwarebytes Portable • Anti-Adware & Browser Hijack',
      steps: [
        t('tut_adw_step1', '1. Clique em "Abrir AdwCleaner" para baixar e iniciar a versão portátil oficial.'),
        t('tut_adw_step2', '2. Clique no botão azul "Scan Now" (Verificar Agora) no centro da tela.'),
        t('tut_adw_step3', '3. Se algum adware ou barra de ferramentas suspeita for detectado, clique em "Quarantine" (Quarentena).'),
      ],
      tip: t('tut_adw_tip', 'O AdwCleaner não substitui seu antivírus nem fica rodando em segundo plano — ele é ideal para varreduras pontuais.'),
    },
    quick: {
      title: t('ext_quick_title'),
      subtitle: 'CPU-Z • HWMonitor • TechPowerUp GPU-Z',
      steps: [
        t('tut_quick_step1', '1. O System Optimizer verifica automaticamente se o CPU-Z, HWMonitor ou GPU-Z já estão instalados no seu PC.'),
        t('tut_quick_step2', '2. Se já estiverem instalados (selo verde "✓ Instalado"), clicar no botão abre o programa imediatamente.'),
        t('tut_quick_step3', '3. Caso ainda não tenha, clicar no botão instala a versão oficial via Winget em segundo plano.'),
      ],
      tip: t('tut_quick_tip', 'Use o HWMonitor para verificar temperaturas máximas (Package Temp / Hot Spot) durante jogos pesados.'),
    },
  };

  const monoLogo = theme === 'light'
    ? '/assets/branding/logo-monochrome-black.jpg'
    : '/assets/branding/logo-monochrome-white.jpg';

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-neutral-300" />
          <h2 className="text-xl font-bold text-neutral-100">{t('ext_title')}</h2>
        </div>
        <p className="text-xs text-neutral-400">{t('ext_subtitle')}</p>
      </div>

      {/* Results Banner */}
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

      {/* Bento Grid: 6 Tools in 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* WinUtil (Chris Titus) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('ext_winutil_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">christitus.com/win</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(tutorials.winutil)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold transition-colors"
              >
                {t('ext_tutorial_btn')}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('ext_winutil_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_winutil_title'),
                  securityRating: 'safe',
                  action: 'irm https://christitus.com/win | iex',
                  targetArea: 'PowerShell Console & Native WPF Utility',
                  expectedBenefit: t('ext_winutil_desc'),
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
              onClick={() => handleAction('winutil', launchWinUtil)}
              disabled={activeActions['winutil']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 text-neutral-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['winutil'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4 text-neutral-300" />}
              <span>{t('ext_winutil_btn')}</span>
            </button>
          </div>
        </div>

        {/* MAS (Microsoft Activation Scripts) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('ext_mas_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">get.activated.win</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(tutorials.mas)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold transition-colors"
              >
                {t('ext_tutorial_btn')}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('ext_mas_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_mas_title'),
                  securityRating: 'safe',
                  action: 'irm https://get.activated.win | iex',
                  targetArea: 'Windows Software Licensing Service (sppsvc)',
                  expectedBenefit: t('ext_mas_desc'),
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
              onClick={() => handleAction('mas', launchMasActivator)}
              disabled={activeActions['mas']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['mas'] ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <ExternalLink className="w-4 h-4 text-neutral-300" />}
              <span>{t('ext_mas_btn')}</span>
            </button>
          </div>
        </div>

        {/* O&O ShutUp10++ */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('ext_ooshutup_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">O&O Software GmbH</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(tutorials.ooshutup)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold transition-colors"
              >
                {t('ext_tutorial_btn')}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('ext_ooshutup_desc')}</p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_ooshutup_title'),
                  securityRating: 'safe',
                  action: 'https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe -> %TEMP%\\OOSU10.exe',
                  targetArea: 'Windows Privacy Policies & Telemetry Controls',
                  expectedBenefit: t('ext_ooshutup_desc'),
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
              onClick={() => handleAction('ooshutup', launchOoShutup10)}
              disabled={activeActions['ooshutup']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['ooshutup'] ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <ShieldCheck className="w-4 h-4 text-neutral-300" />}
              <span>{t('ext_ooshutup_btn')}</span>
            </button>
          </div>
        </div>

        {/* Winget Software Auto-Updater */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <ArrowUpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('ext_winget_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">winget upgrade --all</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(tutorials.winget)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold transition-colors"
              >
                {t('ext_tutorial_btn')}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('ext_winget_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('winget', runWingetUpgrade)}
              disabled={activeActions['winget']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['winget'] ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <ArrowUpCircle className="w-4 h-4 text-neutral-300" />}
              <span>{t('ext_winget_btn')}</span>
            </button>
          </div>
        </div>

        {/* Malwarebytes AdwCleaner */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('ext_adwcleaner_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">Malwarebytes Portable</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(tutorials.adwcleaner)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold transition-colors"
              >
                {t('ext_tutorial_btn')}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('ext_adwcleaner_desc')}</p>
          </div>

          <div className="pt-4 mt-2">
            <button
              onClick={() => handleAction('adwcleaner', launchAdwCleaner)}
              disabled={activeActions['adwcleaner']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['adwcleaner'] ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : <ShieldAlert className="w-4 h-4 text-neutral-300" />}
              <span>{t('ext_adwcleaner_btn')}</span>
            </button>
          </div>
        </div>

        {/* Quick Hardware Tools with Installed Detection (CPU-Z, HWMonitor, GPU-Z) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-800/90 border border-neutral-700/60 flex items-center justify-center text-neutral-200">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{t('ext_quick_title')}</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">CPU-Z, HWMonitor, GPU-Z</span>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(tutorials.quick)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-semibold transition-colors"
              >
                {t('ext_tutorial_btn')}
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">{t('ext_quick_desc')}</p>

            {/* Installed Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: 'cpuz', label: 'CPU-Z', installed: !!installedTools?.cpuzInstalled },
                { id: 'hwmonitor', label: 'HWMonitor', installed: !!installedTools?.hwmonitorInstalled },
                { id: 'gpuz', label: 'GPU-Z', installed: !!installedTools?.gpuzInstalled },
              ].map((tool) => (
                <span
                  key={tool.id}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    tool.installed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {tool.label}: {tool.installed ? t('ext_installed_badge') : t('ext_install_tool')}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-2 flex gap-1.5">
            <button
              onClick={() => handleAction('cpuz', () => launchOrInstallTool('cpuz'))}
              disabled={activeActions['cpuz']}
              className="flex-1 py-2 px-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98] border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            >
              {activeActions['cpuz'] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : installedTools?.cpuzInstalled ? (
                <Play className="w-3.5 h-3.5 text-neutral-300" />
              ) : (
                <Download className="w-3.5 h-3.5 text-neutral-300" />
              )}
              <span>{installedTools?.cpuzInstalled ? 'CPU-Z' : `+ CPU-Z`}</span>
            </button>

            <button
              onClick={() => handleAction('hwmon', () => launchOrInstallTool('hwmonitor'))}
              disabled={activeActions['hwmon']}
              className="flex-1 py-2 px-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98] border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            >
              {activeActions['hwmon'] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : installedTools?.hwmonitorInstalled ? (
                <Play className="w-3.5 h-3.5 text-neutral-300" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-neutral-300" />
              )}
              <span>{installedTools?.hwmonitorInstalled ? 'HWMon' : `+ HWMon`}</span>
            </button>

            <button
              onClick={() => handleAction('gpuz', () => launchOrInstallTool('gpuz'))}
              disabled={activeActions['gpuz']}
              className="flex-1 py-2 px-2 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98] border bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
            >
              {activeActions['gpuz'] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : installedTools?.gpuzInstalled ? (
                <Play className="w-3.5 h-3.5 text-neutral-300" />
              ) : (
                <Cpu className="w-3.5 h-3.5 text-neutral-300" />
              )}
              <span>{installedTools?.gpuzInstalled ? 'GPU-Z' : `+ GPU-Z`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Tutorial Modal */}
      {tutorialData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setTutorialData(null)}
        >
          <div
            className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-neutral-950 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-700">
                  <img src={monoLogo} alt="Badge" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100">{tutorialData.title}</h3>
                  <p className="text-[10px] text-neutral-400">{tutorialData.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setTutorialData(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-blue-400 font-bold uppercase text-[11px]">
                <BookOpen className="w-4 h-4" />
                <span>{t('ext_tutorial_modal_title')}</span>
              </div>

              <div className="space-y-2">
                {tutorialData.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-neutral-200 leading-relaxed"
                  >
                    {step}
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] leading-relaxed">
                <strong>💡 {t('ext_tip_label', 'Dica Útil')}:</strong> {tutorialData.tip}
              </div>
            </div>

            <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setTutorialData(null)}
                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition-colors"
              >
                {t('ext_tutorial_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tech Details Modal */}
      <TechDetailsModal data={techModalData} onClose={() => setTechModalData(null)} />
    </div>
  );
}
