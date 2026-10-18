use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ};
use winreg::RegKey;

use crate::state::CommandResponse;
use crate::utils::{new_hidden_command, shell_open};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledToolsStatus {
    pub cpuz_installed: bool,
    pub cpuz_path: Option<String>,
    pub hwmonitor_installed: bool,
    pub hwmonitor_path: Option<String>,
    pub gpuz_installed: bool,
    pub gpuz_path: Option<String>,
}

fn find_tool_executable(known_paths: &[&str], display_keyword: &str, exe_names: &[&str]) -> Option<String> {
    // 1. Check standard disk paths directly
    for &p in known_paths {
        if Path::new(p).exists() {
            return Some(p.to_string());
        }
    }

    // 2. Check Uninstall registry keys (HKLM 64-bit, HKLM WOW6432Node, HKCU)
    let uninstall_paths = [
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];

    let kw_lower = display_keyword.to_lowercase();

    for &(hive, sub_path) in &uninstall_paths {
        let root = RegKey::predef(hive);
        if let Ok(uninst_key) = root.open_subkey_with_flags(sub_path, KEY_READ) {
            for key_name in uninst_key.enum_keys().flatten() {
                if let Ok(app_key) = uninst_key.open_subkey_with_flags(&key_name, KEY_READ) {
                    let display_name: String = app_key.get_value("DisplayName").unwrap_or_default();
                    if display_name.to_lowercase().contains(&kw_lower) || key_name.to_lowercase().contains(&kw_lower) {
                        // Check InstallLocation
                        if let Ok(loc) = app_key.get_value::<String, _>("InstallLocation") {
                            let loc_trimmed = loc.trim_matches('"').trim();
                            if !loc_trimmed.is_empty() {
                                for &exe in exe_names {
                                    let candidate = Path::new(loc_trimmed).join(exe);
                                    if candidate.exists() {
                                        return Some(candidate.to_string_lossy().to_string());
                                    }
                                }
                            }
                        }

                        // Check DisplayIcon (often points directly to the .exe, e.g. "C:\...\cpuz.exe,0")
                        if let Ok(icon) = app_key.get_value::<String, _>("DisplayIcon") {
                            let clean_icon = icon
                                .split(',')
                                .next()
                                .unwrap_or("")
                                .trim_matches('"')
                                .trim();
                            if clean_icon.to_lowercase().ends_with(".exe") && Path::new(clean_icon).exists() {
                                return Some(clean_icon.to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

fn detect_installed_tools_sync() -> InstalledToolsStatus {
    let cpuz_path = find_tool_executable(
        &[
            r"C:\Program Files\CPUID\CPU-Z\cpuz.exe",
            r"C:\Program Files (x86)\CPUID\CPU-Z\cpuz.exe",
        ],
        "cpu-z",
        &["cpuz.exe", "cpuz_x64.exe"],
    );

    let hwmonitor_path = find_tool_executable(
        &[
            r"C:\Program Files\CPUID\HWMonitor\HWMonitor.exe",
            r"C:\Program Files (x86)\CPUID\HWMonitor\HWMonitor.exe",
        ],
        "hwmonitor",
        &["HWMonitor.exe", "HWMonitor_x64.exe"],
    );

    let gpuz_path = find_tool_executable(
        &[
            r"C:\Program Files (x86)\GPU-Z\GPU-Z.exe",
            r"C:\Program Files\GPU-Z\GPU-Z.exe",
        ],
        "gpu-z",
        &["GPU-Z.exe"],
    );

    InstalledToolsStatus {
        cpuz_installed: cpuz_path.is_some(),
        cpuz_path,
        hwmonitor_installed: hwmonitor_path.is_some(),
        hwmonitor_path,
        gpuz_installed: gpuz_path.is_some(),
        gpuz_path,
    }
}

/// Verifica se CPU-Z, HWMonitor e GPU-Z já estão instalados no computador
#[tauri::command]
pub async fn check_installed_tools() -> Result<CommandResponse<InstalledToolsStatus>, String> {
    let status = tokio::task::spawn_blocking(detect_installed_tools_sync)
        .await
        .map_err(|e| e.to_string())?;
    Ok(CommandResponse::ok("Status de ferramentas verificado.", Some(status)))
}

/// Inicia o Chris Titus WinUtil em uma janela visível de terminal
#[tauri::command]
pub async fn launch_winutil() -> Result<CommandResponse<String>, String> {
    std::process::Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13; irm https://christitus.com/win | iex",
        ])
        .spawn()
        .map_err(|e| format!("Falha ao iniciar WinUtil: {}", e))?;

    Ok(CommandResponse::ok(
        "WinUtil (Chris Titus) iniciado em uma nova janela de terminal.",
        Some("WinUtil Iniciado".to_string()),
    ))
}

/// Inicia o Microsoft Activation Scripts (MAS) em uma janela visível
#[tauri::command]
pub async fn launch_mas_activator() -> Result<CommandResponse<String>, String> {
    std::process::Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            "irm https://get.activated.win | iex",
        ])
        .spawn()
        .map_err(|e| format!("Falha ao iniciar MAS: {}", e))?;

    Ok(CommandResponse::ok(
        "Microsoft Activation Scripts (MAS) iniciado em uma nova janela.",
        Some("MAS Iniciado".to_string()),
    ))
}

/// Baixa e executa o O&O ShutUp10++ (ferramenta líder mundial de privacidade no Windows)
#[tauri::command]
pub async fn launch_ooshutup10() -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(|| {
        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let target_exe = temp_dir.join("OOSU10.exe");

        if !target_exe.exists() {
            let dl_url = "https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe";
            let dl_status = new_hidden_command("curl.exe")
                .args(["-L", "-s", "-o", target_exe.to_str().unwrap(), dl_url])
                .output();

            if dl_status.is_err() || !target_exe.exists() {
                return Err("Falha ao baixar O&O ShutUp10++ via curl.".to_string());
            }
        }

        let _ = shell_open(&target_exe.to_string_lossy());

        Ok(CommandResponse::ok(
            "O&O ShutUp10++ iniciado com sucesso.",
            Some(target_exe.to_string_lossy().to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Executa atualização geral de todos os programas instalados via Winget
#[tauri::command]
pub async fn run_winget_upgrade() -> Result<CommandResponse<String>, String> {
    std::process::Command::new("cmd.exe")
        .args([
            "/c",
            "start",
            "winget",
            "upgrade",
            "--all",
            "--include-unknown",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ])
        .spawn()
        .map_err(|e| format!("Falha ao disparar Winget Upgrade: {}", e))?;

    Ok(CommandResponse::ok(
        "Atualização de aplicativos via Winget disparada em janela de console.",
        Some("Winget Upgrade Iniciado".to_string()),
    ))
}

/// Baixa e executa o Malwarebytes AdwCleaner para remoção de malwares e adwares
#[tauri::command]
pub async fn launch_adwcleaner() -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(|| {
        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let target_exe = temp_dir.join("adwcleaner.exe");

        if !target_exe.exists() {
            let dl_url = "https://downloads.malwarebytes.com/file/adwcleaner";
            let dl_status = new_hidden_command("curl.exe")
                .args(["-L", "-s", "-o", target_exe.to_str().unwrap(), dl_url])
                .output();

            if dl_status.is_err() || !target_exe.exists() {
                return Err("Falha ao baixar AdwCleaner via curl.".to_string());
            }
        }

        let _ = shell_open(&target_exe.to_string_lossy());

        Ok(CommandResponse::ok(
            "Malwarebytes AdwCleaner iniciado com sucesso.",
            Some(target_exe.to_string_lossy().to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Abre imediatamente a ferramenta se já estiver instalada no PC, ou instala via Winget e abre em seguida
#[tauri::command]
pub async fn launch_or_install_tool(tool_id: String) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let current_status = detect_installed_tools_sync();
        let id_lower = tool_id.to_lowercase();

        let (display_name, package_id, existing_path) = match id_lower.as_str() {
            "cpuz" | "cpu-z" => ("CPU-Z", "CPUID.CPU-Z", current_status.cpuz_path),
            "hwmonitor" => ("HWMonitor", "CPUID.HWMonitor", current_status.hwmonitor_path),
            "gpuz" | "gpu-z" => ("GPU-Z", "TechPowerUp.GPU-Z", current_status.gpuz_path),
            _ => return Err(format!("Ferramenta desconhecida: {}", tool_id)),
        };

        // 1. Se o executável já existe no PC, abre na hora via ShellExecuteW ("open")!
        if let Some(exe_path) = existing_path {
            shell_open(&exe_path)?;
            return Ok(CommandResponse::ok(
                format!("{} aberto com sucesso!", display_name),
                Some(exe_path),
            ));
        }

        // 2. Se não estiver instalado, instala via Winget
        let output = new_hidden_command("winget.exe")
            .args([
                "install",
                "--id",
                package_id,
                "-e",
                "--accept-package-agreements",
                "--accept-source-agreements",
                "--silent",
            ])
            .output()
            .map_err(|e| format!("Erro ao executar winget: {}", e))?;

        // Verifica novamente se o executável passou a existir após o winget
        let updated_status = detect_installed_tools_sync();
        let new_path = match id_lower.as_str() {
            "cpuz" | "cpu-z" => updated_status.cpuz_path,
            "hwmonitor" => updated_status.hwmonitor_path,
            "gpuz" | "gpu-z" => updated_status.gpuz_path,
            _ => None,
        };

        if let Some(exe_path) = new_path {
            let _ = shell_open(&exe_path);
            return Ok(CommandResponse::ok(
                format!("{} instalado e iniciado com sucesso!", display_name),
                Some(exe_path),
            ));
        }

        if output.status.success() {
            Ok(CommandResponse::ok(
                format!("{} instalado com sucesso via Winget!", display_name),
                Some(package_id.to_string()),
            ))
        } else {
            // Fallback: abrir janela visível do winget caso exija interação de UAC
            let _ = std::process::Command::new("cmd.exe")
                .args([
                    "/c",
                    "start",
                    "winget",
                    "install",
                    "--id",
                    package_id,
                    "-e",
                    "--accept-package-agreements",
                    "--accept-source-agreements",
                ])
                .spawn();

            Ok(CommandResponse::ok(
                format!("Instalador do {} iniciado via Winget.", display_name),
                Some(package_id.to_string()),
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Alias compatível para install_quick_tool
#[tauri::command]
pub async fn install_quick_tool(tool_id: String) -> Result<CommandResponse<String>, String> {
    launch_or_install_tool(tool_id).await
}
