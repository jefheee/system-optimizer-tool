'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { 
  BookOpen, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Cpu, 
  Trash2, 
  Gamepad2, 
  Settings, 
  ExternalLink,
  Code2,
  Layers,
  Heart
} from 'lucide-react';

interface WikiItem {
  id: string;
  name: string;
  category: 'clean' | 'gamer' | 'system' | 'tools';
  categoryLabel: string;
  securityRating: 'safe' | 'advanced';
  action: string;
  where: string;
  benefit: string;
}

export default function DocsAndAboutModule() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const wikiItems: WikiItem[] = useMemo(() => [
    {
      id: 'deep_clean',
      name: 'Limpeza Profunda (SSD/NVMe)',
      category: 'clean',
      categoryLabel: 'Limpeza',
      securityRating: 'safe',
      action: 'Varre e remove arquivos temporários, logs, caches do Windows Update e navegadores Chromium, esvazia lixeira e dispara TRIM no drive C:.',
      where: '%TEMP%, C:\\Windows\\Prefetch, C:\\Windows\\SoftwareDistribution\\Download, Caches de Chrome/Edge/Brave',
      benefit: 'Libera de 5 GB a 25 GB de armazenamento, remove travas de arquivos e otimiza velocidade de gravação em blocos flash.',
    },
    {
      id: 'lite_clean',
      name: 'Limpeza Rápida (Lite)',
      category: 'clean',
      categoryLabel: 'Limpeza',
      securityRating: 'safe',
      action: 'Limpa arquivos temporários do usuário e esvazia a lixeira nativamente.',
      where: '%LOCALAPPDATA%\\Temp e Lixeira do Windows (SHEmptyRecycleBinW)',
      benefit: 'Rápido, sem desgaste mecânico em discos magnéticos (HDDs) e sem apagar históricos ou credenciais.',
    },
    {
      id: 'hibernation',
      name: 'Hibernação do Windows (hiberfil.sys)',
      category: 'clean',
      categoryLabel: 'Limpeza',
      securityRating: 'safe',
      action: 'Desativa o arquivo de hibernação via powercfg.exe /hibernate off.',
      where: 'C:\\hiberfil.sys e ACPI Power Manager',
      benefit: 'Recupera imediatamente entre 8 GB e 32 GB de espaço em disco no volume C:.',
    },
    {
      id: 'windows_old',
      name: 'Instalações Anteriores (Windows.old & WinSxS)',
      category: 'clean',
      categoryLabel: 'Limpeza',
      securityRating: 'safe',
      action: 'Exclui pastas residuais de grandes updates (Windows.old, $Windows.~BT) e executa StartComponentCleanup no WinSxS via DISM.',
      where: 'C:\\Windows.old e repositório WinSxS de DLLs',
      benefit: 'Elimina gigabytes de versões obsoletas de arquivos do Windows após atualizações semestrais.',
    },
    {
      id: 'timer_res',
      name: 'Resolução de Timer do Kernel (0.5ms)',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Chama NtSetTimerResolution em ntdll.dll para ajustar o agendador do Windows de 15.6ms para 0.5ms (5000 unidades de 100ns).',
      where: 'ntdll.dll e Kernel Timer Dispatcher',
      benefit: 'Diminui o atraso entre comandos do jogador (cliques e teclas) e a renderização do frame na tela.',
    },
    {
      id: 'ultimate_plan',
      name: 'Plano Desempenho Máximo (Ultimate Performance)',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Desbloqueia e ativa o esquema de energia OEM e9a42b02-d5df-448d-aa00-03f14749eb61 via powercfg.',
      where: 'powercfg.exe e Políticas ACPI de CPU',
      benefit: 'Impede núcleos de entrarem em estados C-States de economia, eliminando oscilações de clock e micro-stutters.',
    },
    {
      id: 'ram_flush',
      name: 'Flush Imediato de Memória RAM',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Itera pelos processos com EnumProcesses e chama K32EmptyWorkingSet em cada PID para liberar páginas ociosas.',
      where: 'Win32 Process Status API (K32EmptyWorkingSet)',
      benefit: 'Devolve centenas de megabytes de memória RAM para o sistema sem reiniciar o computador ou fechar aplicativos.',
    },
    {
      id: 'ram_autoclean',
      name: 'Job Auto-Limpeza de RAM (10min)',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Cria uma tarefa assíncrona gerenciada pelo Tokio que executa o Working Set Flush a cada 600 segundos.',
      where: 'Tokio Async Runtime em Rust',
      benefit: 'Mantém a memória livre durante sessões contínuas de jogos longos e pesados.',
    },
    {
      id: 'vbs_toggle',
      name: 'Isolamento de Núcleo / VBS',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'advanced',
      action: 'Configura o hypervisorlaunchtype como off no Boot Configuration Data (BCD) do Windows via bcdedit.',
      where: 'BCD (Boot Configuration Data) / Hyper-V Virtualization',
      benefit: 'Gera ganhos de 5% a 15% em 1% low FPS em jogos competitivos ao desativar a virtualização de segurança de memória.',
    },
    {
      id: 'mouse_opt',
      name: 'Mouse 1:1 Sem Aceleração',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Zera MouseSpeed, MouseThreshold1 e MouseThreshold2 no registro do usuário.',
      where: 'HKCU\\Control Panel\\Mouse',
      benefit: 'A mira do mouse passa a se mover em proporção linear perfeita aos movimentos físicos da sua mão.',
    },
    {
      id: 'kbd_opt',
      name: 'Taxa de Repetição do Teclado 150ms',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Define AutoRepeatDelay em 150ms nas configurações de acessibilidade do teclado.',
      where: 'HKCU\\Control Panel\\Accessibility\\Keyboard Response',
      benefit: 'Reduz o tempo de espera para repetição de teclas em strafing e digitação rápida.',
    },
    {
      id: 'tcp_nodelay',
      name: 'TCP NoDelay & Nagle Off',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Configura TcpAckFrequency=1 e TCPNoDelay=1 nas interfaces ativas com endereço IP.',
      where: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces',
      benefit: 'Despacha pacotes de rede sem esperar acumular buffers, diminuindo o ping em jogos online.',
    },
    {
      id: 'fso_gamedvr',
      name: 'Desativação de GameDVR & FSO',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Desativa GameDVR_Enabled e define GameDVR_FSEBehaviorMode=2 no GameConfigStore.',
      where: 'HKCU\\System\\GameConfigStore',
      benefit: 'Garante que o jogo tenha acesso exclusivo de apresentação à GPU, eliminando sobreposições lentas da barra de jogos.',
    },
    {
      id: 'shader_cache',
      name: 'Reset de Cache de Shaders DirectX',
      category: 'gamer',
      categoryLabel: 'Gamer',
      securityRating: 'safe',
      action: 'Esvazia diretórios D3DSCache e caches de compilação da NVIDIA e AMD em LocalAppData.',
      where: '%LOCALAPPDATA%\\D3DSCache e pastas de drivers gráficos',
      benefit: 'Resolve travamentos e stutterings causados por shaders compilados corrompidos após atualização de drivers de vídeo.',
    },
    {
      id: 'restore_point',
      name: 'Criar Ponto de Restauração',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Habilita a proteção do sistema e invoca Checkpoint-Computer -RestorePointType MODIFY_SETTINGS.',
      where: 'VSS (Volume Shadow Copy) e Registro do Windows',
      benefit: 'Segurança absoluta para desfazer qualquer alteração no sistema a qualquer momento.',
    },
    {
      id: 'dns_bench',
      name: 'Benchmark de Latência DNS',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Mede a latência TCP na porta 53 para Cloudflare, Google, Quad9 e OpenDNS e configura o mais rápido.',
      where: 'Configurações de DNS do adaptador de rede ativo',
      benefit: 'Navegação na web e resolução de domínios muito mais velozes.',
    },
    {
      id: 'net_reset',
      name: 'Redefinição Completa de Pilha de Rede',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Executa netsh winsock reset, netsh int ip reset, ipconfig /release, /renew e /flushdns.',
      where: 'Catálogo Winsock e Drivers de Rede',
      benefit: 'Restaura a internet caso VPNs, firewalls ou antivírus desinstalados tenham corrompido sockets.',
    },
    {
      id: 'classic_menu',
      name: 'Menu de Contexto Clássico (Windows 11)',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Injeta o CLSID {86ca1aa0-34aa-4e8b-a509-50c905bae2a2} no HKCU e atualiza o Windows Explorer.',
      where: 'HKCU\\Software\\Classes\\CLSID e Shell do Explorer',
      benefit: 'Elimina o menu moderno lento do Windows 11 e o clique intermediário em "Mostrar mais opções".',
    },
    {
      id: 'telemetry',
      name: 'Desativação de Telemetria & Rastreamento',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Desativa DiagTrack, dmwappushservice e define políticas de bloqueio de dados de diagnóstico.',
      where: 'Serviços do Windows e HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
      benefit: 'Impede o envio de logs para servidores da Microsoft e reduz uso contínuo de disco.',
    },
    {
      id: 'bloatware',
      name: 'Remoção de Bloatwares de Fábrica',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Desinstala aplicativos não solicitados (Cortana, BingWeather, 3DViewer, Solitaire, etc.) via AppX.',
      where: 'Windows AppX Package Manager',
      benefit: 'Limpa o menu Iniciar e diminui o número de processos em execução em segundo plano.',
    },
    {
      id: 'orphan_tasks',
      name: 'Remoção de Tarefas Agendadas Órfãs',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Varre o Agendador de Tarefas e exclui as que apontam para caminhos de arquivos que já não existem no disco.',
      where: 'Windows Task Scheduler (schtasks)',
      benefit: 'Evita erros invisíveis constantes no log de eventos do Windows.',
    },
    {
      id: 'win_update',
      name: 'Reparo do Windows Update',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Interrompe serviços de atualização, apaga SoftwareDistribution e catroot2 corrompidos e restabelece os serviços.',
      where: 'C:\\Windows\\SoftwareDistribution e catroot2',
      benefit: 'Destrava atualizações travadas e resolve erros comuns de download.',
    },
    {
      id: 'sfc_dism',
      name: 'Integridade de Arquivos (SFC & DISM)',
      category: 'system',
      categoryLabel: 'Sistema',
      securityRating: 'safe',
      action: 'Executa sfc /scannow e dism /Online /Cleanup-Image /RestoreHealth de forma oculta.',
      where: 'WRP (Windows Resource Protection) e Repositório de Componentes',
      benefit: 'Substitui arquivos DLL corrompidos por versões originais intactas da imagem do Windows.',
    },
    {
      id: 'winutil',
      name: 'Chris Titus WinUtil',
      category: 'tools',
      categoryLabel: 'Comunidade',
      securityRating: 'safe',
      action: 'Inicia a ferramenta oficial e mantida pela comunidade open-source para instalação de programas e tweaks visuais.',
      where: 'Console do PowerShell e Interface WPF',
      benefit: 'Acesso a uma biblioteca imensa de aplicativos populares e utilitários de sistema.',
    },
    {
      id: 'ooshutup',
      name: 'O&O ShutUp10++',
      category: 'tools',
      categoryLabel: 'Comunidade',
      securityRating: 'safe',
      action: 'Baixa o executável portátil assinado digitalmente da O&O Software e inicia a interface de controle de privacidade.',
      where: '%TEMP%\\OOSU10.exe',
      benefit: 'Permite controle fino de privacidade, câmera, localização e telemetria por botões de alternância coloridos.',
    },
  ], []);

  const filteredItems = useMemo(() => {
    return wikiItems.filter((item) => {
      const matchCat = filterCategory === 'all' || item.category === filterCategory;
      const matchSearch =
        search.trim() === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.where.toLowerCase().includes(search.toLowerCase()) ||
        item.benefit.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [wikiItems, search, filterCategory]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-neutral-100">
            {t('wiki_title')}
          </h2>
        </div>
        <p className="text-xs text-neutral-400">
          {t('wiki_subtitle')}
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('wiki_search')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todas as Funções' },
            { id: 'clean', label: 'Limpeza' },
            { id: 'gamer', label: 'Gamer' },
            { id: 'system', label: 'Sistema' },
            { id: 'tools', label: 'Comunidade' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Counter */}
      <div className="text-[11px] text-neutral-400">
        Exibindo <strong className="text-neutral-200">{filteredItems.length}</strong> {t('wiki_count')}.
      </div>

      {/* Grid of Wiki Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isSafe = item.securityRating === 'safe';

          return (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {item.categoryLabel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSafe
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {isSafe ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    {isSafe ? 'Seguro' : 'Avançado'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-neutral-100 mb-2">
                  {item.name}
                </h3>

                <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                  {item.action}
                </p>

                <div className="space-y-2 pt-2 border-t border-neutral-800/60 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Onde atua no Windows:
                    </span>
                    <span className="text-blue-300 font-mono text-[10px]">{item.where}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Benefício prático:
                    </span>
                    <span className="text-emerald-300/90 text-xs">{item.benefit}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* About Section */}
      <div className="mt-12 p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100">{t('about_title')}</h3>
            <p className="text-xs text-neutral-400">{t('about_version')}</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          {t('about_desc')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
            <span className="text-[10px] text-neutral-400 block">{t('about_stack_title')}</span>
            <span className="font-bold text-neutral-200">Rust (Tauri v2) + Next.js 16</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
            <span className="text-[10px] text-neutral-400 block">{t('about_author')}</span>
            <span className="font-bold text-neutral-200">Comunidade Open-Source</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
            <span className="text-[10px] text-neutral-400 block">{t('about_license')}</span>
            <span className="font-bold text-neutral-200">MIT Open Source</span>
          </div>
        </div>
      </div>
    </div>
  );
}
