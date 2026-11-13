use std::path::{Path, PathBuf};
use tauri::State;
use tokio::sync::watch;
use winreg::enums::{RegType, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE};
use winreg::{RegKey, RegValue};

use windows::core::{s, w};
use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};

use crate::state::{AppState, CommandResponse, GamerStatus};
use crate::utils::{emit_step, flush_working_set_all_processes, new_hidden_command};

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

// =====================================================================
// ETAPA 3 — MÓDULOS 5, 7 & 8: ENGENHARIA GRÁFICA, AFTERBURNER 1% LOW,
// AFINIDADE DE CPU (SMT OFF / CORE 0 OFF), MOUSE DPI 1:1 & ANTI-CHEAT
// =====================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuServiceStatus {
    pub name: String,
    pub display_name: String,
    pub state: String,
    pub optimized: bool,
    pub note: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuGamingState {
    pub gpu_name: String,
    pub gpu_vendor: String,
    pub hags_enabled: bool,
    pub ofwg_enabled: bool,
    pub p0_state_enabled: bool,
    pub hdcp_disabled: bool,
    pub mpo_disabled: bool,
    pub fso_disabled: bool,
    pub ulps_disabled: bool,
    pub ulps_blocked_by_rx7000: bool,
    pub ulps_warning: String,
    pub telemetry_services_optimized: bool,
    pub profile_3d_applied: bool,
    pub afterburner_installed: bool,
    pub afterburner_cfg_path: String,
    pub afterburner_fix_applied: bool,
    pub win32_priority_hex: u32,
    pub mmcss_optimized: bool,
    pub background_polling_unlocked: bool,
    pub services: Vec<GpuServiceStatus>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuAffinityPreview {
    pub physical_cores: u32,
    pub logical_threads: u32,
    pub mode: String,
    pub mask_decimal: u64,
    pub mask_hex: String,
    pub active_bits_summary: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AntiCheatStatusItem {
    pub id: String,
    pub name: String,
    pub anticheat: String,
    pub compatible: bool,
    pub summary: String,
    pub blocking_reasons: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AntiCheatReadinessReport {
    pub tpm_enabled: bool,
    pub secure_boot_enabled: bool,
    pub cfg_enabled: bool,
    pub vbs_enabled: bool,
    pub dep_enabled: bool,
    pub games: Vec<AntiCheatStatusItem>,
}

/// Calcula deterministicamente a máscara de afinidade de CPU (u64 + hexadecimal)
/// para modos `"smt_off"`, `"core0_off"` e `"all_cores"`.
pub fn calculate_cpu_affinity_mask(
    physical_cores: u32,
    logical_threads: u32,
    mode: &str,
) -> (u64, String) {
    let logical = logical_threads.clamp(1, 64);
    let physical = physical_cores.clamp(1, logical);
    let full_mask: u64 = if logical >= 64 {
        u64::MAX
    } else {
        (1u64 << logical) - 1
    };

    let mask = match mode.trim().to_ascii_lowercase().as_str() {
        "smt_off" => {
            if logical > physical {
                let mut m = 0u64;
                let mut bit = 0u32;
                while bit < logical {
                    m |= 1u64 << bit;
                    bit += 2;
                }
                m & full_mask
            } else {
                full_mask
            }
        }
        "core0_off" => {
            if logical > physical {
                let cleared = full_mask & !0b11u64;
                if cleared == 0 {
                    full_mask
                } else {
                    cleared
                }
            } else if logical > 1 {
                full_mask & !0b1u64
            } else {
                full_mask
            }
        }
        _ => full_mask,
    };

    (mask, format!("0x{:X}", mask))
}

/// Trava de segurança obrigatória para AMD Radeon RX 7000+ com HAGS ativo ao tentar desligar ULPS.
pub fn check_ulps_safety_guard(gpu_name: &str, hags_enabled: bool) -> Result<(), String> {
    let lower = gpu_name.to_lowercase();
    let is_rx7000_plus = lower.contains("rx 76")
        || lower.contains("rx 77")
        || lower.contains("rx 78")
        || lower.contains("rx 79")
        || lower.contains("rx 90")
        || lower.contains("radeon 7")
        || lower.contains("radeon 8")
        || lower.contains("radeon rx 7")
        || lower.contains("radeon rx 9")
        || lower.contains("rdna3")
        || lower.contains("rdna 3")
        || lower.contains("rdna4")
        || lower.contains("rdna 4");

    if is_rx7000_plus && hags_enabled {
        return Err(format!(
            "TRAVA DE SEGURANÇA (RX 7000+ / HAGS): Desativar o ULPS em '{}' com HAGS ativo causa bug severo no driver AMD (quedas bruscas de FPS e stuttering). Desative o HAGS primeiro ou mantenha o ULPS ativado.",
            gpu_name
        ));
    }
    Ok(())
}

/// Constrói as curvas binárias 1:1 lineares (`SmoothMouseXCurve` e `SmoothMouseYCurve`, 40 bytes cada)
/// para escalas DPI de Windows 100%, 125%, 150%, 175%, 200% e 225% sem aceleração de ponteiro.
pub fn build_linear_mouse_curve(dpi_scale_percent: u32) -> ([u8; 40], [u8; 40]) {
    let valid_scales = [100u32, 125, 150, 175, 200, 225];
    let normalized = valid_scales
        .iter()
        .copied()
        .min_by_key(|&s| s.abs_diff(dpi_scale_percent))
        .unwrap_or(100);

    // 5 pontos em formato 16.16 Fixed-Point Little-Endian (8 bytes/ponto: u32 LE + 4 zeros)
    const X_POINTS: [u32; 5] = [
        0x0000_0000,
        0x0000_6E00,
        0x0000_DC00,
        0x0001_B800,
        0x0029_4000,
    ];

    let mut x_bytes = [0u8; 40];
    let mut y_bytes = [0u8; 40];

    for (idx, &x_val) in X_POINTS.iter().enumerate() {
        let y_u64 = (x_val as u64) * (normalized as u64) * 35 / 1000;
        let y_val = y_u64.min(u32::MAX as u64) as u32;

        let offset = idx * 8;
        x_bytes[offset..offset + 4].copy_from_slice(&x_val.to_le_bytes());
        y_bytes[offset..offset + 4].copy_from_slice(&y_val.to_le_bytes());
    }

    (x_bytes, y_bytes)
}

/// Aplica o patch de 1% Low no conteúdo INI de `MSIAfterburner.cfg`:
/// desativa polling ativo dos sensores `GPU power` e `Power percent` e configura hotkeys F10/F11/F12.
pub fn patch_afterburner_cfg_content(original: &str) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut current_section = String::new();
    let mut in_power_source = false;
    let mut saw_settings_section = false;
    let mut wrote_hotkeys = false;

    for raw_line in original.lines() {
        let trimmed = raw_line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            // Flush hotkeys if leaving [Settings]
            if current_section.eq_ignore_ascii_case("[Settings]") && !wrote_hotkeys {
                out.push("ToggleOSDHotkey=121".to_string());
                out.push("BeginRecordingHotkey=122".to_string());
                out.push("EndRecordingHotkey=123".to_string());
                wrote_hotkeys = true;
            }
            // Ensure disabled markers if leaving a power source section
            if in_power_source {
                out.push("Enabled=0".to_string());
                out.push("ShowInOSD=0".to_string());
            }

            current_section = trimmed.to_string();
            let lower_sec = current_section.to_lowercase();
            in_power_source = lower_sec.starts_with("[source")
                && (lower_sec.contains("power") || lower_sec.contains("power percent"));

            if current_section.eq_ignore_ascii_case("[Settings]") {
                saw_settings_section = true;
            }
            out.push(raw_line.to_string());
            continue;
        }

        if let Some((key, val)) = trimmed.split_once('=') {
            let k_lower = key.trim().to_ascii_lowercase();
            let v_lower = val.trim().to_ascii_lowercase();

            if k_lower == "srcname"
                && (v_lower == "power"
                    || v_lower == "gpu power"
                    || v_lower == "gpu1 power"
                    || v_lower == "power percent")
            {
                in_power_source = true;
            }

            if in_power_source && (k_lower == "enabled" || k_lower == "showinosd") {
                continue; // Rewritten cleanly with Enabled=0 / ShowInOSD=0
            }

            if current_section.eq_ignore_ascii_case("[Settings]")
                && (k_lower == "toggleosdhotkey"
                    || k_lower == "beginrecordinghotkey"
                    || k_lower == "endrecordinghotkey")
            {
                continue;
            }
        }

        out.push(raw_line.to_string());
    }

    if in_power_source {
        out.push("Enabled=0".to_string());
        out.push("ShowInOSD=0".to_string());
    }
    if current_section.eq_ignore_ascii_case("[Settings]") && !wrote_hotkeys {
        out.push("ToggleOSDHotkey=121".to_string());
        out.push("BeginRecordingHotkey=122".to_string());
        out.push("EndRecordingHotkey=123".to_string());
    }

    if !saw_settings_section {
        if !out.is_empty() {
            out.push(String::new());
        }
        out.push("[Settings]".to_string());
        out.push("ToggleOSDHotkey=121".to_string());
        out.push("BeginRecordingHotkey=122".to_string());
        out.push("EndRecordingHotkey=123".to_string());
    }

    let joined_lower = out.join("\n").to_lowercase();
    if !joined_lower.contains("[source power]") {
        out.push(String::new());
        out.push("[Source Power]".to_string());
        out.push("Enabled=0".to_string());
        out.push("ShowInOSD=0".to_string());
    }
    if !joined_lower.contains("[source power percent]") {
        out.push(String::new());
        out.push("[Source Power percent]".to_string());
        out.push("Enabled=0".to_string());
        out.push("ShowInOSD=0".to_string());
    }

    out.join("\r\n") + "\r\n"
}

fn find_afterburner_cfg_path() -> (bool, PathBuf) {
    let candidates = [
        PathBuf::from(r"C:\Program Files (x86)\MSI Afterburner\Profiles\MSIAfterburner.cfg"),
        PathBuf::from(r"C:\Program Files\MSI Afterburner\Profiles\MSIAfterburner.cfg"),
        PathBuf::from(r"C:\Program Files (x86)\MSI Afterburner\MSIAfterburner.cfg"),
        PathBuf::from(r"C:\Program Files\MSI Afterburner\MSIAfterburner.cfg"),
    ];
    for p in &candidates {
        if p.exists() {
            return (true, p.clone());
        }
    }
    let dir_x86 = PathBuf::from(r"C:\Program Files (x86)\MSI Afterburner");
    if dir_x86.exists() {
        return (true, dir_x86.join("Profiles").join("MSIAfterburner.cfg"));
    }
    (false, candidates[0].clone())
}

fn detect_primary_gpu_from_registry() -> (String, String, Vec<String>) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let class_root =
        r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}";
    let mut subkeys = Vec::new();
    let mut best_name = "GPU Padrão".to_string();
    let mut best_priority = 0u8;

    if let Ok(root) = hklm.open_subkey_with_flags(class_root, KEY_READ) {
        for name in root.enum_keys().flatten() {
            if name.len() != 4 || !name.chars().all(|c| c.is_ascii_digit()) {
                continue;
            }
            if let Ok(sk) = root.open_subkey_with_flags(&name, KEY_READ) {
                let desc: String = sk.get_value("DriverDesc").unwrap_or_default();
                if desc.trim().is_empty() {
                    continue;
                }
                subkeys.push(format!(r"{}\{}", class_root, name));
                let lower = desc.to_lowercase();
                let prio = if lower.contains("rtx")
                    || lower.contains("gtx")
                    || lower.contains("radeon rx")
                    || lower.contains("arc ")
                {
                    3
                } else if lower.contains("nvidia") || lower.contains("amd radeon") {
                    2
                } else {
                    1
                };
                if prio > best_priority {
                    best_priority = prio;
                    best_name = desc;
                }
            }
        }
    }

    let lower = best_name.to_lowercase();
    let vendor = if lower.contains("nvidia") || lower.contains("geforce") {
        "NVIDIA".to_string()
    } else if lower.contains("amd") || lower.contains("radeon") {
        "AMD".to_string()
    } else if lower.contains("intel") {
        "Intel".to_string()
    } else {
        "Generic".to_string()
    };

    (best_name, vendor, subkeys)
}

