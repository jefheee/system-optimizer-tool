# System Optimizer Tool — Project State

**Current Milestone:** ETAPA 1 DE 3 Completed — Foundation, Consolidated 6-Tab Navigation, Mandatory Restore Point Guard, Auto Hardware Tier, Universal Windows 7–11 26H2 Compatibility & Module 1 Deep Hardware Audit.

## Implemented Architecture Summary
- **Backend (Rust / Tauri v2 — `gui/src-tauri/src/`):**
  - `diagnostics.rs`: Added `OsCompatibility` (`Win7`, `Win8_81`, `Win10`, `Win11_21H2_23H2`, `Win11_24H2_26H2`), `classify_os_tier`, `classify_hardware_tier`, battery status detection (`is_on_battery`), live `trim_enabled`, `enable_trim`, `reboot_to_bios`, `MotherboardInfo` (`support_search_url`, `cpu_vendor`, `is_x3d`), `GpuInfo` (`pcie_device_id`, `msi_supported`, `msi_priority`, `pcie_generation`, `pcie_lanes`, `lane_sharing_warning`, `connected_to_igpu_warning`), `MemoryInfo` (Dual-Channel, `mismatched_modules`, `slot_placement_ok`, `ddr5_four_dimm_warning`, `ram_warnings`, `wmic` legacy fallback), `StorageDisk`/`LogicalVolume` (`free_percent`, `low_space_critical`, `is_hdd_or_usb_warning`), and complete `build_setup_export`.
  - `system.rs`: Added `get_restore_points_status`, updated `create_restore_point` (`SystemRestorePointCreationFrequency = 0` unlock + Win7/WMI fallback), `is_protected_package` (`EdgeWebView2` / `VBScript` guard in `remove_bloatware`), `get_live_tweaks_status`, and `apply_or_revert_tweak` (12 live Registry tweaks including `"msi_mode_gpu"`).
  - `drivers.rs`: Rewrote `scan_usb_devices_sync()` with a 3-layer Admin-free fallback chain (`Get-PnpDevice` JSON -> `pnputil` -> `winreg`) behind `get_usb_devices` / `scan_usb_devices`.
  - `lib.rs`: Registered Tauri commands (`get_restore_points_status`, `get_live_tweaks_status`, `apply_or_revert_tweak`, `enable_trim`, `reboot_to_bios`, `scan_usb_devices`) and 4 unit tests.

- **Frontend (Next.js 16 / React 19 / TypeScript Strict — `gui/`):**
  - **6 Fixed English Navigation Tabs (`TopNavbar.tsx` + `LeftSidebar.tsx` + `app/page.tsx`):** `SYS CORE` (strictly 4 sidebar items), `SYS OPTIMIZE`, `SYS GAMING`, `SYS TUNING`, `SYS DRIVERS`, `SYS DOCS`. Removed duplicated headers and redundant top-right sub-tab switchers.
  - **Mandatory Safety & Performance (`HardwareContext.tsx`, `SettingsContext.tsx`, `RestorePointModal.tsx`):** Auto hardware tier detection (`low | mid | high`) toggling `performanceMode` (disabling WebGL `<LightRays />` and heavy CSS animations on weak/battery systems), plus `requireRestorePoint(...)` intercepting Presets, Debloat, Deep Clean, Hibernation, Old Windows Cleanup, Ghost USB removal, Power Plan changes, and medium/high Registry tweaks.
  - **Module 1 Deep Diagnostics & Interactive Controls (`SysCoreSystemView.tsx`, `SensorsAndStressModule.tsx`, `HomeModule.tsx`, `BenchmarksModule.tsx`, `DocsAndAboutModule.tsx`):** Export Full PC Report outside cards (`.MD`, `.JSON`, Clipboard), BIOS audit w/ DisplayPort warning & `rebootToBios()`, RAM A2/B2 & 4x DDR5 IMC alerts, GPU ReBAR/MSI Mode live Apply/Revert & PCIe lane checks, Storage `<10%` critical red alerts + live `enableTrim()`, unified Sensors/Stress/WHEA/OCCT-FurMark protocols, integrated `BottleneckModule` inside Benchmarks, BIOS troubleshooting guide (`docs-bios`), and live Windows Registry Tweaks Apply/Revert grid in `HomeModule.tsx`.

## Verified Checks (Latest Run)
- `gui/src-tauri`: `cargo check --all-targets` (`0` errors, `0` warnings) & `cargo test --no-fail-fast` (`4/4` unit tests passing).
- `gui`: `npx tsc --noEmit` (`0` errors), `npm run lint` (`0` errors), `npm run build` (Next.js 16.2.6 Turbopack static build exited `0`).
- Private spec stored at gitignored `docs/internal/MASTER_SPEC.md` (`.gitignore` updated with `docs/internal/`).

## Context Handoff
- **Completed:** Full **ETAPA 1 DE 3** architecture, 6-tab English navigation cleanup, `RestorePointGuard`, auto hardware tier, Windows 7–11 26H2 compatibility layer, live Registry Apply/Revert engine, 3-layer USB scanner, and 100% of Module 1 diagnostics/stress/WHEA/BIOS UI + backend commands.
- **Exact Next Step:** Proceed to **ETAPA 2 DE 3** (implementing the next modules/sections per `docs/internal/MASTER_SPEC.md` when requested by the user).
