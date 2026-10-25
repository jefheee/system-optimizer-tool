<div align="center">

<img src="public/assets/branding/logo-transparent.png" alt="System Optimizer" width="128" height="128" />

# System Optimizer

**Native utility for diagnostics, latency tuning, and deep maintenance for Windows 10 and 11.**

[![Release](https://img.shields.io/badge/release-v5.0-1d4ed8?style=flat-square)](https://github.com/jefheee/system-optimizer-tool/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0284c7?style=flat-square)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)](LICENSE)
[![Architecture](https://img.shields.io/badge/stack-Rust%20%7C%20Tauri%20v2%20%7C%20TypeScript%20%7C%20Next.js-64748b?style=flat-square)](https://tauri.app)

</div>

---

**System Optimizer** centralizes real-time hardware diagnostic routines, input latency mitigation for gaming, granular disk cleaning, privacy management, and post-formatting automation.

Originally conceived as a batch routine for technical maintenance, the project was rebuilt in version 5.0 with a natively compiled backend in **Rust (Tauri v2)** connected to a reactive interface in **TypeScript, Next.js, and React**. Operations run directly against low-level Windows APIs (`Win32`, `ntdll.dll`, `psapi.dll`, WMI, and secure 64-bit Registry manipulation), without relying on open consoles in the background.

---

## Version 5.0 Highlights

- **Hardware Diagnostics and Telemetry**
  Detailed reading of CPU, GPU, RAM channels and frequency, disk health (SSD/NVMe with TRIM detection), network cards, and connected displays. Includes system audit scoring and report exporting in structured JSON, TXT, and Markdown.

- **Low Latency and Gamer Optimizations**
  System timer adjustment for 0.5 ms resolution (`timeBeginPeriod` / `NtSetTimerResolution`), safe memory working set emptying via controlled routine, TCP/IP network stack optimization, Fullscreen Optimizations disablement, and VBS mitigation.

- **Deep Cleaning and Space Management**
  Selective cleaning of shader caches (DirectX, NVIDIA, AMD), system logs, user and system temporary files, removal of previous Windows installations (`Windows.old`), and hibernation management (`hiberfil.sys`).

- **Privacy, Security, and System**
  Disabling invasive diagnostic telemetry, native bloatware and OneDrive removal, Windows Update stack repair (`DISM` and `SFC`), restoration of classic context menus, and integrated DNS server benchmark.

- **One-Click Presets**
  Ready-to-use configurations for corporate use, laptops (focus on battery life and thermal conservation), balanced daily use, and dedicated gaming and high-performance stations.

- **Full Technical Transparency**
  Each modification displays the affected registry keys, invoked commands, expected practical benefits, and the exact instruction for reversal.

---

## Repository Architecture

```text
System-Optimizer-Tool/
├── gui/                      # Modern TypeScript / Next.js interface and desktop core
│   ├── app/                  # Next.js routes and pages
│   ├── components/           # UI Modules (Dashboard, Gamer, Clean, Presets, etc.)
│   ├── lib/                  # Typed IPC communication and i18n layer
│   └── src-tauri/            # Native Rust backend
│       ├── src/              # Rust modules (clean, diagnostics, gamer, system, presets)
│       └── tauri.conf.json   # Desktop bundling configuration
├── src/                      # Legacy modular libraries in PowerShell
│   ├── core/                 # Language managers and console renderers
│   ├── modules/              # Original cleaning, gamer, and system logics
│   └── utils/                # Auxiliary Win32 utilities and downloaders
├── cli/                      # Historical terminal launcher (legacy compatibility)
└── public/                   # Visual assets and logos
