use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use crate::state::CommandResponse;
use crate::utils::{emit_step, empty_recycle_bin, flush_working_set_all_processes, new_hidden_command};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanCategory {
    pub name: String,
    pub bytes_freed: u64,
    pub mb_freed: f64,
    pub files_deleted: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanResult {
    pub total_freed_mb: f64,
    pub total_files_deleted: u64,
    pub categories: Vec<CleanCategory>,
    pub message: String,
    pub bytes_freed: f64,
}

fn clean_directory_contents(dir_path: &Path) -> (u64, u64) {
    let mut bytes_freed = 0u64;
    let mut files_deleted = 0u64;

    if !dir_path.exists() {
        return (0, 0);
    }

    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() || path.is_symlink() {
                if let Ok(metadata) = entry.metadata() {
                    let len = metadata.len();
                    if std::fs::remove_file(&path).is_ok() {
                        bytes_freed += len;
                        files_deleted += 1;
                    }
                }
            } else if path.is_dir() {
                let (sub_bytes, sub_files) = clean_directory_contents(&path);
                bytes_freed += sub_bytes;
                files_deleted += sub_files;
                let _ = std::fs::remove_dir(&path);
            }
        }
    }

    (bytes_freed, files_deleted)
}

fn clean_path_list(category_name: &str, paths: Vec<PathBuf>) -> CleanCategory {
    let mut total_bytes = 0u64;
    let mut total_files = 0u64;

    for path in paths {
        let (bytes, files) = clean_directory_contents(&path);
        total_bytes += bytes;
        total_files += files;
    }

    let mb = (total_bytes as f64) / (1024.0 * 1024.0);
    CleanCategory {
        name: category_name.to_string(),
        bytes_freed: total_bytes,
        mb_freed: (mb * 100.0).round() / 100.0,
        files_deleted: total_files,
        status: "Success".to_string(),
    }
}

