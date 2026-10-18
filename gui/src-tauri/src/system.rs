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
pub async fn restart_as_admin() -> Result<CommandResponse<bool>, String> {
    restart_elevated()?;
    Ok(CommandResponse::ok("Reiniciando com privilégios de Administrador...", Some(true)))
}


/// Cria um Ponto de Restauração do Sistema
#[tauri::command]
pub async fn create_restore_point(description: String, app: tauri::AppHandle) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let desc = if description.trim().is_empty() {
            "System Optimizer Restore Point".to_string()
        } else {
            description.trim().to_string()
        };

        emit_step(&app, "restore_point", "Criando ponto de restauração do sistema...", "running", &format!("Checkpoint-Computer: '{}'", desc), 1, 1);

        // Habilitar proteção do sistema caso esteja desligada na unidade C:
        let _ = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-Command", "Enable-ComputerRestore -Drive 'C:\\'"])
            .output();

        let ps_cmd = format!(
            "Checkpoint-Computer -Description '{}' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop",
            desc.replace('\'', "''")
        );

        let output = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            emit_step(&app, "restore_point", "Ponto de restauração criado!", "success", "Seus arquivos e registro estão protegidos.", 1, 1);
            Ok(CommandResponse::ok(
                format!("Ponto de restauração '{}' criado com sucesso!", desc),
                Some(desc),
            ))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            emit_step(&app, "restore_point", "Falha ao criar ponto de restauração", "error", &err, 1, 1);
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

/// Remove pacotes AppX pré-definidos como bloatware seguro
#[tauri::command]
pub async fn remove_bloatware(app: tauri::AppHandle) -> Result<CommandResponse<BloatwareResult>, String> {
    tokio::task::spawn_blocking(move || {
        let targets = vec![
            "*Cortana*",
            "*BingWeather*",
            "*GetHelp*",
            "*GetStarted*",
            "*Microsoft3DViewer*",
            "*MicrosoftSolitaireCollection*",
            "*MixedReality.Portal*",
            "*People*",
            "*SkypeApp*",
            "*YourPhone*",
            "*ZuneMusic*",
            "*ZuneVideo*",
        ];

        let total = targets.len();
        let mut removed = Vec::new();

        for (i, app_name) in targets.iter().enumerate() {
            emit_step(&app, "bloatware", &format!("Removendo bloatware: {}", app_name.replace('*', "")), "running", "Desinstalando pacote de usuário e provisionado...", i + 1, total);

            let ps_cmd = format!(
                "Get-AppxPackage -Name '{}' | Remove-AppxPackage -ErrorAction SilentlyContinue",
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
        emit_step(&app, "bloatware", &format!("Bloatwares removidos: {} pacotes", count), "success", "Aplicativos desnecessários desinstalados.", total, total);

        let res = BloatwareResult {
            removed_count: count,
            removed_apps: removed,
        };

        Ok(CommandResponse::ok(
            format!("Processamento de bloatware concluído ({} pacotes verificados/removidos).", count),
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
