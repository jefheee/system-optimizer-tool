use std::path::{Path, PathBuf};
use tauri::State;
use tokio::sync::watch;
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
use winreg::RegKey;

use windows::core::{s, w};
use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};

use crate::state::{AppState, CommandResponse, GamerStatus};
use crate::utils::{flush_working_set_all_processes, new_hidden_command};

type NtSetTimerResolutionFn = unsafe extern "system" fn(
    desired_resolution: u32,
    set_resolution: u8,
    current_resolution: *mut u32,
) -> i32;

fn set_timer_resolution_raw(desired_100ns: u32, set: bool) -> Result<u32, String> {
    unsafe {
        let ntdll = GetModuleHandleW(w!("ntdll.dll")).map_err(|e| e.to_string())?;
        let proc = GetProcAddress(ntdll, s!("NtSetTimerResolution"));
        let func: NtSetTimerResolutionFn = match proc {
            Some(p) => std::mem::transmute(p),
            None => return Err("Função NtSetTimerResolution não encontrada em ntdll.dll".to_string()),
        };

        let mut current_res = 0u32;
        let status = func(desired_100ns, if set { 1 } else { 0 }, &mut current_res);
        if status == 0 {
            Ok(current_res)
        } else {
            Err(format!("NtSetTimerResolution retornou código NTSTATUS: {:#x}", status))
        }
    }
}

/// Consulta o estado atual dos ajustes gamer mantidos no AppState
#[tauri::command]
pub async fn get_gamer_status(state: State<'_, AppState>) -> Result<CommandResponse<GamerStatus>, String> {
    let gamer = state.gamer.lock().map_err(|e| e.to_string())?;
    let status = GamerStatus {
        timer_resolution_active: gamer.timer_resolution_active,
        current_resolution_ms: (gamer.current_resolution_100ns as f32) / 10000.0,
        ram_autoclean_active: gamer.ram_autoclean_active,
    };
    Ok(CommandResponse::ok("Status gamer obtido.", Some(status)))
}

/// Alterna a resolução do timer do Windows (5000 = 0.5ms vs 156250 = padrão)
#[tauri::command]
pub async fn toggle_timer_resolution(
    enable: bool,
    state: State<'_, AppState>,
) -> Result<CommandResponse<GamerStatus>, String> {
    let desired = if enable { 5000 } else { 156250 };
    let actual_res = set_timer_resolution_raw(desired, enable)?;

    let mut gamer = state.gamer.lock().map_err(|e| e.to_string())?;
    gamer.timer_resolution_active = enable;
    gamer.current_resolution_100ns = actual_res;

    let res_ms = (actual_res as f32) / 10000.0;
    let msg = if enable {
        format!("Resolução de temporizador ajustada para 0.5ms (Atual: {:.2}ms).", res_ms)
    } else {
        format!("Resolução do timer restaurada para o padrão do Windows ({:.2}ms).", res_ms)
    };

    let status = GamerStatus {
        timer_resolution_active: gamer.timer_resolution_active,
        current_resolution_ms: res_ms,
        ram_autoclean_active: gamer.ram_autoclean_active,
    };

    Ok(CommandResponse::ok(msg, Some(status)))
}

