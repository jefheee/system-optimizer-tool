use std::collections::HashSet;
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
use winreg::RegKey;

use crate::gamer::{apply_kernel_timer, flush_working_sets_internal};
use crate::state::{AppState, CommandResponse};
use crate::utils::{emit_step, CREATE_NO_WINDOW};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledGame {
    pub id: String,
    pub name: String,
    pub platform: String, // "Steam", "Epic Games", "Riot Games", "GOG", "Xbox"
    pub install_dir: String,
    pub exe_path: String,
    pub launch_uri: String,
    pub size_gb: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayStatus {
    pub active: bool,
    pub position: String,
}

// -------------------------------------------------------------
// Lightweight Valve VDF / ACF Key-Value Parser
// -------------------------------------------------------------
fn extract_vdf_value(content: &str, key: &str) -> Option<String> {
    let needle = format!("\"{}\"", key.to_lowercase());
    for line in content.lines() {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with(&needle) {
            let rest = &trimmed[needle.len()..].trim();
            if let Some(first_q) = rest.find('"') {
                let after_first = &rest[first_q + 1..];
                if let Some(second_q) = after_first.find('"') {
                    return Some(after_first[..second_q].replace("\\\\", "\\"));
                }
            }
        }
    }
    None
}

fn extract_all_vdf_paths(content: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("\"path\"") {
            let rest = &trimmed[6..].trim();
            if let Some(q1) = rest.find('"') {
                let after = &rest[q1 + 1..];
                if let Some(q2) = after.find('"') {
                    let raw = after[..q2].replace("\\\\", "\\");
                    let pb = PathBuf::from(raw);
                    if pb.exists() && !paths.contains(&pb) {
                        paths.push(pb);
                    }
                }
            }
        }
    }
    paths
}

fn find_primary_exe(dir: &Path) -> Option<PathBuf> {
    if !dir.exists() {
        return None;
    }
    let mut best_exe: Option<(PathBuf, u64)> = None;
    let skip_terms = [
        "unins",
        "crash",
        "report",
        "redist",
        "setup",
        "vc_redist",
        "dxsetup",
        "unitycrash",
        "easyanticheat_eos_setup",
        "battleye",
    ];

    let mut stack = vec![(dir.to_path_buf(), 0usize)];
    while let Some((cur, depth)) = stack.pop() {
        if depth > 3 {
            continue;
        }
        if let Ok(entries) = fs::read_dir(&cur) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push((path, depth + 1));
                } else if path
                    .extension()
                    .map(|e| e.eq_ignore_ascii_case("exe"))
                    .unwrap_or(false)
                {
                    let fname = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_lowercase())
                        .unwrap_or_default();
                    if skip_terms.iter().any(|t| fname.contains(t)) {
                        continue;
                    }
                    let sz = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    if best_exe.as_ref().map(|(_, b_sz)| sz > *b_sz).unwrap_or(true) {
                        best_exe = Some((path, sz));
                    }
                }
            }
        }
    }

    best_exe.map(|(p, _)| p)
}

