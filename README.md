<div align="center">

<img src="public/assets/branding/logo-transparent.png" alt="System Optimizer" width="128" height="128" />

# System Optimizer

**Utilitário nativo de diagnóstico, ajuste de latência e manutenção profunda para Windows 10 e 11.**

[![Release](https://img.shields.io/badge/release-v5.0-1d4ed8?style=flat-square)](https://github.com/jefheee/system-optimizer-tool/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0284c7?style=flat-square)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)](LICENSE)
[![Architecture](https://shields.io)](https://tauri.app)

</div>

---

O **System Optimizer** centraliza rotinas de diagnóstico de hardware em tempo real, mitigação de latência de entrada para jogos, limpeza granular de disco, gerenciamento de privacidade e automação pós-formatação.

Originalmente concebido como uma rotina em lote para manutenção técnica, o projeto foi reconstruído na versão 5.0 com um backend compilado nativamente em **Rust (Tauri v2)** conectado a uma interface reativa em **Next.js e React**. As operações executam diretamente contra as APIs de baixo nível do Windows (`Win32`, `ntdll.dll`, `psapi.dll`, WMI e manipulação segura de Registro em 64 bits), sem depender de consoles abertos em segundo plano.

---

## Destaques da Versão 5.0

- **Diagnóstico e Telemetria de Hardware**
  Leitura detalhada de CPU, GPU, canais e frequência de memória RAM, integridade de discos (SSD/NVMe com detecção TRIM), placas de rede e telas conectadas. Inclui pontuação de auditoria de sistema e exportação de relatórios em JSON, TXT e Markdown estruturado.

- **Baixa Latência e Otimizações Gamer**
  Ajuste do temporizador do sistema para resolução de 0.5 ms (`timeBeginPeriod` / `NtSetTimerResolution`), esvaziamento seguro do working set de memória via rotina controlada, otimização da pilha de rede TCP/IP, desativação de Fullscreen Optimizations e mitigação de VBS.

- **Limpeza Profunda e Gestão de Espaço**
  Limpeza seletiva de cache de shaders (DirectX, NVIDIA, AMD), logs do sistema, arquivos temporários de usuário e de sistema, remoção de instalações anteriores do Windows (`Windows.old`) e gerenciamento da hibernação (`hiberfil.sys`).

- **Privacidade, Segurança e Sistema**
  Desativação de telemetria diagnóstica invasiva, remoção de bloatware nativo e do OneDrive, reparo da pilha do Windows Update (`DISM` e `SFC`), restauração de menus de contexto clássicos e benchmark integrado de servidores DNS.

- **Perfis em Um Clique**
  Configurações prontas para uso corporativo, notebooks (foco em autonomia e conservação térmica), uso balanceado do dia a dia e estações dedicadas a jogos e alta performance.

- **Transparência Técnica Integral**
  Cada modificação exibe as chaves de registro afetadas, os comandos invocados, os benefícios práticos esperados e a instrução exata para reversão.

---

## Arquitetura do Repositório

```
System-Optimizer-Tool/
├── gui/                      # Interface moderna e núcleo desktop
│   ├── app/                  # Rotas e páginas do Next.js
│   ├── components/           # Módulos da UI (Dashboard, Gamer, Clean, Presets, etc.)
│   ├── lib/                  # Camada de comunicação IPC e i18n
│   └── src-tauri/            # Backend nativo em Rust
│       ├── src/              # Módulos Rust (clean, diagnostics, gamer, system, presets)
│       └── tauri.conf.json   # Configuração de empacotamento desktop
├── src/                      # Bibliotecas modulares legadas em PowerShell
│   ├── core/                 # Gestores de idioma e renderizadores de console
│   ├── modules/              # Lógicas originais de limpeza, gamer e sistema
│   └── utils/                # Utilitários auxiliares Win32 e downloaders
├── cli/                      # Lançador de terminal histórico (compatibilidade legada)
└── public/                   # Recursos visuais e logotipos
```

---

## Compilação e Execução

### Pré-requisitos

1. **[Node.js](https://nodejs.org/)** (v18 ou superior)
2. **[Rust & Cargo](https://www.rust-lang.org/tools/install)** (versão stable atual)
3. **[Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)** (com suporte a desenvolvimento desktop para C++)

### Ambiente de Desenvolvimento

Clone o repositório e acerte as dependências dentro do diretório `gui`:

```bash
git clone https://github.com/jefheee/system-optimizer-tool.git
cd system-optimizer-tool/gui
npm install
```

Inicie o servidor de desenvolvimento integrado com o binário nativo do Tauri:

```bash
npm run tauri dev
```

### Gerando o Instalador de Produção

Para gerar o executável final otimizado (`.exe` com instalador NSIS/MSI e sem console de depuração):

```bash
cd gui
npm run tauri build
```

O binário final e os instaladores serão gerados em:
```
gui/src-tauri/target/release/
```

---

## Filosofia de Segurança

Todas as operações executadas pelo utilitário respeitam as diretrizes de integridade do sistema operacional:

1. **Sem Ofuscação:** O código-fonte dos scripts e dos módulos Rust é aberto e auditável.
2. **Reversibilidade:** Modificações de registro e serviços possuem rotinas de reversão documentadas na aba de documentação interna.
3. **Ponto de Restauração:** O aplicativo permite criar pontos de restauração do Windows com um clique antes de aplicar alterações extensas.

---

## Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
