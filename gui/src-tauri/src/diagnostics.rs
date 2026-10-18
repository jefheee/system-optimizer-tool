use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};
use wmi::{COMLibrary, WMIConnection};

use crate::state::CommandResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct UptimeInfo {
    pub days: u64,
    pub hours: u64,
    pub minutes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OperatingSystemInfo {
    pub caption: String,
    pub build_number: String,
    pub last_boot_up_time: String,
    pub uptime: UptimeInfo,
    pub formatted_uptime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CpuInfo {
    pub name: String,
    pub usage_percent: f32,
    pub physical_cores: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct GpuInfo {
    pub name: String,
    pub vram_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct RamModule {
    pub capacity_gb: u64,
    pub speed_mhz: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MemoryInfo {
    pub total_gb: u64,
    pub used_gb: u64,
    pub usage_percent: f32,
    pub module_count: usize,
    pub modules: Vec<RamModule>,
    pub xmp_alert: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StorageDisk {
    pub model: String,
    pub size_gb: u64,
    pub free_gb: u64,
    pub media_type: String,
    pub health_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct SystemDiagnostics {
    pub status: String,
    pub timestamp: String,
    pub operating_system: Option<OperatingSystemInfo>,
    pub cpu: Option<CpuInfo>,
    pub gpu: Option<GpuInfo>,
    pub memory: Option<MemoryInfo>,
    pub storage: Vec<StorageDisk>,
    pub message: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_VideoController")]
#[serde(rename_all = "PascalCase")]
struct WmiVideoController {
    name: Option<String>,
    adapter_ram: Option<u64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_PhysicalMemory")]
#[serde(rename_all = "PascalCase")]
struct WmiPhysicalMemory {
    capacity: Option<u64>,
    speed: Option<u32>,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "Win32_DiskDrive")]
#[serde(rename_all = "PascalCase")]
struct WmiDiskDrive {
    model: Option<String>,
    size: Option<u64>,
    status: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename = "MSFT_PhysicalDisk")]
#[serde(rename_all = "PascalCase")]
struct WmiMsftPhysicalDisk {
    model: Option<String>,
    size: Option<u64>,
    media_type: Option<u16>,
    health_status: Option<u16>,
}

fn query_hardware_via_wmi() -> (Option<GpuInfo>, Vec<RamModule>, Vec<StorageDisk>) {
    let com_lib = match COMLibrary::new() {
        Ok(c) => c,
        Err(_) => return (None, Vec::new(), Vec::new()),
    };

    // 1. GPU info
    let gpu_info = match WMIConnection::new(com_lib) {
        Ok(wmi_con) => {
            let res: Result<Vec<WmiVideoController>, _> = wmi_con.query();
            match res {
                Ok(controllers) => controllers
                    .into_iter()
                    .filter(|c| {
                        let n = c.name.as_deref().unwrap_or("");
                        !n.is_empty() && !n.contains("Basic Render")
                    })
                    .map(|c| GpuInfo {
                        name: c.name.unwrap_or_else(|| "GPU Desconhecida".to_string()).trim().to_string(),
                        vram_mb: c.adapter_ram.map(|b| b / (1024 * 1024)).unwrap_or(0),
                    })
                    .next(),
                Err(_) => None,
            }
        }
        Err(_) => None,
    };

    // 2. RAM Physical sticks
    let ram_modules = match WMIConnection::new(com_lib) {
        Ok(wmi_con) => {
            let res: Result<Vec<WmiPhysicalMemory>, _> = wmi_con.query();
            match res {
                Ok(memories) => memories
                    .into_iter()
                    .map(|m| RamModule {
                        capacity_gb: m.capacity.map(|c| c / (1024 * 1024 * 1024)).unwrap_or(0),
                        speed_mhz: m.speed.unwrap_or(0),
                    })
                    .collect(),
                Err(_) => Vec::new(),
            }
        }
        Err(_) => Vec::new(),
    };

    // 3. Storage Disks (tentar MSFT_PhysicalDisk com fallback para Win32_DiskDrive)
    let mut storage_disks: Vec<StorageDisk> = Vec::new();
    let msft_storage = WMIConnection::with_namespace_path("root\\Microsoft\\Windows\\Storage", com_lib);

    if let Ok(wmi_storage) = msft_storage {
        let res: Result<Vec<WmiMsftPhysicalDisk>, _> = wmi_storage.query();
        if let Ok(disks) = res {
            for d in disks {
                let model = d.model.unwrap_or_else(|| "Disco Desconhecido".to_string()).trim().to_string();
                let size_gb = d.size.map(|s| s / (1024 * 1024 * 1024)).unwrap_or(0);
                let media_type = match d.media_type {
                    Some(3) => "HDD".to_string(),
                    Some(4) => "SSD".to_string(),
                    Some(5) => "SCM/NVMe".to_string(),
                    _ => "SSD".to_string(),
                };
                let health_status = match d.health_status {
                    Some(0) => "Healthy".to_string(),
                    Some(1) => "Warning".to_string(),
                    Some(2) => "Unhealthy".to_string(),
                    _ => "Healthy".to_string(),
                };

                storage_disks.push(StorageDisk {
                    model,
                    size_gb,
                    free_gb: 0,
                    media_type,
                    health_status,
                });
            }
        }
    }

    if storage_disks.is_empty() {
        if let Ok(wmi_con) = WMIConnection::new(com_lib) {
            let res: Result<Vec<WmiDiskDrive>, _> = wmi_con.query();
            if let Ok(disks) = res {
                for d in disks {
                    let model = d.model.unwrap_or_else(|| "Disco Local".to_string()).trim().to_string();
                    let size_gb = d.size.map(|s| s / (1024 * 1024 * 1024)).unwrap_or(0);
                    let media_type = if model.to_lowercase().contains("nvme") || model.to_lowercase().contains("ssd") {
                        "SSD".to_string()
                    } else {
                        "HDD".to_string()
                    };
                    let health_status = d.status.unwrap_or_else(|| "OK".to_string());
                    let health_str = if health_status.eq_ignore_ascii_case("OK") {
                        "Healthy".to_string()
                    } else {
                        "Warning".to_string()
                    };

                    storage_disks.push(StorageDisk {
                        model,
                        size_gb,
                        free_gb: 0,
                        media_type,
                        health_status: health_str,
                    });
                }
            }
        }
    }

    (gpu_info, ram_modules, storage_disks)
}

#[tauri::command]
pub async fn get_system_diagnostics() -> Result<CommandResponse<SystemDiagnostics>, String> {
    let result = tokio::task::spawn_blocking(|| {
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );

        // Aguarda curto intervalo para cálculo preciso de CPU usage
        std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
        sys.refresh_cpu_all();
        sys.refresh_memory();

        // 1. OS & Uptime
        let os_name = System::name().unwrap_or_else(|| "Windows".to_string());
        let os_version = System::os_version().unwrap_or_else(|| "".to_string());
        let kernel_version = System::kernel_version().unwrap_or_else(|| "".to_string());
        let uptime_secs = System::uptime();
        let days = uptime_secs / 86400;
        let hours = (uptime_secs % 86400) / 3600;
        let minutes = (uptime_secs % 3600) / 60;
        let formatted_uptime = format!("{}d {}h {}m", days, hours, minutes);

        let os_info = OperatingSystemInfo {
            caption: format!("{} {} (Build {})", os_name, os_version, kernel_version).trim().to_string(),
            build_number: kernel_version,
            last_boot_up_time: "".to_string(),
            uptime: UptimeInfo {
                days,
                hours,
                minutes,
            },
            formatted_uptime,
        };

        // 2. CPU
        let cpu_name = sys
            .cpus()
            .first()
            .map(|c| c.brand().trim().to_string())
            .unwrap_or_else(|| "Processador Windows".to_string());
        let cpu_usage = sys.global_cpu_usage();
        let physical_cores = sys.physical_core_count().unwrap_or(0);

        let cpu_info = CpuInfo {
            name: cpu_name,
            usage_percent: cpu_usage,
            physical_cores,
        };

        // 3. Consultas WMI para GPU, módulos físicos de RAM e Discos S.M.A.R.T
        let (gpu_info, ram_modules, mut storage_disks) = query_hardware_via_wmi();

        // 4. Memória RAM Global
        let total_ram_bytes = sys.total_memory();
        let used_ram_bytes = sys.used_memory();
        let total_ram_gb = total_ram_bytes / (1024 * 1024 * 1024);
        let used_ram_gb = used_ram_bytes / (1024 * 1024 * 1024);
        let ram_usage_percent = if total_ram_bytes > 0 {
            (used_ram_bytes as f32 / total_ram_bytes as f32) * 100.0
        } else {
            0.0
        };

        // Alerta de XMP desativado: se módulos DDR4/DDR5 estiverem operando na base JEDEC <= 2133 ou 2400 MHz
        let xmp_alert = ram_modules.iter().any(|m| m.speed_mhz > 0 && m.speed_mhz <= 2400);

        let memory_info = MemoryInfo {
            total_gb: total_ram_gb,
            used_gb: used_ram_gb,
            usage_percent: ram_usage_percent,
            module_count: ram_modules.len(),
            modules: ram_modules,
            xmp_alert,
        };

        // 5. Complementa espaço livre dos discos usando sysinfo::Disks
        let disks = Disks::new_with_refreshed_list();
        for d in &disks {
            let total_gb = d.total_space() / (1024 * 1024 * 1024);
            let free_gb = d.available_space() / (1024 * 1024 * 1024);
            let mount_point = d.mount_point().to_string_lossy().to_string();

            if storage_disks.is_empty() {
                let name = d.name().to_string_lossy().to_string();
                let model = if !name.is_empty() {
                    format!("{} ({})", name, mount_point)
                } else {
                    format!("Unidade ({})", mount_point)
                };

                storage_disks.push(StorageDisk {
                    model,
                    size_gb: total_gb,
                    free_gb,
                    media_type: if d.is_removable() { "Removível".to_string() } else { "SSD".to_string() },
                    health_status: "Healthy".to_string(),
                });
            } else if let Some(first) = storage_disks.first_mut() {
                if first.free_gb == 0 {
                    first.free_gb = free_gb;
                }
            }
        }

        SystemDiagnostics {
            status: "Success".to_string(),
            timestamp: chrono::Local::now().to_rfc3339(),
            operating_system: Some(os_info),
            cpu: Some(cpu_info),
            gpu: gpu_info.or_else(|| {
                Some(GpuInfo {
                    name: "Placa Gráfica Integrada / Dedicada".to_string(),
                    vram_mb: 0,
                })
            }),
            memory: Some(memory_info),
            storage: storage_disks,
            message: "Diagnóstico de hardware concluído com sucesso via Rust.".to_string(),
        }
    })
    .await
    .map_err(|e| format!("Falha na rotina de diagnóstico: {}", e))?;

    Ok(CommandResponse::ok(
        "Diagnóstico do sistema executado com sucesso.",
        Some(result),
    ))
}
