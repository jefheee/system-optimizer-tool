use std::path::PathBuf;
use crate::state::CommandResponse;
use crate::utils::new_hidden_command;

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

        std::process::Command::new(&target_exe)
            .spawn()
            .map_err(|e| format!("Falha ao iniciar O&O ShutUp10++: {}", e))?;

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

        std::process::Command::new(&target_exe)
            .spawn()
            .map_err(|e| format!("Falha ao iniciar AdwCleaner: {}", e))?;

        Ok(CommandResponse::ok(
            "Malwarebytes AdwCleaner iniciado com sucesso.",
            Some(target_exe.to_string_lossy().to_string()),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Instalação e inicialização rápida de ferramentas populares de hardware (CPU-Z, HWMonitor, GPU-Z)
#[tauri::command]
pub async fn install_quick_tool(tool_id: String) -> Result<CommandResponse<String>, String> {
    tokio::task::spawn_blocking(move || {
        let package_id = match tool_id.to_lowercase().as_str() {
            "cpuz" | "cpu-z" => "CPUID.CPU-Z",
            "hwmonitor" => "CPUID.HWMonitor",
            "gpuz" | "gpu-z" => "TechPowerUp.GPU-Z",
            _ => return Err(format!("Ferramenta desconhecida: {}", tool_id)),
        };

        let output = new_hidden_command("winget.exe")
            .args([
                "install",
                package_id,
                "-e",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ])
            .output()
            .map_err(|e| format!("Erro ao executar winget: {}", e))?;

        if output.status.success() {
            Ok(CommandResponse::ok(
                format!("{} instalado/atualizado com sucesso via Winget!", package_id),
                Some(package_id.to_string()),
            ))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            Err(format!("Falha ao instalar {}: {}", package_id, err))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
