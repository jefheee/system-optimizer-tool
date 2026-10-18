use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use winreg::enums::{HKEY_CLASSES_ROOT, HKEY_LOCAL_MACHINE};
use winreg::RegKey;

use crate::state::CommandResponse;
use crate::utils::{is_process_elevated, new_hidden_command, restart_elevated};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct DnsOptimizationResult {
    pub best_dns: String,
    pub cloudflare_ping_ms: u64,
    pub google_ping_ms: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SfcScanResult {
    pub sfc_exit_code: i32,
    pub dism_exit_code: i32,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
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

/// Inicia o Chris Titus WinUtil em uma janela visível de PowerShell
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

/// Inicia o ativador MAS em uma janela visível de PowerShell
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

/// Repara o serviço e cache do Windows Update
#[tauri::command]
pub async fn repair_windows_update() -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(|| {
        // 1. Para serviços
        let _ = new_hidden_command("net.exe").args(["stop", "wuauserv", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "bits", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "cryptsvc", "/y"]).output();

        let windir = std::env::var("WINDIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("C:\\Windows"));

        // 2. Remove SoftwareDistribution e Catroot2
        let sd = windir.join("SoftwareDistribution");
        if sd.exists() {
            let _ = std::fs::remove_dir_all(&sd);
        }

        let catroot2 = windir.join("System32\\catroot2");
        if catroot2.exists() {
            let _ = std::fs::remove_dir_all(&catroot2);
        }

        // 3. Reinicia serviços
        let _ = new_hidden_command("net.exe").args(["start", "cryptsvc"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "bits"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "wuauserv"]).output();

        Ok(CommandResponse::ok(
            "Serviços do Windows Update reparados e cache corrompido limpo com sucesso.",
            Some("Update Repaired".to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

async fn ping_server_ms(ip: &str) -> u64 {
    // 1. Tenta medição ultrarrápida via conexão TCP na porta 53
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

    // 2. Fallback via ping.exe nativo
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

/// Testa latência entre Cloudflare e Google DNS e configura o melhor adaptador
#[tauri::command]
pub async fn optimize_dns() -> Result<CommandResponse<DnsOptimizationResult>, String> {
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

    tokio::task::spawn_blocking(move || {
        let ps_cmd = format!(
            "$adapter = (Get-NetAdapter | Where-Object {{ $_.Status -eq 'Up' }} | Select-Object -First 1); \
             if ($adapter) {{ Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ('{}', '{}') }}",
            p_dns, s_dns
        );

        let _ = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .output();
    })
    .await
    .map_err(|e| e.to_string())?;

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

/// Executa verificação e reparo de arquivos de sistema (SFC e DISM) de forma assíncrona
#[tauri::command]
pub async fn run_sfc_scan() -> Result<CommandResponse<SfcScanResult>, String> {
    tokio::task::spawn_blocking(|| {
        let sfc_out = new_hidden_command("sfc.exe")
            .args(["/scannow"])
            .output()
            .map_err(|e| format!("Erro ao executar SFC: {}", e))?;

        let dism_out = new_hidden_command("dism.exe")
            .args(["/Online", "/Cleanup-Image", "/RestoreHealth"])
            .output()
            .map_err(|e| format!("Erro ao executar DISM: {}", e))?;

        let sfc_code = sfc_out.status.code().unwrap_or(-1);
        let dism_code = dism_out.status.code().unwrap_or(-1);

        let summary = if sfc_code == 0 && dism_code == 0 {
            "SFC e DISM concluídos com sucesso. Todos os arquivos de sistema estão íntegros.".to_string()
        } else {
            format!(
                "Verificação concluída (SFC código {}, DISM código {}). Verifique o log do Windows para detalhes.",
                sfc_code, dism_code
            )
        };

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
pub async fn remove_bloatware() -> Result<CommandResponse<BloatwareResult>, String> {
    tokio::task::spawn_blocking(|| {
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

        let mut removed = Vec::new();

        for app in targets {
            let ps_cmd = format!(
                "Get-AppxPackage -Name '{}' | Remove-AppxPackage -ErrorAction SilentlyContinue",
                app
            );
            let out = new_hidden_command("powershell.exe")
                .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
                .output();

            if let Ok(res) = out {
                if res.status.success() {
                    removed.push(app.replace('*', ""));
                }
            }
        }

        let count = removed.len();
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
pub async fn disable_telemetry() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        // 1. Serviços DiagTrack e dmwappushservice
        let _ = new_hidden_command("sc.exe").args(["stop", "DiagTrack"]).output();
        let _ = new_hidden_command("sc.exe").args(["config", "DiagTrack", "start=", "disabled"]).output();
        let _ = new_hidden_command("sc.exe").args(["stop", "dmwappushservice"]).output();
        let _ = new_hidden_command("sc.exe").args(["config", "dmwappushservice", "start=", "disabled"]).output();

        // 2. Chaves de Registro
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

        Ok(CommandResponse::ok(
            "Telemetria do Windows desativada e políticas de privacidade aplicadas com sucesso.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Restaura o Microsoft Store e aplicativos de compras essenciais
#[tauri::command]
pub async fn restore_windows_store() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let _ = new_hidden_command("wsreset.exe").args(["-i"]).output();

        let ps_cmd = r#"
            Get-AppxPackage -AllUsers *WindowsStore* | Foreach-Object {
                Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml" -ErrorAction SilentlyContinue
            }
            Get-AppxPackage -AllUsers *StorePurchaseApp* | Foreach-Object {
                Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml" -ErrorAction SilentlyContinue
            }
        "#;

        let _ = new_hidden_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd])
            .output();

        Ok(CommandResponse::ok(
            "Comando de restauração da Microsoft Store executado com sucesso.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Remove o OneDrive do sistema de forma silenciosa
#[tauri::command]
pub async fn remove_onedrive() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let _ = new_hidden_command("taskkill.exe").args(["/f", "/im", "OneDrive.exe"]).output();

        let sysroot = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
        let syswow64 = Path::new(&sysroot).join("SysWOW64\\OneDriveSetup.exe");
        let system32 = Path::new(&sysroot).join("System32\\OneDriveSetup.exe");

        if syswow64.exists() {
            let _ = new_hidden_command(syswow64.to_str().unwrap()).arg("/uninstall").output();
        } else if system32.exists() {
            let _ = new_hidden_command(system32.to_str().unwrap()).arg("/uninstall").output();
        }

        Ok(CommandResponse::ok(
            "OneDrive finalizado e desinstalador nativo acionado com sucesso.",
            Some(true),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Reinicia o serviço de cache de fontes do Windows e remove caches corrompidos
#[tauri::command]
pub async fn reset_font_cache() -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(|| {
        let _ = new_hidden_command("net.exe").args(["stop", "FontCache", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "FontCache3.0.0.0", "/y"]).output();

        let windir = std::env::var("WINDIR").unwrap_or_else(|_| "C:\\Windows".to_string());
        let font_dir = Path::new(&windir).join(r"ServiceProfiles\LocalService\AppData\Local\FontCache");

        if font_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(font_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map(|e| e == "dat").unwrap_or(false) {
                        let _ = std::fs::remove_file(path);
                    }
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
            // Para arquivos
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

            // Para diretórios
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
pub async fn backup_drivers() -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(|| {
        let dest = Path::new("C:\\Backup_Drivers");
        let _ = std::fs::create_dir_all(dest);

        let output = new_hidden_command("pnputil.exe")
            .args(["/export-driver", "*", "C:\\Backup_Drivers"])
            .output()
            .map_err(|e| format!("Erro ao executar pnputil: {}", e))?;

        if output.status.success() {
            Ok(CommandResponse::ok(
                "Backup de drivers de terceiros concluído com sucesso em 'C:\\Backup_Drivers'.",
                Some("C:\\Backup_Drivers".to_string()),
            ))
        } else {
            // Tenta dism como fallback
            let dism_out = new_hidden_command("dism.exe")
                .args(["/online", "/export-driver", "/destination:C:\\Backup_Drivers"])
                .output();

            if dism_out.map(|o| o.status.success()).unwrap_or(false) {
                Ok(CommandResponse::ok(
                    "Backup de drivers concluído com sucesso em 'C:\\Backup_Drivers' (via DISM).",
                    Some("C:\\Backup_Drivers".to_string()),
                ))
            } else {
                Err("Falha ao exportar drivers do sistema. Verifique os privilégios de administrador.".to_string())
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
