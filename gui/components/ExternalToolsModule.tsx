'use client';

import React, { useState } from 'react';
import { 
  launchWinUtil, 
  launchMasActivator, 
  launchOoShutup10, 
  runWingetUpgrade, 
  launchAdwCleaner, 
  installQuickTool 
} from '../lib/api';
import { useLanguage } from '../lib/LanguageContext';
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
  Download
} from 'lucide-react';

export default function ExternalToolsModule() {
  const { t } = useLanguage();
  const [activeActions, setActiveActions] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});
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
        [id]: { success: false, message: err?.message || 'Erro ao invocar a ferramenta.' }
      }));
    } finally {
      setActiveActions(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">
            {t('ext_title')}
          </h2>
        </div>
        <p className="text-xs text-neutral-400">
          {t('ext_subtitle')}
        </p>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WinUtil (Chris Titus) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('ext_winutil_title')}</h3>
                <span className="text-[10px] text-blue-400 font-medium">christitus.com/win</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('ext_winutil_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_winutil_title'),
                  securityRating: 'safe',
                  action: 'Abre uma janela de console do PowerShell e executa o script oficial open-source do Chris Titus (irm https://christitus.com/win | iex).',
                  targetArea: 'Processo do PowerShell e interface WPF nativa do WinUtil',
                  expectedBenefit: 'Permite selecionar e instalar dezenas de navegadores, softwares de desenvolvimento e aplicar tweaks customizados com interface visual.',
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
              onClick={() => handleAction('winutil', launchWinUtil)}
              disabled={activeActions['winutil']}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
            >
              {activeActions['winutil'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              <span>{t('ext_winutil_btn')}</span>
            </button>
          </div>
        </div>

        {/* MAS (Microsoft Activation Scripts) */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('ext_mas_title')}</h3>
                <span className="text-[10px] text-emerald-400 font-medium">get.activated.win</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('ext_mas_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_mas_title'),
                  securityRating: 'safe',
                  action: 'Dispara uma janela do PowerShell executando o script oficial e seguro da comunidade (irm https://get.activated.win | iex).',
                  targetArea: 'Subsistema de Licenciamento do Windows (SLMGR / sppsvc)',
                  expectedBenefit: 'Ativação limpa e permanente via HWID sem modificação de arquivos de sistema ou instalação de arquivos executáveis suspeitos.',
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
              onClick={() => handleAction('mas', launchMasActivator)}
              disabled={activeActions['mas']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['mas'] ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <ExternalLink className="w-4 h-4 text-emerald-400" />}
              <span>{t('ext_mas_btn')}</span>
            </button>
          </div>
        </div>

        {/* O&O ShutUp10++ */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('ext_ooshutup_title')}</h3>
                <span className="text-[10px] text-cyan-400 font-medium">O&O Software GmbH</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('ext_ooshutup_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_ooshutup_title'),
                  securityRating: 'safe',
                  action: 'Baixa silenciosamente o binário portátil assinado digitalmente de OOSU10.exe para a pasta %TEMP% e o inicia diretamente.',
                  targetArea: 'Políticas de Privacidade, Cortana, Sensores e Câmera no Registro do Windows',
                  expectedBenefit: 'Permite desativar com precisão cirúrgica centenas de configurações de telemetria com recomendação visual por cores.',
                })
              }
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-cyan-400 transition-colors pt-1"
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
              {activeActions['ooshutup'] ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <ShieldCheck className="w-4 h-4 text-cyan-400" />}
              <span>{t('ext_ooshutup_btn')}</span>
            </button>
          </div>
        </div>

        {/* Winget Software Auto-Updater */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-purple-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ArrowUpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('ext_winget_title')}</h3>
                <span className="text-[10px] text-purple-400 font-medium">winget upgrade --all</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('ext_winget_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_winget_title'),
                  securityRating: 'safe',
                  action: 'Dispara o comando nativo winget upgrade --all --include-unknown --accept-package-agreements em uma janela de console.',
                  targetArea: 'Windows Package Manager (winget.exe)',
                  expectedBenefit: 'Garante que todos os seus softwares e navegadores recebam os patches de segurança mais recentes sem precisar atualizar um por um.',
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
              onClick={() => handleAction('winget', runWingetUpgrade)}
              disabled={activeActions['winget']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['winget'] ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <ArrowUpCircle className="w-4 h-4 text-purple-400" />}
              <span>{t('ext_winget_btn')}</span>
            </button>
          </div>
        </div>

        {/* Malwarebytes AdwCleaner */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('ext_adwcleaner_title')}</h3>
                <span className="text-[10px] text-amber-400 font-medium">Malwarebytes Portable</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('ext_adwcleaner_desc')}
            </p>

            <button
              onClick={() =>
                setTechModalData({
                  title: t('ext_adwcleaner_title'),
                  securityRating: 'safe',
                  action: 'Baixa o executável assinado do AdwCleaner para %TEMP% e inicia a ferramenta sem necessidade de instalação permanente.',
                  targetArea: 'C:\\Users\\...\\AppData e Registro contra adwares e hijacks',
                  expectedBenefit: 'Varre e remove spywares, adwares ocultos e barras de ferramentas que degradam o desempenho da navegação.',
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
              onClick={() => handleAction('adwcleaner', launchAdwCleaner)}
              disabled={activeActions['adwcleaner']}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-neutral-700 active:scale-[0.98]"
            >
              {activeActions['adwcleaner'] ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
              <span>{t('ext_adwcleaner_btn')}</span>
            </button>
          </div>
        </div>

        {/* Quick Hardware Tools */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">{t('ext_quick_title')}</h3>
                <span className="text-[10px] text-emerald-400 font-medium">CPU-Z, HWMonitor, GPU-Z</span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('ext_quick_desc')}
            </p>
          </div>

          <div className="pt-4 mt-2 flex gap-2">
            <button
              onClick={() => handleAction('cpuz', () => installQuickTool('cpuz'))}
              disabled={activeActions['cpuz']}
              className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
            >
              {activeActions['cpuz'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-400" />}
              <span>CPU-Z</span>
            </button>

            <button
              onClick={() => handleAction('hwmon', () => installQuickTool('hwmonitor'))}
              disabled={activeActions['hwmon']}
              className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
            >
              {activeActions['hwmon'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-emerald-400" />}
              <span>HWMonitor</span>
            </button>

            <button
              onClick={() => handleAction('gpuz', () => installQuickTool('gpuz'))}
              disabled={activeActions['gpuz']}
              className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs flex items-center justify-center gap-1 transition-all active:scale-[0.98]"
            >
              {activeActions['gpuz'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5 text-purple-400" />}
              <span>GPU-Z</span>
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
