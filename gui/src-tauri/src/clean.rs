use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use crate::state::CommandResponse;
use crate::utils::{empty_recycle_bin, flush_working_set_all_processes, new_hidden_command};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CleanCategory {
    pub name: String,
    pub bytes_freed: u64,
    pub mb_freed: f64,
    pub files_deleted: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CleanResult {
    pub total_freed_mb: f64,
    pub total_files_deleted: u64,
    pub categories: Vec<CleanCategory>,
    pub message: String,
    // Compatibilidade com a interface antiga
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

/// Otimização Profunda (SSD):
/// - Para temporariamente wuauserv e bits
/// - Limpa %TEMP%, %WINDIR%\Temp, %WINDIR%\Prefetch, %WINDIR%\SoftwareDistribution\Download, %WINDIR%\Logs
/// - Limpa caches de navegadores (Chrome, Edge, Brave, Opera)
/// - Esvazia Lixeira nativamente via SHEmptyRecycleBinW
/// - Limpa logs principais do Windows via wevtutil
/// - Otimiza TCP (RSS) e Flush DNS
/// - Flush de memória RAM (K32EmptyWorkingSet)
/// - Reinicia wuauserv e bits
/// - Executa TRIM no drive C: (defrag C: /O)
#[tauri::command]
pub async fn run_deep_clean() -> Result<CommandResponse<CleanResult>, String> {
    tokio::task::spawn_blocking(|| {
        let mut categories = Vec::new();
        let mut total_bytes = 0u64;
        let mut total_files = 0u64;

        // 1. Parar serviços de atualização para liberar locks em arquivos temporários
        let _ = new_hidden_command("net.exe").args(["stop", "wuauserv", "/y"]).output();
        let _ = new_hidden_command("net.exe").args(["stop", "bits", "/y"]).output();

        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let windir = std::env::var("WINDIR").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows"));
        let local_appdata = std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Users\\Default\\AppData\\Local"));

        // 2. Limpar Diretórios do Sistema e Usuário
        let c_temp_user = clean_path_list("Temp Usuário", vec![temp_dir]);
        total_bytes += c_temp_user.bytes_freed;
        total_files += c_temp_user.files_deleted;
        categories.push(c_temp_user);

        let c_temp_win = clean_path_list("Temp Windows", vec![windir.join("Temp")]);
        total_bytes += c_temp_win.bytes_freed;
        total_files += c_temp_win.files_deleted;
        categories.push(c_temp_win);

        let c_prefetch = clean_path_list("Prefetch", vec![windir.join("Prefetch")]);
        total_bytes += c_prefetch.bytes_freed;
        total_files += c_prefetch.files_deleted;
        categories.push(c_prefetch);

        let c_update_cache = clean_path_list(
            "Cache Windows Update",
            vec![windir.join("SoftwareDistribution").join("Download")],
        );
        total_bytes += c_update_cache.bytes_freed;
        total_files += c_update_cache.files_deleted;
        categories.push(c_update_cache);

        let c_logs = clean_path_list("Logs do Sistema", vec![windir.join("Logs")]);
        total_bytes += c_logs.bytes_freed;
        total_files += c_logs.files_deleted;
        categories.push(c_logs);

        // 3. Caches de Navegadores
        let browser_paths = vec![
            local_appdata.join("Google\\Chrome\\User Data\\Default\\Cache"),
            local_appdata.join("Microsoft\\Edge\\User Data\\Default\\Cache"),
            local_appdata.join("BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache"),
            local_appdata.join("Opera Software\\Opera Stable\\Cache"),
        ];
        let c_browsers = clean_path_list("Caches de Navegadores", browser_paths);
        total_bytes += c_browsers.bytes_freed;
        total_files += c_browsers.files_deleted;
        categories.push(c_browsers);

        // 4. Lixeira do Windows
        let _ = empty_recycle_bin();
        categories.push(CleanCategory {
            name: "Lixeira do Windows".to_string(),
            bytes_freed: 0,
            mb_freed: 0.0,
            files_deleted: 0,
            status: "Esvaziada".to_string(),
        });

        // 5. Event Logs críticos (Application, System, Security, Setup)
        for log_name in &["Application", "System", "Security", "Setup"] {
            let _ = new_hidden_command("wevtutil.exe").args(["cl", log_name]).output();
        }
        categories.push(CleanCategory {
            name: "Logs de Eventos (wevtutil)".to_string(),
            bytes_freed: 0,
            mb_freed: 0.0,
            files_deleted: 0,
            status: "Limpos".to_string(),
        });

        // 6. Otimizações de Rede & Flush DNS
        let _ = new_hidden_command("netsh.exe")
            .args(["int", "tcp", "set", "global", "rss=enabled"])
            .output();
        let _ = new_hidden_command("ipconfig.exe").args(["/flushdns"]).output();

        // 7. Flush de RAM Working Set
        let procs_flushed = flush_working_set_all_processes();
        categories.push(CleanCategory {
            name: "Otimização de RAM (EmptyWorkingSet)".to_string(),
            bytes_freed: 0,
            mb_freed: 0.0,
            files_deleted: procs_flushed as u64,
            status: format!("{} processos otimizados", procs_flushed),
        });

        // 8. Restaurar Serviços
        let _ = new_hidden_command("net.exe").args(["start", "wuauserv"]).output();
        let _ = new_hidden_command("net.exe").args(["start", "bits"]).output();

        // 9. TRIM no Drive C:
        let _ = new_hidden_command("defrag.exe").args(["C:", "/O"]).output();
        categories.push(CleanCategory {
            name: "Otimização SSD (TRIM C:)".to_string(),
            bytes_freed: 0,
            mb_freed: 0.0,
            files_deleted: 0,
            status: "Concluído".to_string(),
        });

        let total_mb = ((total_bytes as f64) / (1024.0 * 1024.0) * 100.0).round() / 100.0;

        let result = CleanResult {
            total_freed_mb: total_mb,
            total_files_deleted: total_files,
            categories,
            message: format!("Limpeza profunda concluída. Foram liberados {} MB de espaço.", total_mb),
            bytes_freed: total_mb,
        };

        Ok(CommandResponse::ok("Limpeza profunda concluída com sucesso.", Some(result)))
    })
    .await
    .map_err(|e| format!("Falha ao executar limpeza profunda: {}", e))?
}

/// Otimização Lite (HDD):
/// - Limpeza segura focada apenas em %TEMP%, %WINDIR%\Temp, %WINDIR%\Logs e Lixeira
/// - Sem TRIM, sem prefetch wipe e sem working set flush para poupar o braço mecânico do HD
#[tauri::command]
pub async fn run_lite_clean() -> Result<CommandResponse<CleanResult>, String> {
    tokio::task::spawn_blocking(|| {
        let mut categories = Vec::new();
        let mut total_bytes = 0u64;
        let mut total_files = 0u64;

        let temp_dir = std::env::var("TEMP").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows\\Temp"));
        let windir = std::env::var("WINDIR").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("C:\\Windows"));

        // 1. Temp Usuário
        let c_temp_user = clean_path_list("Temp Usuário", vec![temp_dir]);
        total_bytes += c_temp_user.bytes_freed;
        total_files += c_temp_user.files_deleted;
        categories.push(c_temp_user);

        // 2. Temp Windows
        let c_temp_win = clean_path_list("Temp Windows", vec![windir.join("Temp")]);
        total_bytes += c_temp_win.bytes_freed;
        total_files += c_temp_win.files_deleted;
        categories.push(c_temp_win);

        // 3. Logs
        let c_logs = clean_path_list("Logs Leves", vec![windir.join("Logs")]);
        total_bytes += c_logs.bytes_freed;
        total_files += c_logs.files_deleted;
        categories.push(c_logs);

        // 4. Lixeira do Windows
        let _ = empty_recycle_bin();
        categories.push(CleanCategory {
            name: "Lixeira do Windows".to_string(),
            bytes_freed: 0,
            mb_freed: 0.0,
            files_deleted: 0,
            status: "Esvaziada".to_string(),
        });

        let total_mb = ((total_bytes as f64) / (1024.0 * 1024.0) * 100.0).round() / 100.0;

        let result = CleanResult {
            total_freed_mb: total_mb,
            total_files_deleted: total_files,
            categories,
            message: format!("Limpeza Lite concluída com sucesso. Foram liberados {} MB.", total_mb),
            bytes_freed: total_mb,
        };

        Ok(CommandResponse::ok("Limpeza Lite concluída com sucesso.", Some(result)))
    })
    .await
    .map_err(|e| format!("Falha ao executar limpeza lite: {}", e))?
}
