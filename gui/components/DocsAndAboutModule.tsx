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
  Award,
  Terminal,
  Cpu,
  ChevronLeft,
  ChevronRight,
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
  revert: string;
}

export default function DocsAndAboutModule() {
  const { t } = useLanguage();
  const { theme } = useSettings();
  const [subTab, setSubTab] = useState<'wiki' | 'about'>('wiki');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const wikiItems: WikiItem[] = useMemo(
    () => [
      // CLEAN (6)
      {
        id: 'deep_clean',
        name: 'Limpeza Profunda (SSD/NVMe)',
        category: 'clean',
        categoryLabel: t('docs_filter_clean'),
        securityRating: 'safe',
        action: 'Varre e remove arquivos temporários, logs, caches do Windows Update e navegadores Chromium, esvazia lixeira e dispara TRIM no drive C:.',
        where: '%TEMP%, C:\\Windows\\Prefetch, C:\\Windows\\SoftwareDistribution\\Download, Caches de Chrome/Edge/Brave',
        benefit: 'Libera de 5 GB a 25 GB de armazenamento, remove travas de arquivos e otimiza velocidade de gravação em blocos flash.',
        revert: 'Automático — o Windows recria apenas os caches necessários sob demanda.',
      },
      {
        id: 'lite_clean',
        name: 'Limpeza Rápida (Lite)',
        category: 'clean',
        categoryLabel: t('docs_filter_clean'),
        securityRating: 'safe',
        action: 'Limpa arquivos temporários do usuário (%TEMP%) e esvazia a lixeira nativamente via SHEmptyRecycleBinW.',
        where: '%LOCALAPPDATA%\\Temp e Lixeira do Windows (Win32 Shell API)',
        benefit: 'Limpeza ágil sem desgaste mecânico em discos magnéticos (HDDs) e sem apagar sessões de navegador.',
        revert: 'Não requer reversão — remove apenas lixo temporário descartável.',
      },
      {
        id: 'hibernation',
        name: 'Hibernação do Windows (hiberfil.sys)',
        category: 'clean',
        categoryLabel: t('docs_filter_clean'),
        securityRating: 'safe',
        action: 'Desativa o arquivo de hibernação via powercfg.exe /hibernate off.',
        where: 'C:\\hiberfil.sys e ACPI Power Manager',
        benefit: 'Recupera imediatamente entre 8 GB e 32 GB de espaço contínuo no volume C:.',
        revert: 'Clique no botão "Ativar Hibernação" na aba Limpeza ou execute powercfg /hibernate on.',
      },
      {
        id: 'windows_old',
        name: 'Instalações Anteriores (Windows.old & WinSxS)',
        category: 'clean',
        categoryLabel: t('docs_filter_clean'),
        securityRating: 'safe',
        action: 'Exclui pastas residuais de grandes updates (Windows.old, $Windows.~BT) e executa StartComponentCleanup no WinSxS via DISM.',
        where: 'C:\\Windows.old e repositório C:\\Windows\\WinSxS',
        benefit: 'Elimina de 10 GB a 40 GB de versões obsoletas de arquivos do Windows após atualizações estáveis.',
        revert: 'Operação definitiva de limpeza de versões antigas de updates.',
      },
      {
        id: 'trim_ssd',
        name: 'Otimização TRIM Nativa para SSD/NVMe',
        category: 'clean',
        categoryLabel: t('docs_filter_clean'),
        securityRating: 'safe',
        action: 'Dispara o comando ReTrim (defrag C: /O /L) informando à controladora NAND quais blocos livres podem ser reciclados.',
        where: 'Controladora NVMe/SATA AHCI e Sistema de Arquivos NTFS',
        benefit: 'Evita queda de velocidade de gravação e prolonga a vida útil das células flash.',
        revert: 'Operação de manutenção nativa do SSD; não altera configurações.',
      },
      {
        id: 'junk_scanner',
        name: 'Scanner de Auditoria de Lixo Acumulado',
        category: 'clean',
        categoryLabel: t('docs_filter_clean'),
        securityRating: 'safe',
        action: 'Calcula de forma assíncrona o tamanho total de %TEMP%, %WINDIR%\\Temp, Prefetch e D3DSCache sem apagar arquivos.',
        where: 'Sistema de arquivos local (Somente Leitura)',
        benefit: 'Mostra exatamente quantos megabytes/gigabytes podem ser recuperados antes de limpar.',
        revert: 'Operação 100% passiva (somente leitura).',
      },

      // GAMER (12)
      {
        id: 'timer_res',
        name: 'Resolução de Timer do Kernel (0.5ms)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Chama NtSetTimerResolution em ntdll.dll para ajustar o agendador do Windows de 15.6ms para 0.5ms (5000 unidades de 100ns).',
        where: 'ntdll.dll e Kernel Timer Dispatcher',
        benefit: 'Diminui o atraso entre comandos do jogador (cliques e teclas) e a renderização do frame na tela.',
        revert: 'Clique em "Restaurar Padrão" na aba Gamer ou feche o aplicativo.',
      },
      {
        id: 'ultimate_plan',
        name: 'Plano Desempenho Máximo (Ultimate Performance)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Desbloqueia e ativa o esquema de energia OEM e9a42b02-d5df-448d-aa00-03f14749eb61 via powercfg.',
        where: 'powercfg.exe e Políticas ACPI de CPU',
        benefit: 'Impede núcleos de entrarem em estados C-States de economia, eliminando oscilações de clock e micro-stutters.',
        revert: 'Altere para o plano "Equilibrado" no Painel de Controle > Opções de Energia.',
      },
      {
        id: 'ram_flush',
        name: 'Flush Imediato de Memória RAM',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Itera pelos processos com EnumProcesses e chama K32EmptyWorkingSet em cada PID para liberar páginas ociosas.',
        where: 'Win32 Process Status API (K32EmptyWorkingSet)',
        benefit: 'Devolve centenas de megabytes de memória RAM para o sistema sem reiniciar o computador ou fechar aplicativos.',
        revert: 'Automático — o gerenciador de memória do Windows realoca páginas conforme os programas precisarem.',
      },
      {
        id: 'ram_autoclean',
        name: 'Job Auto-Limpeza de RAM (Ciclo de 10min)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Cria uma tarefa assíncrona gerenciada pelo Tokio que executa o Working Set Flush a cada 600 segundos.',
        where: 'Tokio Async Runtime em Rust & Win32 Memory API',
        benefit: 'Mantém a memória física livre durante sessões contínuas de jogos longos e pesados.',
        revert: 'Clique em "Parar Job" no card de Auto-Limpeza de RAM.',
      },
      {
        id: 'process_freezer',
        name: 'Process Freezer (Top Consumidores de RAM/CPU)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Lista os 8 processos não-críticos de usuário que mais consomem memória RAM e permite encerrá-los em 1 clique.',
        where: 'Tabela de Processos do Usuário (sysinfo / Win32 TerminateProcess)',
        benefit: 'Libera instantaneamente gigabytes ocupados por navegadores ou launchers pesados antes de jogar.',
        revert: 'Basta abrir novamente o aplicativo que foi encerrado.',
      },
      {
        id: 'vbs_toggle',
        name: 'Isolamento de Núcleo / VBS (Virtualization-Based Security)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'advanced',
        action: 'Configura o hypervisorlaunchtype como off no Boot Configuration Data (BCD) do Windows via bcdedit.',
        where: 'BCD (Boot Configuration Data) / Hyper-V Virtualization',
        benefit: 'Gera ganhos de 5% a 15% em 1% low FPS em jogos competitivos ao desativar a sobrecarga de virtualização.',
        revert: 'Clique no botão "Reativar VBS" (hypervisorlaunchtype auto) e reinicie o PC.',
      },
      {
        id: 'mouse_opt',
        name: 'Mouse 1:1 Sem Aceleração (Raw Input)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Zera MouseSpeed, MouseThreshold1 e MouseThreshold2 no registro do usuário.',
        where: 'HKCU\\Control Panel\\Mouse',
        benefit: 'A mira do mouse passa a se mover em proporção linear perfeita aos movimentos físicos da sua mão.',
        revert: 'Marque "Aprimorar precisão do ponteiro" nas Propriedades do Mouse do Windows.',
      },
      {
        id: 'kbd_opt',
        name: 'Taxa de Repetição do Teclado 150ms',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Define AutoRepeatDelay=150, BounceTime=0 e KeyboardDelay=0 no registro do usuário.',
        where: 'HKCU\\Control Panel\\Accessibility\\Keyboard Response',
        benefit: 'Reduz o tempo de espera para repetição de teclas em strafing e digitação rápida.',
        revert: 'Restaure o atraso de repetição padrão nas Propriedades do Teclado no Painel de Controle.',
      },
      {
        id: 'tcp_nodelay',
        name: 'TCP NoDelay & Algoritmo de Nagle Off',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Configura TcpAckFrequency=1 e TCPNoDelay=1 nas interfaces ativas com endereço IP.',
        where: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces',
        benefit: 'Despacha pacotes de rede imediatamente sem esperar acumular buffers, diminuindo jitter em jogos online.',
        revert: 'Use o botão "Redefinir Pilha de Rede Completa" na aba Sistema.',
      },
      {
        id: 'fso_gamedvr',
        name: 'Desativação de GameDVR & Otimizações de Tela Cheia (FSO)',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Desativa AppCaptureEnabled, GameDVR_Enabled e define GameDVR_FSEBehaviorMode=2 no GameConfigStore.',
        where: 'HKCU\\System\\GameConfigStore e HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR',
        benefit: 'Garante que o jogo tenha acesso exclusivo de apresentação à GPU, eliminando sobreposições lentas.',
        revert: 'Reative a Gravação em Segundo Plano nas Configurações > Jogos > Capturas do Windows.',
      },
      {
        id: 'shader_cache',
        name: 'Reset de Cache de Shaders DirectX / NVIDIA / AMD',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Esvazia diretórios D3DSCache, DXCache e caches de compilação da NVIDIA e AMD em LocalAppData.',
        where: '%LOCALAPPDATA%\\D3DSCache, NVIDIA\\DXCache, AMD\\DxCache',
        benefit: 'Resolve travamentos e stutterings causados por shaders compilados corrompidos após atualização de drivers.',
        revert: 'Automático — a placa de vídeo recompila shaders limpos na próxima abertura do jogo.',
      },
      {
        id: 'game_prio_defender',
        name: 'Prioridade Alta de CPU por Jogo & Exclusão no Defender',
        category: 'gamer',
        categoryLabel: t('docs_filter_gamer'),
        securityRating: 'safe',
        action: 'Configura CpuPriorityClass=3 no IFEO para o .exe do jogo e adiciona a pasta do jogo em Add-MpPreference -ExclusionPath.',
        where: 'HKLM\\...\\Image File Execution Options e Windows Defender Antivirus',
        benefit: 'Garante fatia prioritária de tempo de CPU ao jogo e evita varreduras de antivírus durante o carregamento de mapas.',
        revert: 'Remova a chave do executável em Image File Execution Options ou remova a exclusão na Segurança do Windows.',
      },

      // SYSTEM, NETWORK & PRIVACY (17)
      {
        id: 'post_format_ext',
        name: 'Checklist: Mostrar Extensões de Arquivos (.exe, .png)',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Altera o valor DWORD HideFileExt para 0 nas configurações avançadas do Windows Explorer.',
        where: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced (HideFileExt)',
        benefit: 'Segurança e produtividade: exibe a verdadeira extensão de todos os arquivos, prevenindo trojans disfarçados de PDF/JPG.',
        revert: 'Desligue o switch correspondente no Checklist Pós-Formatação (volta HideFileExt=1).',
      },
      {
        id: 'post_format_hidden',
        name: 'Checklist: Mostrar Arquivos e Pastas Ocultas',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Configura o valor DWORD Hidden=1 na chave Explorer\\Advanced.',
        where: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced (Hidden)',
        benefit: 'Permite acessar diretamente pastas técnicas como AppData e ProgramData no Explorer.',
        revert: 'Desligue o switch correspondente no Checklist Pós-Formatação (volta Hidden=2).',
      },
      {
        id: 'post_format_bing',
        name: 'Checklist: Desativar Busca Web do Bing no Menu Iniciar',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Define DisableSearchBoxSuggestions=1 e BingSearchEnabled=0 no registro do usuário.',
        where: 'HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer e HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search',
        benefit: 'Torna a pesquisa do Menu Iniciar instantânea e 100% local, sem abrir o Edge por engano.',
        revert: 'Desligue o switch correspondente no Checklist Pós-Formatação.',
      },
      {
        id: 'startup_manager',
        name: 'Gerenciador de Programas de Inicialização (Startup Apps)',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Lê todas as entradas de inicialização em HKCU e HKLM Run e permite excluir entradas desnecessárias em 1 clique.',
        where: 'HKCU\\...\\CurrentVersion\\Run e HKLM\\...\\CurrentVersion\\Run',
        benefit: 'Reduz drasticamente o tempo de boot do Windows e economiza RAM logo ao ligar o PC.',
        revert: 'Reative a inicialização automática dentro das preferências do próprio aplicativo.',
      },
      {
        id: 'energy_battery_report',
        name: 'Diagnóstico Oficial de Energia & Bateria (HTML)',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Executa powercfg /batteryreport (em Notebooks) ou powercfg /energy /duration 5 (em Desktops) e abre o HTML gerado.',
        where: 'Subsistema ACPI do Windows (powercfg.exe)',
        benefit: 'Exibe histórico completo de capacidade de fábrica vs. carga atual da bateria ou alertas de eficiência energética.',
        revert: 'Operação de diagnóstico (gera apenas um arquivo HTML de leitura em %TEMP%).',
      },
      {
        id: 'restore_point',
        name: 'Criar Ponto de Restauração do Sistema',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Habilita a proteção do sistema no drive C: e invoca Checkpoint-Computer -RestorePointType MODIFY_SETTINGS.',
        where: 'VSS (Volume Shadow Copy Service) e Registro do Windows',
        benefit: 'Segurança absoluta para reverter o sistema para um ponto anterior caso necessário.',
        revert: 'Use o utilitário rstrui.exe (Restauração do Sistema) para aplicar o ponto salvo.',
      },
      {
        id: 'dns_bench',
        name: 'Benchmark & Otimização Automática de DNS',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Mede a latência TCP na porta 53 para Cloudflare (1.1.1.1), Google (8.8.8.8), Quad9 e OpenDNS e aplica o mais rápido.',
        where: 'Configurações de DNS IPv4 da interface de rede ativa',
        benefit: 'Resolução de domínios e abertura de páginas web com menor tempo de resposta.',
        revert: 'Use o botão "Restaurar Rede" para voltar ao DNS automático via DHCP.',
      },
      {
        id: 'net_reset',
        name: 'Redefinição Completa da Pilha de Rede',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Executa netsh winsock reset, netsh int ip reset, ipconfig /release, /renew e /flushdns.',
        where: 'Catálogo Winsock e Drivers TCP/IP',
        benefit: 'Corrige quedas de conexão, conflitos de IP e sockets corrompidos por VPNs.',
        revert: 'Define o estado padrão original de fábrica da pilha de rede do Windows.',
      },
      {
        id: 'classic_menu',
        name: 'Menu de Contexto Clássico (Windows 11)',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Registra o CLSID {86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32 no HKCU e reinicia o Explorer.',
        where: 'HKCU\\Software\\Classes\\CLSID e Windows Explorer',
        benefit: 'Exibe todas as opções do clique direito imediatamente sem clicar em "Mostrar mais opções".',
        revert: 'Clique no botão "Menu Padrão Win11" ou desligue o switch no Checklist.',
      },
      {
        id: 'telemetry',
        name: 'Desativação de Telemetria & Coleta de Dados',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Para e desativa os serviços DiagTrack e dmwappushservice e grava AllowTelemetry=0 nas políticas locais.',
        where: 'Serviços do Windows e HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
        benefit: 'Impede envio contínuo de diagnósticos em segundo plano, reduzindo uso de disco e rede.',
        revert: 'Desligue o switch de Telemetria no Checklist Pós-Formatação.',
      },
      {
        id: 'bloatware',
        name: 'Remoção de Bloatware Pré-Instalado',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Remove pacotes AppX pré-instalados não essenciais (BingNews, BingWeather, Solitaire, People, FeedbackHub, etc.).',
        where: 'Windows AppX Package Manager',
        benefit: 'Desocupa espaço em disco e reduz processos suspensos do Menu Iniciar.',
        revert: 'Qualquer aplicativo removido pode ser reinstalado gratuitamente pela Microsoft Store.',
      },
      {
        id: 'orphan_tasks',
        name: 'Limpeza de Tarefas Agendadas Órfãs',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Inspeciona o Agendador de Tarefas e remove tarefas de terceiros cujo arquivo executável não existe mais no disco.',
        where: 'Windows Task Scheduler',
        benefit: 'Elimina erros silenciosos de inicialização deixados por programas desinstalados.',
        revert: 'Remove apenas tarefas quebradas que apontam para caminhos inexistentes.',
      },
      {
        id: 'win_update',
        name: 'Reparo Completo do Windows Update',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Pausa wuauserv/bits/cryptsvc, limpa caches corrompidos em SoftwareDistribution e catroot2 e reinicia os serviços.',
        where: 'C:\\Windows\\SoftwareDistribution e C:\\Windows\\System32\\catroot2',
        benefit: 'Destrava atualizações do Windows presas em 0% ou com código de erro.',
        revert: 'Os serviços voltam a rodar limpa e automaticamente ao final do processo.',
      },
      {
        id: 'sfc_dism',
        name: 'Verificação de Integridade (SFC & DISM)',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Executa DISM /Online /Cleanup-Image /RestoreHealth seguido de sfc /scannow.',
        where: 'Windows Component Store (WinSxS) e System32',
        benefit: 'Detecta e substitui DLLs corrompidas do sistema por cópias íntegras oficiais.',
        revert: 'Mantém o sistema operacional em seu estado original íntegro.',
      },
      {
        id: 'store_onedrive_drivers',
        name: 'Restaurar Store, Remover OneDrive & Backup de Drivers',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Re-registra a Microsoft Store via AppXManifest, desinstala OneDriveSetup.exe ou exporta drivers via Export-WindowsDriver.',
        where: 'AppX, OneDrive e C:\\Backup_Drivers',
        benefit: 'Recupera a loja oficial, elimina sincronização indesejada em nuvem e salva todos os seus drivers para formatação.',
        revert: 'O OneDrive pode ser reinstalado pelo site da Microsoft; os drivers ficam salvos em C:\\Backup_Drivers.',
      },
      {
        id: 'font_bt_ownership',
        name: 'Cache de Fontes, Bluetooth & Menu Tomar Posse',
        category: 'system',
        categoryLabel: t('docs_filter_system'),
        securityRating: 'safe',
        action: 'Limpa FontCache, reinicia bthserv/Bluetooth e adiciona o comando "Tomar Posse" (takeown/icacls) no clique direito.',
        where: 'Serviços FontCache/bthserv e HKCR\\*\\shell\\runas',
        benefit: 'Corrige textos borrados, reconecta fones Bluetooth e libera acesso a pastas com erro de permissão.',
        revert: 'Clique novamente no botão "Remover" do Menu Tomar Posse.',
      },

      // COMMUNITY TOOLS (6)
      {
        id: 'winutil',
        name: 'Chris Titus WinUtil',
        category: 'tools',
        categoryLabel: t('docs_filter_tools'),
        securityRating: 'safe',
        action: 'Inicia a suíte gráfica oficial mantida pela comunidade open-source (irm https://christitus.com/win | iex).',
        where: 'PowerShell & Interface WPF',
        benefit: 'Instalação em lote de dezenas de programas essenciais e ajustes avançados do Windows.',
        revert: 'Possui botão "Undo All Tweaks" dentro da própria interface do WinUtil.',
      },
      {
        id: 'mas_activator',
        name: 'Microsoft Activation Scripts (MAS)',
        category: 'tools',
        categoryLabel: t('docs_filter_tools'),
        securityRating: 'safe',
        action: 'Executa o script open-source oficial da comunidade Massgrave (irm https://get.activated.win | iex).',
        where: 'Subsistema de Licenciamento do Windows (slmgr / sppsvc)',
        benefit: 'Verificação e ativação limpa via licença digital HWID sem binários modificados.',
        revert: 'Gerenciado diretamente pelo menu interativo do script.',
      },
      {
        id: 'ooshutup',
        name: 'O&O ShutUp10++',
        category: 'tools',
        categoryLabel: t('docs_filter_tools'),
        securityRating: 'safe',
        action: 'Baixa o executável portátil oficial assinado pela O&O Software GmbH e o executa diretamente.',
        where: '%TEMP%\\OOSU10.exe',
        benefit: 'Controle visual detalhado sobre mais de 100 políticas de privacidade, Copilot, Recall e telemetria.',
        revert: 'No menu Actions do O&O ShutUp10++, clique em "Undo all changes" (Desfazer todas as alterações).',
      },
      {
        id: 'winget_all',
        name: 'Atualizador Global de Programas (Winget)',
        category: 'tools',
        categoryLabel: t('docs_filter_tools'),
        securityRating: 'safe',
        action: 'Executa winget upgrade --all --include-unknown --accept-package-agreements.',
        where: 'Gerenciador Oficial de Pacotes do Windows (winget.exe)',
        benefit: 'Mantém todos os programas do PC atualizados com 1 clique sem precisar entrar em sites de download.',
        revert: 'Cada programa pode ser gerenciado individualmente em Aplicativos Instalados.',
      },
      {
        id: 'adwcleaner',
        name: 'Malwarebytes AdwCleaner Portable',
        category: 'tools',
        categoryLabel: t('docs_filter_tools'),
        securityRating: 'safe',
        action: 'Baixa e executa o scanner portátil oficial da Malwarebytes focado em adwares, PUPs e sequestradores de navegador.',
        where: '%TEMP%\\adwcleaner.exe',
        benefit: 'Remove extensões maliciosas e programas indesejados sem instalar antivírus residente pesado.',
        revert: 'Itens colocados em quarentena podem ser restaurados na aba Quarantine do AdwCleaner.',
      },
      {
        id: 'hw_monitors',
        name: 'Monitores de Hardware Inteligentes (CPU-Z, HWMonitor, GPU-Z)',
        category: 'tools',
        categoryLabel: t('docs_filter_tools'),
        securityRating: 'safe',
        action: 'Detecta automaticamente se a ferramenta já está instalada no disco/Registro para abri-la em 0s, ou instala via Winget.',
        where: 'Arquivos de Programas / Winget Repository',
        benefit: 'Acesso imediato a sensores térmicos, tensões Vcore/12V e timings de memória.',
        revert: 'Podem ser desinstalados a qualquer momento pelo Painel de Controle.',
      },
    ],
    [t]
  );

  const filteredItems = useMemo(() => {
    return wikiItems.filter((item) => {
      const matchCat = filterCategory === 'all' || item.category === filterCategory;
      const itemName = t(`wiki_${item.id}_name`, item.name);
      const itemAction = t(`wiki_${item.id}_action`, item.action);
      const itemBenefit = t(`wiki_${item.id}_benefit`, item.benefit);
      const itemWhere = t(`wiki_${item.id}_where`, item.where);
      const matchSearch =
        search.trim() === '' ||
        itemName.toLowerCase().includes(search.toLowerCase()) ||
        itemWhere.toLowerCase().includes(search.toLowerCase()) ||
        itemBenefit.toLowerCase().includes(search.toLowerCase()) ||
        itemAction.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [wikiItems, search, filterCategory, t]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Sub-Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-neutral-100">{t('wiki_title')}</h2>
          </div>
          <p className="text-xs text-neutral-400">{t('wiki_subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
          <button
            onClick={() => setSubTab('wiki')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'wiki'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('docs_tab_wiki')}
          </button>
          <button
            onClick={() => setSubTab('about')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'about'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('docs_tab_about')}
          </button>
        </div>
      </div>

      {subTab === 'wiki' ? (
        <div className="space-y-5">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('wiki_search')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: t('docs_filter_all') },
                { id: 'clean', label: t('docs_filter_clean') },
                { id: 'gamer', label: t('docs_filter_gamer') },
                { id: 'system', label: t('docs_filter_system') },
                { id: 'tools', label: t('docs_filter_tools') },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setFilterCategory(cat.id);
                    setPage(1);
                  }}
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
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <div>
              {t('docs_showing')} <strong className="text-neutral-200">{filteredItems.length}</strong> {t('wiki_count')}.
            </div>
            {totalPages > 1 && (
              <div>
                Página <strong className="text-neutral-200">{currentPage}</strong> de <strong className="text-neutral-200">{totalPages}</strong>
              </div>
            )}
          </div>

          {/* Grid of Paginated Wiki Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedItems.map((item) => {
              const isSafe = item.securityRating === 'safe';

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {item.categoryLabel}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isSafe
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {isSafe ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {isSafe ? t('docs_risk_safe') : t('docs_risk_advanced')}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-neutral-100 mb-3">{t(`wiki_${item.id}_name`, item.name)}</h3>

                    <div className="space-y-2.5 pt-2 border-t border-neutral-800/60 text-[11px]">
                      {/* Field 1: O que faz exatamente */}
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {t('docs_field_action')}
                        </span>
                        <span className="text-neutral-200 leading-relaxed">{t(`wiki_${item.id}_action`, item.action)}</span>
                      </div>

                      {/* Field 2: Onde atua no Windows */}
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {t('docs_field_where')}
                        </span>
                        <span className="text-neutral-300 font-mono text-[10px]">{t(`wiki_${item.id}_where`, item.where)}</span>
                      </div>

                      {/* Field 3: Benefício prático esperado */}
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          {t('docs_field_benefit')}
                        </span>
                        <span className="text-emerald-300/90 text-xs">{t(`wiki_${item.id}_benefit`, item.benefit)}</span>
                      </div>

                      {/* Field 4: Como reverter */}
                      <div className="pt-1 border-t border-neutral-800/40">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider inline-flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-neutral-400" />
                          {t('docs_field_revert')}
                        </span>
                        <span className="text-neutral-300 block mt-0.5">{t(`wiki_${item.id}_revert`, item.revert)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-800/80 text-xs text-neutral-400">
              <span className="text-[11px]">
                Exibindo página <strong className="text-neutral-200">{currentPage}</strong> de <strong className="text-neutral-200">{totalPages}</strong> ({filteredItems.length} otimizações)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 disabled:opacity-40 disabled:pointer-events-none hover:bg-neutral-800 text-neutral-200 transition-colors flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                      p === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 disabled:opacity-40 disabled:pointer-events-none hover:bg-neutral-800 text-neutral-200 transition-colors flex items-center gap-1 text-xs"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sub-Tab 2: About the Project, Evolution Timeline & Credits */
        <div className="space-y-6">
          {/* Hero Branding Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className={`w-24 h-24 rounded-2xl overflow-hidden border shadow-2xl shrink-0 p-2 flex items-center justify-center ${
                theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-950 border-neutral-700'
              }`}>
                <img
                  src={theme === 'light' ? '/assets/branding/logo-primary-white-bg.jpg' : '/assets/branding/logo-transparent.png'}
                  alt="System Optimizer Tool Official Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {t('about_version')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {t('about_license')}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-neutral-100">{t('about_title')}</h3>
                <p className="text-xs text-neutral-400 font-medium">{t('about_hero_tagline')}</p>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">{t('about_desc')}</p>
              </div>
            </div>

            <button
              onClick={() => openExternalUrl('https://github.com/jefheee/system-optimizer-tool')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-md shadow-blue-600/20 transition-all"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>{t('about_repo_btn')}</span>
            </button>
          </div>

          {/* Evolution Timeline (From .bat -> v58 PowerShell/C# -> v5.0 Rust/Tauri/Next.js) */}
          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-5">
            <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              {t('about_evolution_title')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Era 1 */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {t('about_evo_1_year')}
                  </span>
                  <Terminal className="w-4 h-4 text-neutral-400" />
                </div>
                <h5 className="text-xs font-bold text-neutral-100">{t('about_evo_1_title')}</h5>
                <p className="text-xs text-neutral-400 leading-relaxed">{t('about_evo_1_desc')}</p>
              </div>

              {/* Era 2 */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {t('about_evo_2_year')}
                  </span>
                  <Code2 className="w-4 h-4 text-cyan-400" />
                </div>
                <h5 className="text-xs font-bold text-neutral-100">{t('about_evo_2_title')}</h5>
                <p className="text-xs text-neutral-400 leading-relaxed">{t('about_evo_2_desc')}</p>
              </div>

              {/* Era 3 */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {t('about_evo_3_year')}
                  </span>
                  <Cpu className="w-4 h-4 text-blue-400" />
                </div>
                <h5 className="text-xs font-bold text-neutral-100">{t('about_evo_3_title')}</h5>
                <p className="text-xs text-neutral-300 leading-relaxed">{t('about_evo_3_desc')}</p>
              </div>
            </div>
          </div>

          {/* Credits & Architecture Stack Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">{t('about_author_label')}</span>
                <span className="text-sm font-extrabold text-neutral-100">{t('about_author_name')}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">{t('about_stack_title')}</span>
                <span className="text-sm font-extrabold text-neutral-100">Rust (Tauri v2) + Next.js 16</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">{t('about_license')}</span>
                <span className="text-sm font-extrabold text-neutral-100">MIT Open-Source</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
