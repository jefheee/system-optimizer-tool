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

pub fn apply_kernel_timer(enable: bool, state: &AppState) -> Result<u32, String> {
    let desired = if enable { 5000 } else { 156250 };
    let actual_res = set_timer_resolution_raw(desired, enable)?;
    if let Ok(mut gamer) = state.gamer.lock() {
        gamer.timer_resolution_active = enable;
        gamer.current_resolution_100ns = actual_res;
    }
    Ok(actual_res)
}

pub fn flush_working_sets_internal() -> usize {
    flush_working_set_all_processes()
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

/// Ativa e define como padrão o plano de energia de Desempenho Máximo (Ultimate Performance)
#[tauri::command]
pub async fn enable_ultimate_performance_plan(app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        crate::utils::emit_step(&app, "gamer_power_plan", "Desbloqueando plano Ultimate Performance...", "running", "Duplicando esquema OEM oculto e ativando.", 1, 2);

        // Duplica esquema Ultimate Performance caso não exista
        let dup = new_hidden_command("powercfg.exe")
            .args(["-duplicatescheme", "e9a42b02-d5df-448d-aa00-03f14749eb61"])
            .output();

        let mut scheme_guid = "e9a42b02-d5df-448d-aa00-03f14749eb61".to_string();
        if let Ok(out) = dup {
            let stdout = String::from_utf8_lossy(&out.stdout);
            // Se retornou um GUID específico no stdout: GUID do Esquema de Energia: xxxxx-xxxx
            for word in stdout.split_whitespace() {
                if word.len() == 36 && word.contains('-') {
                    scheme_guid = word.to_string();
                    break;
                }
            }
        }

        crate::utils::emit_step(&app, "gamer_power_plan", "Ativando plano como ativo...", "running", &format!("powercfg /setactive {}", scheme_guid), 2, 2);

        // Ativa o plano
        let act = new_hidden_command("powercfg.exe")
            .args(["/setactive", &scheme_guid])
            .output();

        if act.map(|o| o.status.success()).unwrap_or(false) {
            crate::utils::emit_step(&app, "gamer_power_plan", "Plano Desempenho Máximo Ativado!", "success", "Frequência de clock e latência de C-States travadas no perfil máximo.", 2, 2);
            Ok(CommandResponse::ok(
                "Plano de Energia 'Desempenho Máximo' (Ultimate Performance) ativado com sucesso!",
                Some(scheme_guid),
            ))
        } else {
            // Tentar ativar pelo GUID padrão de Alto Desempenho (8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c) como fallback
            let _ = new_hidden_command("powercfg.exe")
                .args(["/setactive", "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"])
                .output();
            crate::utils::emit_step(&app, "gamer_power_plan", "Plano de Alto Desempenho Ativado (Fallback)", "success", "Esquema alternativo aplicado.", 2, 2);
            Ok(CommandResponse::ok(
                "Plano de Alto Desempenho aplicado como fallback.",
                Some("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c".to_string()),
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Executa liberação imediata de memória RAM (Working Set Flush de todos os processos)
#[tauri::command]
pub async fn flush_ram_now() -> Result<CommandResponse<usize>, String> {
    tokio::task::spawn_blocking(|| {
        let count = flush_working_set_all_processes();
        Ok(CommandResponse::ok(
            format!("Memória RAM otimizada imediatamente! {} processos tiveram seu working set limpo.", count),
            Some(count),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Ativa ou Desativa VBS (Virtualization-Based Security / Isolamento de Núcleo)
#[tauri::command]
pub async fn toggle_vbs(disable: bool, app: tauri::AppHandle) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let val = if disable { "off" } else { "auto" };
        crate::utils::emit_step(&app, "gamer_vbs", "Configurando hypervisorlaunchtype via bcdedit...", "running", &format!("bcdedit /set hypervisorlaunchtype {}", val), 1, 1);

        let out = new_hidden_command("bcdedit.exe")
            .args(["/set", "hypervisorlaunchtype", val])
            .output()
            .map_err(|e| e.to_string())?;

        if out.status.success() {
            let msg = if disable {
                "Isolamento de Núcleo / VBS desativado no BCD. Reinicie o computador para aplicar o ganho de FPS."
            } else {
                "Isolamento de Núcleo / VBS reativado no BCD. Reinicie o computador para aplicar."
            };
            crate::utils::emit_step(&app, "gamer_vbs", "Configuração aplicada no BCD", "success", msg, 1, 1);
            Ok(CommandResponse::ok(msg, Some(disable)))
        } else {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            crate::utils::emit_step(&app, "gamer_vbs", "Falha ao aplicar no BCD", "error", &err, 1, 1);
            Ok(CommandResponse::err(format!("Falha ao alterar VBS: {}", err)))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeavyProcess {
    pub pid: u32,
    pub name: String,
    pub memory_mb: f32,
    pub cpu_percent: f32,
}

/// Lista os 8 processos de usuário que mais consomem memória RAM no momento (Modo Foco Gamer / Process Freezer)
#[tauri::command]
pub async fn get_heavy_processes() -> Result<CommandResponse<Vec<HeavyProcess>>, String> {
    tokio::task::spawn_blocking(|| {
        use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System};

        let mut sys = System::new_with_specifics(
            RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
        );
        sys.refresh_processes(ProcessesToUpdate::All, true);

        let current_pid = std::process::id();
        let critical_names = [
            "system",
            "idle",
            "registry",
            "memcompression",
            "smss.exe",
            "csrss.exe",
            "wininit.exe",
            "services.exe",
            "lsass.exe",
            "svchost.exe",
            "fontdrvhost.exe",
            "winlogon.exe",
            "dwm.exe",
            "explorer.exe",
            "sihost.exe",
            "taskhostw.exe",
            "runtimebroker.exe",
            "searchhost.exe",
            "startmenuexperiencehost.exe",
            "msmpeng.exe",
            "nissrv.exe",
            "audiodg.exe",
            "conhost.exe",
            "ctfmon.exe",
            "dllhost.exe",
            "spoolsv.exe",
            "wmiprvse.exe",
            "securityhealthservice.exe",
            "securityhealthsystray.exe",
            "system-optimizer.exe",
            "app.exe",
            "cargo.exe",
            "node.exe",
        ];

        let mut list: Vec<HeavyProcess> = sys
            .processes()
            .iter()
            .filter_map(|(pid, proc_info)| {
                let p_u32 = pid.as_u32();
                if p_u32 <= 4 || p_u32 == current_pid {
                    return None;
                }
                let name = proc_info.name().to_string_lossy().to_string();
                let lower = name.to_lowercase();
                if critical_names.iter().any(|&c| lower == c) {
                    return None;
                }
                let mem_mb = (proc_info.memory() as f32) / (1024.0 * 1024.0);
                if mem_mb < 15.0 {
                    return None;
                }
                Some(HeavyProcess {
                    pid: p_u32,
                    name,
                    memory_mb: (mem_mb * 10.0).round() / 10.0,
                    cpu_percent: (proc_info.cpu_usage() * 10.0).round() / 10.0,
                })
            })
            .collect();

        list.sort_by(|a, b| b.memory_mb.partial_cmp(&a.memory_mb).unwrap_or(std::cmp::Ordering::Equal));
        list.truncate(8);

        Ok(CommandResponse::ok(
            format!("{} processos de alto consumo identificados.", list.len()),
            Some(list),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Encerra um processo de segundo plano pelo PID para liberar RAM antes de jogar
#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<CommandResponse<bool>, String> {
    if pid <= 4 || pid == std::process::id() {
        return Err("Processo protegido do sistema.".to_string());
    }

    tokio::task::spawn_blocking(move || {
        let out = new_hidden_command("taskkill.exe")
            .args(["/F", "/PID", &pid.to_string()])
            .output()
            .map_err(|e| format!("Erro ao encerrar processo: {}", e))?;

        if out.status.success() {
            Ok(CommandResponse::ok(
                format!("Processo (PID {}) encerrado com sucesso e memória liberada!", pid),
                Some(true),
            ))
        } else {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            Err(format!("Não foi possível encerrar o processo PID {}: {}", pid, err))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}