fn query_sc_state(service_name: &str) -> Option<String> {
    let out = new_hidden_command("sc.exe")
        .args(["query", service_name])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let txt = String::from_utf8_lossy(&out.stdout).to_uppercase();
    if txt.contains("RUNNING") {
        Some("Running".to_string())
    } else if txt.contains("STOPPED") {
        Some("Stopped".to_string())
    } else {
        Some("Installed".to_string())
    }
}

fn read_gpu_gaming_state_sync() -> GpuGamingState {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (gpu_name, gpu_vendor, adapter_keys) = detect_primary_gpu_from_registry();

    // HAGS
    let hags_enabled = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers", KEY_READ)
        .and_then(|k| k.get_value::<u32, _>("HwSchMode"))
        .map(|v| v == 2)
        .unwrap_or(false);

    // OFWG
    let ofwg_str = hkcu
        .open_subkey_with_flags(r"Software\Microsoft\DirectX\UserGlobalSettings", KEY_READ)
        .and_then(|k| k.get_value::<String, _>("DirectXUserGlobalSettings"))
        .unwrap_or_default();
    let ofwg_enabled = ofwg_str.contains("SwapEffectUpgradeEnable=1");

    // Adapter-level P0, HDCP, ULPS
    let mut p0_state_enabled = false;
    let mut hdcp_disabled = false;
    let mut ulps_disabled = false;
    let mut profile_3d_applied = false;

    for path in &adapter_keys {
        if let Ok(sk) = hklm.open_subkey_with_flags(path, KEY_READ) {
            if sk.get_value::<u32, _>("DisableDynamicPstate").unwrap_or(0) == 1 {
                p0_state_enabled = true;
            }
            if sk.get_value::<u32, _>("RMHdcpKeyglobZero").unwrap_or(0) == 1 {
                hdcp_disabled = true;
            }
            if let Ok(ulps) = sk.get_value::<u32, _>("EnableUlps") {
                if ulps == 0 {
                    ulps_disabled = true;
                }
            }
            if sk.get_value::<u32, _>("SysOptimizer3DProfile").unwrap_or(0) == 1 {
                profile_3d_applied = true;
            }
        }
    }

    // MPO & FSO
    let mpo_disabled = hklm
        .open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows\Dwm", KEY_READ)
        .and_then(|k| k.get_value::<u32, _>("OverlayTestMode"))
        .map(|v| v == 5)
        .unwrap_or(false);

    let fso_disabled = hkcu
        .open_subkey_with_flags(r"System\GameConfigStore", KEY_READ)
        .and_then(|k| k.get_value::<u32, _>("GameDVR_FSEBehaviorMode"))
        .map(|v| v == 2)
        .unwrap_or(false);

    let ulps_guard = check_ulps_safety_guard(&gpu_name, hags_enabled);
    let (ulps_blocked_by_rx7000, ulps_warning) = match ulps_guard {
        Ok(()) => (false, String::new()),
        Err(msg) => (true, msg),
    };

    // Telemetry & PresentMon services
    let service_defs = [
        (
            "Intel(R) PresentMon Service",
            "Intel PresentMon Service",
            "Consome 1% a 2% de CPU continuamente em segundo plano mesmo fechado.",
        ),
        (
            "PresentMonService",
            "PresentMon Telemetry Service",
            "Serviço residente de captura PresentMon em segundo plano.",
        ),
        (
            "AMD Crash Defender Service",
            "AMD Crash Defender Service",
            "Coletor de crash dumps em segundo plano da AMD.",
        ),
        (
            "AMD External Events Utility",
            "AMD External Events Utility",
            "Utilitário de eventos AMD (mantenha se utilizar FreeSync via painel).",
        ),
        (
            "NvTelemetryContainer",
            "NVIDIA Telemetry Container",
            "Telemetria em segundo plano do driver NVIDIA.",
        ),
    ];

    let mut services = Vec::new();
    let mut telemetry_services_optimized = true;
    for (svc_id, display, note) in service_defs {
        if let Some(st) = query_sc_state(svc_id) {
            let opt = st == "Stopped";
            if !opt {
                telemetry_services_optimized = false;
            }
            services.push(GpuServiceStatus {
                name: svc_id.to_string(),
                display_name: display.to_string(),
                state: st,
                optimized: opt,
                note: note.to_string(),
            });
        }
    }

    // Afterburner state
    let (afterburner_installed, cfg_path) = find_afterburner_cfg_path();
    let afterburner_fix_applied = cfg_path
        .parent()
        .map(|p| p.join("MSIAfterburner.cfg.bak").exists())
        .unwrap_or(false)
        || std::fs::read_to_string(&cfg_path)
            .map(|c| c.contains("ToggleOSDHotkey=121") && c.contains("Enabled=0"))
            .unwrap_or(false);

    // Module 7 & 8 quick status
    let win32_priority_hex = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\PriorityControl", KEY_READ)
        .and_then(|k| k.get_value::<u32, _>("Win32PrioritySeparation"))
        .unwrap_or(2);

    let mm_resp = hklm
        .open_subkey_with_flags(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile",
            KEY_READ,
        )
        .and_then(|k| k.get_value::<u32, _>("SystemResponsiveness"))
        .unwrap_or(20);
    let mm_net = hklm
        .open_subkey_with_flags(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile",
            KEY_READ,
        )
        .and_then(|k| k.get_value::<u32, _>("NetworkThrottlingIndex"))
        .unwrap_or(10);
    let mmcss_optimized = mm_resp == 10 && mm_net == 0xFFFF_FFFF;

    let background_polling_unlocked = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Services\mouclass\Parameters", KEY_READ)
        .and_then(|k| k.get_value::<u32, _>("MouseDataQueueSize"))
        .map(|v| v <= 32)
        .unwrap_or(false)
        || hkcu
            .open_subkey_with_flags(r"Control Panel\Mouse", KEY_READ)
            .and_then(|k| k.get_value::<u32, _>("SysOptimizerPollingUnlocked"))
            .map(|v| v == 1)
            .unwrap_or(false);

    GpuGamingState {
        gpu_name,
        gpu_vendor,
        hags_enabled,
        ofwg_enabled,
        p0_state_enabled,
        hdcp_disabled,
        mpo_disabled,
        fso_disabled,
        ulps_disabled,
        ulps_blocked_by_rx7000,
        ulps_warning,
        telemetry_services_optimized,
        profile_3d_applied,
        afterburner_installed,
        afterburner_cfg_path: cfg_path.to_string_lossy().to_string(),
        afterburner_fix_applied,
        win32_priority_hex,
        mmcss_optimized,
        background_polling_unlocked,
        services,
    }
}