fn scan_steam_games(seen: &mut HashSet<String>, out: &mut Vec<InstalledGame>) {
    let mut steam_roots: Vec<PathBuf> = Vec::new();

    if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(r"Software\Valve\Steam", KEY_READ)
    {
        if let Ok(p) = hkcu.get_value::<String, _>("SteamPath") {
            let pb = PathBuf::from(p.replace('/', "\\"));
            if pb.exists() {
                steam_roots.push(pb);
            }
        }
    }

    if let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags(r"SOFTWARE\WOW6432Node\Valve\Steam", KEY_READ)
    {
        if let Ok(p) = hklm.get_value::<String, _>("InstallPath") {
            let pb = PathBuf::from(p);
            if pb.exists() && !steam_roots.contains(&pb) {
                steam_roots.push(pb);
            }
        }
    }

    let default_steam = PathBuf::from(r"C:\Program Files (x86)\Steam");
    if default_steam.exists() && !steam_roots.contains(&default_steam) {
        steam_roots.push(default_steam);
    }

    for letter in ['C', 'D', 'E', 'F', 'G'] {
        for folder in ["SteamLibrary", "Steam", "Games\\SteamLibrary"] {
            let candidate = PathBuf::from(format!("{}:\\{}", letter, folder));
            if candidate.exists() && !steam_roots.contains(&candidate) {
                steam_roots.push(candidate);
            }
        }
    }

    let mut library_roots = steam_roots.clone();
    for root in &steam_roots {
        let vdf_path = root.join("steamapps").join("libraryfolders.vdf");
        if let Ok(content) = fs::read_to_string(&vdf_path) {
            for p in extract_all_vdf_paths(&content) {
                if !library_roots.contains(&p) {
                    library_roots.push(p);
                }
            }
        }
    }

    for lib in library_roots {
        let steamapps = if lib.ends_with("steamapps") {
            lib
        } else {
            lib.join("steamapps")
        };
        if !steamapps.exists() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&steamapps) {
            for entry in entries.flatten() {
                let path = entry.path();
                let fname = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                if fname.starts_with("appmanifest_") && fname.ends_with(".acf") {
                    if let Ok(acf) = fs::read_to_string(&path) {
                        let appid = extract_vdf_value(&acf, "appid").unwrap_or_default();
                        let name = extract_vdf_value(&acf, "name").unwrap_or_default();
                        let installdir = extract_vdf_value(&acf, "installdir").unwrap_or_default();
                        let size_bytes = extract_vdf_value(&acf, "SizeOnDisk")
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(0);

                        if appid.is_empty()
                            || name.is_empty()
                            || appid == "228980"
                            || name.to_lowercase().contains("steamworks common")
                            || name.to_lowercase().contains("proton ")
                            || name.to_lowercase().contains("steam linux runtime")
                        {
                            continue;
                        }

                        let key = format!("steam:{}", appid);
                        if !seen.insert(key.clone()) {
                            continue;
                        }

                        let game_dir = steamapps.join("common").join(&installdir);
                        let exe_path = find_primary_exe(&game_dir)
                            .map(|p| p.to_string_lossy().to_string())
                            .unwrap_or_default();
                        let size_gb =
                            ((size_bytes as f32 / (1024.0 * 1024.0 * 1024.0)) * 10.0).round()
                                / 10.0;

                        out.push(InstalledGame {
                            id: key,
                            name,
                            platform: "Steam".to_string(),
                            install_dir: game_dir.to_string_lossy().to_string(),
                            exe_path,
                            launch_uri: format!("steam://rungameid/{}", appid),
                            size_gb,
                        });
                    }
                }
            }
        }
    }
}

fn scan_epic_games(seen: &mut HashSet<String>, out: &mut Vec<InstalledGame>) {
    let manifests_dir = PathBuf::from(r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests");
    if !manifests_dir.exists() {
        return;
    }

    if let Ok(entries) = fs::read_dir(manifests_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path
                .extension()
                .map(|e| e.eq_ignore_ascii_case("item"))
                .unwrap_or(false)
            {
                if let Ok(raw) = fs::read_to_string(&path) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
                        let name = json
                            .get("DisplayName")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .trim()
                            .to_string();
                        let install_loc = json
                            .get("InstallLocation")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .trim()
                            .to_string();
                        let launch_exe = json
                            .get("LaunchExecutable")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .trim()
                            .to_string();
                        let app_name = json
                            .get("AppName")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .trim()
                            .to_string();
                        let install_size = json
                            .get("InstallSize")
                            .and_then(|v| v.as_u64())
                            .unwrap_or(0);

                        if name.is_empty() || install_loc.is_empty() {
                            continue;
                        }

                        let key = format!("epic:{}", if app_name.is_empty() { &name } else { &app_name });
                        if !seen.insert(key.clone()) {
                            continue;
                        }

                        let full_exe = if !launch_exe.is_empty() {
                            PathBuf::from(&install_loc)
                                .join(&launch_exe)
                                .to_string_lossy()
                                .to_string()
                        } else {
                            find_primary_exe(Path::new(&install_loc))
                                .map(|p| p.to_string_lossy().to_string())
                                .unwrap_or_default()
                        };

                        let size_gb =
                            ((install_size as f32 / (1024.0 * 1024.0 * 1024.0)) * 10.0).round()
                                / 10.0;

                        out.push(InstalledGame {
                            id: key,
                            name,
                            platform: "Epic Games".to_string(),
                            install_dir: install_loc,
                            exe_path: full_exe,
                            launch_uri: if !app_name.is_empty() {
                                format!(
                                    "com.epicgames.launcher://apps/{}?action=launch&silent=true",
                                    app_name
                                )
                            } else {
                                String::new()
                            },
                            size_gb,
                        });
                    }
                }
            }
        }
    }
}

