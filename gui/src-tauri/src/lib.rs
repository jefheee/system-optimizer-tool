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

            // 5. Presets Inteligentes / 1-Click Profiles (SYS OTIMIZA)
            presets::run_preset,

            // 6. Limpeza & Armazenamento (SYS OTIMIZA)
            clean::run_deep_clean,
            clean::run_lite_clean,
            clean::toggle_hibernation,
            clean::clean_old_windows_installations,
            clean::clean_windows_update_cache,

            // 7. Ferramentas Gamer & Baixa Latência + Process Freezer (SYS OTIMIZA)
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
}
