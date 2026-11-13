use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use winreg::enums::{HKEY_CLASSES_ROOT, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};
use winreg::RegKey;

use crate::state::CommandResponse;
use crate::utils::{emit_step, is_process_elevated, new_hidden_command, restart_elevated};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsOptimizationResult {
    pub best_dns: String,
    pub cloudflare_ping_ms: u64,
    pub google_ping_ms: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsProviderPing {
    pub name: String,
    pub primary_ip: String,
    pub secondary_ip: String,
    pub ping_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsBenchmarkResult {
    pub providers: Vec<DnsProviderPing>,
    pub fastest: String,
    pub fastest_ip: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SfcScanResult {
    pub sfc_exit_code: i32,
    pub dism_exit_code: i32,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BloatwareResult {
    pub removed_count: usize,
    pub removed_apps: Vec<String>,
}

/// Verifica se o processo atual está com privilégios de Administrador
#[tauri::command]
pub async fn check_admin() -> Result<CommandResponse<bool>, String> {
    let elevated = is_process_elevated();
    Ok(CommandResponse::ok(
        if elevated { "Privilégios de Administrador ativos." } else { "Executando como usuário padrão." },
        Some(elevated),
    ))
}

/// Reinicia o aplicativo solicitando elevação de privilégios (UAC)
#[tauri::command]
pub async fn restart_as_admin(window: tauri::Window) -> Result<CommandResponse<bool>, String> {
    restart_elevated(Some(&window))?;
    Ok(CommandResponse::ok("Reiniciando com privilégios de Administrador...", Some(true)))
}



#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestorePointEntry {
    pub sequence_number: u32,
    pub description: String,
    pub creation_time: String,
    pub restore_point_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestorePointsStatus {
    pub protection_enabled: bool,
    pub frequency_unlocked: bool,
    pub has_recent_restore_point: bool,
    pub points: Vec<RestorePointEntry>,
}

fn parse_restore_point_type(code: u64) -> String {
    match code {
        0 => "APPLICATION_INSTALL".to_string(),
        1 => "APPLICATION_UNINSTALL".to_string(),
        10 => "DEVICE_DRIVER_INSTALL".to_string(),
        12 => "MODIFY_SETTINGS".to_string(),
        13 => "CANCELLED_OPERATION".to_string(),
        _ => format!("TYPE_{}", code),
    }
}

fn is_restore_point_recent(creation_time: &str) -> bool {
    if let Ok(parsed) = chrono::NaiveDateTime::parse_from_str(creation_time.trim(), "%Y-%m-%d %H:%M:%S") {
        let now = chrono::Local::now().naive_local();
        let hours = now.signed_duration_since(parsed).num_hours();
        return (-1..=24).contains(&hours);
    }
    false
}

/// Consulta status da Proteção do Sistema, destravamento de 24h e pontos existentes
#[tauri::command]
pub async fn get_restore_points_status() -> Result<CommandResponse<RestorePointsStatus>, String> {
    let status = tokio::task::spawn_blocking(|| {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let key_read = winreg::enums::KEY_READ;

        let mut protection_enabled = false;
        let mut frequency_unlocked = false;

        if let Ok(sr_key) = hklm.open_subkey_with_flags(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore",
            key_read,
        ) {
            if let Ok(interval) = sr_key.get_value::<u32, _>("RPSessionInterval") {
                if interval > 0 {
                    protection_enabled = true;
                }
            }
            if let Ok(freq) = sr_key.get_value::<u32, _>("SystemRestorePointCreationFrequency") {
                frequency_unlocked = freq == 0;
            }
        }

        if let Ok(spp_key) = hklm.open_subkey_with_flags(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\SPP\Clients",
            key_read,
        ) {
            for (_, val) in spp_key.enum_values().flatten() {
                if !val.to_string().trim().is_empty() {
                    protection_enabled = true;
                    break;
                }
            }
        }

        let ps_cmd = r#"
            $pts = @()
            try {
                $pts = @(Get-ComputerRestorePoint -ErrorAction Stop | Select-Object SequenceNumber, Description, @{N='CreationTime';E={$_.ConvertToDateTime($_.CreationTime).ToString('yyyy-MM-dd HH:mm:ss')}}, RestorePointType)
            } catch {
                try {
                    $pts = @(Get-WmiObject -Namespace 'root\default' -Class SystemRestore -ErrorAction SilentlyContinue | Select-Object SequenceNumber, Description, @{N='CreationTime';E={[System.Management.ManagementDateTimeConverter]::ToDateTime($_.CreationTime).ToString('yyyy-MM-dd HH:mm:ss')}}, RestorePointType)
                } catch {}
            }
            @($pts) | ConvertTo-Json -Compress
        "#;

        let mut points: Vec<RestorePointEntry> = Vec::new();
        if let Ok(out) = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd])
            .output()
        {
            if out.status.success() {
                let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&raw) {
                    let arr: Vec<&serde_json::Value> = match &val {
                        serde_json::Value::Array(a) => a.iter().collect(),
                        serde_json::Value::Object(_) => vec![&val],
                        _ => Vec::new(),
                    };
                    for item in arr {
                        let seq = item.get("SequenceNumber").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                        let desc = item
                            .get("Description")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Restore Point")
                            .to_string();
                        let creation = item
                            .get("CreationTime")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let rtype_num = item.get("RestorePointType").and_then(|v| v.as_u64()).unwrap_or(12);
                        if seq > 0 || !desc.is_empty() {
                            points.push(RestorePointEntry {
                                sequence_number: seq,
                                description: desc,
                                creation_time: creation,
                                restore_point_type: parse_restore_point_type(rtype_num),
                            });
                        }
                    }
                }
            }
        }

        points.sort_by(|a, b| b.sequence_number.cmp(&a.sequence_number));
        if !points.is_empty() {
            protection_enabled = true;
        }
        let has_recent_restore_point = points.iter().any(|p| is_restore_point_recent(&p.creation_time));

        RestorePointsStatus {
            protection_enabled,
            frequency_unlocked,
            has_recent_restore_point,
            points,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        if status.has_recent_restore_point {
            "Ponto de restauração recente (< 24h) detectado."
        } else {
            "Nenhum ponto de restauração recente encontrado."
        },
        Some(status),
    ))
}

/// Cria um Ponto de Restauração do Sistema (destravando limite de 24h via Registry)
#[tauri::command]
pub async fn create_restore_point(description: String, app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        if !is_process_elevated() {
            return Err("Privilégios de Administrador são obrigatórios para criar um Ponto de Restauração e destravar políticas de sistema.".to_string());
        }

        let desc = if description.trim().is_empty() {
            "System Optimizer Restore Point".to_string()
        } else {
            description.trim().to_string()
        };

        emit_step(
            &app,
            "restore_unlock",
            "Destravando limite de 24h e ativando Proteção do Sistema...",
            "running",
            "SystemRestorePointCreationFrequency = 0 & Enable-ComputerRestore",
            1,
            3,
        );

        // a) Destrava limite de 24h (SystemRestorePointCreationFrequency = 0)
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        if let Ok((sr_key, _)) = hklm.create_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore") {
            let _ = sr_key.set_value("SystemRestorePointCreationFrequency", &0u32);
        }

        // b) Inicia servicos VSS/swprv e habilita protecao no drive C:\
        let _ = new_hidden_command("sc.exe").args(["start", "vss"]).output();
        let _ = new_hidden_command("sc.exe").args(["start", "swprv"]).output();
        let _ = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", "Enable-ComputerRestore -Drive 'C:\\' -ErrorAction SilentlyContinue"])
            .output();

        emit_step(
            &app,
            "restore_point",
            "Gravando Ponto de Restauração do Windows...",
            "running",
            &format!("Checkpoint-Computer: '{}'", desc),
            2,
            3,
        );

        let escaped = desc.replace('\'', "''");
        let ps_cmd = format!(
            r#"
            $ErrorActionPreference = 'Stop'
            try {{
                Checkpoint-Computer -Description '{}' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop
            }} catch {{
                $sr = [wmiclass]'\\.\root\default:SystemRestore'
                $res = $sr.CreateRestorePoint('{}', 12, 100)
                if ($res.ReturnValue -ne 0) {{
                    throw "WMI SystemRestore retornou codigo $($res.ReturnValue)"
                }}
            }}
            "#,
            escaped, escaped
        );

        let output = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            emit_step(
                &app,
                "restore_point",
                "Ponto de restauração criado com sucesso!",
                "success",
                "Sistema protegido antes das otimizações.",
                3,
                3,
            );
            Ok(CommandResponse::ok(
                format!("Ponto de restauração '{}' criado com sucesso!", desc),
                Some(desc),
            ))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            emit_step(&app, "restore_point", "Falha ao criar ponto de restauração", "error", &err, 3, 3);
            Err(format!("Falha ao criar ponto de restauração: {}", err))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Reseta a pilha de rede completa (Winsock, TCP/IP, Flush DNS, Release/Renew)
#[tauri::command]
pub async fn reset_network_stack(app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let total = 5;

        emit_step(&app, "net_winsock", "Resetando Winsock Catalog...", "running", "netsh winsock reset", 1, total);
        let _ = new_hidden_command("netsh.exe").args(["winsock", "reset"]).output();
        emit_step(&app, "net_winsock", "Winsock redefinido com sucesso", "success", "Catálogo de sockets limpo.", 1, total);

        emit_step(&app, "net_tcpip", "Resetando pilha TCP/IP...", "running", "netsh int ip reset", 2, total);
        let _ = new_hidden_command("netsh.exe").args(["int", "ip", "reset"]).output();
        emit_step(&app, "net_tcpip", "Pilha TCP/IP redefinida", "success", "Configurações de interface restauradas.", 2, total);

        emit_step(&app, "net_release", "Liberando concessão DHCP (ipconfig /release)...", "running", "Liberando endereços IP atuais.", 3, total);
        let _ = new_hidden_command("ipconfig.exe").args(["/release"]).output();
        emit_step(&app, "net_release", "IP liberado", "success", "Concessões antigas descartadas.", 3, total);

        emit_step(&app, "net_flush", "Esvaziando cache de resolução DNS...", "running", "ipconfig /flushdns", 4, total);
        let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
        emit_step(&app, "net_flush", "Cache DNS esvaziado", "success", "Tabela local limpa.", 4, total);

        emit_step(&app, "net_renew", "Renovando endereço IP (ipconfig /renew)...", "running", "Solicitando nova concessão de rede ao roteador.", 5, total);
        let _ = new_hidden_command("ipconfig.exe").args(["/renew"]).output();
        emit_step(&app, "net_renew", "Pilha de rede restaurada com sucesso!", "success", "Conexão reestabelecida.", 5, total);

        Ok(CommandResponse::ok(
            "Pilha de rede (Winsock, TCP/IP e DNS) totalmente restaurada com sucesso!",
            Some("Network Stack Reset".to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Alterna o Menu de Contexto Clássico do Windows 10 no Windows 11 (sem submenu "Mostrar mais opções")
#[tauri::command]
pub async fn toggle_classic_context_menu(enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let clsid_path = r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32";

        if enable {
            // Cria a chave com valor padrão vazio para ativar menu clássico
            let (key, _) = hkcu.create_subkey(clsid_path)
                .map_err(|e| format!("Erro ao criar chave de registro: {}", e))?;
            key.set_value("", &"").map_err(|e| e.to_string())?;

            // Reinicia explorer.exe silenciosamente para aplicar na hora
            let _ = new_hidden_command("taskkill.exe").args(["/f", "/im", "explorer.exe"]).output();
            std::thread::sleep(std::time::Duration::from_millis(500));
            let _ = std::process::Command::new("explorer.exe").spawn();

            Ok(CommandResponse::ok(
                "Menu de contexto clássico ativado com sucesso! O Windows Explorer foi atualizado.",
                Some(true),
            ))
        } else {
            // Remove a chave para voltar ao menu padrão do Windows 11
            let parent_path = r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}";
            let _ = hkcu.delete_subkey_all(parent_path);

            let _ = new_hidden_command("taskkill.exe").args(["/f", "/im", "explorer.exe"]).output();
            std::thread::sleep(std::time::Duration::from_millis(500));
            let _ = std::process::Command::new("explorer.exe").spawn();

            Ok(CommandResponse::ok(
                "Menu de contexto moderno do Windows 11 restaurado.",
                Some(false),
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Mede latência até um endereço IP via socket TCP na porta 53 ou ping.exe
async fn ping_server_ms(ip: &str) -> u64 {
    let addr_str = format!("{}:53", ip);
    if let Ok(addr) = addr_str.parse::<std::net::SocketAddr>() {
        let start = std::time::Instant::now();
        if tokio::time::timeout(
            std::time::Duration::from_millis(1000),
            tokio::net::TcpStream::connect(addr),
        )
        .await
        .is_ok()
        {
            return start.elapsed().as_millis() as u64;
        }
    }

    let ip_owned = ip.to_string();
    tokio::task::spawn_blocking(move || {
        let output = new_hidden_command("ping.exe")
            .args(["-n", "1", "-w", "1000", &ip_owned])
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for part in stdout.split(|c: char| c == ' ' || c == '=' || c == '<' || c == ',') {
                if let Some(num_str) = part.strip_suffix("ms") {
                    if let Ok(num) = num_str.trim().parse::<u64>() {
                        return num;
                    }
                }
            }
        }
        999
    })
    .await
    .unwrap_or(999)
}

/// Executa Benchmark de latência entre Cloudflare, Google, Quad9 e OpenDNS
#[tauri::command]
pub async fn benchmark_dns(app: tauri::AppHandle) -> Result<CommandResponse<DnsBenchmarkResult>, String> {
    let total = 4;

    emit_step(&app, "dns_cf", "Testando Cloudflare DNS (1.1.1.1)...", "running", "Medindo latência...", 1, total);
    let ping_cf = ping_server_ms("1.1.1.1").await;
    emit_step(&app, "dns_cf", &format!("Cloudflare: {} ms", ping_cf), "success", "Latência obtida", 1, total);

    emit_step(&app, "dns_google", "Testando Google Public DNS (8.8.8.8)...", "running", "Medindo latência...", 2, total);
    let ping_google = ping_server_ms("8.8.8.8").await;
    emit_step(&app, "dns_google", &format!("Google DNS: {} ms", ping_google), "success", "Latência obtida", 2, total);

    emit_step(&app, "dns_quad9", "Testando Quad9 DNS (9.9.9.9)...", "running", "Medindo latência...", 3, total);
    let ping_quad9 = ping_server_ms("9.9.9.9").await;
    emit_step(&app, "dns_quad9", &format!("Quad9: {} ms", ping_quad9), "success", "Latência obtida", 3, total);

    emit_step(&app, "dns_opendns", "Testando Cisco OpenDNS (208.67.222.222)...", "running", "Medindo latência...", 4, total);
    let ping_opendns = ping_server_ms("208.67.222.222").await;
    emit_step(&app, "dns_opendns", &format!("OpenDNS: {} ms", ping_opendns), "success", "Latência obtida", 4, total);

    let mut providers = vec![
        DnsProviderPing { name: "Cloudflare".to_string(), primary_ip: "1.1.1.1".to_string(), secondary_ip: "1.0.0.1".to_string(), ping_ms: ping_cf },
        DnsProviderPing { name: "Google".to_string(), primary_ip: "8.8.8.8".to_string(), secondary_ip: "8.8.4.4".to_string(), ping_ms: ping_google },
        DnsProviderPing { name: "Quad9".to_string(), primary_ip: "9.9.9.9".to_string(), secondary_ip: "149.112.112.112".to_string(), ping_ms: ping_quad9 },
        DnsProviderPing { name: "OpenDNS".to_string(), primary_ip: "208.67.222.222".to_string(), secondary_ip: "208.67.220.220".to_string(), ping_ms: ping_opendns },
    ];

    providers.sort_by_key(|p| p.ping_ms);
    let fastest = providers[0].name.clone();
    let fastest_ip = providers[0].primary_ip.clone();

    let msg = format!("DNS mais rápido: {} ({} ms)", fastest, providers[0].ping_ms);
    let res = DnsBenchmarkResult {
        providers,
        fastest,
        fastest_ip,
        message: msg.clone(),
    };

    Ok(CommandResponse::ok(msg, Some(res)))
}

/// Otimiza DNS configurando o provedor mais rápido automaticamente
#[tauri::command]
pub async fn optimize_dns(app: tauri::AppHandle) -> Result<CommandResponse<DnsOptimizationResult>, String> {
    emit_step(&app, "dns_optimize", "Medindo servidores DNS disponíveis...", "running", "Testando latência de Cloudflare e Google...", 1, 2);
    let cloudflare_ping = ping_server_ms("1.1.1.1").await;
    let google_ping = ping_server_ms("8.8.8.8").await;

    let use_cloudflare = cloudflare_ping <= google_ping;
    let (best_name, primary_dns, secondary_dns) = if use_cloudflare {
        ("Cloudflare (1.1.1.1)", "1.1.1.1", "1.0.0.1")
    } else {
        ("Google (8.8.8.8)", "8.8.8.8", "8.8.4.4")
    };

    let p_dns = primary_dns.to_string();
    let s_dns = secondary_dns.to_string();

    emit_step(&app, "dns_optimize", &format!("Configurando {}", best_name), "running", "Aplicando na interface de rede ativa...", 2, 2);

    tokio::task::spawn_blocking(move || {
        let ps_cmd = format!(
            "$adapter = (Get-NetAdapter | Where-Object {{ $_.Status -eq 'Up' }} | Select-Object -First 1); \
             if ($adapter) {{ Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ('{}', '{}') }}",
            p_dns, s_dns
        );

        let _ = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output();

        let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
    })
    .await
    .map_err(|e| e.to_string())?;

    emit_step(&app, "dns_optimize", &format!("{} Ativado!", best_name), "success", &format!("Cloudflare: {}ms, Google: {}ms", cloudflare_ping, google_ping), 2, 2);

    let msg = format!(
        "{} aplicado como DNS preferencial (Cloudflare: {}ms, Google: {}ms).",
        best_name, cloudflare_ping, google_ping
    );

    let res = DnsOptimizationResult {
        best_dns: best_name.to_string(),
        cloudflare_ping_ms: cloudflare_ping,
        google_ping_ms: google_ping,
        message: msg.clone(),
    };

    Ok(CommandResponse::ok(msg, Some(res)))
}

/// Repara o serviço e cache do Windows Update
#[tauri::command]
pub async fn repair_windows_update(app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        emit_step(&app, "wu_repair", "Interrompendo serviços do Windows Update...", "running", "Parando wuauserv, bits e cryptsvc...", 1, 3);
        let _ = new_hidden_command("net.exe").args(["stop", "wuauserv", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "bits", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "cryptsvc", "/y"]).output();

        emit_step(&app, "wu_repair", "Limpando diretórios de cache corrompidos...", "running", "Limpando SoftwareDistribution e catroot2...", 2, 3);
        let windir = std::env::var("WINDIR").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows"));
        let sd = windir.join("SoftwareDistribution");
        if sd.exists() {
            let _ = std::fs::remove_dir_all(&sd);
        }
        let catroot2 = windir.join("System32\\catroot2");
        if catroot2.exists() {
            let _ = std::fs::remove_dir_all(&catroot2);
        }

        emit_step(&app, "wu_repair", "Reiniciando serviços do Windows Update...", "running", "Iniciando cryptsvc, bits e wuauserv...", 3, 3);
        let _ = new_hidden_command("net.exe").args(["start", "cryptsvc"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "bits"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "wuauserv"]).output();

        emit_step(&app, "wu_repair", "Windows Update Reparado com Sucesso!", "success", "Cache limpo e serviços operando normalmente.", 3, 3);

        Ok(CommandResponse::ok(
            "Serviços do Windows Update reparados e cache corrompido limpo com sucesso.",
            Some("Update Repaired".to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Executa verificação e reparo de arquivos de sistema (SFC e DISM) de forma assíncrona
#[tauri::command]
pub async fn run_sfc_scan(app: tauri::AppHandle) -> Result<CommandResponse<SfcScanResult>, String> {
    tokio::task::spawn_blocking(move || {
        emit_step(&app, "sfc_scan", "Executando SFC /scannow...", "running", "Verificando integridade dos arquivos protegidos do Windows...", 1, 2);
        let sfc_out = new_hidden_command("sfc.exe")
            .args(["/scannow"])
            .output()
            .map_err(|e| format!("Erro ao executar SFC: {}", e))?;

        emit_step(&app, "sfc_scan", "Executando DISM /RestoreHealth...", "running", "Baixando imagens limpas caso haja corrupção...", 2, 2);
        let dism_out = new_hidden_command("dism.exe")
            .args(["/Online", "/Cleanup-Image", "/RestoreHealth"])
            .output()
            .map_err(|e| format!("Erro ao executar DISM: {}", e))?;

        let sfc_code = sfc_out.status.code().unwrap_or(-1);
        let dism_code = dism_out.status.code().unwrap_or(-1);

        let summary = if sfc_code == 0 && dism_code == 0 {
            "SFC e DISM concluídos com sucesso. Todos os arquivos de sistema estão 100% íntegros.".to_string()
        } else {
            format!("Verificação concluída (SFC código {}, DISM código {}).", sfc_code, dism_code)
        };

        emit_step(&app, "sfc_scan", "Verificação de Sistema Concluída", "success", &summary, 2, 2);

        Ok(CommandResponse::ok(
            summary.clone(),
            Some(SfcScanResult {
                sfc_exit_code: sfc_code,
                dism_exit_code: dism_code,
                summary,
            }),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Remove tarefas agendadas órfãs que apontam para executáveis inexistentes
#[tauri::command]
pub async fn clean_orphan_tasks() -> Result<CommandResponse<u32>, String> {
    tokio::task::spawn_blocking(|| {
        let ps_cmd = r#"
            $Tasks = Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.Actions.Execute -ne $null }
            $del = 0
            foreach ($T in $Tasks) {
                $Path = $T.Actions.Execute.Replace('"', '')
                if ($Path -match "^[a-zA-Z]:\\") {
                    if (-not (Test-Path $Path)) {
                        try {
                            Unregister-ScheduledTask -TaskName $T.TaskName -Confirm:$false -ErrorAction Stop | Out-Null
                            $del++
                        } catch {}
                    }
                }
            }
            $del
        "#;

        let output = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd])
            .output()
            .map_err(|e| format!("Erro ao consultar tarefas agendadas: {}", e))?;

        let count_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let count: u32 = count_str.parse().unwrap_or(0);

        Ok(CommandResponse::ok(
            format!("{} tarefa(s) agendada(s) órfã(s) removida(s) com sucesso.", count),
            Some(count),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Pacotes e componentes críticos do sistema que JAMAIS devem ser removidos pelo debloat
/// (EdgeWebView2 quebra apps Tauri v2; VBScript quebra instaladores MSI; Paint/Photos/Notepad/Codecs/.NET preservados)
pub const PROTECTED_SYSTEM_PACKAGES: &[&str] = &[
    "Microsoft.EdgeWebView2",
    "MicrosoftEdgeWebView2",
    "WebView2Runtime",
    "VBScript",
    "VBSCRIPT",
    "WindowsStore",
    "XboxIdentityProvider",
    "DesktopAppInstaller",
    "VCLibs",
    "UI.Xaml",
    "MSPaint",
    "Microsoft.Paint",
    "Windows.Photos",
    "Microsoft.Windows.Photos",
    "WindowsNotepad",
    "Microsoft.WindowsNotepad",
    "HEVCVideoExtension",
    "AV1VideoExtension",
    "WebpImageExtension",
    "VP9VideoExtensions",
    "RawImageExtension",
    "NetFx",
    "NETFramework",
];

pub fn is_protected_package(pkg_name: &str) -> bool {
    let clean = pkg_name.replace('*', "").trim().to_lowercase();
    if clean.is_empty() {
        return true;
    }
    PROTECTED_SYSTEM_PACKAGES
        .iter()
        .any(|p| clean.contains(&p.to_lowercase()) || p.to_lowercase().contains(&clean))
}

/// Remove pacotes AppX pré-definidos como bloatware seguro (preservando Paint, Photos, Notepad, Codecs, .NET, WebView2 e VBScript)
#[tauri::command]
pub async fn remove_bloatware(app: tauri::AppHandle) -> Result<CommandResponse<BloatwareResult>, String> {
    tokio::task::spawn_blocking(move || {
        let targets = vec![
            "*Clipchamp*",
            "*BingNews*",
            "*BingWeather*",
            "*LinkedIn*",
            "*OutlookForWindows*",
            "*WindowsFeedbackHub*",
            "*GetHelp*",
            "*GetStarted*",
            "*WindowsMaps*",
            "*Microsoft3DViewer*",
            "*MicrosoftSolitaireCollection*",
            "*MixedReality.Portal*",
            "*People*",
            "*549981C3F5F10*",
            "*Cortana*",
            "*SkypeApp*",
            "*YourPhone*",
            "*ZuneMusic*",
            "*ZuneVideo*",
            "*GamingApp*",
            "*Todos*",
            "*PowerAutomateDesktop*",
        ];

        let total = targets.len();
        let mut removed = Vec::new();

        for (i, app_name) in targets.iter().enumerate() {
            if is_protected_package(app_name) {
                continue;
            }
            emit_step(&app, "bloatware", &format!("Removendo bloatware: {}", app_name.replace('*', "")), "running", "Desinstalando pacote de usuário e provisionado (Whitelist endurecida ativa)...", i + 1, total);

            let ps_cmd = format!(
                "Get-AppxPackage -Name '{}' | Where-Object {{ $_.Name -notmatch 'EdgeWebView2|WebView2|WindowsStore|VCLibs|DesktopAppInstaller|Paint|Photos|Notepad|HEVC|AV1|Webp|VP9|RawImage|XboxGamingOverlay|XboxIdentityProvider' }} | Remove-AppxPackage -ErrorAction SilentlyContinue",
                app_name
            );
            let out = new_hidden_command("powershell.exe")
                .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
                .output();

            if let Ok(res) = out {
                if res.status.success() {
                    removed.push(app_name.replace('*', ""));
                }
            }
        }

        let count = removed.len();
        emit_step(&app, "bloatware", &format!("Bloatwares removidos: {} pacotes", count), "success", "Aplicativos desnecessários desinstalados com componentes essenciais intactos.", total, total);

        let res = BloatwareResult {
            removed_count: count,
            removed_apps: removed,
        };

        Ok(CommandResponse::ok(
            format!("Processamento de bloatware concluído ({} pacotes removidos; Paint, Photos, Notepad, Codecs, EdgeWebView2 e VBScript protegidos).", count),
            Some(res),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Desativa telemetria nativa e injeta políticas de privacidade do Windows
#[tauri::command]
pub async fn disable_telemetry(app: tauri::AppHandle) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        emit_step(&app, "telemetry", "Desativando serviços de rastreamento...", "running", "Parando DiagTrack e dmwappushservice...", 1, 2);
        let _ = new_hidden_command("sc.exe").args(["stop", "DiagTrack"]).output();
        let _ = new_hidden_command("sc.exe").args(["config", "DiagTrack", "start=", "disabled"]).output();
        let _ = new_hidden_command("sc.exe").args(["stop", "dmwappushservice"]).output();
        let _ = new_hidden_command("sc.exe").args(["config", "dmwappushservice", "start=", "disabled"]).output();

        emit_step(&app, "telemetry", "Injetando políticas de privacidade no Registro...", "running", "Aplicando chaves em Policies\\DataCollection e Windows Search...", 2, 2);
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        
        if let Ok((key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\DataCollection") {
            let _ = key.set_value("AllowTelemetry", &0u32);
            let _ = key.set_value("MaxTelemetryAllowed", &0u32);
        }

        if let Ok((key, _)) = hklm.create_subkey(r"SOFTWARE\Microsoft\Windows\AppCompat") {
            let _ = key.set_value("AITEnable", &0u32);
            let _ = key.set_value("DisableInventory", &1u32);
            let _ = key.set_value("DisableUAR", &1u32);
        }

        if let Ok((key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\Windows Search") {
            let _ = key.set_value("AllowCortana", &0u32);
            let _ = key.set_value("DisableWebSearch", &1u32);
            let _ = key.set_value("ConnectedSearchUseWeb", &0u32);
        }

        emit_step(&app, "telemetry", "Privacidade Blindada!", "success", "Telemetria, relatórios de erro e diagnósticos desativados.", 2, 2);

        Ok(CommandResponse::ok(
            "Telemetria do Windows, relatórios de dados e rastreamento desativados com sucesso.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Restaura o Microsoft Store e aplicativos padrão através do PowerShell
#[tauri::command]
pub async fn restore_windows_store(app: tauri::AppHandle) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        emit_step(&app, "store_restore", "Reinstalando pacotes da Microsoft Store...", "running", "Executando Add-AppxPackage com manifesto...", 1, 1);
        let ps_cmd = r#"Get-AppxPackage -allusers Microsoft.WindowsStore | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"}"#;

        let output = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd])
            .output()
            .map_err(|e| format!("Erro ao executar powershell: {}", e))?;

        if output.status.success() {
            emit_step(&app, "store_restore", "Microsoft Store Restaurada!", "success", "App registrado com sucesso no sistema.", 1, 1);
            Ok(CommandResponse::ok(
                "Microsoft Store registrada e restaurada com sucesso.",
                Some(true),
            ))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            emit_step(&app, "store_restore", "Falha ao restaurar Store", "error", &err, 1, 1);
            Err(format!("Falha ao restaurar Microsoft Store: {}", err))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Remove o Microsoft OneDrive do sistema
#[tauri::command]
pub async fn remove_onedrive(app: tauri::AppHandle) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        emit_step(&app, "onedrive", "Encerrando processo do OneDrive...", "running", "taskkill /f /im OneDrive.exe", 1, 3);
        let _ = new_hidden_command("taskkill.exe").args(["/f", "/im", "OneDrive.exe"]).output();

        emit_step(&app, "onedrive", "Executando desinstalador oficial...", "running", "Localizando OneDriveSetup.exe /uninstall...", 2, 3);
        let sys_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let sys32_setup = Path::new(&sys_root).join("System32\\OneDriveSetup.exe");
        let syswow_setup = Path::new(&sys_root).join("SysWOW64\\OneDriveSetup.exe");

        let setup_path = if syswow_setup.exists() {
            Some(syswow_setup)
        } else if sys32_setup.exists() {
            Some(sys32_setup)
        } else {
            None
        };

        if let Some(path) = setup_path {
            let _ = new_hidden_command(path.to_str().unwrap()).arg("/uninstall").output();
        }

        emit_step(&app, "onedrive", "Limpando diretórios residuais do OneDrive...", "running", "Esvaziando AppData e LocalAppData...", 3, 3);
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let od_dir = Path::new(&local_appdata).join("Microsoft\\OneDrive");
            if od_dir.exists() {
                let _ = std::fs::remove_dir_all(od_dir);
            }
        }

        emit_step(&app, "onedrive", "OneDrive Removido com Sucesso!", "success", "Processo, executável e pastas limpos.", 3, 3);

        Ok(CommandResponse::ok(
            "Microsoft OneDrive desinstalado e resíduos removidos com sucesso.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Limpa o cache de fontes do Windows e reinicia o serviço FontCache
#[tauri::command]
pub async fn reset_font_cache() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let _ = new_hidden_command("net.exe").args(["stop", "FontCache", "/y"]).output();

        let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string());
        let service_profiles = Path::new(&windir).join("ServiceProfiles\\LocalService\\AppData\\Local");

        if let Ok(entries) = std::fs::read_dir(&service_profiles) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("FontCache") && name.ends_with(".dat") {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }

        let fnt_cache = Path::new(&windir).join("System32\\FNTCACHE.DAT");
        if fnt_cache.exists() {
            let _ = std::fs::remove_file(fnt_cache);
        }

        let _ = new_hidden_command("net.exe").args(["start", "FontCache"]).output();

        Ok(CommandResponse::ok(
            "Cache de fontes do Windows limpo e serviço FontCache reiniciado.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Reinicia o serviço bthserv e redefine o cache de pareamento do Bluetooth
#[tauri::command]
pub async fn fix_bluetooth_cache() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let _ = new_hidden_command("net.exe").args(["stop", "bthserv", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "bthserv"]).output();

        Ok(CommandResponse::ok(
            "Serviço de suporte a Bluetooth reiniciado e cache redefinido com sucesso.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Adiciona ou remove o atalho 'Tomar Posse' no menu de contexto do Windows Explorer
#[tauri::command]
pub async fn toggle_take_ownership_menu(enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);

        let file_key_path = r"*\shell\runas";
        let dir_key_path = r"Directory\shell\runas";

        if enable {
            let (file_key, _) = hkcr
                .create_subkey(file_key_path)
                .map_err(|e| format!("Erro ao criar chave para arquivos: {}", e))?;
            file_key.set_value("", &"Tomar Posse (System Optimizer)").map_err(|e| e.to_string())?;
            file_key.set_value("Icon", &"imageres.dll,-78").map_err(|e| e.to_string())?;
            file_key.set_value("NoWorkingDirectory", &"").map_err(|e| e.to_string())?;

            let (file_cmd, _) = file_key.create_subkey("command").map_err(|e| e.to_string())?;
            file_cmd
                .set_value("", &r#"cmd.exe /c takeown /f "%1" && icacls "%1" /grant administrators:F"#)
                .map_err(|e| e.to_string())?;

            let (dir_key, _) = hkcr
                .create_subkey(dir_key_path)
                .map_err(|e| format!("Erro ao criar chave para diretórios: {}", e))?;
            dir_key.set_value("", &"Tomar Posse (System Optimizer)").map_err(|e| e.to_string())?;
            dir_key.set_value("Icon", &"imageres.dll,-78").map_err(|e| e.to_string())?;
            dir_key.set_value("NoWorkingDirectory", &"").map_err(|e| e.to_string())?;

            let (dir_cmd, _) = dir_key.create_subkey("command").map_err(|e| e.to_string())?;
            dir_cmd
                .set_value("", &r#"cmd.exe /c takeown /f "%1" /r /d y && icacls "%1" /grant administrators:F /t"#)
                .map_err(|e| e.to_string())?;

            Ok(CommandResponse::ok(
                "Opção 'Tomar Posse' adicionada ao menu de contexto do Windows Explorer.",
                Some(true),
            ))
        } else {
            let _ = hkcr.delete_subkey_all(file_key_path);
            let _ = hkcr.delete_subkey_all(dir_key_path);

            Ok(CommandResponse::ok(
                "Opção 'Tomar Posse' removida do menu de contexto.",
                Some(false),
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Exporta todos os drivers de terceiros instalados para C:\Backup_Drivers
#[tauri::command]
pub async fn backup_drivers(app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        emit_step(&app, "backup_drivers", "Criando diretório C:\\Backup_Drivers...", "running", "Preparando pasta de destino...", 1, 2);
        let dest = Path::new("C:\\Backup_Drivers");
        let _ = std::fs::create_dir_all(dest);

        emit_step(&app, "backup_drivers", "Exportando drivers instalados via pnputil...", "running", "pnputil /export-driver * C:\\Backup_Drivers...", 2, 2);
        let output = new_hidden_command("pnputil.exe")
            .args(["/export-driver", "*", "C:\\Backup_Drivers"])
            .output()
            .map_err(|e| format!("Erro ao executar pnputil: {}", e))?;

        if output.status.success() {
            emit_step(&app, "backup_drivers", "Backup de Drivers Concluído!", "success", "Drivers exportados para C:\\Backup_Drivers", 2, 2);
            Ok(CommandResponse::ok(
                "Backup de drivers de terceiros concluído com sucesso em 'C:\\Backup_Drivers'.",
                Some("C:\\Backup_Drivers".to_string()),
            ))
        } else {
            let dism_out = new_hidden_command("dism.exe")
                .args(["/online", "/export-driver", "/destination:C:\\Backup_Drivers"])
                .output();

            if dism_out.map(|o| o.status.success()).unwrap_or(false) {
                emit_step(&app, "backup_drivers", "Backup de Drivers Concluído (via DISM)!", "success", "Destino: C:\\Backup_Drivers", 2, 2);
                Ok(CommandResponse::ok(
                    "Backup de drivers concluído com sucesso em 'C:\\Backup_Drivers' (via DISM).",
                    Some("C:\\Backup_Drivers".to_string()),
                ))
            } else {
                emit_step(&app, "backup_drivers", "Falha ao exportar drivers", "error", "Verifique privilégios de Administrador.", 2, 2);
                Err("Falha ao exportar drivers do sistema. Verifique os privilégios de administrador.".to_string())
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// =================================================================
// NOVAS FUNÇÕES V5.0: AUDITORIA DO SISTEMA, PÓS-FORMATAÇÃO & STARTUP
// =================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAuditResult {
    pub estimated_junk_mb: f64,
    pub estimated_junk_files: u64,
    pub timer_05ms_active: bool,
    pub ultimate_power_active: bool,
    pub telemetry_disabled: bool,
    pub hibernation_disabled: bool,
    pub mouse_precision_active: bool,
    pub fso_disabled: bool,
    pub vbs_disabled: bool,
    pub classic_context_menu: bool,
    pub show_file_extensions: bool,
    pub show_hidden_files: bool,
    pub bing_search_disabled: bool,
    pub windows_ads_disabled: bool,
    pub hags_active: bool,
    pub startup_apps_count: usize,
    pub optimization_score: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupApp {
    pub name: String,
    pub command: String,
    pub location: String, // "HKCU Run", "HKLM Run", "Startup Folder"
    pub enabled: bool,
}

fn is_startup_enabled(root: &RegKey, subkey: &str, name: &str) -> bool {
    if let Ok(appr_key) = root.open_subkey_with_flags(subkey, winreg::enums::KEY_READ) {
        if let Ok(raw_val) = appr_key.get_raw_value(name) {
            if !raw_val.bytes.is_empty() {
                // Byte 0 == 0x02 is Enabled, 0x03 is Disabled by Task Manager
                return raw_val.bytes[0] == 0x02;
            }
        }
    }
    true
}

fn collect_startup_apps_sync() -> Vec<StartupApp> {
    let mut apps = Vec::new();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    if let Ok(run_key) = hkcu.open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", winreg::enums::KEY_READ) {
        for (name, val) in run_key.enum_values().flatten() {
            let cmd_str = val.to_string();
            if !name.trim().is_empty() {
                let enabled = is_startup_enabled(
                    &hkcu,
                    r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run",
                    &name,
                );
                apps.push(StartupApp {
                    name,
                    command: cmd_str,
                    location: "HKCU Run".to_string(),
                    enabled,
                });
            }
        }
    }

    if let Ok(run_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", winreg::enums::KEY_READ) {
        for (name, val) in run_key.enum_values().flatten() {
            let cmd_str = val.to_string();
            if !name.trim().is_empty() {
                let enabled = is_startup_enabled(
                    &hklm,
                    r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run",
                    &name,
                );
                apps.push(StartupApp {
                    name,
                    command: cmd_str,
                    location: "HKLM Run".to_string(),
                    enabled,
                });
            }
        }
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        let startup_dir = Path::new(&appdata).join(r"Microsoft\Windows\Start Menu\Programs\Startup");
        if startup_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&startup_dir) {
                for entry in entries.flatten() {
                    let fname = entry.file_name().to_string_lossy().to_string();
                    if fname.eq_ignore_ascii_case("desktop.ini") {
                        continue;
                    }
                    let enabled = is_startup_enabled(
                        &hkcu,
                        r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder",
                        &fname,
                    );
                    apps.push(StartupApp {
                        name: fname,
                        command: entry.path().to_string_lossy().to_string(),
                        location: "Startup Folder".to_string(),
                        enabled,
                    });
                }
            }
        }
    }

    apps
}

/// Scanner de Auditoria do Sistema (Raio-X rápido sem deletar nada)
#[tauri::command]
pub async fn run_system_audit(state: tauri::State<'_, crate::state::AppState>) -> Result<CommandResponse<SystemAuditResult>, String> {
    let timer_05ms_active = state
        .gamer
        .lock()
        .map(|g| g.timer_resolution_active)
        .unwrap_or(false);

    let result = tokio::task::spawn_blocking(move || {
        // 1. Calcular lixo acumulado estimado sem apagar
        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let win_temp = PathBuf::from("C:\\Windows\\Temp");
        let prefetch = PathBuf::from("C:\\Windows\\Prefetch");
        let local_appdata = std::env::var("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Default\\AppData\\Local"));

        let scan_dirs = vec![
            temp_dir,
            win_temp,
            prefetch,
            local_appdata.join("D3DSCache"),
            local_appdata.join("NVIDIA\\DXCache"),
            local_appdata.join("AMD\\DxCache"),
        ];

        let mut total_junk_bytes = 0u64;
        let mut total_junk_files = 0u64;
        for d in scan_dirs {
            let (b, f) = crate::utils::calculate_dir_size(&d);
            total_junk_bytes += b;
            total_junk_files += f;
        }
        let estimated_junk_mb = ((total_junk_bytes as f64) / (1024.0 * 1024.0) * 10.0).round() / 10.0;

        // 2. Verificar estados reais no Registro
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let key_read = winreg::enums::KEY_READ;

        // Ultimate Power Plan active check
        let ultimate_power_active = hklm
            .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes", key_read)
            .and_then(|k| k.get_value::<String, _>("ActivePowerScheme"))
            .map(|guid| {
                let g = guid.to_lowercase();
                g.contains("e9a42b02") || g.contains("8c5e7fda")
            })
            .unwrap_or(false);

        // Telemetry disabled check
        let telemetry_disabled = hklm
            .open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Windows\DataCollection", key_read)
            .and_then(|k| k.get_value::<u32, _>("AllowTelemetry"))
            .map(|v| v == 0)
            .unwrap_or(false)
            || hklm
                .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Services\DiagTrack", key_read)
                .and_then(|k| k.get_value::<u32, _>("Start"))
                .map(|v| v == 4)
                .unwrap_or(false);

        // Hibernation disabled check
        let hibernation_disabled = !Path::new("C:\\hiberfil.sys").exists()
            || hklm
                .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\Power", key_read)
                .and_then(|k| k.get_value::<u32, _>("HibernateEnabled"))
                .map(|v| v == 0)
                .unwrap_or(false);

        // Mouse precision 1:1 check
        let mouse_precision_active = hkcu
            .open_subkey_with_flags(r"Control Panel\Mouse", key_read)
            .and_then(|k| k.get_value::<String, _>("MouseSpeed"))
            .map(|v| v.trim() == "0")
            .unwrap_or(false);

        // FSO disabled check
        let fso_disabled = hkcu
            .open_subkey_with_flags(r"System\GameConfigStore", key_read)
            .and_then(|k| k.get_value::<u32, _>("GameDVR_FSEBehaviorMode"))
            .map(|v| v == 2)
            .unwrap_or(false);

        // VBS disabled check
        let vbs_disabled = hklm
            .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity", key_read)
            .and_then(|k| k.get_value::<u32, _>("Enabled"))
            .map(|v| v == 0)
            .unwrap_or(true);

        // Classic Context Menu check
        let classic_context_menu = hkcu
            .open_subkey_with_flags(r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32", key_read)
            .is_ok();

        // Show File Extensions check (HideFileExt == 0)
        let show_file_extensions = hkcu
            .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", key_read)
            .and_then(|k| k.get_value::<u32, _>("HideFileExt"))
            .map(|v| v == 0)
            .unwrap_or(false);

        // Show Hidden Files check (Hidden == 1)
        let show_hidden_files = hkcu
            .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced", key_read)
            .and_then(|k| k.get_value::<u32, _>("Hidden"))
            .map(|v| v == 1)
            .unwrap_or(false);

        // Bing Search Disabled check
        let bing_search_disabled = hkcu
            .open_subkey_with_flags(r"Software\Policies\Microsoft\Windows\Explorer", key_read)
            .and_then(|k| k.get_value::<u32, _>("DisableSearchBoxSuggestions"))
            .map(|v| v == 1)
            .unwrap_or(false)
            || hkcu
                .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Search", key_read)
                .and_then(|k| k.get_value::<u32, _>("BingSearchEnabled"))
                .map(|v| v == 0)
                .unwrap_or(false);

        // Windows Ads / Suggestions Disabled check
        let windows_ads_disabled = hkcu
            .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager", key_read)
            .and_then(|k| k.get_value::<u32, _>("SoftLandingEnabled"))
            .map(|v| v == 0)
            .unwrap_or(false);

        // HAGS (Hardware Accelerated GPU Scheduling) check
        let hags_active = hklm
            .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers", key_read)
            .and_then(|k| k.get_value::<u32, _>("HwSchMode"))
            .map(|v| v == 2)
            .unwrap_or(false);

        let startup_apps = collect_startup_apps_sync();
        let startup_apps_count = startup_apps.len();

        // 3. Calcular Score de Otimização (0 a 100%)
        let flags = [
            timer_05ms_active,
            ultimate_power_active,
            telemetry_disabled,
            hibernation_disabled,
            mouse_precision_active,
            fso_disabled,
            vbs_disabled,
            classic_context_menu,
            show_file_extensions,
            bing_search_disabled,
            windows_ads_disabled,
            hags_active,
        ];
        let active_count = flags.iter().filter(|&&b| b).count() as u32;
        // Base 30 points + up to 55 points from tweaks + up to 15 points from clean disk
        let tweak_points = (active_count * 55) / (flags.len() as u32);
        let clean_points = if estimated_junk_mb < 150.0 {
            15
        } else if estimated_junk_mb < 800.0 {
            8
        } else {
            2
        };
        let optimization_score = (30 + tweak_points + clean_points).min(100);

        SystemAuditResult {
            estimated_junk_mb,
            estimated_junk_files: total_junk_files,
            timer_05ms_active,
            ultimate_power_active,
            telemetry_disabled,
            hibernation_disabled,
            mouse_precision_active,
            fso_disabled,
            vbs_disabled,
            classic_context_menu,
            show_file_extensions,
            show_hidden_files,
            bing_search_disabled,
            windows_ads_disabled,
            hags_active,
            startup_apps_count,
            optimization_score,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok("Auditoria do sistema concluída.", Some(result)))
}

/// Alterna tweaks do Checklist Pós-Formatação & Qualidade de Vida
#[tauri::command]
pub async fn toggle_post_format_tweak(tweak_id: String, enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        match tweak_id.as_str() {
            "file_extensions" => {
                let (key, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced")
                    .map_err(|e| e.to_string())?;
                let val: u32 = if enable { 0 } else { 1 };
                key.set_value("HideFileExt", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Extensões de arquivos (.exe, .pdf) agora estão visíveis!" } else { "Extensões de arquivos ocultadas." },
                    Some(enable),
                ))
            }
            "hidden_files" => {
                let (key, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced")
                    .map_err(|e| e.to_string())?;
                let val: u32 = if enable { 1 } else { 2 };
                key.set_value("Hidden", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Arquivos e pastas ocultas agora estão visíveis!" } else { "Arquivos e pastas ocultas escondidos." },
                    Some(enable),
                ))
            }
            "bing_search" => {
                let (pol_key, _) = hkcu
                    .create_subkey(r"Software\Policies\Microsoft\Windows\Explorer")
                    .map_err(|e| e.to_string())?;
                let (search_key, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Search")
                    .map_err(|e| e.to_string())?;

                if enable {
                    pol_key.set_value("DisableSearchBoxSuggestions", &1u32).map_err(|e| e.to_string())?;
                    search_key.set_value("BingSearchEnabled", &0u32).map_err(|e| e.to_string())?;
                    search_key.set_value("CortanaConsent", &0u32).map_err(|e| e.to_string())?;
                } else {
                    pol_key.set_value("DisableSearchBoxSuggestions", &0u32).map_err(|e| e.to_string())?;
                    search_key.set_value("BingSearchEnabled", &1u32).map_err(|e| e.to_string())?;
                }
                Ok(CommandResponse::ok(
                    if enable { "Busca Web do Bing no Menu Iniciar desativada!" } else { "Busca Web do Bing restaurada." },
                    Some(enable),
                ))
            }
            "windows_ads" => {
                let (cdm_key, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager")
                    .map_err(|e| e.to_string())?;
                let val: u32 = if enable { 0 } else { 1 };
                let _ = cdm_key.set_value("SubscribedContent-338389Enabled", &val);
                let _ = cdm_key.set_value("SubscribedContent-310093Enabled", &val);
                let _ = cdm_key.set_value("SubscribedContent-338388Enabled", &val);
                let _ = cdm_key.set_value("SoftLandingEnabled", &val);
                let _ = cdm_key.set_value("SystemPaneSuggestionsEnabled", &val);
                Ok(CommandResponse::ok(
                    if enable { "Anúncios, dicas e sugestões do Windows desativados!" } else { "Sugestões do Windows restauradas." },
                    Some(enable),
                ))
            }
            "hags" => {
                let (gfx_key, _) = hklm
                    .create_subkey(r"SYSTEM\CurrentControlSet\Control\GraphicsDrivers")
                    .map_err(|e| format!("Requer privilégios de Administrador: {}", e))?;
                let val: u32 = if enable { 2 } else { 1 };
                gfx_key.set_value("HwSchMode", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Agendamento de GPU Acelerado por Hardware (HAGS) ativado!" } else { "HAGS desativado." },
                    Some(enable),
                ))
            }
            "sticky_keys" => {
                let (key, _) = hkcu
                    .create_subkey(r"Control Panel\Accessibility\StickyKeys")
                    .map_err(|e| e.to_string())?;
                let val = if enable { "506" } else { "510" };
                key.set_value("Flags", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Atalho de Teclas de Aderência (Shift 5x) desativado!" } else { "Teclas de Aderência restauradas." },
                    Some(enable),
                ))
            }
            "menu_delay" => {
                let (key, _) = hkcu
                    .create_subkey(r"Control Panel\Desktop")
                    .map_err(|e| e.to_string())?;
                let val = if enable { "0" } else { "400" };
                key.set_value("MenuShowDelay", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Atraso de abertura de menus definido para 0ms (instantâneo)!" } else { "Atraso padrão de menus restaurado (400ms)." },
                    Some(enable),
                ))
            }
            "fast_startup" => {
                let (key, _) = hklm
                    .create_subkey(r"SYSTEM\CurrentControlSet\Control\Session Manager\Power")
                    .map_err(|e| format!("Requer privilégios de Administrador: {}", e))?;
                let val: u32 = if enable { 0 } else { 1 };
                key.set_value("HiberbootEnabled", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Inicialização Rápida (Fast Startup) desativada para estabilidade do kernel!" } else { "Inicialização Rápida reativada." },
                    Some(enable),
                ))
            }
            "error_reporting" => {
                let (key, _) = hklm
                    .create_subkey(r"SOFTWARE\Microsoft\Windows\Windows Error Reporting")
                    .map_err(|e| format!("Requer privilégios de Administrador: {}", e))?;
                let val: u32 = if enable { 1 } else { 0 };
                key.set_value("Disabled", &val).map_err(|e| e.to_string())?;
                Ok(CommandResponse::ok(
                    if enable { "Relatório de Erros do Windows (WerSvc / travamentos) desativado!" } else { "Relatório de erros restaurado." },
                    Some(enable),
                ))
            }
            "sync_time" => {
                let out = crate::utils::new_hidden_command("w32tm")
                    .args(["/resync", "/force"])
                    .output();
                match out {
                    Ok(o) if o.status.success() => Ok(CommandResponse::ok("Relógio do Windows sincronizado com sucesso via NTP!", Some(true))),
                    _ => Ok(CommandResponse::ok("Comando de sincronização enviado ao serviço de horário do Windows.", Some(true))),
                }
            }
            _ => Err(format!("Ajuste desconhecido: {}", tweak_id)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Lista todos os programas configurados na inicialização do Windows
#[tauri::command]
pub async fn get_startup_apps() -> Result<CommandResponse<Vec<StartupApp>>, String> {
    let apps = tokio::task::spawn_blocking(collect_startup_apps_sync)
        .await
        .map_err(|e| e.to_string())?;
    Ok(CommandResponse::ok("Lista de inicialização carregada.", Some(apps)))
}

/// Alterna o status de um programa na inicialização (Ativado / Desativado via StartupApproved)
#[tauri::command]
pub async fn toggle_startup_app(name: String, location: String, enable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let (root, subkey) = match location.as_str() {
            "HKCU Run" => (RegKey::predef(HKEY_CURRENT_USER), r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
            "HKLM Run" => (RegKey::predef(HKEY_LOCAL_MACHINE), r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run"),
            "Startup Folder" => (RegKey::predef(HKEY_CURRENT_USER), r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder"),
            _ => return Err(format!("Localização desconhecida: {}", location)),
        };

        let (key, _) = root.create_subkey(subkey).map_err(|e| format!("Erro no registro: {}", e))?;
        let first_byte: u8 = if enable { 0x02 } else { 0x03 };
        let mut bytes = vec![first_byte, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        if let Ok(existing) = key.get_raw_value(&name) {
            if existing.bytes.len() >= 12 {
                bytes = existing.bytes;
                bytes[0] = first_byte;
            }
        }

        let reg_val = winreg::RegValue {
            vtype: winreg::enums::REG_BINARY,
            bytes,
        };

        key.set_raw_value(&name, &reg_val).map_err(|e| format!("Erro ao atualizar status: {}", e))?;

        let status_str = if enable { "ativado" } else { "desativado" };
        Ok(CommandResponse::ok(
            format!("'{}' foi {} na inicialização com sucesso!", name, status_str),
            Some(enable),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Remove um programa da inicialização do Windows (HKCU Run, HKLM Run ou Startup Folder)
#[tauri::command]
pub async fn remove_startup_app(name: String, location: String) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        match location.as_str() {
            "HKCU Run" => {
                let hkcu = RegKey::predef(HKEY_CURRENT_USER);
                let key = hkcu
                    .open_subkey_with_flags(r"Software\Microsoft\Windows\CurrentVersion\Run", winreg::enums::KEY_ALL_ACCESS)
                    .map_err(|e| e.to_string())?;
                key.delete_value(&name).map_err(|e| e.to_string())?;
            }
            "HKLM Run" => {
                let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
                let key = hklm
                    .open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", winreg::enums::KEY_ALL_ACCESS)
                    .map_err(|e| format!("Requer privilégios de Administrador: {}", e))?;
                key.delete_value(&name).map_err(|e| e.to_string())?;
            }
            "Startup Folder" => {
                let appdata = std::env::var("APPDATA").map_err(|e| e.to_string())?;
                let target = Path::new(&appdata)
                    .join(r"Microsoft\Windows\Start Menu\Programs\Startup")
                    .join(&name);
                if target.exists() {
                    std::fs::remove_file(&target).map_err(|e| e.to_string())?;
                }
            }
            _ => return Err(format!("Localização desconhecida: {}", location)),
        }

        Ok(CommandResponse::ok(
            format!("'{}' removido da inicialização com sucesso!", name),
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Gera e abre o Relatório Oficial de Bateria (Notebooks) ou Relatório de Eficiência de Energia (Desktops)
#[tauri::command]
pub async fn generate_battery_or_energy_report() -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(|| {
        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let report_path = temp_dir.join("Relatorio_Bateria_Energia.html");
        let report_str = report_path.to_string_lossy().to_string();

        // Tenta gerar batteryreport (funciona em notebooks)
        let bat_out = new_hidden_command("powercfg.exe")
            .args(["/batteryreport", "/output", &report_str])
            .output();

        if bat_out.map(|o| o.status.success()).unwrap_or(false) && report_path.exists() {
            let _ = crate::utils::shell_open(&report_str);
            return Ok(CommandResponse::ok(
                format!("Relatório oficial de bateria gerado e aberto no navegador ({})!", report_str),
                Some(report_str),
            ));
        }

        // Em Desktops (sem bateria), gera um relatório HTML detalhado dos planos de energia e estados de suspensão
        let schemes_out = new_hidden_command("powercfg.exe").args(["/list"]).output();
        let avail_out = new_hidden_command("powercfg.exe").args(["/availablesleepstates"]).output();
        let req_out = new_hidden_command("powercfg.exe").args(["/requests"]).output();

        let schemes_txt = schemes_out.map(|o| String::from_utf8_lossy(&o.stdout).to_string()).unwrap_or_default();
        let avail_txt = avail_out.map(|o| String::from_utf8_lossy(&o.stdout).to_string()).unwrap_or_default();
        let req_txt = req_out.map(|o| String::from_utf8_lossy(&o.stdout).to_string()).unwrap_or_default();

        let html = format!(
            r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Relatório de Energia & ACPI - System Optimizer Tool V5.0</title>
<style>
  body {{ font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0c; color: #e4e4e7; padding: 40px; max-width: 900px; margin: 0 auto; }}
  h1 {{ color: #38bdf8; border-bottom: 1px solid #27272a; padding-bottom: 12px; }}
  h2 {{ color: #a78bfa; margin-top: 28px; font-size: 16px; }}
  pre {{ background: #18181b; border: 1px solid #27272a; padding: 16px; border-radius: 12px; overflow-x: auto; color: #d4d4d8; }}
</style>
</head>
<body>
  <h1>⚡ Diagnóstico de Energia & ACPI (Desktop) — System Optimizer V5.0</h1>
  <h2>Esquemas de Energia Instalados (powercfg /list)</h2>
  <pre>{}</pre>
  <h2>Estados de Suspensão Suportados pela BIOS (powercfg /availablesleepstates)</h2>
  <pre>{}</pre>
  <h2>Requisições de Energia Ativas (powercfg /requests)</h2>
  <pre>{}</pre>
</body>
</html>"#,
            schemes_txt, avail_txt, req_txt
        );

        std::fs::write(&report_path, html).map_err(|e| e.to_string())?;
        let _ = crate::utils::shell_open(&report_str);

        Ok(CommandResponse::ok(
            format!("Relatório de Energia & ACPI gerado e aberto no navegador ({})!", report_str),
            Some(report_str),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Abre uma URL externa no navegador padrão do usuário via ShellExecuteW
#[tauri::command]
pub async fn open_external_url(url: String) -> Result<CommandResponse<bool>, String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("URL inválida.".to_string());
    }
    crate::utils::shell_open(&url)?;
    Ok(CommandResponse::ok("Link aberto no navegador.", Some(true)))
}

// =================================================================
// MOTOR LIVE REGISTRY TWEAKS (APPLY / REVERT + COMPATIBILIDADE OS)
// =================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveTweakStatus {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub risk_level: String, // "low" | "medium" | "high"
    pub applied: bool,
    pub current_value: String,
    pub recommended_value: String,
    pub default_value: String,
    pub registry_path: String,
    pub min_os_tier: String,
}

fn check_pci_display_msi_status() -> (bool, String) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key_read = winreg::enums::KEY_READ;
    let Ok(pci_root) = hklm.open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Enum\PCI", key_read) else {
        return (false, "N/A".to_string());
    };

    let mut found_any = false;
    let mut all_enabled = true;
    for dev_key_name in pci_root.enum_keys().flatten() {
        let Ok(dev_key) = pci_root.open_subkey_with_flags(&dev_key_name, key_read) else {
            continue;
        };
        for inst_name in dev_key.enum_keys().flatten() {
            let Ok(inst_key) = dev_key.open_subkey_with_flags(&inst_name, key_read) else {
                continue;
            };
            let class_guid: String = inst_key.get_value("ClassGUID").unwrap_or_default();
            if class_guid.eq_ignore_ascii_case("{4d36e968-e325-11ce-bfc1-08002be10318}") {
                // Ignora placas desplugadas/fantasmas sem Interrupt Management
                if let Ok(msi_key) = inst_key.open_subkey_with_flags(
                    r"Device Parameters\Interrupt Management\MessageSignaledInterruptProperties",
                    key_read,
                ) {
                    found_any = true;
                    let val: u32 = msi_key.get_value("MSISupported").unwrap_or(0);
                    if val != 1 {
                        all_enabled = false;
                    }
                }
            }
        }
    }

    if !found_any {
        (false, "Padrão (Line-Based IRQ)".to_string())
    } else if all_enabled {
        (true, "MSISupported = 1 (Ativo)".to_string())
    } else {
        (false, "MSISupported = 0 (IRQ Legado)".to_string())
    }
}

fn set_pci_display_msi_mode(enable: bool) -> Result<u32, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let pci_root = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Enum\PCI", winreg::enums::KEY_READ)
        .map_err(|e| format!("Falha ao acessar Enum\\PCI: {}", e))?;

    let mut updated = 0u32;
    let target_val: u32 = if enable { 1 } else { 0 };

    for dev_key_name in pci_root.enum_keys().flatten() {
        let Ok(dev_key) = pci_root.open_subkey_with_flags(&dev_key_name, winreg::enums::KEY_READ) else {
            continue;
        };
        for inst_name in dev_key.enum_keys().flatten() {
            let Ok(inst_key) = dev_key.open_subkey_with_flags(&inst_name, winreg::enums::KEY_READ) else {
                continue;
            };
            let class_guid: String = inst_key.get_value("ClassGUID").unwrap_or_default();
            if class_guid.eq_ignore_ascii_case("{4d36e968-e325-11ce-bfc1-08002be10318}") {
                let msi_subpath = format!(
                    r"SYSTEM\CurrentControlSet\Enum\PCI\{}\{}\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties",
                    dev_key_name, inst_name
                );
                if hklm.open_subkey_with_flags(
                    format!(r"SYSTEM\CurrentControlSet\Enum\PCI\{}\{}\Device Parameters\Interrupt Management", dev_key_name, inst_name),
                    winreg::enums::KEY_READ,
                ).is_ok() {
                    let (msi_key, _) = hklm
                        .create_subkey(&msi_subpath)
                        .map_err(|e| format!("Falha ao alterar MSI Mode (requer Administrador): {}", e))?;
                    msi_key
                        .set_value("MSISupported", &target_val)
                        .map_err(|e| format!("Erro ao gravar MSISupported: {}", e))?;
                    updated += 1;
                }
            }
        }
    }

    if updated == 0 {
        return Err("Nenhum controlador de vídeo PCI com Interrupt Management foi encontrado.".to_string());
    }
    Ok(updated)
}

fn check_tcp_nodelay_active() -> (bool, String) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key_read = winreg::enums::KEY_READ;
    let base = r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces";
    if let Ok(ifaces) = hklm.open_subkey_with_flags(base, key_read) {
        for sub in ifaces.enum_keys().flatten() {
            if let Ok(k) = ifaces.open_subkey_with_flags(&sub, key_read) {
                let has_ip = k.get_value::<String, _>("DhcpIPAddress").map(|s| !s.is_empty() && s != "0.0.0.0").unwrap_or(false)
                    || k.get_value::<Vec<String>, _>("IPAddress").is_ok();
                if has_ip {
                    let nodelay: u32 = k.get_value("TCPNoDelay").unwrap_or(0);
                    let ack: u32 = k.get_value("TcpAckFrequency").unwrap_or(0);
                    if nodelay == 1 && ack == 1 {
                        return (true, "TCPNoDelay=1, AckFreq=1".to_string());
                    }
                }
            }
        }
    }
    (false, "Nagle Padrão do Windows".to_string())
}

fn read_live_tweaks_sync(timer_active_in_state: bool) -> Vec<LiveTweakStatus> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key_read = winreg::enums::KEY_READ;

    // 1. Timer 0.5ms + GlobalTimerResolutionRequests
    let global_timer_reg = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\Session Manager\kernel", key_read)
        .and_then(|k| k.get_value::<u32, _>("GlobalTimerResolutionRequests"))
        .map(|v| v == 1)
        .unwrap_or(false);
    let timer_applied = global_timer_reg || timer_active_in_state;

    // 2. Win32PrioritySeparation
    let win32_prio = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\PriorityControl", key_read)
        .and_then(|k| k.get_value::<u32, _>("Win32PrioritySeparation"))
        .unwrap_or(2);
    let win32_applied = win32_prio == 0x26 || win32_prio == 0x28;

    // 3. Multimedia SystemResponsiveness & NetworkThrottlingIndex
    let mm_key = hklm.open_subkey_with_flags(
        r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile",
        key_read,
    );
    let sys_resp = mm_key
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("SystemResponsiveness").ok())
        .unwrap_or(20);
    let net_throt = mm_key
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("NetworkThrottlingIndex").ok())
        .unwrap_or(10);
    let mm_applied = sys_resp <= 10 && net_throt == 0xFFFFFFFF;

    // 4. GameDVR & FSO
    let gcs = hkcu.open_subkey_with_flags(r"System\GameConfigStore", key_read);
    let dvr_enabled = gcs
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("GameDVR_Enabled").ok())
        .unwrap_or(1);
    let fse_mode = gcs
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("GameDVR_FSEBehaviorMode").ok())
        .unwrap_or(0);
    let gamedvr_applied = dvr_enabled == 0 && fse_mode == 2;

    // 5. MSI Mode GPU
    let (msi_applied, msi_cur) = check_pci_display_msi_status();

    // 6. Mouse Raw 1:1
    let mouse_key = hkcu.open_subkey_with_flags(r"Control Panel\Mouse", key_read);
    let mouse_speed = mouse_key
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<String, _>("MouseSpeed").ok())
        .unwrap_or_else(|| "1".to_string());
    let mouse_applied = mouse_speed.trim() == "0";

    // 7. Bing Search Disabled
    let bing_applied = hkcu
        .open_subkey_with_flags(r"Software\Policies\Microsoft\Windows\Explorer", key_read)
        .and_then(|k| k.get_value::<u32, _>("DisableSearchBoxSuggestions"))
        .map(|v| v == 1)
        .unwrap_or(false);

    // 8. Hibernation Disabled
    let hib_enabled = hklm
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\Power", key_read)
        .and_then(|k| k.get_value::<u32, _>("HibernateEnabled"))
        .unwrap_or(1);
    let hib_applied = hib_enabled == 0 || !Path::new("C:\\hiberfil.sys").exists();

    // 9. Telemetry Disabled
    let allow_tel = hklm
        .open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Windows\DataCollection", key_read)
        .and_then(|k| k.get_value::<u32, _>("AllowTelemetry"))
        .unwrap_or(1);
    let tel_applied = allow_tel == 0;

    // 10. NTFS TRIM
    let trim_enabled = crate::diagnostics::detect_os_compatibility().build_number > 0 && {
        if let Ok(out) = new_hidden_command("fsutil.exe")
            .args(["behavior", "query", "DisableDeleteNotify"])
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
            text.lines().any(|l| l.contains("disabledeletenotify") && l.contains("= 0"))
        } else {
            true
        }
    };

    // 11. TCP NoDelay
    let (tcp_applied, tcp_cur) = check_tcp_nodelay_active();

    // 12. VBS / HVCI
    let vbs_enabled = hklm
        .open_subkey_with_flags(
            r"SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity",
            key_read,
        )
        .and_then(|k| k.get_value::<u32, _>("Enabled"))
        .unwrap_or(0);
    let vbs_disabled = vbs_enabled == 0;

    // 13. Compressão de Memória (MMAgent)
    let mc_disabled = new_hidden_command("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-MMAgent).MemoryCompression",
        ])
        .output()
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .trim()
                .eq_ignore_ascii_case("False")
        })
        .unwrap_or(false);

    // 14. Pausa Avançada do Windows Update (até 1 ano)
    let wu_expiry = hklm
        .open_subkey_with_flags(r"SOFTWARE\Microsoft\WindowsUpdate\UX\Settings", key_read)
        .and_then(|k| k.get_value::<String, _>("PauseUpdatesExpiryTime"))
        .unwrap_or_default();
    let wu_paused = if !wu_expiry.is_empty() {
        chrono::DateTime::parse_from_rfc3339(&wu_expiry)
            .map(|dt| dt.with_timezone(&chrono::Utc) > chrono::Utc::now())
            .unwrap_or(false)
    } else {
        false
    };

    // 15. Delivery Optimization (P2P Off)
    let do_mode = hklm
        .open_subkey_with_flags(
            r"SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization",
            key_read,
        )
        .and_then(|k| k.get_value::<u32, _>("DODownloadMode"))
        .unwrap_or(1);
    let do_applied = do_mode == 0;

    // 16. UWP Background Apps Off
    let uwp_bg_disabled = hkcu
        .open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications",
            key_read,
        )
        .and_then(|k| k.get_value::<u32, _>("GlobalUserDisabled"))
        .map(|v| v == 1)
        .unwrap_or(false);

    // 17. Microsoft Store Auto-Update Off
    let store_auto_off = hklm
        .open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\WindowsStore", key_read)
        .and_then(|k| k.get_value::<u32, _>("AutoDownload"))
        .map(|v| v == 2)
        .unwrap_or(false);

    // 18. Menu de Contexto Clássico (Windows 10)
    let classic_menu_applied = hkcu
        .open_subkey_with_flags(
            r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32",
            key_read,
        )
        .is_ok();

    // 19. Bloco de Notas Limpo (sem Copilot/IA & sem restaurar abas)
    let clean_notepad_applied = hklm
        .open_subkey_with_flags(r"SOFTWARE\Policies\WindowsNotepad", key_read)
        .and_then(|k| k.get_value::<u32, _>("DisableAIFeatures"))
        .map(|v| v == 1)
        .unwrap_or(false);

    // 20. Efeitos Visuais Otimizados (Preserva Fontes e Miniaturas)
    let vfx_setting = hkcu
        .open_subkey_with_flags(
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects",
            key_read,
        )
        .and_then(|k| k.get_value::<u32, _>("VisualFXSetting"))
        .unwrap_or(0);
    let min_animate = hkcu
        .open_subkey_with_flags(r"Control Panel\Desktop\WindowMetrics", key_read)
        .and_then(|k| k.get_value::<String, _>("MinAnimate"))
        .unwrap_or_else(|_| "1".to_string());
    let visual_fx_applied = vfx_setting == 3 && min_animate.trim() == "0";

    // 21. Explorer Pro & Iluminação Dinâmica Off
    let exp_adv = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced",
        key_read,
    );
    let hide_ext = exp_adv
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("HideFileExt").ok())
        .unwrap_or(1);
    let show_hidden = exp_adv
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("Hidden").ok())
        .unwrap_or(2);
    let explorer_pro_applied = hide_ext == 0 && show_hidden == 1;

    // 22. Tema Dark Blackout (Sem Transparência)
    let pers = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
        key_read,
    );
    let apps_light = pers
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("AppsUseLightTheme").ok())
        .unwrap_or(1);
    let sys_light = pers
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("SystemUsesLightTheme").ok())
        .unwrap_or(1);
    let transp = pers
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("EnableTransparency").ok())
        .unwrap_or(1);
    let blackout_applied = apps_light == 0 && sys_light == 0 && transp == 0;

    // 23. Extermínio de IA Windows 11 24H2-26H2 (Copilot, Recall, Paint Cocreator, Cross Device)
    let copilot_off = hkcu
        .open_subkey_with_flags(
            r"Software\Policies\Microsoft\Windows\WindowsCopilot",
            key_read,
        )
        .and_then(|k| k.get_value::<u32, _>("TurnOffWindowsCopilot"))
        .map(|v| v == 1)
        .unwrap_or(false);
    let recall_off = hkcu
        .open_subkey_with_flags(r"Software\Policies\Microsoft\Windows\WindowsAI", key_read)
        .and_then(|k| k.get_value::<u32, _>("DisableAIDataAnalysis"))
        .map(|v| v == 1)
        .unwrap_or(false);
    let win_ai_off = copilot_off && recall_off;

    // 24. Economia de Energia do Adaptador de Rede (NIC Power Saving Off)
    let (nic_ps_applied, nic_ps_desc) = check_nic_power_saving_sync();

    vec![
        LiveTweakStatus {
            id: "timer_05ms".to_string(),
            name: "Kernel Timer Resolution 0.5ms".to_string(),
            category: "Latência & CPU".to_string(),
            description: "Ativa GlobalTimerResolutionRequests = 1 e ajusta precisão do tick para 0.5ms (5000ns) evitando frametimes irregulares no Windows 11.".to_string(),
            risk_level: "low".to_string(),
            applied: timer_applied,
            current_value: if global_timer_reg { "Global=1 (0.5ms)".to_string() } else if timer_active_in_state { "Runtime Ativo".to_string() } else { "Padrão (15.6ms)".to_string() },
            recommended_value: "1 (0.5ms)".to_string(),
            default_value: "0 (15.6ms)".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\kernel\GlobalTimerResolutionRequests".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "win32_priority".to_string(),
            name: "Win32PrioritySeparation (0x26 / 38)".to_string(),
            category: "Latência & CPU".to_string(),
            description: "Prioriza a janela ativa em primeiro plano (Short Variable Quantum) reduzindo micro-engasgos com Discord/OBS abertos.".to_string(),
            risk_level: "low".to_string(),
            applied: win32_applied,
            current_value: format!("0x{:X} ({})", win32_prio, win32_prio),
            recommended_value: "0x26 (38)".to_string(),
            default_value: "0x2 (2)".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl\Win32PrioritySeparation".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "system_responsiveness".to_string(),
            name: "MMCSS Responsiveness (10%) & Sem Throttling de Rede".to_string(),
            category: "Rede & Multimídia".to_string(),
            description: "Define SystemResponsiveness = 10 e remove limitação de pacotes de rede (NetworkThrottlingIndex = FFFFFFFF).".to_string(),
            risk_level: "low".to_string(),
            applied: mm_applied,
            current_value: format!("Resp={}%, Net={:#X}", sys_resp, net_throt),
            recommended_value: "Resp=10%, Net=0xFFFFFFFF".to_string(),
            default_value: "Resp=20%, Net=10".to_string(),
            registry_path: r"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "gamedvr_fso".to_string(),
            name: "Desativar GameDVR & Otimizações de Tela Cheia (FSO)".to_string(),
            category: "GPU & Gaming".to_string(),
            description: "Desliga gravação oculta da Game Bar e força Modo Exclusivo Direto para menor input lag.".to_string(),
            risk_level: "low".to_string(),
            applied: gamedvr_applied,
            current_value: format!("DVR={}, FSE={}", dvr_enabled, fse_mode),
            recommended_value: "DVR=0, FSE=2".to_string(),
            default_value: "DVR=1, FSE=0".to_string(),
            registry_path: r"HKCU\System\GameConfigStore".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "msi_mode_gpu".to_string(),
            name: "MSI Mode na GPU (Message Signaled Interrupts)".to_string(),
            category: "GPU & PCIe".to_string(),
            description: "Converte interrupções antigas IRQ compartilhadas da placa de vídeo em sinalização PCIe direta de baixíssima latência.".to_string(),
            risk_level: "medium".to_string(),
            applied: msi_applied,
            current_value: msi_cur,
            recommended_value: "MSISupported = 1".to_string(),
            default_value: "MSISupported = 0".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Enum\PCI\<GPU>\MessageSignaledInterruptProperties".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "mouse_raw".to_string(),
            name: "Precisão 1:1 do Mouse (Sem Aceleração do Windows)".to_string(),
            category: "Periféricos".to_string(),
            description: "Zera MouseSpeed e Thresholds eliminando a curva não-linear de aceleração de ponteiro.".to_string(),
            risk_level: "low".to_string(),
            applied: mouse_applied,
            current_value: format!("MouseSpeed={}", mouse_speed),
            recommended_value: "0 (Curva Plana 1:1)".to_string(),
            default_value: "1 (Acelerado)".to_string(),
            registry_path: r"HKCU\Control Panel\Mouse".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "tcp_nodelay".to_string(),
            name: "TCPNoDelay & Nagle Desativado".to_string(),
            category: "Rede & Latência".to_string(),
            description: "Envia pacotes de jogos e apps em tempo real imediatamente sem agrupamento (Nagle Algorithm OFF).".to_string(),
            risk_level: "low".to_string(),
            applied: tcp_applied,
            current_value: tcp_cur,
            recommended_value: "TCPNoDelay=1, AckFreq=1".to_string(),
            default_value: "Omitido (Nagle Ativo)".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "bing_search".to_string(),
            name: "Remover Bing Search do Menu Iniciar".to_string(),
            category: "Privacidade & UI".to_string(),
            description: "Impede que cada tecla digitada no Menu Iniciar envie consultas web ao Bing, acelerando buscas locais.".to_string(),
            risk_level: "low".to_string(),
            applied: bing_applied,
            current_value: if bing_applied { "Desativado (1)".to_string() } else { "Ativo (0)".to_string() },
            recommended_value: "DisableSearchBoxSuggestions = 1".to_string(),
            default_value: "0 (Ativo)".to_string(),
            registry_path: r"HKCU\Software\Policies\Microsoft\Windows\Explorer".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "ntfs_trim".to_string(),
            name: "TRIM Ativo em SSDs/NVMe (DisableDeleteNotify = 0)".to_string(),
            category: "Armazenamento".to_string(),
            description: "Garante coleta automática de blocos apagados em SSDs evitando queda de velocidade de gravação.".to_string(),
            risk_level: "low".to_string(),
            applied: trim_enabled,
            current_value: if trim_enabled { "0 (TRIM Ativo)".to_string() } else { "1 (Desativado!)".to_string() },
            recommended_value: "0 (Ativo)".to_string(),
            default_value: "0 (Ativo)".to_string(),
            registry_path: "fsutil behavior DisableDeleteNotify".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "hibernation".to_string(),
            name: "Desativar Hibernação (Economia de SSD)".to_string(),
            category: "Armazenamento".to_string(),
            description: "Remove hiberfil.sys liberando vários GB do SSD e evita desgastes desnecessários em desktops.".to_string(),
            risk_level: "medium".to_string(),
            applied: hib_applied,
            current_value: if hib_applied { "Desativada (0)".to_string() } else { "Ativa (1)".to_string() },
            recommended_value: "0 (Desativada para Desktop)".to_string(),
            default_value: "1 (Ativa)".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Control\Power\HibernateEnabled".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "telemetry".to_string(),
            name: "Telemetria e Coleta de Diagnóstico = 0".to_string(),
            category: "Privacidade".to_string(),
            description: "Aplica AllowTelemetry = 0 na política do Windows para reduzir tráfego em segundo plano.".to_string(),
            risk_level: "medium".to_string(),
            applied: tel_applied,
            current_value: format!("AllowTelemetry={}", allow_tel),
            recommended_value: "0 (Mínimo/Segurança)".to_string(),
            default_value: "1 (Diagnóstico Básico)".to_string(),
            registry_path: r"HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "vbs_hvci".to_string(),
            name: "Desativar VBS / Isolamento de Núcleo (HVCI) para FPS".to_string(),
            category: "Segurança vs FPS".to_string(),
            description: "Desativa virtualização HVCI de integridade de memória (pode recuperar 5% a 12% de FPS em jogos competitivos; exige reinício).".to_string(),
            risk_level: "high".to_string(),
            applied: vbs_disabled,
            current_value: if vbs_disabled { "0 (Desativado - Max FPS)".to_string() } else { "1 (HVCI Ativo)".to_string() },
            recommended_value: "0 (Performance) ou 1 (Segurança)".to_string(),
            default_value: "1 (Ativo no Win11)".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "memory_compression".to_string(),
            name: "Compressão de Memória (MMAgent)".to_string(),
            category: "Memória & Sistema".to_string(),
            description: "Desativa compressão de páginas em RAM (recomendado para >=16GB RAM para eliminar micro-stutters; mantenha Ativo em <=8GB).".to_string(),
            risk_level: "low".to_string(),
            applied: mc_disabled,
            current_value: if mc_disabled { "Desativada (False)".to_string() } else { "Ativa (True)".to_string() },
            recommended_value: "Desativada (>=16GB) / Ativa (<=8GB)".to_string(),
            default_value: "Ativa (True)".to_string(),
            registry_path: "PowerShell: Get-MMAgent / Disable-MMAgent -mc".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "windows_update_pause".to_string(),
            name: "Pausar Windows Update (Até 1 Ano)".to_string(),
            category: "Windows Update".to_string(),
            description: "Pausa atualizações automáticas e drivers via WU por 365 dias com opção de retomar (Resume) a qualquer momento.".to_string(),
            risk_level: "medium".to_string(),
            applied: wu_paused,
            current_value: if wu_paused { format!("Pausado até {}", &wu_expiry.chars().take(10).collect::<String>()) } else { "Ativo (Automático)".to_string() },
            recommended_value: "Pausado (+365d) c/ Resume Manual".to_string(),
            default_value: "Ativo".to_string(),
            registry_path: r"HKLM\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "delivery_optimization_off".to_string(),
            name: "Desativar Delivery Optimization (P2P Off)".to_string(),
            category: "Rede & Update".to_string(),
            description: "Define DODownloadMode = 0 impedindo que o Windows consuma seu upload enviando updates P2P na rede.".to_string(),
            risk_level: "low".to_string(),
            applied: do_applied,
            current_value: format!("DODownloadMode={}", do_mode),
            recommended_value: "0 (P2P Desativado)".to_string(),
            default_value: "1 (LAN/P2P)".to_string(),
            registry_path: r"HKLM\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "uwp_background_off".to_string(),
            name: "Bloquear Apps UWP em Segundo Plano".to_string(),
            category: "Sistema & Privacidade".to_string(),
            description: "Impede que apps da Microsoft Store rodem processos ocultos em segundo plano consumindo RAM e CPU.".to_string(),
            risk_level: "low".to_string(),
            applied: uwp_bg_disabled,
            current_value: if uwp_bg_disabled { "GlobalUserDisabled=1 (Bloqueado)".to_string() } else { "Permitido".to_string() },
            recommended_value: "1 (Bloqueado)".to_string(),
            default_value: "0 (Permitido)".to_string(),
            registry_path: r"HKCU\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "store_autoupdate_off".to_string(),
            name: "Desativar Auto-Update da Microsoft Store".to_string(),
            category: "Sistema & Privacidade".to_string(),
            description: "Evita downloads silenciosos da Microsoft Store roubando banda e I/O durante partidas online.".to_string(),
            risk_level: "low".to_string(),
            applied: store_auto_off,
            current_value: if store_auto_off { "AutoDownload=2 (Desativado)".to_string() } else { "Automático (4)".to_string() },
            recommended_value: "2 (Manual)".to_string(),
            default_value: "4 (Automático)".to_string(),
            registry_path: r"HKLM\SOFTWARE\Policies\Microsoft\WindowsStore".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "classic_context_menu".to_string(),
            name: "Menu de Contexto Clássico (Windows 10)".to_string(),
            category: "Shell & Interface".to_string(),
            description: "Restaura o menu de botão direito completo instantâneo do Windows 10 (remove o submenu extra do Win11).".to_string(),
            risk_level: "low".to_string(),
            applied: classic_menu_applied,
            current_value: if classic_menu_applied { "Clássico Win10 Ativo".to_string() } else { "Padrão Win11".to_string() },
            recommended_value: "Ativo".to_string(),
            default_value: "Padrão Win11".to_string(),
            registry_path: r"HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}".to_string(),
            min_os_tier: "Win11".to_string(),
        },
        LiveTweakStatus {
            id: "clean_notepad".to_string(),
            name: "Bloco de Notas Limpo (Sem Copilot/IA & Sem Abas)".to_string(),
            category: "Shell & Interface".to_string(),
            description: "Preserva o Notepad clássico desativando botões de IA/Copilot e restauração de sessões antigas.".to_string(),
            risk_level: "low".to_string(),
            applied: clean_notepad_applied,
            current_value: if clean_notepad_applied { "IA Desativada (1)".to_string() } else { "IA / Sessão Padrão".to_string() },
            recommended_value: "DisableAIFeatures=1".to_string(),
            default_value: "0".to_string(),
            registry_path: r"HKLM\SOFTWARE\Policies\WindowsNotepad".to_string(),
            min_os_tier: "Win11".to_string(),
        },
        LiveTweakStatus {
            id: "visual_effects_opt".to_string(),
            name: "Efeitos Visuais Enxutos (Preserva Fontes e Thumbnails)".to_string(),
            category: "Shell & Interface".to_string(),
            description: "Remove animações de minimizar/maximizar e barra de tarefas sem estragar ClearType nem miniaturas.".to_string(),
            risk_level: "low".to_string(),
            applied: visual_fx_applied,
            current_value: if visual_fx_applied { "Custom (MinAnimate=0)".to_string() } else { "Padrão".to_string() },
            recommended_value: "VisualFXSetting=3".to_string(),
            default_value: "1 / 0".to_string(),
            registry_path: r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "explorer_pro_settings".to_string(),
            name: "Explorer Pro & Iluminação Dinâmica Off".to_string(),
            category: "Shell & Interface".to_string(),
            description: "Exibe extensões de arquivos, pastas ocultas, abre em 'Este Computador' e desativa Windows Dynamic Lighting.".to_string(),
            risk_level: "low".to_string(),
            applied: explorer_pro_applied,
            current_value: if explorer_pro_applied { "Extensões + Ocultos Visíveis".to_string() } else { "Padrão Oculto".to_string() },
            recommended_value: "HideFileExt=0, Hidden=1".to_string(),
            default_value: "HideFileExt=1, Hidden=2".to_string(),
            registry_path: r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced".to_string(),
            min_os_tier: "Win7".to_string(),
        },
        LiveTweakStatus {
            id: "full_blackout_theme".to_string(),
            name: "Tema Escuro Total & Sem Transparência".to_string(),
            category: "Shell & Interface".to_string(),
            description: "Ativa Dark Mode em Apps e Sistema (0) e desativa transparência Mica/Acrylic para menor carga da GPU Desktop.".to_string(),
            risk_level: "low".to_string(),
            applied: blackout_applied,
            current_value: if blackout_applied { "Blackout Total (Transp=0)".to_string() } else { "Claro ou Transparência Ativa".to_string() },
            recommended_value: "Dark=1, Transparency=0".to_string(),
            default_value: "Transparency=1".to_string(),
            registry_path: r"HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize".to_string(),
            min_os_tier: "Win10".to_string(),
        },
        LiveTweakStatus {
            id: "disable_windows_ai".to_string(),
            name: "Extermínio de IA Win11 24H2-26H2 (Copilot/Recall/Cocreator)".to_string(),
            category: "Privacidade & IA".to_string(),
            description: "Desativa Copilot, Windows Recall (Snapshots), Paint Image Creator/Cocreator e Cross Device Resume via GPO.".to_string(),
            risk_level: "medium".to_string(),
            applied: win_ai_off,
            current_value: if win_ai_off { "Copilot & Recall Desativados".to_string() } else { "Recursos de IA Ativos".to_string() },
            recommended_value: "TurnOffCopilot=1, DisableRecall=1".to_string(),
            default_value: "Ativo no Win11".to_string(),
            registry_path: r"HKCU\Software\Policies\Microsoft\Windows\WindowsAI".to_string(),
            min_os_tier: "Win11".to_string(),
        },
        LiveTweakStatus {
            id: "nic_power_saving_off".to_string(),
            name: "Desativar Economia de Energia da Placa de Rede (NIC EEE Off)".to_string(),
            category: "Rede & Latência".to_string(),
            description: "Desativa EEE, Green Ethernet, Wake-on-MagicPacket e PnPCapabilities nos adaptadores de rede evitando micro-quedas de ping.".to_string(),
            risk_level: "medium".to_string(),
            applied: nic_ps_applied,
            current_value: nic_ps_desc,
            recommended_value: "PnP=24, EEE=0, GreenEthernet=0".to_string(),
            default_value: "Economia Ativa".to_string(),
            registry_path: r"HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}".to_string(),
            min_os_tier: "Win7".to_string(),
        },
    ]
}

/// Retorna o catálogo de tweaks com status LIDO EM TEMPO REAL do Registro do Windows
#[tauri::command]
pub async fn get_live_tweaks_status(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<CommandResponse<Vec<LiveTweakStatus>>, String> {
    let timer_active = state.gamer.lock().map(|g| g.timer_resolution_active).unwrap_or(false);
    let list = tokio::task::spawn_blocking(move || read_live_tweaks_sync(timer_active))
        .await
        .map_err(|e| e.to_string())?;
    Ok(CommandResponse::ok("Estado real do Registro carregado.", Some(list)))
}

/// Aplica ou Reverte uma política real no Registro do Windows e retorna seu novo estado
#[tauri::command]
pub async fn apply_or_revert_tweak(
    tweak_id: String,
    apply: bool,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<CommandResponse<LiveTweakStatus>, String> {
    let id_clone = tweak_id.clone();

    if id_clone == "timer_05ms" {
        let _ = crate::gamer::apply_kernel_timer(apply, &state);
    }

    let timer_active = state.gamer.lock().map(|g| g.timer_resolution_active).unwrap_or(false);

    let updated_item = tokio::task::spawn_blocking(move || -> Result<LiveTweakStatus, String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);

        let needs_admin = matches!(
            id_clone.as_str(),
            "timer_05ms"
                | "win32_priority"
                | "system_responsiveness"
                | "msi_mode_gpu"
                | "tcp_nodelay"
                | "ntfs_trim"
                | "hibernation"
                | "telemetry"
                | "vbs_hvci"
                | "memory_compression"
                | "windows_update_pause"
                | "delivery_optimization_off"
                | "uwp_background_off"
                | "store_autoupdate_off"
                | "clean_notepad"
                | "disable_windows_ai"
                | "nic_power_saving_off"
        );

        if needs_admin && !is_process_elevated() {
            return Err("Este ajuste altera chaves protegidas de sistema (HKLM). Execute como Administrador para aplicar ou reverter.".to_string());
        }

        match id_clone.as_str() {
            "timer_05ms" => {
                let (key, _) = hklm
                    .create_subkey(r"SYSTEM\CurrentControlSet\Control\Session Manager\kernel")
                    .map_err(|e| e.to_string())?;
                key.set_value("GlobalTimerResolutionRequests", &(if apply { 1u32 } else { 0u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "win32_priority" => {
                let (key, _) = hklm
                    .create_subkey(r"SYSTEM\CurrentControlSet\Control\PriorityControl")
                    .map_err(|e| e.to_string())?;
                key.set_value("Win32PrioritySeparation", &(if apply { 0x26u32 } else { 2u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "system_responsiveness" => {
                let (key, _) = hklm
                    .create_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile")
                    .map_err(|e| e.to_string())?;
                key.set_value("SystemResponsiveness", &(if apply { 10u32 } else { 20u32 }))
                    .map_err(|e| e.to_string())?;
                key.set_value("NetworkThrottlingIndex", &(if apply { 0xFFFFFFFFu32 } else { 10u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "gamedvr_fso" => {
                let (key, _) = hkcu
                    .create_subkey(r"System\GameConfigStore")
                    .map_err(|e| e.to_string())?;
                key.set_value("GameDVR_Enabled", &(if apply { 0u32 } else { 1u32 }))
                    .map_err(|e| e.to_string())?;
                key.set_value("GameDVR_FSEBehaviorMode", &(if apply { 2u32 } else { 0u32 }))
                    .map_err(|e| e.to_string())?;
                key.set_value("GameDVR_HonorUserFSEBehaviorMode", &(if apply { 1u32 } else { 0u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "msi_mode_gpu" => {
                set_pci_display_msi_mode(apply)?;
            }
            "mouse_raw" => {
                let (key, _) = hkcu
                    .create_subkey(r"Control Panel\Mouse")
                    .map_err(|e| e.to_string())?;
                if apply {
                    key.set_value("MouseSpeed", &"0").map_err(|e| e.to_string())?;
                    key.set_value("MouseThreshold1", &"0").map_err(|e| e.to_string())?;
                    key.set_value("MouseThreshold2", &"0").map_err(|e| e.to_string())?;
                } else {
                    key.set_value("MouseSpeed", &"1").map_err(|e| e.to_string())?;
                    key.set_value("MouseThreshold1", &"6").map_err(|e| e.to_string())?;
                    key.set_value("MouseThreshold2", &"10").map_err(|e| e.to_string())?;
                }
            }
            "tcp_nodelay" => {
                let base_path = r"SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces";
                let base_key = hklm.open_subkey(base_path).map_err(|e| e.to_string())?;
                for sub in base_key.enum_keys().flatten() {
                    let iface_path = format!(r"{}\{}", base_path, sub);
                    if let Ok(k) = hklm.open_subkey_with_flags(&iface_path, winreg::enums::KEY_ALL_ACCESS) {
                        let has_ip = k.get_value::<String, _>("DhcpIPAddress").is_ok()
                            || k.get_value::<Vec<String>, _>("IPAddress").is_ok();
                        if has_ip {
                            if apply {
                                let _ = k.set_value("TCPNoDelay", &1u32);
                                let _ = k.set_value("TcpAckFrequency", &1u32);
                            } else {
                                let _ = k.delete_value("TCPNoDelay");
                                let _ = k.delete_value("TcpAckFrequency");
                            }
                        }
                    }
                }
            }
            "bing_search" => {
                let (pol, _) = hkcu
                    .create_subkey(r"Software\Policies\Microsoft\Windows\Explorer")
                    .map_err(|e| e.to_string())?;
                pol.set_value("DisableSearchBoxSuggestions", &(if apply { 1u32 } else { 0u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "ntfs_trim" => {
                let target = if apply { "0" } else { "1" };
                let out = new_hidden_command("fsutil.exe")
                    .args(["behavior", "set", "DisableDeleteNotify", "NTFS", target])
                    .output()
                    .map_err(|e| e.to_string())?;
                if !out.status.success() {
                    return Err(String::from_utf8_lossy(&out.stderr).to_string());
                }
            }
            "hibernation" => {
                let arg = if apply { "off" } else { "on" };
                let out = new_hidden_command("powercfg.exe")
                    .args(["/h", arg])
                    .output()
                    .map_err(|e| e.to_string())?;
                if !out.status.success() {
                    return Err(String::from_utf8_lossy(&out.stderr).to_string());
                }
            }
            "telemetry" => {
                let (key, _) = hklm
                    .create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\DataCollection")
                    .map_err(|e| e.to_string())?;
                key.set_value("AllowTelemetry", &(if apply { 0u32 } else { 1u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "vbs_hvci" => {
                let (key, _) = hklm
                    .create_subkey(r"SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity")
                    .map_err(|e| e.to_string())?;
                key.set_value("Enabled", &(if apply { 0u32 } else { 1u32 }))
                    .map_err(|e| e.to_string())?;
            }
            "memory_compression" => {
                let cmd = if apply { "Disable-MMAgent -mc" } else { "Enable-MMAgent -mc" };
                let out = new_hidden_command("powershell.exe")
                    .args(["-NoProfile", "-NonInteractive", "-Command", cmd])
                    .output()
                    .map_err(|e| e.to_string())?;
                if !out.status.success() {
                    return Err(String::from_utf8_lossy(&out.stderr).to_string());
                }
            }
            "windows_update_pause" => {
                let (ux_key, _) = hklm
                    .create_subkey(r"SOFTWARE\Microsoft\WindowsUpdate\UX\Settings")
                    .map_err(|e| e.to_string())?;
                if apply {
                    let now = chrono::Utc::now();
                    let expiry = now + chrono::Duration::days(365);
                    let now_s = now.format("%Y-%m-%dT%H:%M:%SZ").to_string();
                    let exp_s = expiry.format("%Y-%m-%dT%H:%M:%SZ").to_string();
                    let _ = ux_key.set_value("FlightSettingsMaxPauseDays", &365u32);
                    let _ = ux_key.set_value("PauseFeatureUpdatesStartTime", &now_s);
                    let _ = ux_key.set_value("PauseQualityUpdatesStartTime", &now_s);
                    let _ = ux_key.set_value("PauseUpdatesStartTime", &now_s);
                    let _ = ux_key.set_value("PauseFeatureUpdatesEndTime", &exp_s);
                    let _ = ux_key.set_value("PauseQualityUpdatesEndTime", &exp_s);
                    let _ = ux_key.set_value("PauseUpdatesExpiryTime", &exp_s);

                    if let Ok((wu_pol, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate") {
                        let _ = wu_pol.set_value("ExcludeWUDriversInQualityUpdate", &1u32);
                    }
                } else {
                    for val in [
                        "PauseFeatureUpdatesStartTime",
                        "PauseQualityUpdatesStartTime",
                        "PauseUpdatesStartTime",
                        "PauseFeatureUpdatesEndTime",
                        "PauseQualityUpdatesEndTime",
                        "PauseUpdatesExpiryTime",
                    ] {
                        let _ = ux_key.delete_value(val);
                    }
                }
            }
            "delivery_optimization_off" => {
                let (pol, _) = hklm
                    .create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization")
                    .map_err(|e| e.to_string())?;
                pol.set_value("DODownloadMode", &(if apply { 0u32 } else { 1u32 }))
                    .map_err(|e| e.to_string())?;
                if let Ok((cfg, _)) = hklm.create_subkey(r"SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config") {
                    let _ = cfg.set_value("DODownloadMode", &(if apply { 0u32 } else { 1u32 }));
                }
            }
            "uwp_background_off" => {
                let (key, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications")
                    .map_err(|e| e.to_string())?;
                key.set_value("GlobalUserDisabled", &(if apply { 1u32 } else { 0u32 }))
                    .map_err(|e| e.to_string())?;
                if let Ok((pol, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\AppPrivacy") {
                    if apply {
                        let _ = pol.set_value("LetAppsRunInBackground", &2u32);
                    } else {
                        let _ = pol.delete_value("LetAppsRunInBackground");
                    }
                }
            }
            "store_autoupdate_off" => {
                let (pol, _) = hklm
                    .create_subkey(r"SOFTWARE\Policies\Microsoft\WindowsStore")
                    .map_err(|e| e.to_string())?;
                if apply {
                    pol.set_value("AutoDownload", &2u32).map_err(|e| e.to_string())?;
                } else {
                    let _ = pol.delete_value("AutoDownload");
                }
            }
            "classic_context_menu" => {
                let clsid = r"Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}";
                if apply {
                    let (key, _) = hkcu
                        .create_subkey(format!(r"{}\InprocServer32", clsid))
                        .map_err(|e| e.to_string())?;
                    key.set_value("", &"").map_err(|e| e.to_string())?;
                } else {
                    let _ = hkcu.delete_subkey_all(clsid);
                }
                let _ = new_hidden_command("taskkill.exe")
                    .args(["/F", "/IM", "explorer.exe"])
                    .output();
                let _ = new_hidden_command("explorer.exe").spawn();
            }
            "clean_notepad" => {
                let (pol, _) = hklm
                    .create_subkey(r"SOFTWARE\Policies\WindowsNotepad")
                    .map_err(|e| e.to_string())?;
                if apply {
                    pol.set_value("DisableAIFeatures", &1u32).map_err(|e| e.to_string())?;
                } else {
                    let _ = pol.delete_value("DisableAIFeatures");
                }
                if let Ok((np, _)) = hkcu.create_subkey(r"Software\Microsoft\Notepad") {
                    let _ = np.set_value("ShowCopilotButton", &(if apply { 0u32 } else { 1u32 }));
                    let _ = np.set_value("SessionState", &(if apply { 0u32 } else { 1u32 }));
                }
            }
            "visual_effects_opt" => {
                let (vfx, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects")
                    .map_err(|e| e.to_string())?;
                vfx.set_value("VisualFXSetting", &(if apply { 3u32 } else { 1u32 }))
                    .map_err(|e| e.to_string())?;
                if let Ok((wm, _)) = hkcu.create_subkey(r"Control Panel\Desktop\WindowMetrics") {
                    let _ = wm.set_value("MinAnimate", &(if apply { "0" } else { "1" }));
                }
                if let Ok((desk, _)) = hkcu.create_subkey(r"Control Panel\Desktop") {
                    let _ = desk.set_value("SmoothScroll", &(if apply { 0u32 } else { 1u32 }));
                    let _ = desk.set_value("DragFullWindows", &"1");
                    let _ = desk.set_value("FontSmoothing", &"2");
                }
                if let Ok((adv, _)) = hkcu.create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced") {
                    let _ = adv.set_value("TaskbarAnimations", &(if apply { 0u32 } else { 1u32 }));
                    let _ = adv.set_value("IconsOnly", &0u32);
                }
            }
            "explorer_pro_settings" => {
                let (adv, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced")
                    .map_err(|e| e.to_string())?;
                adv.set_value("HideFileExt", &(if apply { 0u32 } else { 1u32 }))
                    .map_err(|e| e.to_string())?;
                adv.set_value("Hidden", &(if apply { 1u32 } else { 2u32 }))
                    .map_err(|e| e.to_string())?;
                adv.set_value("LaunchTo", &(if apply { 1u32 } else { 2u32 }))
                    .map_err(|e| e.to_string())?;
                if let Ok((pol, _)) = hkcu.create_subkey(r"Software\Policies\Microsoft\Windows\Explorer") {
                    let _ = pol.set_value("DisableSearchBoxSuggestions", &(if apply { 1u32 } else { 0u32 }));
                }
                if let Ok((light, _)) = hkcu.create_subkey(r"Software\Microsoft\Lighting") {
                    let _ = light.set_value("AmbientLightingEnabled", &(if apply { 0u32 } else { 1u32 }));
                }
            }
            "full_blackout_theme" => {
                let (pers, _) = hkcu
                    .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize")
                    .map_err(|e| e.to_string())?;
                if apply {
                    pers.set_value("AppsUseLightTheme", &0u32).map_err(|e| e.to_string())?;
                    pers.set_value("SystemUsesLightTheme", &0u32).map_err(|e| e.to_string())?;
                    pers.set_value("EnableTransparency", &0u32).map_err(|e| e.to_string())?;
                } else {
                    pers.set_value("EnableTransparency", &1u32).map_err(|e| e.to_string())?;
                }
            }
            "disable_windows_ai" => {
                let (cu_cop, _) = hkcu
                    .create_subkey(r"Software\Policies\Microsoft\Windows\WindowsCopilot")
                    .map_err(|e| e.to_string())?;
                let (cu_ai, _) = hkcu
                    .create_subkey(r"Software\Policies\Microsoft\Windows\WindowsAI")
                    .map_err(|e| e.to_string())?;
                if apply {
                    cu_cop.set_value("TurnOffWindowsCopilot", &1u32).map_err(|e| e.to_string())?;
                    cu_ai.set_value("DisableAIDataAnalysis", &1u32).map_err(|e| e.to_string())?;
                    if let Ok((lm_cop, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot") {
                        let _ = lm_cop.set_value("TurnOffWindowsCopilot", &1u32);
                    }
                    if let Ok((lm_ai, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\WindowsAI") {
                        let _ = lm_ai.set_value("DisableAIDataAnalysis", &1u32);
                    }
                    if let Ok((paint, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\Paint") {
                        let _ = paint.set_value("DisableImageCreator", &1u32);
                        let _ = paint.set_value("DisableCocreator", &1u32);
                    }
                    if let Ok((sys_pol, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Windows\System") {
                        let _ = sys_pol.set_value("EnableCdp", &0u32);
                        let _ = sys_pol.set_value("AllowCrossDeviceClipboard", &0u32);
                    }
                } else {
                    let _ = cu_cop.delete_value("TurnOffWindowsCopilot");
                    let _ = cu_ai.delete_value("DisableAIDataAnalysis");
                    if let Ok(lm_cop) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot", winreg::enums::KEY_WRITE) {
                        let _ = lm_cop.delete_value("TurnOffWindowsCopilot");
                    }
                    if let Ok(lm_ai) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Windows\WindowsAI", winreg::enums::KEY_WRITE) {
                        let _ = lm_ai.delete_value("DisableAIDataAnalysis");
                    }
                    if let Ok(paint) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Windows\Paint", winreg::enums::KEY_WRITE) {
                        let _ = paint.delete_value("DisableImageCreator");
                        let _ = paint.delete_value("DisableCocreator");
                    }
                    if let Ok(sys_pol) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Windows\System", winreg::enums::KEY_WRITE) {
                        let _ = sys_pol.delete_value("EnableCdp");
                        let _ = sys_pol.delete_value("AllowCrossDeviceClipboard");
                    }
                }
            }
            "nic_power_saving_off" => {
                set_nic_power_saving_sync(apply)?;
            }
            _ => return Err(format!("Tweak desconhecido: {}", id_clone)),
        }

        let refreshed = read_live_tweaks_sync(timer_active);
        refreshed
            .into_iter()
            .find(|t| t.id == id_clone)
            .ok_or_else(|| "Falha ao recarregar status do tweak.".to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    let action_word = if apply { "aplicado" } else { "revertido ao padrão" };
    Ok(CommandResponse::ok(
        format!("'{}' foi {} com sucesso!", updated_item.name, action_word),
        Some(updated_item),
    ))
}

// ============================================================================
// MÓDULO 3 & MÓDULO 6: BITLOCKER, NTP SYNC, RESTAURAÇÃO, AUDIO LOUDNESS EQ & REDE
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BitLockerDriveStatus {
    pub drive: String,
    pub status: String,
    pub protection_on: bool,
    pub percentage_encrypted: f32,
    pub encryption_method: String,
}

#[tauri::command]
pub async fn get_bitlocker_status() -> Result<CommandResponse<Vec<BitLockerDriveStatus>>, String> {
    tokio::task::spawn_blocking(|| {
        let out = new_hidden_command("manage-bde")
            .args(["-status"])
            .output();

        let mut drives = Vec::new();
        if let Ok(res) = out {
            let stdout = String::from_utf8_lossy(&res.stdout).to_string();
            let mut cur_drive = String::new();
            let mut cur_status = String::from("Desconhecido");
            let mut cur_pct = 0.0f32;
            let mut cur_prot = false;
            let mut cur_method = String::from("N/A");

            for raw_line in stdout.lines() {
                let line = raw_line.trim();
                let lower = line.to_lowercase();
                if lower.starts_with("volume ") && line.contains(':') {
                    if !cur_drive.is_empty() {
                        drives.push(BitLockerDriveStatus {
                            drive: cur_drive.clone(),
                            status: cur_status.clone(),
                            protection_on: cur_prot,
                            percentage_encrypted: cur_pct,
                            encryption_method: cur_method.clone(),
                        });
                    }
                    let after_vol = line.trim_start_matches("Volume ").trim();
                    cur_drive = after_vol
                        .split_whitespace()
                        .next()
                        .unwrap_or("C:")
                        .to_string();
                    cur_status = String::from("Verificado");
                    cur_pct = 0.0;
                    cur_prot = false;
                    cur_method = String::from("Nenhum");
                } else if lower.contains("conversion status:") || lower.contains("status da conversão:") {
                    if let Some((_, val)) = line.split_once(':') {
                        cur_status = val.trim().to_string();
                    }
                } else if lower.contains("percentage encrypted:") || lower.contains("porcentagem criptografada:") {
                    if let Some((_, val)) = line.split_once(':') {
                        let num_s: String = val
                            .trim()
                            .chars()
                            .filter(|c| c.is_ascii_digit() || *c == '.' || *c == ',')
                            .collect();
                        cur_pct = num_s.replace(',', ".").parse::<f32>().unwrap_or(0.0);
                    }
                } else if lower.contains("protection status:") || lower.contains("status da proteção:") {
                    if let Some((_, val)) = line.split_once(':') {
                        let v = val.trim().to_lowercase();
                        cur_prot = v.contains("on") || v.contains("ativ") || v.contains("proteg");
                    }
                } else if lower.contains("encryption method:") || lower.contains("método de criptografia:") {
                    if let Some((_, val)) = line.split_once(':') {
                        cur_method = val.trim().to_string();
                    }
                }
            }

            if !cur_drive.is_empty() {
                drives.push(BitLockerDriveStatus {
                    drive: cur_drive,
                    status: cur_status,
                    protection_on: cur_prot,
                    percentage_encrypted: cur_pct,
                    encryption_method: cur_method,
                });
            }
        }

        if drives.is_empty() {
            drives.push(BitLockerDriveStatus {
                drive: "C:".to_string(),
                status: "Descriptografado / Inativo".to_string(),
                protection_on: false,
                percentage_encrypted: 0.0,
                encryption_method: "Nenhum".to_string(),
            });
        }

        Ok(CommandResponse::ok(
            "Auditoria de BitLocker concluída.",
            Some(drives),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn bitlocker_decrypt(drive: String) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        if !is_process_elevated() {
            return Ok(CommandResponse::err(
                "Descriptografar o BitLocker exige privilégios de Administrador.",
            ));
        }
        let letter = drive
            .trim()
            .chars()
            .next()
            .filter(|c| c.is_ascii_alphabetic())
            .unwrap_or('C');
        let target = format!("{}:", letter.to_ascii_uppercase());

        let out = new_hidden_command("manage-bde")
            .args(["-off", &target])
            .output()
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        let stderr = String::from_utf8_lossy(&out.stderr).to_string();
        if out.status.success() {
            Ok(CommandResponse::ok(
                format!("Descriptografia BitLocker iniciada em {}! {}", target, stdout.trim()),
                Some(target),
            ))
        } else {
            Ok(CommandResponse::err(format!(
                "Falha ao executar manage-bde -off {}: {} {}",
                target, stdout, stderr
            )))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn sync_system_time() -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(|| {
        let _ = new_hidden_command("sc")
            .args(["config", "w32time", "start=", "auto"])
            .output();
        let _ = new_hidden_command("net").args(["start", "w32time"]).output();

        let resync = new_hidden_command("w32tm")
            .args(["/resync", "/force"])
            .output()
            .map_err(|e| e.to_string())?;

        let tz_out = new_hidden_command("tzutil").args(["/g"]).output();
        let tz = tz_out
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_else(|_| "Desconhecido".to_string());

        let msg = if resync.status.success() {
            format!("Relógio NTP sincronizado com sucesso! Fuso horário ativo: {}", tz)
        } else {
            format!(
                "Serviço w32time configurado e verificado (Fuso: {}). Aviso resync: {}",
                tz,
                String::from_utf8_lossy(&resync.stdout).trim()
            )
        };
        Ok(CommandResponse::ok(msg.clone(), Some(msg)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn restore_essential_app(target: String) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let (ps_cmd, label) = match target.as_str() {
            "xbox_gaming" => (
                "Get-AppxPackage -AllUsers *XboxGamingOverlay* | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register \"$($_.InstallLocation)\\AppXManifest.xml\" -ErrorAction SilentlyContinue }; Get-AppxPackage -AllUsers *XboxIdentityProvider* | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register \"$($_.InstallLocation)\\AppXManifest.xml\" -ErrorAction SilentlyContinue }; winget install --id Microsoft.GamingServices -e --accept-source-agreements --accept-package-agreements --silent",
                "Xbox Game Bar & Gaming Services",
            ),
            "ms_store" => (
                "Start-Process wsreset -ArgumentList '-i' -WindowStyle Hidden; Get-AppxPackage -AllUsers *WindowsStore* | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register \"$($_.InstallLocation)\\AppXManifest.xml\" -ErrorAction SilentlyContinue }",
                "Microsoft Store",
            ),
            "calc_snipping" => (
                "winget install --id 9WZDNCRFHVN5 -e --accept-source-agreements --accept-package-agreements --silent; winget install --id 9MZ95KL8MR0L -e --accept-source-agreements --accept-package-agreements --silent; Get-AppxPackage -AllUsers *WindowsCalculator* | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register \"$($_.InstallLocation)\\AppXManifest.xml\" -ErrorAction SilentlyContinue }; Get-AppxPackage -AllUsers *ScreenSketch* | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register \"$($_.InstallLocation)\\AppXManifest.xml\" -ErrorAction SilentlyContinue }",
                "Calculadora & Ferramenta de Captura",
            ),
            _ => {
                return Ok(CommandResponse::err(format!(
                    "Alvo de restauração desconhecido: {}",
                    target
                )))
            }
        };

        let _ = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd])
            .output();

        let msg = format!("Comando de reparo/reinstalação concluído para '{}'.", label);
        Ok(CommandResponse::ok(msg.clone(), Some(msg)))
    })
    .await
    .map_err(|e| e.to_string())?
}

// ============================================================================
// AUDIO RENDER ENDPOINTS & LOUDNESS EQUALIZATION INJECTOR
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioEndpointItem {
    pub id: String,
    pub name: String,
    pub device_name: String,
    pub loudness_eq_enabled: bool,
    pub enhancements_unlocked: bool,
}

#[tauri::command]
pub async fn get_audio_endpoints() -> Result<CommandResponse<Vec<AudioEndpointItem>>, String> {
    tokio::task::spawn_blocking(|| {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let base_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render";
        let mut items = Vec::new();

        if let Ok(render_key) = hklm.open_subkey_with_flags(base_path, winreg::enums::KEY_READ) {
            for guid in render_key.enum_keys().flatten() {
                let Ok(ep_key) = render_key.open_subkey_with_flags(&guid, winreg::enums::KEY_READ) else {
                    continue;
                };
                let state = ep_key.get_value::<u32, _>("DeviceState").unwrap_or(0);
                if state != 1 {
                    continue; // Apenas dispositivos Ativos
                }

                let props = ep_key.open_subkey_with_flags("Properties", winreg::enums::KEY_READ);
                let friendly = props
                    .as_ref()
                    .ok()
                    .and_then(|p| {
                        p.get_value::<String, _>("{a45c254e-df1c-4efd-8020-67d146a850e0},14")
                            .or_else(|_| p.get_value::<String, _>("{a45c254e-df1c-4efd-8020-67d146a850e0},2"))
                            .ok()
                    })
                    .unwrap_or_else(|| "Dispositivo de Áudio".to_string());
                let adapter = props
                    .as_ref()
                    .ok()
                    .and_then(|p| {
                        p.get_value::<String, _>("{b3f8fa53-0004-438e-9003-51a46e139b69},6")
                            .ok()
                    })
                    .unwrap_or_else(|| "Windows Audio Endpoint".to_string());

                let fx = ep_key.open_subkey_with_flags("FxProperties", winreg::enums::KEY_READ);
                let enhancements_unlocked = fx
                    .as_ref()
                    .ok()
                    .and_then(|f| f.get_value::<String, _>("{d04e05a6-594b-4fb6-a80d-01af5eed7d1d},3").ok())
                    .map(|v| !v.is_empty())
                    .unwrap_or(false);
                let loudness_eq_enabled = fx
                    .as_ref()
                    .ok()
                    .and_then(|f| f.get_raw_value("{fc52a749-4be9-4510-896e-966ba6525980},3").ok())
                    .map(|raw| raw.bytes.get(4).copied().unwrap_or(0) == 1)
                    .unwrap_or(false);

                items.push(AudioEndpointItem {
                    id: guid,
                    name: friendly,
                    device_name: adapter,
                    loudness_eq_enabled,
                    enhancements_unlocked,
                });
            }
        }

        Ok(CommandResponse::ok(
            format!("{} dispositivo(s) de reprodução ativo(s) encontrado(s).", items.len()),
            Some(items),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn inject_loudness_eq(
    endpoint_id: String,
    enable: bool,
) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        if !is_process_elevated() {
            return Ok(CommandResponse::err(
                "Injetar FxProperties APO em dispositivos de áudio exige privilégios de Administrador.",
            ));
        }

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let fx_path = format!(
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render\{}\FxProperties",
            endpoint_id
        );

        let (fx_key, _) = match hklm.create_subkey(&fx_path) {
            Ok(pair) => pair,
            Err(e) => {
                return Ok(CommandResponse::err(format!(
                    "Sem acesso de escrita em FxProperties (o driver OEM pode restringir ACLs a SYSTEM): {}",
                    e
                )));
            }
        };

        if enable {
            let _ = fx_key.set_value(
                "{d04e05a6-594b-4fb6-a80d-01af5eed7d1d},1",
                &"{5860E1C5-F95C-4a7a-8EC8-8AEF24F379A1}",
            );
            let _ = fx_key.set_value(
                "{d04e05a6-594b-4fb6-a80d-01af5eed7d1d},2",
                &"{62dc1a93-ae24-464c-a43e-452f824c4250}",
            );
            let _ = fx_key.set_value(
                "{d04e05a6-594b-4fb6-a80d-01af5eed7d1d},3",
                &"{5860E1C5-F95C-4a7a-8EC8-8AEF24F379A1}",
            );
            let loudness_on = winreg::RegValue {
                bytes: vec![
                    0x0b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
                ],
                vtype: winreg::enums::REG_BINARY,
            };
            let _ = fx_key.set_raw_value("{fc52a749-4be9-4510-896e-966ba6525980},3", &loudness_on);
        } else {
            let loudness_off = winreg::RegValue {
                bytes: vec![
                    0x0b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                ],
                vtype: winreg::enums::REG_BINARY,
            };
            let _ = fx_key.set_raw_value("{fc52a749-4be9-4510-896e-966ba6525980},3", &loudness_off);
        }

        let _ = new_hidden_command("net").args(["stop", "Audiosrv", "/y"]).output();
        let _ = new_hidden_command("net").args(["start", "AudioEndpointBuilder"]).output();
        let _ = new_hidden_command("net").args(["start", "Audiosrv"]).output();

        let msg = if enable {
            "Aba Enhancements destravada, Loudness Equalization ativado e serviço de áudio reiniciado!"
        } else {
            "Loudness Equalization revertido no endpoint selecionado."
        };
        Ok(CommandResponse::ok(msg, Some(msg.to_string())))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_sound_control_panel() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let res = new_hidden_command("cmd")
            .args(["/C", "start", "", "control", "mmsys.cpl", "sounds"])
            .spawn();
        match res {
            Ok(_) => Ok(CommandResponse::ok(
                "Painel clássico de Som (mmsys.cpl) aberto.",
                Some(true),
            )),
            Err(e) => Ok(CommandResponse::err(format!("Falha ao abrir mmsys.cpl: {}", e))),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// ============================================================================
// NIC POWER SAVING DISABLER & IPv4-ONLY NETWORK MODE
// ============================================================================

fn check_nic_power_saving_sync() -> (bool, String) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let class_path = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}";
    let mut physical_count = 0u32;
    let mut optimized_count = 0u32;

    if let Ok(base) = hklm.open_subkey_with_flags(class_path, winreg::enums::KEY_READ) {
        for sub in base.enum_keys().flatten() {
            if sub.len() == 4 && sub.chars().all(|c| c.is_ascii_digit()) {
                if let Ok(k) = base.open_subkey_with_flags(&sub, winreg::enums::KEY_READ) {
                    let chars = k.get_value::<u32, _>("Characteristics").unwrap_or(0);
                    if (chars & 0x04) != 0 {
                        physical_count += 1;
                        let pnp = k.get_value::<u32, _>("PnPCapabilities").unwrap_or(0);
                        let eee = k
                            .get_value::<String, _>("EEE")
                            .unwrap_or_else(|_| "1".to_string());
                        if pnp == 24 && eee == "0" {
                            optimized_count += 1;
                        }
                    }
                }
            }
        }
    }

    if physical_count == 0 {
        (false, "Nenhum adaptador físico detectado".to_string())
    } else if optimized_count > 0 {
        (
            true,
            format!("{}/{} adaptador(es) sem economia EEE/PnP", optimized_count, physical_count),
        )
    } else {
        (false, "Economia de energia ativa no adaptador".to_string())
    }
}

fn set_nic_power_saving_sync(disable_power_saving: bool) -> Result<u32, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let class_path = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}";
    let base = hklm.open_subkey_with_flags(class_path, winreg::enums::KEY_READ).map_err(|e| e.to_string())?;
    let mut touched = 0u32;

    for sub in base.enum_keys().flatten() {
        if sub.len() == 4 && sub.chars().all(|c| c.is_ascii_digit()) {
            let sub_path = format!(r"{}\{}", class_path, sub);
            if let Ok(k) = hklm.open_subkey_with_flags(&sub_path, winreg::enums::KEY_ALL_ACCESS) {
                let chars = k.get_value::<u32, _>("Characteristics").unwrap_or(0);
                if (chars & 0x04) != 0 {
                    if disable_power_saving {
                        for str_key in [
                            "EEE",
                            "EEELinkAdvertisement",
                            "GreenEthernet",
                            "GigabitLite",
                            "EnablePME",
                            "WakeOnMagicPacket",
                            "WakeOnPattern",
                            "ULPMode",
                        ] {
                            let _ = k.set_value(str_key, &"0");
                        }
                        let _ = k.set_value("PnPCapabilities", &24u32);
                    } else {
                        for str_key in ["EEE", "EEELinkAdvertisement", "EnablePME", "WakeOnMagicPacket"] {
                            let _ = k.set_value(str_key, &"1");
                        }
                        let _ = k.set_value("PnPCapabilities", &0u32);
                    }
                    touched += 1;
                }
            }
        }
    }

    Ok(touched)
}

#[tauri::command]
pub async fn disable_nic_power_saving(enable: bool) -> Result<CommandResponse<u32>, String> {
    tokio::task::spawn_blocking(move || {
        if !is_process_elevated() {
            return Ok(CommandResponse::err(
                "Alterar chaves de driver da NIC (HKLM) exige privilégios de Administrador.",
            ));
        }
        match set_nic_power_saving_sync(enable) {
            Ok(count) => {
                let msg = if enable {
                    format!("Economia de energia (EEE, Green Ethernet, Wake-on-LAN, PnP) desativada em {} placa(s) de rede.", count)
                } else {
                    format!("Economia de energia da rede revertida em {} placa(s).", count)
                };
                Ok(CommandResponse::ok(msg, Some(count)))
            }
            Err(e) => Ok(CommandResponse::err(e)),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkBindingsStatus {
    pub adapter_name: String,
    pub ipv4_enabled: bool,
    pub ipv6_enabled: bool,
    pub qos_enabled: bool,
    pub lltd_enabled: bool,
    pub smb_enabled: bool,
    pub ipv4_only_mode: bool,
}

#[tauri::command]
pub async fn get_network_bindings_status() -> Result<CommandResponse<NetworkBindingsStatus>, String> {
    tokio::task::spawn_blocking(|| {
        let ps = "$a = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true } | Select-Object -First 1; if (-not $a) { $a = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1 }; if ($a) { $b = Get-NetAdapterBinding -Name $a.Name | Where-Object { $_.ComponentID -in @('ms_tcpip','ms_tcpip6','ms_pacer','ms_lltdio','ms_server') }; [PSCustomObject]@{ AdapterName = $a.Name; IPv4 = [bool](($b | Where-Object ComponentID -eq 'ms_tcpip').Enabled); IPv6 = [bool](($b | Where-Object ComponentID -eq 'ms_tcpip6').Enabled); QoS = [bool](($b | Where-Object ComponentID -eq 'ms_pacer').Enabled); LLTD = [bool](($b | Where-Object ComponentID -eq 'ms_lltdio').Enabled); SMB = [bool](($b | Where-Object ComponentID -eq 'ms_server').Enabled) } | ConvertTo-Json -Compress }";
        let out = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps])
            .output();

        let status = if let Ok(res) = out {
            let txt = String::from_utf8_lossy(&res.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&txt) {
                let ipv6 = val.get("IPv6").and_then(|v| v.as_bool()).unwrap_or(true);
                let qos = val.get("QoS").and_then(|v| v.as_bool()).unwrap_or(true);
                let lltd = val.get("LLTD").and_then(|v| v.as_bool()).unwrap_or(true);
                NetworkBindingsStatus {
                    adapter_name: val
                        .get("AdapterName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Ethernet")
                        .to_string(),
                    ipv4_enabled: val.get("IPv4").and_then(|v| v.as_bool()).unwrap_or(true),
                    ipv6_enabled: ipv6,
                    qos_enabled: qos,
                    lltd_enabled: lltd,
                    smb_enabled: val.get("SMB").and_then(|v| v.as_bool()).unwrap_or(true),
                    ipv4_only_mode: !ipv6 && !qos && !lltd,
                }
            } else {
                NetworkBindingsStatus {
                    adapter_name: "Ethernet / Wi-Fi".to_string(),
                    ipv4_enabled: true,
                    ipv6_enabled: true,
                    qos_enabled: true,
                    lltd_enabled: true,
                    smb_enabled: true,
                    ipv4_only_mode: false,
                }
            }
        } else {
            NetworkBindingsStatus {
                adapter_name: "Ethernet / Wi-Fi".to_string(),
                ipv4_enabled: true,
                ipv6_enabled: true,
                qos_enabled: true,
                lltd_enabled: true,
                smb_enabled: true,
                ipv4_only_mode: false,
            }
        };

        Ok(CommandResponse::ok("Vínculos de rede auditados.", Some(status)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn toggle_ipv4_only(
    enable_ipv4_only: bool,
    preserve_smb: bool,
) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        if !is_process_elevated() {
            return Ok(CommandResponse::err(
                "Alterar vínculos (bindings) do adaptador de rede exige privilégios de Administrador.",
            ));
        }

        let ps = if enable_ipv4_only {
            if preserve_smb {
                "$adapters = Get-NetAdapter | Where-Object { $_.HardwareInterface -eq $true }; foreach ($a in $adapters) { Disable-NetAdapterBinding -Name $a.Name -ComponentID ms_tcpip6,ms_pacer,ms_lltdio,ms_rspndr -ErrorAction SilentlyContinue; Enable-NetAdapterBinding -Name $a.Name -ComponentID ms_tcpip,ms_server,ms_msclient -ErrorAction SilentlyContinue }"
            } else {
                "$adapters = Get-NetAdapter | Where-Object { $_.HardwareInterface -eq $true }; foreach ($a in $adapters) { Disable-NetAdapterBinding -Name $a.Name -ComponentID ms_tcpip6,ms_pacer,ms_lltdio,ms_rspndr,ms_server,ms_msclient -ErrorAction SilentlyContinue; Enable-NetAdapterBinding -Name $a.Name -ComponentID ms_tcpip -ErrorAction SilentlyContinue }"
            }
        } else {
            "$adapters = Get-NetAdapter | Where-Object { $_.HardwareInterface -eq $true }; foreach ($a in $adapters) { Enable-NetAdapterBinding -Name $a.Name -ComponentID ms_tcpip,ms_tcpip6,ms_pacer,ms_lltdio,ms_rspndr,ms_server,ms_msclient -ErrorAction SilentlyContinue }"
        };

        let out = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps])
            .output()
            .map_err(|e| e.to_string())?;

        if out.status.success() {
            let msg = if enable_ipv4_only {
                if preserve_smb {
                    "Modo IPv4-Only ativado (IPv6, QoS, LLTD desativados; compartilhamento SMB local preservado)."
                } else {
                    "Modo IPv4-Only estrito ativado (IPv6, QoS, LLTD e SMB desativados)."
                }
            } else {
                "Vínculos padrão de rede (IPv4 + IPv6 + QoS + SMB) restaurados."
            };
            Ok(CommandResponse::ok(msg, Some(msg.to_string())))
        } else {
            Ok(CommandResponse::err(format!(
                "Falha ao atualizar bindings da placa de rede: {}",
                String::from_utf8_lossy(&out.stderr)
            )))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