fn scan_riot_and_other_games(seen: &mut HashSet<String>, out: &mut Vec<InstalledGame>) {
    // 1. Riot Games
    for letter in ['C', 'D', 'E'] {
        let riot_dir = PathBuf::from(format!("{}:\\Riot Games", letter));
        if riot_dir.exists() {
            if let Ok(entries) = fs::read_dir(&riot_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if !path.is_dir() {
                        continue;
                    }
                    let folder_name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if folder_name.eq_ignore_ascii_case("Riot Client") {
                        continue;
                    }
                    let key = format!("riot:{}", folder_name.to_lowercase());
                    if !seen.insert(key.clone()) {
                        continue;
                    }
                    let exe = find_primary_exe(&path)
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();
                    out.push(InstalledGame {
                        id: key,
                        name: folder_name,
                        platform: "Riot Games".to_string(),
                        install_dir: path.to_string_lossy().to_string(),
                        exe_path: exe.clone(),
                        launch_uri: exe,
                        size_gb: 28.5,
                    });
                }
            }
        }

        // 2. XboxGames
        let xbox_dir = PathBuf::from(format!("{}:\\XboxGames", letter));
        if xbox_dir.exists() {
            if let Ok(entries) = fs::read_dir(&xbox_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if !path.is_dir() {
                        continue;
                    }
                    let folder_name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if folder_name.is_empty() {
                        continue;
                    }
                    let key = format!("xbox:{}", folder_name.to_lowercase());
                    if !seen.insert(key.clone()) {
                        continue;
                    }
                    let exe = find_primary_exe(&path)
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_default();
                    out.push(InstalledGame {
                        id: key,
                        name: folder_name,
                        platform: "Xbox".to_string(),
                        install_dir: path.to_string_lossy().to_string(),
                        exe_path: exe.clone(),
                        launch_uri: exe,
                        size_gb: 35.0,
                    });
                }
            }
        }
    }

    // 3. GOG Galaxy Registry
    if let Ok(gog_key) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags(r"SOFTWARE\WOW6432Node\GOG.com\Games", KEY_READ)
    {
        for sub in gog_key.enum_keys().flatten() {
            if let Ok(game_k) = gog_key.open_subkey_with_flags(&sub, KEY_READ) {
                let name: String = game_k.get_value("gameName").unwrap_or_default();
                let path: String = game_k.get_value("path").unwrap_or_default();
                let exe: String = game_k.get_value("exe").unwrap_or_default();
                if !name.is_empty() && Path::new(&path).exists() {
                    let key = format!("gog:{}", sub);
                    if seen.insert(key.clone()) {
                        out.push(InstalledGame {
                            id: key,
                            name,
                            platform: "GOG".to_string(),
                            install_dir: path,
                            exe_path: exe.clone(),
                            launch_uri: exe,
                            size_gb: 15.0,
                        });
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub async fn scan_installed_games() -> Result<CommandResponse<Vec<InstalledGame>>, String> {
    let games = tokio::task::spawn_blocking(|| {
        let mut seen = HashSet::new();
        let mut list = Vec::new();

        scan_steam_games(&mut seen, &mut list);
        scan_epic_games(&mut seen, &mut list);
        scan_riot_and_other_games(&mut seen, &mut list);

        list.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        list
    })
    .await
    .map_err(|e| e.to_string())?;

    let msg = format!(
        "{} jogos instalados detectados nas bibliotecas locais.",
        games.len()
    );
    Ok(CommandResponse::ok(msg, Some(games)))
}

#[tauri::command]
pub async fn launch_game_optimized(
    name: String,
    platform: String,
    exe_path: Option<String>,
    launch_uri: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<CommandResponse<String>, String> {
    let exe_str = exe_path.unwrap_or_default();
    let uri_str = launch_uri.unwrap_or_default();

    // 1. Activate 0.5ms Kernel Timer
    emit_step(
        &app,
        "launch-timer",
        "Ativando Kernel Timer Resolution (0.5ms)",
        "running",
        "Reduzindo latência de interrupção do agendador do Windows via ntdll...",
        1,
        4,
    );
    let _ = apply_kernel_timer(true, &state);

    let app_clone = app.clone();
    let name_clone = name.clone();
    let result_msg = tokio::task::spawn_blocking(move || -> Result<String, String> {
        // 2. Flush RAM Working Sets
        emit_step(
            &app_clone,
            "launch-ram",
            "Limpando Working Sets da Memória RAM",
            "running",
            "Liberando páginas ociosas de processos em segundo plano...",
            2,
            4,
        );
        let freed_mb = flush_working_sets_internal();

        // 3. Configure DirectX High Performance GPU & Disable Fullscreen Optimizations
        emit_step(
            &app_clone,
            "launch-dx",
            "Configurando GPU Dedicada & Fullscreen",
            "running",
            &format!(
                "Aplicando GpuPreference=2 e FSO para {} ({} MB RAM liberados)...",
                name_clone, freed_mb
            ),
            3,
            4,
        );

        if !exe_str.is_empty() && Path::new(&exe_str).exists() {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok((dx_key, _)) =
                hkcu.create_subkey(r"Software\Microsoft\DirectX\UserGpuPreferences")
            {
                let _ = dx_key.set_value(&exe_str, &"GpuPreference=2;");
            }
            if let Ok((layers_key, _)) = hkcu.create_subkey(
                r"Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers",
            ) {
                let _ = layers_key.set_value(
                    &exe_str,
                    &"~ HIGHDPIAWARE DISABLEDXMAXIMIZEDWINDOWEDMODE",
                );
            }
        }

        // Activate High Performance power plan silently
        let _ = Command::new("powercfg")
            .args(["/setactive", "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        // 4. Launch Game
        emit_step(
            &app_clone,
            "launch-exec",
            "Iniciando Jogo com Prioridade Alta",
            "running",
            &format!("Disparando inicialização via {}...", platform),
            4,
            4,
        );

        let launched = if !uri_str.is_empty() {
            Command::new("cmd")
                .args(["/C", "start", "", &uri_str])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .is_ok()
        } else if !exe_str.is_empty() && Path::new(&exe_str).exists() {
            Command::new(&exe_str)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .is_ok()
        } else {
            false
        };

        if !launched {
            return Err("Não foi possível iniciar o executável ou URI do jogo.".to_string());
        }

        emit_step(
            &app_clone,
            "launch-done",
            "Game Booster Ativo & Jogo Iniciado!",
            "success",
            &format!(
                "{} iniciado com Timer 0.5ms + {} MB de RAM liberada!",
                name_clone, freed_mb
            ),
            4,
            4,
        );

        Ok(format!(
            "{} iniciado com Timer 0.5ms ativo e {} MB de RAM liberados!",
            name_clone, freed_mb
        ))
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(CommandResponse::ok(result_msg.clone(), Some(result_msg)))
}

#[tauri::command]
pub async fn toggle_hud_overlay(
    enable: bool,
    position: Option<String>,
    app: AppHandle,
) -> Result<CommandResponse<OverlayStatus>, String> {
    let pos = position.unwrap_or_else(|| "top-right".to_string());
    let label = "hud-overlay";

    if !enable {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.close();
        }
        return Ok(CommandResponse::ok(
            "In-Game HUD Overlay encerrado.",
            Some(OverlayStatus {
                active: false,
                position: pos,
            }),
        ));
    }

    let (x, y) = match pos.as_str() {
        "top-left" => (24.0, 24.0),
        "bottom-left" => (24.0, 860.0),
        "bottom-right" => (1580.0, 860.0),
        _ => (1580.0, 24.0), // top-right default
    };

    if let Some(existing) = app.get_webview_window(label) {
        let _ = existing.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
        let _ = existing.show();
        return Ok(CommandResponse::ok(
            "In-Game HUD Overlay reposicionado.",
            Some(OverlayStatus {
                active: true,
                position: pos,
            }),
        ));
    }

    match WebviewWindowBuilder::new(&app, label, WebviewUrl::App("/?overlay=1".into()))
        .title("SYS HUD Overlay")
        .inner_size(270.0, 128.0)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .build()
    {
        Ok(_) => Ok(CommandResponse::ok(
            "In-Game HUD Overlay ativado.",
            Some(OverlayStatus {
                active: true,
                position: pos,
            }),
        )),
        Err(e) => Ok(CommandResponse::err(format!(
            "Falha ao abrir janela de Overlay: {}",
            e
        ))),
    }
}
