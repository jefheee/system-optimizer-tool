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

O **System Optimizer** centraliza rotinas de diagnóstico de hardware em tempo real, mitigação de latência de entrada para jogos, limpeza granular de disco, gerenciamento de privacidade e automação pós-formatação. O projeto foi reconstruído na versão 5.0 com um backend em **Rust (Tauri v2)** e interface em **Next.js e React**.

---

## Destaques da Versão 5.0

- **Diagnóstico e Telemetria:** Leitura detalhada de CPU, GPU, RAM, discos e rede com exportação de relatórios.
- **Otimizações Gamer:** Ajuste do temporizador do sistema para 0.5 ms e otimização de rede TCP/IP.
- **Limpeza Profunda:** Remoção de cache de shaders, arquivos temporários e `Windows.old`.
- **Privacidade e Sistema:** Desativação de telemetria e reparo da pilha do Windows Update.
- **Perfis em Um Clique:** Configurações para jogos, escritório e economia de energia.
- **Transparência:** Exibição das chaves de registro afetadas e instruções de reversão.

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
