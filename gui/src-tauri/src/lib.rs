// =================================================================
// SYSTEM OPTIMIZER - TAURI CORE LIBRARY (RUST NATIVE BACKEND V5.0)
// =================================================================

pub mod clean;
pub mod diagnostics;
pub mod external_tools;
pub mod gamer;
pub mod presets;
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

            // 2. Presets Inteligentes / 1-Click Profiles
            presets::run_preset,

            // 3. Limpeza & Armazenamento
            clean::run_deep_clean,
            clean::run_lite_clean,
            clean::toggle_hibernation,
            clean::clean_old_windows_installations,

            // 4. Ferramentas Gamer & Baixa Latência + Process Freezer
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

            // 5. Sistema, Rede, Privacidade, Auditoria, Pós-Formatação & Startup Manager
            system::check_admin,
            system::restart_as_admin,
            system::create_restore_point,
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

            // 6. Hub da Comunidade & Ferramentas Externas
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
