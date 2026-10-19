use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;
use tauri::Emitter;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::ProcessStatus::K32EmptyWorkingSet;
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA};
use windows::Win32::UI::Shell::{IsUserAnAdmin, SHEmptyRecycleBinW, ShellExecuteW};
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

use crate::state::StepEvent;

pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn new_hidden_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

pub fn new_hidden_tokio_command(program: &str) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

/// Emite evento de progresso detalhado para o Drawer de Execução no Frontend
pub fn emit_step(
    app: &tauri::AppHandle,
    step_id: &str,
    step_name: &str,
    status: &str,
    details: &str,
    current: usize,
    total: usize,
) {
    let _ = app.emit(
        "optimization-step",
        StepEvent {
            step_id: step_id.to_string(),
            step_name: step_name.to_string(),
            status: status.to_string(),
            details: details.to_string(),
            current,
            total,
        },
    );
}

/// Verifica se o processo atual está rodando com privilégios de Administrador
pub fn is_process_elevated() -> bool {
    unsafe { IsUserAnAdmin().as_bool() }
}

/// Reinicia o executável atual com elevação de UAC ("runas").
/// Em modo debug (`tauri dev`), oculta a janela não-elevada sem matar o processo pai,
/// mantendo o servidor `localhost:3000` vivo para a nova instância elevada.
pub fn restart_elevated(window: Option<&tauri::Window>) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let work_dir = current_exe
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    let path_wide: Vec<u16> = current_exe
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let dir_wide: Vec<u16> = work_dir
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let instance = ShellExecuteW(
            None,
            w!("runas"),
            PCWSTR(path_wide.as_ptr()),
            PCWSTR::null(),
            PCWSTR(dir_wide.as_ptr()),
            SW_SHOWNORMAL,
        );

        if instance.0 as usize > 32 {
            #[cfg(debug_assertions)]
            {
                if let Some(win) = window {
                    let _ = win.hide();
                }
                Ok(())
            }
            #[cfg(not(debug_assertions))]
            {
                let _ = window;
                std::process::exit(0);
            }
        } else {
            Err("Falha ao solicitar elevação de privilégios (UAC cancelado ou negado).".to_string())
        }
    }
}

/// Abre um executável, arquivo ou URL usando ShellExecuteW ("open" ou "runas") com argumentos
pub fn shell_run(target: &str, params: &str, run_as_admin: bool) -> Result<(), String> {
    let target_wide: Vec<u16> = std::ffi::OsStr::new(target)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let params_wide: Vec<u16> = std::ffi::OsStr::new(params)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let verb = if run_as_admin { w!("runas") } else { w!("open") };

    unsafe {
        let instance = ShellExecuteW(
            None,
            verb,
            PCWSTR(target_wide.as_ptr()),
            if params.is_empty() {
                PCWSTR::null()
            } else {
                PCWSTR(params_wide.as_ptr())
            },
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );

        if instance.0 as usize > 32 {
            Ok(())
        } else if run_as_admin {
            // Se o usuário recusar o UAC elevado ou falhar, tenta fallback com "open"
            let fallback_instance = ShellExecuteW(
                None,
                w!("open"),
                PCWSTR(target_wide.as_ptr()),
                if params.is_empty() {
                    PCWSTR::null()
                } else {
                    PCWSTR(params_wide.as_ptr())
                },
                PCWSTR::null(),
                SW_SHOWNORMAL,
            );

            if fallback_instance.0 as usize > 32 {
                Ok(())
            } else {
                Err(format!("Falha ao abrir '{}'", target))
            }
        } else {
            Err(format!("Falha ao abrir '{}'", target))
        }
    }
}

/// Abre um executável, arquivo HTML ou URL usando ShellExecuteW ("open")
pub fn shell_open(target: &str) -> Result<(), String> {
    shell_run(target, "", false)
}

/// Calcula recursivamente o tamanho em bytes e a contagem de arquivos de um diretório sem apagar nada
pub fn calculate_dir_size(dir_path: &Path) -> (u64, u64) {
    let mut total_bytes = 0u64;
    let mut total_files = 0u64;

    if !dir_path.exists() {
        return (0, 0);
    }

    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() || path.is_symlink() {
                if let Ok(meta) = entry.metadata() {
                    total_bytes += meta.len();
                    total_files += 1;
                }
            } else if path.is_dir() {
                let (sub_b, sub_f) = calculate_dir_size(&path);
                total_bytes += sub_b;
                total_files += sub_f;
            }
        }
    }

    (total_bytes, total_files)
}

/// Esvazia a Lixeira do Windows nativamente sem confirmação, barra de progresso ou som
pub fn empty_recycle_bin() -> Result<(), String> {
    unsafe {
        let flags = 0x00000001 | 0x00000002 | 0x00000004;
        let _ = SHEmptyRecycleBinW(None, PCWSTR::null(), flags);
        Ok(())
    }
}

/// Itera pelos processos ativos e executa K32EmptyWorkingSet para liberar RAM de páginas ociosas
pub fn flush_working_set_all_processes() -> usize {
    let mut count = 0;
    let mut pids = [0u32; 2048];
    let mut bytes_returned = 0u32;

    unsafe {
        if windows::Win32::System::ProcessStatus::EnumProcesses(
            pids.as_mut_ptr(),
            (pids.len() * std::mem::size_of::<u32>()) as u32,
            &mut bytes_returned,
        )
        .is_ok()
        {
            let num_procs = (bytes_returned as usize) / std::mem::size_of::<u32>();
            for &pid in &pids[..num_procs] {
                if pid == 0 || pid == 4 {
                    continue;
                }
                if let Ok(handle) = OpenProcess(
                    PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA,
                    false,
                    pid,
                ) {
                    if K32EmptyWorkingSet(handle).as_bool() {
                        count += 1;
                    }
                    let _ = CloseHandle(handle);
                }
            }
        }
    }
    count
}
