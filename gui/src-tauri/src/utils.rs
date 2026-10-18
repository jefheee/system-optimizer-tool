use std::os::windows::ffi::OsStrExt;
use std::os::windows::process::CommandExt;
use std::process::Command;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::ProcessStatus::K32EmptyWorkingSet;
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA};
use windows::Win32::UI::Shell::{IsUserAnAdmin, SHEmptyRecycleBinW, ShellExecuteW};
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

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

/// Verifica se o processo atual está rodando com privilégios de Administrador
pub fn is_process_elevated() -> bool {
    unsafe { IsUserAnAdmin().as_bool() }
}

/// Reinicia o executável atual com elevação de UAC ("runas")
pub fn restart_elevated() -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let path_wide: Vec<u16> = current_exe
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
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );

        if instance.0 as usize > 32 {
            std::process::exit(0);
        } else {
            Err("Falha ao solicitar elevação de privilégios (UAC).".to_string())
        }
    }
}

/// Esvazia a Lixeira do Windows nativamente sem confirmação, barra de progresso ou som
pub fn empty_recycle_bin() -> Result<(), String> {
    unsafe {
        // SHERB_NOCONFIRMATION = 0x00000001
        // SHERB_NOPROGRESSUI = 0x00000002
        // SHERB_NOSOUND = 0x00000004
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