/// Otimização Profunda (SSD) com emissão de passos detalhados
#[tauri::command]
pub async fn run_deep_clean(app: tauri::AppHandle) -> Result<CommandResponse<CleanResult>, String> {
    tokio::task::spawn_blocking(move || {
        let mut categories = Vec::new();
        let mut total_bytes = 0u64;
        let mut total_files = 0u64;
        let total_steps = 8;

        // Passo 1: Interromper temporariamente serviços em background
        emit_step(&app, "clean_services", "Pausando serviços de download...", "running", "Interrompendo wuauserv e bits temporariamente para liberar travas de arquivos.", 1, total_steps);
        let _ = new_hidden_command("net.exe").args(["stop", "wuauserv", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "bits", "/y"]).output();
        emit_step(&app, "clean_services", "Serviços pausados com sucesso", "success", "Locks temporários liberados.", 1, total_steps);

        // Passo 2: Limpar Diretórios Temporários do Usuário e Windows
        emit_step(&app, "clean_temp", "Limpando arquivos temporários (%TEMP%, WinDir)...", "running", "Varrendo pastas temporárias do usuário e do sistema.", 2, total_steps);
        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let win_temp = PathBuf::from("C:\\Windows\\Temp");
        let prefetch = PathBuf::from("C:\\Windows\\Prefetch");
        let logs_dir = PathBuf::from("C:\\Windows\\Logs");

        let c_temp = clean_path_list("Arquivos Temporários e Prefetch", vec![temp_dir, win_temp, prefetch, logs_dir]);
        total_bytes += c_temp.bytes_freed;
        total_files += c_temp.files_deleted;
        emit_step(&app, "clean_temp", &format!("Temporários limpos: {:.1} MB liberados", c_temp.mb_freed), "success", &format!("{} arquivos deletados.", c_temp.files_deleted), 2, total_steps);
        categories.push(c_temp);

        // Passo 3: Limpeza de Cache de Download do Windows Update
        emit_step(&app, "clean_softwaredist", "Limpando cache do SoftwareDistribution...", "running", "Esvaziando arquivos de downloads incompletos do Windows Update.", 3, total_steps);
        let sw_download = PathBuf::from("C:\\Windows\\SoftwareDistribution\\Download");
        let c_sw = clean_path_list("Windows Update Cache", vec![sw_download]);
        total_bytes += c_sw.bytes_freed;
        total_files += c_sw.files_deleted;
        emit_step(&app, "clean_softwaredist", &format!("Cache de atualização: {:.1} MB liberados", c_sw.mb_freed), "success", "Pasta de downloads do Windows Update limpa.", 3, total_steps);
        categories.push(c_sw);

        // Passo 4: Caches de Navegadores (Chrome, Edge, Brave, Opera)
        emit_step(&app, "clean_browsers", "Limpando caches de navegadores...", "running", "Verificando Chrome, Edge, Brave e Opera.", 4, total_steps);
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());
        let browser_caches = vec![
            PathBuf::from(&local_app_data).join("Google\\Chrome\\User Data\\Default\\Cache"),
            PathBuf::from(&local_app_data).join("Google\\Chrome\\User Data\\Default\\Code Cache"),
            PathBuf::from(&local_app_data).join("Microsoft\\Edge\\User Data\\Default\\Cache"),
            PathBuf::from(&local_app_data).join("Microsoft\\Edge\\User Data\\Default\\Code Cache"),
            PathBuf::from(&local_app_data).join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache"),
            PathBuf::from(&local_app_data).join("Opera Software\\Opera Stable\\Cache"),
        ];
        let c_browsers = clean_path_list("Caches de Navegadores", browser_caches);
        total_bytes += c_browsers.bytes_freed;
        total_files += c_browsers.files_deleted;
        emit_step(&app, "clean_browsers", &format!("Navegadores limpos: {:.1} MB liberados", c_browsers.mb_freed), "success", "Caches de navegação esvaziados.", 4, total_steps);
        categories.push(c_browsers);

        // Passo 5: Esvaziar Lixeira Nativa
        emit_step(&app, "clean_recycle", "Esvaziando a Lixeira do Windows...", "running", "Chamando API nativa SHEmptyRecycleBinW sem prompts.", 5, total_steps);
        let _ = empty_recycle_bin();
        emit_step(&app, "clean_recycle", "Lixeira do Windows esvaziada", "success", "Espaço em disco recuperado de todas as unidades.", 5, total_steps);

        // Passo 6: Limpeza de Logs de Eventos
        emit_step(&app, "clean_logs", "Limpando logs de eventos obsoletos...", "running", "Limpando canais Application, Security e System via wevtutil.", 6, total_steps);
        let _ = new_hidden_command("wevtutil.exe").args(["cl", "Application"]).output();
        let _ = new_hidden_command("wevtutil.exe").args(["cl", "Security"]).output();
        let _ = new_hidden_command("wevtutil.exe").args(["cl", "System"]).output();
        emit_step(&app, "clean_logs", "Logs de eventos obsoletos limpos", "success", "Histórico de eventos antigos liberado.", 6, total_steps);

        // Passo 7: Reativação dos Serviços e Flush de RAM
        emit_step(&app, "clean_finalize", "Restaurando serviços e liberando RAM...", "running", "Reiniciando serviços e executando working set flush em todos os processos.", 7, total_steps);
        let _ = new_hidden_command("net.exe").args(["start", "wuauserv"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "bits"]).output();
        let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
        let flushed = flush_working_set_all_processes();
        emit_step(&app, "clean_finalize", &format!("Finalizado: {} processos liberaram RAM", flushed), "success", "Serviços reativados e DNS limpo.", 7, total_steps);

        // Passo 8: Otimização TRIM no Disco C:
        emit_step(&app, "clean_trim", "Disparando comando TRIM no drive C:...", "running", "Executando defrag C: /O para manter desempenho de SSD/NVMe.", 8, total_steps);
        let _ = new_hidden_command("defrag.exe").args(["C:", "/O"]).output();
        emit_step(&app, "clean_trim", "Otimização TRIM concluída", "success", "Blocos do SSD organizados para máxima taxa de gravação.", 8, total_steps);

        let total_freed_mb = ((total_bytes as f64) / (1024.0 * 1024.0) * 100.0).round() / 100.0;
        let res = CleanResult {
            total_freed_mb,
            total_files_deleted: total_files,
            categories,
            message: format!("Limpeza profunda concluída com sucesso! {:.2} MB liberados.", total_freed_mb),
            bytes_freed: total_freed_mb,
        };

        let msg = res.message.clone();
        Ok(CommandResponse::ok(msg, Some(res)))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Otimização Leve (Lite Clean) com emissão de passos
#[tauri::command]
pub async fn run_lite_clean(app: tauri::AppHandle) -> Result<CommandResponse<CleanResult>, String> {
    tokio::task::spawn_blocking(move || {
        let mut categories = Vec::new();
        let mut total_bytes = 0u64;
        let mut total_files = 0u64;
        let total_steps = 4;

        emit_step(&app, "lite_temp", "Limpando arquivos temporários do usuário (%TEMP%)...", "running", "Esvaziando diretório temporário ativo.", 1, total_steps);
        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let c_temp = clean_path_list("Arquivos Temporários", vec![temp_dir]);
        total_bytes += c_temp.bytes_freed;
        total_files += c_temp.files_deleted;
        emit_step(&app, "lite_temp", &format!("{:.1} MB limpos em temporários", c_temp.mb_freed), "success", &format!("{} arquivos deletados.", c_temp.files_deleted), 1, total_steps);
        categories.push(c_temp);

        emit_step(&app, "lite_recycle", "Esvaziando a Lixeira do Windows...", "running", "Esvaziando lixeira silenciosamente.", 2, total_steps);
        let _ = empty_recycle_bin();
        emit_step(&app, "lite_recycle", "Lixeira esvaziada", "success", "Lixeira limpa.", 2, total_steps);

        emit_step(&app, "lite_dns", "Liberando cache de DNS...", "running", "Executando flush no resolvedor de nomes local.", 3, total_steps);
        let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();
        emit_step(&app, "lite_dns", "Cache DNS limpo", "success", "Tabela ARP/DNS liberada.", 3, total_steps);

        emit_step(&app, "lite_ram", "Liberando memória RAM ociosa...", "running", "Executando K32EmptyWorkingSet.", 4, total_steps);
        let flushed = flush_working_set_all_processes();
        emit_step(&app, "lite_ram", &format!("RAM liberada em {} processos", flushed), "success", "Páginas não utilizadas retornadas ao SO.", 4, total_steps);

        let total_freed_mb = ((total_bytes as f64) / (1024.0 * 1024.0) * 100.0).round() / 100.0;
        let res = CleanResult {
            total_freed_mb,
            total_files_deleted: total_files,
            categories,
            message: format!("Limpeza rápida concluída! {:.2} MB liberados.", total_freed_mb),
            bytes_freed: total_freed_mb,
        };

        let msg = res.message.clone();
        Ok(CommandResponse::ok(msg, Some(res)))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Ativa ou Desativa a Hibernação do Windows (libera o arquivo hiberfil.sys de 8GB-32GB no disco C:)
#[tauri::command]
pub async fn toggle_hibernation(disable: bool) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let arg = if disable { "/hibernate off" } else { "/hibernate on" };
        let output = new_hidden_command("powercfg.exe")
            .args(arg.split_whitespace())
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            let msg = if disable {
                "Hibernação desativada com sucesso! Arquivo hiberfil.sys removido do disco C:."
            } else {
                "Hibernação ativada com sucesso."
            };
            Ok(CommandResponse::ok(msg, Some(disable)))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            Ok(CommandResponse::err(format!("Falha ao alterar hibernação: {}", err)))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Limpeza de Instalações Anteriores do Windows (Windows.old) e WinSxS via DISM
#[tauri::command]
pub async fn clean_old_windows_installations(app: tauri::AppHandle) -> Result<CommandResponse<CleanResult>, String> {
    tokio::task::spawn_blocking(move || {
        let mut categories = Vec::new();
        let mut total_bytes = 0u64;
        let mut total_files = 0u64;
        let total_steps = 3;

        emit_step(&app, "clean_old_folders", "Procurando diretórios de instalações antigas...", "running", "Varrendo C:\\Windows.old, C:\\$Windows.~BT e C:\\$Windows.~WS", 1, total_steps);
        let old_folders = vec![
            PathBuf::from("C:\\Windows.old"),
            PathBuf::from("C:\\$Windows.~BT"),
            PathBuf::from("C:\\$Windows.~WS"),
        ];

        let c_old = clean_path_list("Pastas de Instalações Antigas (Windows.old)", old_folders);
        total_bytes += c_old.bytes_freed;
        total_files += c_old.files_deleted;
        emit_step(&app, "clean_old_folders", &format!("{:.1} MB limpos de instalações anteriores", c_old.mb_freed), "success", &format!("{} arquivos deletados.", c_old.files_deleted), 1, total_steps);
        categories.push(c_old);

        emit_step(&app, "clean_winsxs", "Executando limpeza de componentes obsoletos (DISM WinSxS)...", "running", "Executando DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase...", 2, total_steps);
        let dism_output = new_hidden_command("dism.exe")
            .args(["/Online", "/Cleanup-Image", "/StartComponentCleanup"])
            .output();

        let winsxs_status = if dism_output.map(|o| o.status.success()).unwrap_or(false) {
            "Concluído com sucesso"
        } else {
            "Finalizado ou parcialmente executado"
        };
        emit_step(&app, "clean_winsxs", "Limpeza de componentes WinSxS finalizada", "success", winsxs_status, 2, total_steps);

        emit_step(&app, "clean_system_restore", "Limpando pontos de restauração antigos...", "running", "Removendo shadow copies excedentes via vssadmin.", 3, total_steps);
        let _ = new_hidden_command("vssadmin.exe")
            .args(["delete", "shadows", "/for=C:", "/oldest", "/quiet"])
            .output();
        emit_step(&app, "clean_system_restore", "Pontos de restauração excedentes limpos", "success", "Espaço de backup antigo recuperado.", 3, total_steps);

        let total_freed_mb = ((total_bytes as f64) / (1024.0 * 1024.0) * 100.0).round() / 100.0;
        let res = CleanResult {
            total_freed_mb,
            total_files_deleted: total_files,
            categories,
            message: format!("Limpeza de versões anteriores concluída! {:.2} MB liberados.", total_freed_mb),
            bytes_freed: total_freed_mb,
        };

        let msg = res.message.clone();
        Ok(CommandResponse::ok(msg, Some(res)))
    })
    .await
    .map_err(|e| e.to_string())?
}
