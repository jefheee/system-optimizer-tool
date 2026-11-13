// =================================================================
// SYSTEM OPTIMIZER - TAURI CORE LIBRARY (RUST NATIVE BACKEND V6.0)
// =================================================================

pub mod benchmarks;
pub mod bottleneck;
pub mod clean;
pub mod diagnostics;
pub mod drivers;
pub mod external_tools;
pub mod gamer;
pub mod games;
pub mod presets;
pub mod sensors;
pub mod state;
pub mod system;
pub mod utils;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // 1. Diagnóstico de Hardware & Profiler em Tempo Real
            diagnostics::get_system_diagnostics,
            diagnostics::enable_trim,
            diagnostics::reboot_to_bios,
            sensors::get_live_sensors,
            bottleneck::analyze_bottleneck,

            // 2. Suíte de Benchmarks & Stress Test (SYS BENCH & SYS CORE)
            benchmarks::run_disk_benchmark,
            benchmarks::run_ram_benchmark,
            benchmarks::run_cpu_benchmark,
            benchmarks::start_stress_test,
            benchmarks::stop_stress_test,
            benchmarks::get_stress_status,

            // 3. Biblioteca Automática de Jogos, Game Booster Launcher & HUD Overlay (SYS JOGOS & SYS CORE)
            games::scan_installed_games,
            games::launch_game_optimized,
            games::toggle_hud_overlay,

            // 4. Auditor de Drivers, Scanner Overclock/WHEA, USB Fantasmas, RGB Sync, Maker & Winget (SYS TUNING, SYS SYNC, SYS DRIVERS)
            drivers::get_driver_inventory,
            drivers::scan_oc_and_errors,
            drivers::set_power_plan,
            drivers::get_usb_devices,
            drivers::scan_usb_devices,
            drivers::remove_ghost_usb_devices,
            drivers::get_rgb_status,
            drivers::apply_rgb_effect,
            drivers::get_maker_drivers,
            drivers::install_maker_driver,
            drivers::clean_arduino_cache,
            drivers::get_winget_catalog,
            drivers::install_winget_batch,
            drivers::generate_clean_install_usb,
            drivers::open_account_control_panel,
            drivers::run_app_post_processing,
            drivers::disable_usb_power_saving,

            // 5. Presets Inteligentes / 1-Click Profiles (SYS OTIMIZA)
            presets::run_preset,

            // 6. Limpeza & Armazenamento (SYS OTIMIZA)
            clean::run_deep_clean,
            clean::run_lite_clean,
            clean::toggle_hibernation,
            clean::clean_old_windows_installations,
            clean::clean_windows_update_cache,

            // 7. Ferramentas Gamer & Baixa Latência + Process Freezer + Subsistema Gráfico (SYS GAMING & SYS TUNING)
            gamer::get_gamer_status,
            gamer::toggle_timer_resolution,
            gamer::set_game_priority,
            gamer::disable_fullscreen_optimizations,
            gamer::optimize_mouse,
            gamer::optimize_keyboard,
            gamer::optimize_tcp_network,
            gamer::toggle_ram_autoclean,
            gamer::flush_ram_now,
            gamer::add_defender_exclusion,
            gamer::reset_shader_cache,
            gamer::enable_ultimate_performance_plan,
            gamer::toggle_vbs,
            gamer::get_heavy_processes,
            gamer::kill_process,
            gamer::get_gpu_gaming_state,
            gamer::apply_gpu_tweak,
            gamer::apply_afterburner_1percent_low_fix,
            gamer::set_win32_priority_separation,
            gamer::configure_mmcss_gaming,
            gamer::preview_cpu_affinity,
            gamer::apply_process_affinity,
            gamer::relaunch_launcher_with_affinity,
            gamer::apply_linear_mouse_scale_curve,
            gamer::unlock_background_polling_rate,
            gamer::get_anticheat_readiness,
            gamer::set_control_flow_guard,

            // 8. Sistema, Rede, Privacidade, Auditoria, Pós-Formatação & Startup Manager
            system::check_admin,
            system::restart_as_admin,
            system::create_restore_point,
            system::get_restore_points_status,
            system::get_live_tweaks_status,
            system::apply_or_revert_tweak,
            system::reset_network_stack,
            system::toggle_classic_context_menu,
            system::benchmark_dns,
            system::repair_windows_update,
            system::optimize_dns,
            system::run_sfc_scan,
            system::clean_orphan_tasks,
            system::remove_bloatware,
            system::disable_telemetry,
            system::restore_windows_store,
            system::remove_onedrive,
            system::reset_font_cache,
            system::fix_bluetooth_cache,
            system::toggle_take_ownership_menu,
            system::backup_drivers,
            system::run_system_audit,
            system::toggle_post_format_tweak,
            system::get_startup_apps,
            system::toggle_startup_app,
            system::remove_startup_app,
            system::generate_battery_or_energy_report,
            system::open_external_url,
            system::get_bitlocker_status,
            system::bitlocker_decrypt,
            system::sync_system_time,
            system::restore_essential_app,
            system::get_audio_endpoints,
            system::inject_loudness_eq,
            system::open_sound_control_panel,
            system::disable_nic_power_saving,
            system::get_network_bindings_status,
            system::toggle_ipv4_only,

            // 9. Hub da Comunidade & Ferramentas Externas (SYS DRIVERS)
            external_tools::check_installed_tools,
            external_tools::launch_or_install_tool,
            external_tools::launch_winutil,
            external_tools::launch_mas_activator,
            external_tools::launch_ooshutup10,
            external_tools::run_winget_upgrade,
            external_tools::launch_adwcleaner,
            external_tools::install_quick_tool,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_os_tier_universal() {
        assert_eq!(diagnostics::classify_os_tier(7601), ("Win7", false, true));
        assert_eq!(diagnostics::classify_os_tier(9600), ("Win8_81", false, true));
        assert_eq!(diagnostics::classify_os_tier(19045), ("Win10", false, false));
        assert_eq!(diagnostics::classify_os_tier(22631), ("Win11_21H2_23H2", false, false));
        assert_eq!(diagnostics::classify_os_tier(26100), ("Win11_24H2_26H2", true, false));
        assert_eq!(diagnostics::classify_os_tier(26200), ("Win11_24H2_26H2", true, false));
    }

    #[test]
    fn test_classify_hardware_tier() {
        assert_eq!(diagnostics::classify_hardware_tier(2, 4.0, true, false), "low");
        assert_eq!(diagnostics::classify_hardware_tier(6, 16.0, false, false), "low");
        assert_eq!(diagnostics::classify_hardware_tier(6, 32.0, true, true), "low");
        assert_eq!(diagnostics::classify_hardware_tier(4, 8.0, true, false), "mid");
        assert_eq!(diagnostics::classify_hardware_tier(6, 32.0, true, false), "high");
    }

    #[test]
    fn test_protected_packages_guard() {
        assert!(system::is_protected_package("Microsoft.EdgeWebView2"));
        assert!(system::is_protected_package("WebView2Runtime"));
        assert!(system::is_protected_package("VBSCRIPT"));
        assert!(system::is_protected_package("*Microsoft.WindowsStore*"));
        assert!(!system::is_protected_package("*Cortana*"));
        assert!(!system::is_protected_package("*BingWeather*"));
    }

    #[test]
    fn test_expanded_protected_packages_whitelist() {
        for protected in [
            "Microsoft.Paint",
            "MSPaint",
            "Microsoft.Windows.Photos",
            "Microsoft.WindowsNotepad",
            "Microsoft.HEVCVideoExtension",
            "Microsoft.AV1VideoExtension",
            "Microsoft.WebpImageExtension",
            "NetFx3",
            "Microsoft.EdgeWebView2",
            "VBScript",
        ] {
            assert!(
                system::is_protected_package(protected),
                "Package '{}' must be protected from debloat",
                protected
            );
        }
        assert!(!system::is_protected_package("Clipchamp.Clipchamp"));
        assert!(!system::is_protected_package("Microsoft.BingNews"));
        assert!(!system::is_protected_package("Microsoft.OutlookForWindows"));
    }

    #[test]
    fn test_autounattend_xml_and_setup_complete_generation() {
        let xml = drivers::build_autounattend_xml("Jefh<Admin>", true, true);
        assert!(xml.contains("BypassTPMCheck"));
        assert!(xml.contains("BypassSecureBootCheck"));
        assert!(xml.contains("BypassRAMCheck"));
        assert!(xml.contains("BypassCPUCheck"));
        assert!(xml.contains("<ProtectYourPC>3</ProtectYourPC>"));
        assert!(xml.contains("<Name>JefhAdmin</Name>"));
        assert!(xml.contains("SetupComplete.cmd"));

        let xml_no_bypass = drivers::build_autounattend_xml("   ", false, false);
        assert!(!xml_no_bypass.contains("BypassTPMCheck"));
        assert!(xml_no_bypass.contains("<Name>User</Name>"));

        let cmd = drivers::build_setup_complete_cmd();
        assert!(cmd.contains("ExcludeWUDriversInQualityUpdate"));
        assert!(cmd.contains("SearchOrderConfig"));
        assert!(cmd.contains("DisableWindowsConsumerFeatures"));
    }

    #[test]
    fn test_usb_scanner_returns_devices() {
        let scan = drivers::scan_usb_devices_sync();
        assert!(
            scan.total_devices > 0 && !scan.devices.is_empty(),
            "USB scanner should detect at least one PnP USB/HID/BT/COM device on Windows"
        );
    }

    #[test]
    fn test_cpu_affinity_bitmask_calculations() {
        // 4C/8T
        assert_eq!(gamer::calculate_cpu_affinity_mask(4, 8, "smt_off"), (0x55, "0x55".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(4, 8, "core0_off"), (0xFC, "0xFC".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(4, 8, "all_cores"), (0xFF, "0xFF".to_string()));

        // 6C/12T
        assert_eq!(gamer::calculate_cpu_affinity_mask(6, 12, "smt_off"), (0x555, "0x555".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(6, 12, "core0_off"), (0xFFC, "0xFFC".to_string()));

        // 8C/16T
        assert_eq!(gamer::calculate_cpu_affinity_mask(8, 16, "smt_off"), (0x5555, "0x5555".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(8, 16, "core0_off"), (0xFFFC, "0xFFFC".to_string()));

        // 12C/24T
        assert_eq!(gamer::calculate_cpu_affinity_mask(12, 24, "smt_off"), (0x555555, "0x555555".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(12, 24, "core0_off"), (0xFFFFFC, "0xFFFFFC".to_string()));

        // 16C/32T
        assert_eq!(gamer::calculate_cpu_affinity_mask(16, 32, "smt_off"), (0x55555555, "0x55555555".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(16, 32, "core0_off"), (0xFFFFFFFC, "0xFFFFFFFC".to_string()));

        // Non-SMT CPU (e.g. 6C/6T)
        assert_eq!(gamer::calculate_cpu_affinity_mask(6, 6, "smt_off"), (0x3F, "0x3F".to_string()));
        assert_eq!(gamer::calculate_cpu_affinity_mask(6, 6, "core0_off"), (0x3E, "0x3E".to_string()));
    }

    #[test]
    fn test_linear_mouse_curve_scales_without_acceleration() {
        for scale in [100u32, 125, 150, 175, 200, 225] {
            let (x_bytes, y_bytes) = gamer::build_linear_mouse_curve(scale);
            assert_eq!(x_bytes.len(), 40);
            assert_eq!(y_bytes.len(), 40);

            let read_u32 = |buf: &[u8; 40], idx: usize| -> u32 {
                let off = idx * 8;
                u32::from_le_bytes([buf[off], buf[off + 1], buf[off + 2], buf[off + 3]])
            };

            assert_eq!(read_u32(&x_bytes, 0), 0);
            assert_eq!(read_u32(&y_bytes, 0), 0);

            // Check strict linearity: y_i / x_i is identical across points 1..=4
            let x1 = read_u32(&x_bytes, 1) as u64;
            let y1 = read_u32(&y_bytes, 1) as u64;
            for pt in 2..=4 {
                let xi = read_u32(&x_bytes, pt) as u64;
                let yi = read_u32(&y_bytes, pt) as u64;
                assert_eq!(
                    yi * x1,
                    y1 * xi,
                    "Linear slope broken at point {} for scale {}%",
                    pt,
                    scale
                );
            }
        }

        // Check scaling between 100% and 200% is strictly 2x
        let (_, y100) = gamer::build_linear_mouse_curve(100);
        let (_, y200) = gamer::build_linear_mouse_curve(200);
        let p1_100 = u32::from_le_bytes([y100[8], y100[9], y100[10], y100[11]]);
        let p1_200 = u32::from_le_bytes([y200[8], y200[9], y200[10], y200[11]]);
        assert_eq!(p1_200, p1_100 * 2);
    }

    #[test]
    fn test_ulps_rx7000_hags_safety_guard() {
        // RX 7000+ with HAGS ON -> MUST block
        assert!(gamer::check_ulps_safety_guard("AMD Radeon RX 7600", true).is_err());
        assert!(gamer::check_ulps_safety_guard("AMD Radeon RX 7800 XT", true).is_err());
        assert!(gamer::check_ulps_safety_guard("AMD Radeon RX 7900 XTX", true).is_err());
        assert!(gamer::check_ulps_safety_guard("AMD Radeon RX 9070 XT", true).is_err());

        // RX 7000+ with HAGS OFF -> Permitted
        assert!(gamer::check_ulps_safety_guard("AMD Radeon RX 7600", false).is_ok());

        // Older RX 6000 / NVIDIA with HAGS ON -> Permitted
        assert!(gamer::check_ulps_safety_guard("AMD Radeon RX 6750 XT", true).is_ok());
        assert!(gamer::check_ulps_safety_guard("NVIDIA GeForce RTX 4070 Super", true).is_ok());
    }

    #[test]
    fn test_afterburner_cfg_1percent_low_patcher() {
        let sample = "[Settings]\r\nPollingInterval=1000\r\nToggleOSDHotkey=0\r\n\r\n[Source GPU1 power]\r\nEnabled=1\r\nShowInOSD=1\r\n\r\n[Source Power percent]\r\nEnabled=1\r\nShowInOSD=1\r\n";
        let patched = gamer::patch_afterburner_cfg_content(sample);
        assert!(patched.contains("ToggleOSDHotkey=121"));
        assert!(patched.contains("BeginRecordingHotkey=122"));
        assert!(patched.contains("EndRecordingHotkey=123"));
        assert!(!patched.contains("Enabled=1"));
        assert!(patched.contains("Enabled=0"));
    }

    #[test]
    fn test_read_live_tweaks_sync_no_panic() {
        let tweaks = system::read_live_tweaks_sync(false);
        assert!(tweaks.len() >= 15, "Expected full live tweaks audit list");
        assert!(tweaks.iter().any(|t| t.id == "timer_05ms"));
        assert!(tweaks.iter().any(|t| t.id == "win32_priority"));
    }
}
