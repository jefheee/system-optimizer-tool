# System Optimizer Tool — Engineering & Agent Context

This document establishes repository rules, architecture conventions, and safety boundaries for AI coding agents working in `c:\Projetos\System-Optimizer-Tool`.

## 1. Tech Stack & Architecture
- **Desktop Host / Core Backend:** Tauri v2 (`gui/src-tauri/src/`), Rust (Win32 API via `windows-sys`/`winreg`, PowerShell / WMI / CIM fallbacks, unit tests in `lib.rs`).
- **Frontend UI:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4 (`gui/app/`, `gui/components/`, `gui/lib/`).
- **Private Master Specification:** Located at `docs/internal/MASTER_SPEC.md` (gitignored via `docs/internal/` in `.gitignore`; never commit or publish its raw contents).

## 2. Navigation Standard (Fixed 6 English Tabs)
Top navigation (`gui/components/TopNavbar.tsx`) MUST keep **6 fixed English tabs** regardless of UI language (`PT` / `EN`):
1. `SYS CORE` (`core-overview`, `core-system`, `core-sensors`, `core-benchmarks` — strictly 4 sidebar items in `LeftSidebar.tsx`)
2. `SYS OPTIMIZE` (`opt-presets`, `opt-system`, `opt-debloat`, `opt-clean`, `opt-network`, `opt-startup`)
3. `SYS GAMING` (`game-library`, `game-gpu`, `game-cpu`, `game-overlay`)
4. `SYS TUNING` (`tuning-power`, `tuning-peripherals`, `tuning-sync`, `tuning-sandbox`)
5. `SYS DRIVERS` (`drv-audit`, `drv-apps`, `drv-format`, `drv-maker`)
6. `SYS DOCS` (`docs-encyclopedia`, `docs-bios`, `docs-about`)

Navigation lives in `TopNavbar` + `LeftSidebar`. Do NOT duplicate `LeftSidebar` pills inside module headers except when grouping distinct sub-tools under one consolidated sidebar entry (`BenchmarksModule`, `SyncAndUsbModule`, `SensorsAndStressModule`). Export actions (`Export Full PC Report`) belong outside individual hardware component cards.

## 3. Critical Safety Guardrails (`RestorePointGuard` & Protected Packages)
- **`RestorePointGuard` (`gui/lib/HardwareContext.tsx` & `gui/components/RestorePointModal.tsx`):** Any 1-click preset, debloat, Registry/Service clean, or medium/high risk tweak must pass through `requireRestorePoint(...)`, which checks `get_restore_points_status` for a snapshot created within 24h and prompts automatic creation if missing (with `SystemRestorePointCreationFrequency = 0` unlocked in `gui/src-tauri/src/system.rs`).
- **Protected Windows Packages:** Never remove `Microsoft.EdgeWebView2` / `WebView2Runtime` (breaks Tauri v2) or `VBScript` in `remove_bloatware` (`is_protected_package`).
- **Auto Hardware Tier:** `computeHardwareTierFromDiagnostics` detects `'low' | 'mid' | 'high'` automatically and toggles `performanceMode` (`<LightRays />` / heavy motion off on weak/battery hardware unless manually overridden).

## 4. Universal OS Compatibility & Determinism
- Backend diagnostics (`OsCompatibility` in `gui/src-tauri/src/diagnostics.rs`) classifies Windows 7 (`< 9200`), 8/8.1 (`9200..9600`), 10 (`10240..19045`), 11 21H2–23H2 (`22000..22631`), and 11 24H2–26H2 (`>= 26100`), with PowerShell/WMI/winreg fallbacks for Win7/8.
- Avoid duplicating constants/parsers; verify changes with `cargo check --all-targets`, `cargo test --no-fail-fast`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## 5. Versioning Standard (Single Source of Truth)
- Never hardcode app version strings (`v6.0`, `6.0.0`, etc.) in UI components, Rust reports, or CI workflows.
- When bumping the version, update only the 3 manifests: `gui/package.json`, `gui/src-tauri/Cargo.toml`, and `gui/src-tauri/tauri.conf.json`.
- **Frontend:** import `APP_VERSION` / `APP_VERSION_SHORT` from `gui/lib/version.ts` (reads `gui/package.json`).
- **Rust backend:** use `env!("CARGO_PKG_VERSION")` (reads `Cargo.toml`).
- **CI/Release:** `.github/workflows/release.yml` resolves the version dynamically from `gui/package.json`.