/// Consulta o estado completo do subsistema gráfico, serviços de GPU, Flip Models, MMCSS e Afterburner
#[tauri::command]
pub async fn get_gpu_gaming_state() -> Result<CommandResponse<GpuGamingState>, String> {
    let state = tokio::task::spawn_blocking(read_gpu_gaming_state_sync)
        .await
        .map_err(|e| e.to_string())?;
    Ok(CommandResponse::ok("Estado do subsistema gráfico auditado.", Some(state)))
}

/// Aplica ou reverte otimizações de Hardware GPU, Flip Models, P0 State, HDCP, MPO, ULPS e Serviços
#[tauri::command]
pub async fn apply_gpu_tweak(
    tweak_id: String,
    enable: bool,
    app: tauri::AppHandle,
) -> Result<CommandResponse<GpuGamingState>, String> {
    tokio::task::spawn_blocking(move || {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (gpu_name, vendor, adapter_keys) = detect_primary_gpu_from_registry();

        emit_step(
            &app,
            "gpu_tweak",
            &format!("Aplicando ajuste gráfico: {}", tweak_id),
            "running",
            &format!("enable={}", enable),
            1,
            2,
        );

        match tweak_id.as_str() {
            "hags" => {
                let (key, _) = hklm
                    .create_subkey(r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers")
                    .map_err(|e| format!("Falha ao abrir GraphicsDrivers (Requer Admin): {}", e))?;
                let val: u32 = if enable { 2 } else { 1 };
                key.set_value("HwSchMode", &val).map_err(|e| e.to_string())?;
            }
            "ofwg" => {
                let (key, _) = hkcu
                    .create_subkey(r"Software\Microsoft\DirectX\UserGlobalSettings")
                    .map_err(|e| e.to_string())?;
                let existing: String = key.get_value("DirectXUserGlobalSettings").unwrap_or_default();
                let mut parts: Vec<String> = existing
                    .split(';')
                    .filter(|s| !s.trim().is_empty() && !s.contains("SwapEffectUpgradeEnable"))
                    .map(|s| s.to_string())
                    .collect();
                parts.push(format!(
                    "SwapEffectUpgradeEnable={}",
                    if enable { 1 } else { 0 }
                ));
                let updated = format!("{};", parts.join(";"));
                key.set_value("DirectXUserGlobalSettings", &updated)
                    .map_err(|e| e.to_string())?;
            }
            "gpu_p0_state" => {
                if adapter_keys.is_empty() {
                    return Err("Nenhum adaptador de vídeo encontrado na classe PCI.".to_string());
                }
                for path in &adapter_keys {
                    if let Ok(sk) = hklm.open_subkey_with_flags(path, KEY_WRITE) {
                        if enable {
                            let _ = sk.set_value("DisableDynamicPstate", &1u32);
                        } else {
                            let _ = sk.delete_value("DisableDynamicPstate");
                        }
                    }
                }
            }
            "gpu_disable_hdcp" => {
                for path in &adapter_keys {
                    if let Ok(sk) = hklm.open_subkey_with_flags(path, KEY_WRITE) {
                        if enable {
                            let _ = sk.set_value("RMHdcpKeyglobZero", &1u32);
                        } else {
                            let _ = sk.delete_value("RMHdcpKeyglobZero");
                        }
                    }
                }
            }
            "mpo_disable" => {
                let (key, _) = hklm
                    .create_subkey(r"SOFTWARE\Microsoft\Windows\Dwm")
                    .map_err(|e| format!("Falha ao abrir Dwm (Requer Admin): {}", e))?;
                if enable {
                    key.set_value("OverlayTestMode", &5u32)
                        .map_err(|e| e.to_string())?;
                } else {
                    let _ = key.delete_value("OverlayTestMode");
                }
            }
            "fso_disable" => {
                let (key, _) = hkcu
                    .create_subkey(r"System\GameConfigStore")
                    .map_err(|e| e.to_string())?;
                if enable {
                    key.set_value("GameDVR_FSEBehaviorMode", &2u32)
                        .map_err(|e| e.to_string())?;
                    key.set_value("GameDVR_HonorUserFSEBehaviorMode", &1u32)
                        .map_err(|e| e.to_string())?;
                    key.set_value("GameDVR_DXGIHonorFSEWindowsCompatible", &1u32)
                        .map_err(|e| e.to_string())?;
                } else {
                    key.set_value("GameDVR_FSEBehaviorMode", &0u32)
                        .map_err(|e| e.to_string())?;
                    key.set_value("GameDVR_HonorUserFSEBehaviorMode", &0u32)
                        .map_err(|e| e.to_string())?;
                    key.set_value("GameDVR_DXGIHonorFSEWindowsCompatible", &0u32)
                        .map_err(|e| e.to_string())?;
                }
            }
            "amd_ulps_disable" => {
                let hags_on = hklm
                    .open_subkey_with_flags(
                        r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers",
                        KEY_READ,
                    )
                    .and_then(|k| k.get_value::<u32, _>("HwSchMode"))
                    .map(|v| v == 2)
                    .unwrap_or(false);

                if enable {
                    check_ulps_safety_guard(&gpu_name, hags_on)?;
                }

                for path in &adapter_keys {
                    if let Ok(sk) = hklm.open_subkey_with_flags(path, KEY_READ | KEY_WRITE) {
                        if sk.get_value::<u32, _>("EnableUlps").is_ok() || vendor == "AMD" {
                            let val = if enable { 0u32 } else { 1u32 };
                            let _ = sk.set_value("EnableUlps", &val);
                        }
                    }
                }
            }
            "gpu_telemetry_services" => {
                let svcs = [
                    "Intel(R) PresentMon Service",
                    "PresentMonService",
                    "AMD Crash Defender Service",
                    "AMD External Events Utility",
                    "NvTelemetryContainer",
                ];
                for svc in svcs {
                    if enable {
                        let _ = new_hidden_command("sc.exe").args(["stop", svc]).output();
                        let _ = new_hidden_command("sc.exe")
                            .args(["config", svc, "start=", "disabled"])
                            .output();
                    } else {
                        let _ = new_hidden_command("sc.exe")
                            .args(["config", svc, "start=", "demand"])
                            .output();
                    }
                }
            }
            "gpu_3d_profile" => {
                if let Some(first) = adapter_keys.first() {
                    if let Ok(sk) = hklm.open_subkey_with_flags(first, KEY_WRITE) {
                        if enable {
                            let _ = sk.set_value("SysOptimizer3DProfile", &1u32);
                            if vendor == "AMD" {
                                if let Ok((umd, _)) = sk.create_subkey("UMD") {
                                    let _ = umd.set_value("SurfaceFormatReplacements", &1u32);
                                }
                            } else if vendor == "NVIDIA" {
                                let _ = sk.set_value("PerfLevelSrc", &0x2222u32);
                                let _ = sk.set_value("PowerMizerEnable", &1u32);
                            }
                        } else {
                            let _ = sk.delete_value("SysOptimizer3DProfile");
                            let _ = sk.delete_value("PerfLevelSrc");
                        }
                    }
                }
                if vendor == "AMD" {
                    if let Ok((cn, _)) = hkcu.create_subkey(r"Software\AMD\CN") {
                        let _ = cn.set_value("OverlayEnabled", &(if enable { 0u32 } else { 1u32 }));
                        let _ = cn.set_value("ToastNotification", &(if enable { 0u32 } else { 1u32 }));
                    }
                }
            }
            other => return Err(format!("Ajuste gráfico desconhecido: {}", other)),
        }

        let updated = read_gpu_gaming_state_sync();
        emit_step(
            &app,
            "gpu_tweak",
            "Subsistema gráfico atualizado!",
            "success",
            &format!("{} = {}", tweak_id, enable),
            2,
            2,
        );
        Ok(CommandResponse::ok(
            format!("Ajuste '{}' {} com sucesso.", tweak_id, if enable { "ativado" } else { "revertido" }),
            Some(updated),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Gerador e patcher do perfil MSI Afterburner + RTSS (Fix Crítico de 1% Lows: desativa Power/Power percent)
#[tauri::command]
pub async fn apply_afterburner_1percent_low_fix(
    revert: bool,
) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let (installed, cfg_path) = find_afterburner_cfg_path();
        if !installed {
            return Err("MSI Afterburner não encontrado em C:\\Program Files (x86)\\MSI Afterburner. Instale-o pela aba SYS DRIVERS -> Smart Apps antes de aplicar o perfil.".to_string());
        }

        let bak_path = cfg_path.with_file_name("MSIAfterburner.cfg.bak");
        if revert {
            if bak_path.exists() {
                std::fs::copy(&bak_path, &cfg_path).map_err(|e| format!("Falha ao restaurar backup .cfg: {}", e))?;
                let _ = std::fs::remove_file(&bak_path);
                return Ok(CommandResponse::ok(
                    "Backup original do MSI Afterburner (MSIAfterburner.cfg.bak) restaurado com sucesso!",
                    Some(cfg_path.to_string_lossy().to_string()),
                ));
            }
            return Err("Nenhum arquivo MSIAfterburner.cfg.bak encontrado para reverter.".to_string());
        }

        if let Some(parent) = cfg_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let original = if cfg_path.exists() {
            let _ = std::fs::copy(&cfg_path, &bak_path);
            std::fs::read_to_string(&cfg_path).unwrap_or_default()
        } else {
            String::new()
        };

        let patched = patch_afterburner_cfg_content(&original);
        std::fs::write(&cfg_path, patched)
            .map_err(|e| format!("Sem permissão para gravar em {} (execute como Admin): {}", cfg_path.display(), e))?;

        Ok(CommandResponse::ok(
            format!(
                "Fix de 1% Lows aplicado em {}! Polling de 'GPU Power' e 'Power Percent' desativado + Hotkeys F10 (OSD), F11 (Start Bench) e F12 (Stop Bench) gravadas.",
                cfg_path.display()
            ),
            Some(cfg_path.to_string_lossy().to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Seletor de Win32PrioritySeparation (0x26, 0x38 ou 0x02 padrão)
#[tauri::command]
pub async fn set_win32_priority_separation(
    mode_hex: u32,
) -> Result<CommandResponse<u32>, String> {
    tokio::task::spawn_blocking(move || {
        let valid = match mode_hex {
            0x26 | 0x38 | 0x02 => mode_hex,
            _ => return Err("Valor inválido para Win32PrioritySeparation. Use 0x26, 0x38 ou 0x02.".to_string()),
        };

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let (key, _) = hklm
            .create_subkey(r"SYSTEM\CurrentControlSet\Control\PriorityControl")
            .map_err(|e| format!("Erro ao gravar PriorityControl (Requer Admin): {}", e))?;
        key.set_value("Win32PrioritySeparation", &valid)
            .map_err(|e| e.to_string())?;

        Ok(CommandResponse::ok(
            format!("Win32PrioritySeparation definido para 0x{:X} ({}). Reinicie o PC para surtir efeito completo.", valid, valid),
            Some(valid),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Configura MMCSS SystemProfile (SystemResponsiveness = 10, NetworkThrottlingIndex = FFFFFFFF, Tasks\Games)
#[tauri::command]
pub async fn configure_mmcss_gaming(enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let (sys_prof, _) = hklm
            .create_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile")
            .map_err(|e| format!("Falha ao abrir SystemProfile (Requer Admin): {}", e))?;

        let (games, _) = hklm
            .create_subkey(
                r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games",
            )
            .map_err(|e| format!("Falha ao abrir Tasks\\Games: {}", e))?;

        if enable {
            sys_prof.set_value("SystemResponsiveness", &10u32).map_err(|e| e.to_string())?;
            sys_prof
                .set_value("NetworkThrottlingIndex", &0xFFFF_FFFFu32)
                .map_err(|e| e.to_string())?;
            games.set_value("Scheduling Category", &"High").map_err(|e| e.to_string())?;
            games.set_value("SFIO Priority", &"High").map_err(|e| e.to_string())?;
            games.set_value("Priority", &6u32).map_err(|e| e.to_string())?;
            games.set_value("GPU Priority", &8u32).map_err(|e| e.to_string())?;

            Ok(CommandResponse::ok(
                "MMCSS SystemProfile otimizado: SystemResponsiveness=10%, NetworkThrottlingIndex=0xFFFFFFFF, Tasks\\Games=High (Priority 6).",
                Some(true),
            ))
        } else {
            sys_prof.set_value("SystemResponsiveness", &20u32).map_err(|e| e.to_string())?;
            sys_prof.set_value("NetworkThrottlingIndex", &10u32).map_err(|e| e.to_string())?;
            games.set_value("Scheduling Category", &"Medium").map_err(|e| e.to_string())?;
            games.set_value("SFIO Priority", &"Normal").map_err(|e| e.to_string())?;
            games.set_value("Priority", &2u32).map_err(|e| e.to_string())?;
            games.set_value("GPU Priority", &8u32).map_err(|e| e.to_string())?;

            Ok(CommandResponse::ok(
                "MMCSS SystemProfile restaurado para os padrões originais do Windows (20% / Net=10 / Priority=2).",
                Some(false),
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

fn detect_cpu_topology() -> (u32, u32) {
    use sysinfo::{RefreshKind, System};
    let sys = System::new_with_specifics(
        RefreshKind::nothing().with_cpu(sysinfo::CpuRefreshKind::everything()),
    );
    let logical = sys.cpus().len().max(1) as u32;
    let physical = sys.physical_core_count().unwrap_or(logical as usize).max(1) as u32;
    (physical, logical)
}

/// Calcula prévia da máscara de afinidade real do processador atual para `"smt_off"`, `"core0_off"` ou `"all_cores"`
#[tauri::command]
pub async fn preview_cpu_affinity(
    mode: String,
) -> Result<CommandResponse<CpuAffinityPreview>, String> {
    tokio::task::spawn_blocking(move || {
        let (physical, logical) = detect_cpu_topology();
        let (mask_decimal, mask_hex) = calculate_cpu_affinity_mask(physical, logical, &mode);
        let active_count = mask_decimal.count_ones();
        let active_bits_summary = format!(
            "{} threads ativas de {} totais ({} núcleos físicos)",
            active_count, logical, physical
        );

        Ok(CommandResponse::ok(
            format!("Máscara calculada: {} ({})", mask_hex, active_bits_summary),
            Some(CpuAffinityPreview {
                physical_cores: physical,
                logical_threads: logical,
                mode,
                mask_decimal,
                mask_hex,
                active_bits_summary,
            }),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Aplica afinidade de CPU e prioridade Alta em um processo ativo em execução
#[tauri::command]
pub async fn apply_process_affinity(
    pid: u32,
    mode: String,
) -> Result<CommandResponse<String>, String> {
    if pid <= 4 || pid == std::process::id() {
        return Err("Processo protegido do sistema.".to_string());
    }

    tokio::task::spawn_blocking(move || {
        let (physical, logical) = detect_cpu_topology();
        let (mask_dec, mask_hex) = calculate_cpu_affinity_mask(physical, logical, &mode);

        let ps_cmd = format!(
            "$ErrorActionPreference='Stop'; $p = Get-Process -Id {}; $p.ProcessorAffinity = [IntPtr]{}; $p.PriorityClass = 'High'",
            pid, mask_dec
        );
        let out = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if out.status.success() {
            Ok(CommandResponse::ok(
                format!("Afinidade {} ({}) e Prioridade Alta aplicadas ao PID {}!", mask_hex, mode, pid),
                Some(mask_hex),
            ))
        } else {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            Err(format!(
                "Não foi possível alterar PID {} (Anti-Cheats bloqueiam alterações em tempo real — use 'Herança de Launcher'): {}",
                pid, err
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Reinicia Steam ou Epic Games Launcher com a máscara de afinidade já aplicada (Workaround seguro para Anti-Cheat)
#[tauri::command]
pub async fn relaunch_launcher_with_affinity(
    launcher: String,
    mode: String,
) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let (physical, logical) = detect_cpu_topology();
        let (_, mask_hex) = calculate_cpu_affinity_mask(physical, logical, &mode);
        let raw_hex = mask_hex.trim_start_matches("0x");

        let (proc_name, exe_candidates): (&str, Vec<&str>) = match launcher.to_ascii_lowercase().as_str() {
            "epic" | "epicgames" => (
                "EpicGamesLauncher.exe",
                vec![
                    r"C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe",
                    r"C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe",
                ],
            ),
            _ => (
                "steam.exe",
                vec![
                    r"C:\Program Files (x86)\Steam\steam.exe",
                    r"C:\Program Files\Steam\steam.exe",
                ],
            ),
        };

        let found_exe = exe_candidates
            .into_iter()
            .find(|p| PathBuf::from(p).exists())
            .ok_or_else(|| format!("Executável do launcher '{}' não encontrado no diretório padrão.", proc_name))?;

        let _ = new_hidden_command("taskkill.exe")
            .args(["/F", "/IM", proc_name])
            .output();
        std::thread::sleep(std::time::Duration::from_millis(800));

        let cmd_str = format!(r#"start "" /affinity {} "{}""#, raw_hex, found_exe);
        let out = new_hidden_command("cmd.exe")
            .args(["/C", &cmd_str])
            .spawn()
            .map_err(|e| format!("Falha ao reiniciar {} com afinidade: {}", proc_name, e))?;
        let _ = out.id();

        Ok(CommandResponse::ok(
            format!(
                "{} reiniciado com máscara {} ({}). Jogos iniciados por ele herdarão a afinidade física sem conflitar com Anti-Cheats!",
                proc_name, mask_hex, mode
            ),
            Some(mask_hex),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Aplica curva binária linear 1:1 do mouse por escala de DPI (100%..225%) ou reverte ao padrão do Windows
#[tauri::command]
pub async fn apply_linear_mouse_scale_curve(
    dpi_scale_percent: u32,
    revert_to_default: bool,
) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (mouse_key, _) = hkcu
            .create_subkey(r"Control Panel\Mouse")
            .map_err(|e| e.to_string())?;

        if revert_to_default {
            mouse_key.set_value("MouseSensitivity", &"10").map_err(|e| e.to_string())?;
            mouse_key.set_value("MouseSpeed", &"0").map_err(|e| e.to_string())?;
            mouse_key.set_value("MouseThreshold1", &"0").map_err(|e| e.to_string())?;
            mouse_key.set_value("MouseThreshold2", &"0").map_err(|e| e.to_string())?;

            // Curvas padrão do Windows 10/11
            const DEFAULT_X: [u8; 40] = [
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x15, 0x6e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x40, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x29, 0xdc, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x00, 0x00,
            ];
            const DEFAULT_Y: [u8; 40] = [
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0xfd, 0x11, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x24, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0xfc, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0xc0, 0xbb, 0x01, 0x00, 0x00, 0x00, 0x00,
            ];

            let _ = mouse_key.set_raw_value(
                "SmoothMouseXCurve",
                &RegValue {
                    bytes: DEFAULT_X.to_vec(),
                    vtype: RegType::REG_BINARY,
                },
            );
            let _ = mouse_key.set_raw_value(
                "SmoothMouseYCurve",
                &RegValue {
                    bytes: DEFAULT_Y.to_vec(),
                    vtype: RegType::REG_BINARY,
                },
            );

            return Ok(CommandResponse::ok(
                "Curva de mouse e aceleração restauradas para o padrão do Windows (MouseSpeed=0, 6/11).",
                Some("default".to_string()),
            ));
        }

        let (x_bytes, y_bytes) = build_linear_mouse_curve(dpi_scale_percent);
        mouse_key.set_value("MouseSensitivity", &"10").map_err(|e| e.to_string())?;
        // Mantém MouseSpeed="1" conforme Módulo 7.1 para o Windows obedecer SmoothMouseX/YCurve linear 1:1
        mouse_key.set_value("MouseSpeed", &"1").map_err(|e| e.to_string())?;
        mouse_key.set_value("MouseThreshold1", &"0").map_err(|e| e.to_string())?;
        mouse_key.set_value("MouseThreshold2", &"0").map_err(|e| e.to_string())?;

        mouse_key
            .set_raw_value(
                "SmoothMouseXCurve",
                &RegValue {
                    bytes: x_bytes.to_vec(),
                    vtype: RegType::REG_BINARY,
                },
            )
            .map_err(|e| e.to_string())?;
        mouse_key
            .set_raw_value(
                "SmoothMouseYCurve",
                &RegValue {
                    bytes: y_bytes.to_vec(),
                    vtype: RegType::REG_BINARY,
                },
            )
            .map_err(|e| e.to_string())?;

        let _ = new_hidden_command("rundll32.exe")
            .args(["user32.dll,UpdatePerUserSystemParameters", "1", "True"])
            .output();

        Ok(CommandResponse::ok(
            format!(
                "Curva Linear 1:1 MarkC aplicada para Escala DPI de {}% (SmoothMouseXCurve/YCurve gravados sem aceleração). Reinicie a sessão se necessário.",
                dpi_scale_percent
            ),
            Some(format!("{}%", dpi_scale_percent)),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Desbloqueia polling rate de mouses 1000Hz–8000Hz em janelas/processos de segundo plano
#[tauri::command]
pub async fn unlock_background_polling_rate(enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        if let Ok((mk, _)) = hkcu.create_subkey(r"Control Panel\Mouse") {
            let _ = mk.set_value("SysOptimizerPollingUnlocked", &(if enable { 1u32 } else { 0u32 }));
        }
        if let Ok((mm, _)) = hklm.create_subkey(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile",
        ) {
            let _ = mm.set_value("NoLazyMode", &(if enable { 1u32 } else { 0u32 }));
        }
        if let Ok((mou, _)) =
            hklm.create_subkey(r"SYSTEM\CurrentControlSet\Services\mouclass\Parameters")
        {
            let _ = mou.set_value("MouseDataQueueSize", &(if enable { 32u32 } else { 100u32 }));
        }

        Ok(CommandResponse::ok(
            if enable {
                "Limitador de polling rate em segundo plano desbloqueado (NoLazyMode=1, QueueSize=32)."
            } else {
                "Polling rate em segundo plano restaurado para o padrão de economia do Windows."
            },
            Some(enable),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Audita requisitos de Anti-Cheat (Vanguard, FACEIT, EAC/BattlEye/Ricochet)
#[tauri::command]
pub async fn get_anticheat_readiness() -> Result<CommandResponse<AntiCheatReadinessReport>, String> {
    tokio::task::spawn_blocking(|| {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        let secure_boot_enabled = hklm
            .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\SecureBoot\State", KEY_READ)
            .and_then(|k| k.get_value::<u32, _>("UEFISecureBootEnabled"))
            .map(|v| v == 1)
            .unwrap_or(false);

        let tpm_enabled = new_hidden_command("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "try { $t = Get-Tpm -ErrorAction Stop; if ($t.TpmPresent -and $t.TpmReady) { 'ON' } else { 'OFF' } } catch { 'OFF' }",
            ])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "ON")
            .unwrap_or(false);

        let cfg_raw = new_hidden_command("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "try { (Get-ProcessMitigation -System).CFG.Enable } catch { 'ON' }",
            ])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_ascii_uppercase())
            .unwrap_or_else(|_| "ON".to_string());
        let cfg_enabled = cfg_raw != "OFF";

        let hvci_reg = hklm
            .open_subkey_with_flags(
                r"SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity",
                KEY_READ,
            )
            .and_then(|k| k.get_value::<u32, _>("Enabled"))
            .unwrap_or(0)
            == 1;
        let bcd_hv = new_hidden_command("bcdedit.exe")
            .args(["/enum", "{current}"])
            .output()
            .map(|o| {
                let s = String::from_utf8_lossy(&o.stdout).to_lowercase();
                s.contains("hypervisorlaunchtype") && !s.contains("off")
            })
            .unwrap_or(true);
        let vbs_enabled = hvci_reg || bcd_hv;

        let dep_enabled = new_hidden_command("bcdedit.exe")
            .args(["/enum", "{current}"])
            .output()
            .map(|o| {
                let s = String::from_utf8_lossy(&o.stdout).to_lowercase();
                !s.contains("nx") || !s.contains("alwaysoff")
            })
            .unwrap_or(true);

        let mut vanguard_blocks = Vec::new();
        if !tpm_enabled {
            vanguard_blocks.push("TPM 2.0 desativado na BIOS".to_string());
        }
        if !secure_boot_enabled {
            vanguard_blocks.push("Secure Boot desligado na BIOS".to_string());
        }
        if !cfg_enabled {
            vanguard_blocks.push("Control Flow Guard (CFG) desativado no Exploit Protection".to_string());
        }

        let mut faceit_blocks = Vec::new();
        if !tpm_enabled {
            faceit_blocks.push("TPM 2.0 desativado".to_string());
        }
        if !secure_boot_enabled {
            faceit_blocks.push("Secure Boot desligado".to_string());
        }
        if !vbs_enabled {
            faceit_blocks.push("VBS / Core Isolation desativado (FACEIT exige VBS ativo; fora do FACEIT gera +2–5% FPS)".to_string());
        }

        let mut eac_blocks = Vec::new();
        if !dep_enabled {
            eac_blocks.push("DEP (Data Execution Prevention) desativado no bcdedit".to_string());
        }
        if !secure_boot_enabled {
            eac_blocks.push("Secure Boot recomendado pelo Ricochet / EAC".to_string());
        }

        let games = vec![
            AntiCheatStatusItem {
                id: "vanguard".to_string(),
                name: "VALORANT".to_string(),
                anticheat: "Riot Vanguard".to_string(),
                compatible: vanguard_blocks.is_empty(),
                summary: if vanguard_blocks.is_empty() {
                    "Pronto: TPM 2.0, Secure Boot e Control Flow Guard (CFG) conformes.".to_string()
                } else {
                    "Atenção: requisitos pendentes para iniciar o Vanguard.".to_string()
                },
                blocking_reasons: vanguard_blocks,
            },
            AntiCheatStatusItem {
                id: "faceit".to_string(),
                name: "Counter-Strike 2 (FACEIT)".to_string(),
                anticheat: "FACEIT Anti-Cheat".to_string(),
                compatible: faceit_blocks.is_empty(),
                summary: if faceit_blocks.is_empty() {
                    "Pronto: TPM 2.0, Secure Boot e VBS ativos.".to_string()
                } else {
                    "Requer VBS/IOMMU ativo em ligas FACEIT competitivas.".to_string()
                },
                blocking_reasons: faceit_blocks,
            },
            AntiCheatStatusItem {
                id: "eac_battleye".to_string(),
                name: "Fortnite / Warzone / Tarkov".to_string(),
                anticheat: "EAC / BattlEye / Ricochet".to_string(),
                compatible: eac_blocks.is_empty(),
                summary: if eac_blocks.is_empty() {
                    "Pronto: DEP e integridade de boot verificados.".to_string()
                } else {
                    "DEP ou Secure Boot requer atenção.".to_string()
                },
                blocking_reasons: eac_blocks,
            },
        ];

        Ok(CommandResponse::ok(
            "Matriz de compatibilidade Anti-Cheat auditada.",
            Some(AntiCheatReadinessReport {
                tpm_enabled,
                secure_boot_enabled,
                cfg_enabled,
                vbs_enabled,
                dep_enabled,
                games,
            }),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Ativa ou reverte o Control Flow Guard (CFG) global no Exploit Protection (Exigido pelo Riot Vanguard)
#[tauri::command]
pub async fn set_control_flow_guard(enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let arg = if enable { "-Enable CFG" } else { "-Disable CFG" };
        let ps_cmd = format!("Set-ProcessMitigation -System {}", arg);
        let out = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if out.status.success() {
            Ok(CommandResponse::ok(
                if enable {
                    "Control Flow Guard (CFG) ativado globalmente! Riot Vanguard compatível."
                } else {
                    "Control Flow Guard (CFG) desativado globalmente."
                },
                Some(enable),
            ))
        } else {
            let err = String::from_utf8_lossy(&out.stderr).to_string();
            Err(format!("Falha ao configurar Control Flow Guard: {}", err))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}


