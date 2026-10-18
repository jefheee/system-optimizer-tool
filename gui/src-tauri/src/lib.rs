// =================================================================
// SYSTEM OPTIMIZER - TAURI CORE LIBRARY (RUST NATIVE BACKEND)
// =================================================================

pub mod clean;
pub mod diagnostics;
pub mod gamer;
pub mod state;
pub mod system;
pub mod utils;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // 1. Diagnóstico de Hardware
            diagnostics::get_system_diagnostics,

            // 2. Limpeza e Otimização
            clean::run_deep_clean,
            clean::run_lite_clean,

            // 3. Ferramentas Gamer & Baixa Latência
            gamer::get_gamer_status,
            gamer::toggle_timer_resolution,
            gamer::set_game_priority,
            gamer::disable_fullscreen_optimizations,
            gamer::optimize_mouse,
            gamer::optimize_keyboard,
            gamer::optimize_tcp_network,
            gamer::toggle_ram_autoclean,
            gamer::add_defender_exclusion,
            gamer::reset_shader_cache,

            // 4. Ferramentas de Sistema, Reparos e Utilidades
            system::check_admin,
            system::restart_as_admin,
            system::launch_winutil,
            system::launch_mas_activator,
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