/// Define prioridade Alta para o executável do jogo no Registro (Image File Execution Options)
#[tauri::command]
pub async fn set_game_priority(exe_name: String) -> Result<CommandResponse<String>, String> {
    let trimmed = exe_name.trim();
    if trimmed.is_empty() {
        return Err("O nome do processo não pode ser vazio.".to_string());
    }

    if trimmed.contains('/') || trimmed.contains('\\') || trimmed.contains("..") {
        return Err("Informe apenas o nome do arquivo executável (ex: jogo.exe), sem barras ou diretórios.".to_string());
    }

    let final_name = if trimmed.to_lowercase().ends_with(".exe") {
        trimmed.to_string()
    } else {
        format!("{}.exe", trimmed)
    };

    tokio::task::spawn_blocking(move || {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let subkey_path = format!(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\{}\PerfOptions",
            final_name
        );

        let (key, _) = hklm
            .create_subkey(&subkey_path)
            .map_err(|e| format!("Falha ao acessar registro HKLM (exige permissão de administrador): {}", e))?;

        // CpuPriorityClass = 3 (Prioridade Alta)
        key.set_value("CpuPriorityClass", &3u32)
            .map_err(|e| format!("Falha ao gravar CpuPriorityClass: {}", e))?;

        Ok(CommandResponse::ok(
            format!("Prioridade Alta configurada com sucesso no Registro para '{}'.", final_name),
            Some(final_name),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Desativa Otimizações de Tela Cheia (FSO / GameDVR) no Registro
#[tauri::command]
pub async fn disable_fullscreen_optimizations(disable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu
            .create_subkey(r"System\GameConfigStore")
            .map_err(|e| format!("Erro ao abrir chave GameConfigStore: {}", e))?;

        let mode_val: u32 = if disable { 2 } else { 0 };
        key.set_value("GameDVR_FSEBehaviorMode", &mode_val)
            .map_err(|e| format!("Erro ao definir GameDVR_FSEBehaviorMode: {}", e))?;
        key.set_value("GameDVR_HonorUserFSEBehaviorMode", &1u32)
            .map_err(|e| format!("Erro ao definir GameDVR_HonorUserFSEBehaviorMode: {}", e))?;
        key.set_value("GameDVR_FSEBehavior", &2u32)
            .map_err(|e| format!("Erro ao definir GameDVR_FSEBehavior: {}", e))?;

        let msg = if disable {
            "Otimizações de tela inteira (FSO) desativadas para mitigar delay no Alt+Tab."
        } else {
            "Otimizações de tela inteira restauradas."
        };

        Ok(CommandResponse::ok(msg, Some(disable)))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Otimização de Precisão de Mouse 1:1 (desativa aceleração)
#[tauri::command]
pub async fn optimize_mouse(enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu
            .create_subkey(r"Control Panel\Mouse")
            .map_err(|e| format!("Erro ao abrir chave Mouse: {}", e))?;

        if enable {
            key.set_value("MouseSpeed", &"0")
                .map_err(|e| format!("Erro ao gravar MouseSpeed: {}", e))?;
            key.set_value("MouseThreshold1", &"0")
                .map_err(|e| format!("Erro ao gravar MouseThreshold1: {}", e))?;
            key.set_value("MouseThreshold2", &"0")
                .map_err(|e| format!("Erro ao gravar MouseThreshold2: {}", e))?;
        } else {
            key.set_value("MouseSpeed", &"1")
                .map_err(|e| format!("Erro ao gravar MouseSpeed: {}", e))?;
            key.set_value("MouseThreshold1", &"6")
                .map_err(|e| format!("Erro ao gravar MouseThreshold1: {}", e))?;
            key.set_value("MouseThreshold2", &"10")
                .map_err(|e| format!("Erro ao gravar MouseThreshold2: {}", e))?;
        }

        let msg = if enable {
            "Aceleração do mouse desativada no Registro (Precisão 1:1 nativa ativa)."
        } else {
            "Configurações padrão do mouse restauradas."
        };

        Ok(CommandResponse::ok(msg, Some(enable)))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Otimização de Teclado (reduz atraso de repetição de teclas)
#[tauri::command]
pub async fn optimize_keyboard() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu
            .create_subkey(r"Control Panel\Keyboard")
            .map_err(|e| format!("Erro ao acessar chave Keyboard: {}", e))?;

        key.set_value("KeyboardDelay", &"0")
            .map_err(|e| format!("Erro ao definir KeyboardDelay: {}", e))?;
        key.set_value("KeyboardSpeed", &"31")
            .map_err(|e| format!("Erro ao definir KeyboardSpeed: {}", e))?;

        let (resp_key, _) = hkcu
            .create_subkey(r"Control Panel\Accessibility\Keyboard Response")
            .map_err(|e| format!("Erro ao acessar chave Keyboard Response: {}", e))?;

        resp_key
            .set_value("AutoRepeatDelay", &"150")
            .map_err(|e| format!("Erro ao definir AutoRepeatDelay: {}", e))?;

        Ok(CommandResponse::ok(
            "Taxa de repetição do teclado otimizada para menor latência (150ms).",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Otimização de Rede TCP (Nagle's Algorithm desativado em interfaces com IP ativo)
#[tauri::command]
pub async fn optimize_tcp_network() -> Result<CommandResponse<u32>, String> {
    tokio::task::spawn_blocking(|| {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let base_path = r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces";
        let base_key = hklm
            .open_subkey(base_path)
            .map_err(|e| format!("Erro ao acessar adaptadores de rede no Registro: {}", e))?;

        let mut updated_count = 0u32;

        for subkey_name in base_key.enum_keys().flatten() {
            let interface_path = format!(r"{}\{}", base_path, subkey_name);
            if let Ok(key) = hklm.open_subkey_with_flags(&interface_path, winreg::enums::KEY_ALL_ACCESS) {
                let has_ip = key.get_value::<String, _>("DhcpIPAddress").is_ok()
                    || key.get_value::<String, _>("IPAddress").is_ok();

                if has_ip {
                    let _ = key.set_value("TcpAckFrequency", &1u32);
                    let _ = key.set_value("TCPNoDelay", &1u32);
                    updated_count += 1;
                }
            }
        }

        Ok(CommandResponse::ok(
            format!(
                "Otimização TCP aplicada com sucesso em {} interface(s) de rede ativa(s).",
                updated_count
            ),
            Some(updated_count),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Inicia ou interrompe o job assíncrono de auto-limpeza de memória RAM em background
#[tauri::command]
pub async fn toggle_ram_autoclean(
    enable: bool,
    state: State<'_, AppState>,
) -> Result<CommandResponse<GamerStatus>, String> {
    let mut gamer = state.gamer.lock().map_err(|e| e.to_string())?;

    if enable {
        if gamer.ram_autoclean_active {
            let status = GamerStatus {
                timer_resolution_active: gamer.timer_resolution_active,
                current_resolution_ms: (gamer.current_resolution_100ns as f32) / 10000.0,
                ram_autoclean_active: true,
            };
            return Ok(CommandResponse::ok("Job de Auto-Limpeza de RAM já está em execução.", Some(status)));
        }

        let (tx, mut rx) = watch::channel(false);
        gamer.ram_autoclean_cancel = Some(tx);
        gamer.ram_autoclean_active = true;

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(600)) => {
                        let _ = tokio::task::spawn_blocking(|| {
                            flush_working_set_all_processes();
                        }).await;
                    }
                    _ = rx.changed() => {
                        break;
                    }
                }
            }
        });

        let status = GamerStatus {
            timer_resolution_active: gamer.timer_resolution_active,
            current_resolution_ms: (gamer.current_resolution_100ns as f32) / 10000.0,
            ram_autoclean_active: true,
        };

        Ok(CommandResponse::ok(
            "Job de auto-limpeza de RAM ativado (executa silenciosamente a cada 10 minutos).",
            Some(status),
        ))
    } else {
        if let Some(cancel_tx) = gamer.ram_autoclean_cancel.take() {
            let _ = cancel_tx.send(true);
        }
        gamer.ram_autoclean_active = false;

        let status = GamerStatus {
            timer_resolution_active: gamer.timer_resolution_active,
            current_resolution_ms: (gamer.current_resolution_100ns as f32) / 10000.0,
            ram_autoclean_active: false,
        };

        Ok(CommandResponse::ok("Job de auto-limpeza de RAM desativado.", Some(status)))
    }
}

/// Adiciona exclusão de varredura do Windows Defender para uma pasta de jogo
#[tauri::command]
pub async fn add_defender_exclusion(folder_path: String) -> Result<CommandResponse<String>, String> {
    let trimmed = folder_path.trim().to_string();
    if trimmed.is_empty() {
        return Err("O caminho da pasta não pode ser vazio.".to_string());
    }

    if !Path::new(&trimmed).exists() {
        return Err(format!("O caminho especificado não existe no disco: '{}'", trimmed));
    }

    tokio::task::spawn_blocking(move || {
        let escaped_path = trimmed.replace('\'', "''");
        let ps_cmd = format!("Add-MpPreference -ExclusionPath '{}'", escaped_path);

        let output = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output()
            .map_err(|e| format!("Erro ao executar powershell: {}", e))?;

        if output.status.success() {
            Ok(CommandResponse::ok(
                format!("Pasta '{}' adicionada com sucesso às exclusões do Windows Defender.", trimmed),
                Some(trimmed),
            ))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Falha ao adicionar exclusão no Windows Defender: {}", stderr))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Limpa caches de Shader do DirectX e drivers de vídeo (D3D, NVIDIA, AMD)
#[tauri::command]
pub async fn reset_shader_cache() -> Result<CommandResponse<u32>, String> {
    tokio::task::spawn_blocking(|| {
        let local_appdata = std::env::var("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Default\\AppData\\Local"));

        let shader_dirs = vec![
            local_appdata.join("D3DSCache"),
            local_appdata.join("NVIDIA\\DXCache"),
            local_appdata.join("NVIDIA\\GLCache"),
            local_appdata.join("AMD\\DxCache"),
            local_appdata.join("AMD\\DxcCache"),
        ];

        let mut deleted_files = 0u32;
        for dir in shader_dirs {
            if dir.exists() {
                if let Ok(entries) = std::fs::read_dir(&dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if std::fs::remove_file(&path).is_ok() {
                                deleted_files += 1;
                            }
                        }
                    }
                }
            }
        }

        // Executa cleanmgr de forma silenciosa para o cache DirectX
        let _ = new_hidden_command("cleanmgr.exe").args(["/d", "C:", "/verylowdisk"]).output();

        Ok(CommandResponse::ok(
            format!(
                "Cache de Shaders DirectX/GPU limpo com sucesso ({} arquivos excluídos).",
                deleted_files
            ),
            Some(deleted_files),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}
