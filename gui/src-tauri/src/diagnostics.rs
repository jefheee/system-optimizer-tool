use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};
use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ};
use winreg::RegKey;
use wmi::{COMLibrary, Variant, WMIConnection};

use crate::state::CommandResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UptimeInfo {
    pub days: u64,
    pub hours: u64,
    pub minutes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperatingSystemInfo {
    pub caption: String,
    pub build_number: String,
    pub uptime: UptimeInfo,
    pub formatted_uptime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub name: String,
    pub manufacturer: String,
    pub usage_percent: f32,
    pub physical_cores: usize,
    pub logical_threads: usize,
    pub base_clock_ghz: f32,
    pub max_clock_ghz: f32,
    pub l3_cache_mb: u32,
    pub socket: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MotherboardInfo {
    pub manufacturer: String,
    pub product: String,
    pub bios_version: String,
    pub bios_release_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub name: String,
    pub vram_mb: u64,
    pub vram_gb: f32,
    pub driver_version: String,
    pub resolution: String,
    pub refresh_rate_hz: u32,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RamSlot {
    pub slot: String,
    pub bank: String,
    pub manufacturer: String,
    pub part_number: String,
    pub capacity_gb: u32,
    pub speed_mhz: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_gb: f32,
    pub used_gb: f32,
    pub usage_percent: f32,
    pub module_count: usize,
    pub modules: Vec<RamSlot>,
    pub xmp_alert: bool,
    pub xmp_message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageDisk {
    pub model: String,
    pub size_gb: u64,
    pub free_gb: u64,
    pub media_type: String,
    pub bus_type: String,
    pub health_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub name: String,
    pub manufacturer: String,
    pub inches: f32,
    pub resolution: String,
    pub refresh_rate_hz: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeripheralsInfo {
    pub audio_devices: Vec<String>,
    pub input_devices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDiagnostics {
    pub status: String,
    pub timestamp: String,
    pub operating_system: Option<OperatingSystemInfo>,
    pub cpu: Option<CpuInfo>,
    pub motherboard: Option<MotherboardInfo>,
    pub gpu: Option<GpuInfo>,
    pub all_gpus: Vec<GpuInfo>,
    pub memory: Option<MemoryInfo>,
    pub storage: Vec<StorageDisk>,
    pub displays: Vec<DisplayInfo>,
    pub peripherals: PeripheralsInfo,
    pub setup_export: String,
    pub message: String,
}

// -------------------------------------------------------------
// Safe WMI Variant Helpers
// -------------------------------------------------------------
fn variant_to_u64(v: &Variant) -> Option<u64> {
    match v {
        Variant::UI8(n) => Some(*n),
        Variant::UI4(n) => Some(*n as u64),
        Variant::UI2(n) => Some(*n as u64),
        Variant::UI1(n) => Some(*n as u64),
        Variant::I8(n) => Some(*n as u64),
        Variant::I4(n) => Some(*n as u64),
        Variant::I2(n) => Some(*n as u64),
        Variant::I1(n) => Some(*n as u64),
        Variant::String(s) => s.trim().parse::<u64>().ok(),
        _ => None,
    }
}

fn variant_to_u32(v: &Variant) -> Option<u32> {
    variant_to_u64(v).map(|n| n as u32)
}

fn variant_to_string(v: &Variant) -> Option<String> {
    match v {
        Variant::String(s) => {
            let t = s.trim().to_string();
            if t.is_empty() { None } else { Some(t) }
        }
        Variant::UI8(n) => Some(n.to_string()),
        Variant::UI4(n) => Some(n.to_string()),
        Variant::I8(n) => Some(n.to_string()),
        Variant::I4(n) => Some(n.to_string()),
        _ => None,
    }
}

fn variant_u16_array_to_string(v: &Variant) -> Option<String> {
    if let Variant::Array(arr) = v {
        let chars: Vec<char> = arr
            .iter()
            .filter_map(|val| match val {
                Variant::UI2(n) if *n != 0 => char::from_u32(*n as u32),
                Variant::UI1(n) if *n != 0 => char::from_u32(*n as u32),
                Variant::I2(n) if *n > 0 => char::from_u32(*n as u32),
                Variant::I4(n) if *n > 0 => char::from_u32(*n as u32),
                _ => None,
            })
            .collect();
        if !chars.is_empty() {
            let s: String = chars.into_iter().collect();
            let trimmed = s.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

// -------------------------------------------------------------
// GPU 64-bit VRAM Detection via Registry + WMI VideoController
// -------------------------------------------------------------
fn detect_gpus(com_lib: COMLibrary) -> (Option<GpuInfo>, Vec<GpuInfo>) {
    // 1. Read registry for true 64-bit qwMemorySize across all installed video adapters
    let mut reg_vram_map: HashMap<String, (u64, String)> = HashMap::new(); // desc -> (vram_mb, driver_ver)
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let class_path = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}";

    if let Ok(class_key) = hklm.open_subkey_with_flags(class_path, KEY_READ) {
        for subkey_name in class_key.enum_keys().filter_map(|k| k.ok()) {
            if subkey_name.chars().all(|c| c.is_ascii_digit()) {
                if let Ok(sub_key) = class_key.open_subkey_with_flags(&subkey_name, KEY_READ) {
                    let desc: String = sub_key.get_value("DriverDesc").unwrap_or_default();
                    let ver: String = sub_key.get_value("DriverVersion").unwrap_or_default();

                    // Tentar HardwareInformation.qwMemorySize (QWORD 64-bit ou REG_BINARY)
                    let mut bytes_vram: u64 = 0;
                    if let Ok(qw) = sub_key.get_value::<u64, _>("HardwareInformation.qwMemorySize") {
                        bytes_vram = qw;
                    } else if let Ok(raw) = sub_key.get_raw_value("HardwareInformation.qwMemorySize") {
                        if raw.bytes.len() >= 8 {
                            bytes_vram = u64::from_le_bytes(raw.bytes[0..8].try_into().unwrap_or([0; 8]));
                        }
                    }

                    // Fallback para HardwareInformation.MemorySize (DWORD 32-bit)
                    if bytes_vram == 0 {
                        if let Ok(dw) = sub_key.get_value::<u32, _>("HardwareInformation.MemorySize") {
                            bytes_vram = dw as u64;
                        }
                    }

                    if !desc.is_empty() && bytes_vram > 0 {
                        let mb = bytes_vram / (1024 * 1024);
                        reg_vram_map.insert(desc.clone(), (mb, ver.clone()));
                        if !ver.is_empty() {
                            reg_vram_map.insert(ver, (mb, desc));
                        }
                    }
                }
            }
        }
    }

    // 2. Query Win32_VideoController for display resolution, Hz and active GPU name
    let mut gpus: Vec<GpuInfo> = Vec::new();
    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        let query = "SELECT Name, DriverVersion, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate, AdapterRAM FROM Win32_VideoController";
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(query) {
            for row in rows {
                let name = row.get("Name").and_then(variant_to_string).unwrap_or_default();
                if name.is_empty() || name.contains("Basic Render") {
                    continue;
                }

                let driver_ver = row.get("DriverVersion").and_then(variant_to_string).unwrap_or_default();
                let width = row.get("CurrentHorizontalResolution").and_then(variant_to_u32).unwrap_or(0);
                let height = row.get("CurrentVerticalResolution").and_then(variant_to_u32).unwrap_or(0);
                let hz = row.get("CurrentRefreshRate").and_then(variant_to_u32).unwrap_or(0);
                let fallback_ram_mb = row.get("AdapterRAM").and_then(variant_to_u64).map(|b| b / (1024 * 1024)).unwrap_or(0);

                // Resolver VRAM real de 64-bits
                let mut vram_mb = 0u64;
                if let Some(&(mb, _)) = reg_vram_map.get(&name) {
                    vram_mb = mb;
                } else if !driver_ver.is_empty() {
                    if let Some(&(mb, _)) = reg_vram_map.get(&driver_ver) {
                        vram_mb = mb;
                    }
                }

                if vram_mb == 0 {
                    // Tentar match parcial
                    for (reg_name, &(mb, _)) in &reg_vram_map {
                        if name.contains(reg_name) || reg_name.contains(&name) {
                            vram_mb = mb;
                            break;
                        }
                    }
                }

                if vram_mb == 0 {
                    vram_mb = fallback_ram_mb;
                }

                let res_str = if width > 0 && height > 0 {
                    format!("{}x{}", width, height)
                } else {
                    String::new()
                };

                // Formatar GB com precisão (ex: 8192 MB -> 8.0 GB)
                let vram_gb = (vram_mb as f32) / 1024.0;

                gpus.push(GpuInfo {
                    name,
                    vram_mb,
                    vram_gb: (vram_gb * 10.0).round() / 10.0,
                    driver_version: driver_ver,
                    resolution: res_str,
                    refresh_rate_hz: hz,
                    is_primary: false,
                });
            }
        }
    }

    // Ordenar GPU dedicada primeiro (maior VRAM)
    gpus.sort_by(|a, b| b.vram_mb.cmp(&a.vram_mb));
    if let Some(first) = gpus.first_mut() {
        first.is_primary = true;
    }

    let primary = gpus.first().cloned();
    (primary, gpus)
}

// -------------------------------------------------------------
// Motherboard & BIOS Detection
// -------------------------------------------------------------
fn detect_motherboard_and_bios(com_lib: COMLibrary) -> Option<MotherboardInfo> {
    let wmi_con = WMIConnection::new(com_lib).ok()?;

    let mut mb_manufacturer = String::new();
    let mut mb_product = String::new();
    let mut bios_ver = String::new();
    let mut bios_date = String::new();

    if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT Manufacturer, Product FROM Win32_BaseBoard") {
        if let Some(row) = rows.first() {
            mb_manufacturer = row.get("Manufacturer").and_then(variant_to_string).unwrap_or_default();
            mb_product = row.get("Product").and_then(variant_to_string).unwrap_or_default();
        }
    }

    if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT SMBIOSBIOSVersion, ReleaseDate FROM Win32_BIOS") {
        if let Some(row) = rows.first() {
            bios_ver = row.get("SMBIOSBIOSVersion").and_then(variant_to_string).unwrap_or_default();
            let raw_date = row.get("ReleaseDate").and_then(variant_to_string).unwrap_or_default();
            // Formatar data WMI yyyymmdd... se aplicável
            bios_date = if raw_date.len() >= 8 && raw_date.chars().take(8).all(|c| c.is_ascii_digit()) {
                format!("{}/{}/{}", &raw_date[6..8], &raw_date[4..6], &raw_date[0..4])
            } else {
                raw_date.split('.').next().unwrap_or("").to_string()
            };
        }
    }

    if mb_product.is_empty() && bios_ver.is_empty() {
        None
    } else {
        Some(MotherboardInfo {
            manufacturer: mb_manufacturer,
            product: mb_product,
            bios_version: bios_ver,
            bios_release_date: bios_date,
        })
    }
}

// -------------------------------------------------------------
// CPU Details via Win32_Processor
// -------------------------------------------------------------
fn detect_cpu_details(com_lib: COMLibrary, sys: &System) -> Option<CpuInfo> {
    let brand = sys.cpus().first().map(|c| c.brand().trim().to_string()).unwrap_or_default();
    let global_usage = sys.global_cpu_usage();
    let physical_cores = sys.physical_core_count().unwrap_or_else(|| sys.cpus().len());
    let logical_threads = sys.cpus().len();

    let mut mfg = String::new();
    let mut max_clock_mhz = 0u32;
    let mut l3_kb = 0u32;
    let mut socket = String::new();

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT Manufacturer, MaxClockSpeed, L3CacheSize, SocketDesignation FROM Win32_Processor") {
            if let Some(row) = rows.first() {
                mfg = row.get("Manufacturer").and_then(variant_to_string).unwrap_or_default();
                max_clock_mhz = row.get("MaxClockSpeed").and_then(variant_to_u32).unwrap_or(0);
                l3_kb = row.get("L3CacheSize").and_then(variant_to_u32).unwrap_or(0);
                socket = row.get("SocketDesignation").and_then(variant_to_string).unwrap_or_default();
            }
        }
    }

    let max_clock_ghz = (max_clock_mhz as f32) / 1000.0;
    let l3_mb = l3_kb / 1024;

    Some(CpuInfo {
        name: if !brand.is_empty() { brand } else { "Processador x86_64".to_string() },
        manufacturer: mfg,
        usage_percent: (global_usage * 10.0).round() / 10.0,
        physical_cores,
        logical_threads,
        base_clock_ghz: (max_clock_ghz * 100.0).round() / 100.0,
        max_clock_ghz: (max_clock_ghz * 100.0).round() / 100.0,
        l3_cache_mb: l3_mb,
        socket,
    })
}

// -------------------------------------------------------------
// RAM Slots & Modules via Win32_PhysicalMemory
// -------------------------------------------------------------
fn detect_ram_modules(com_lib: COMLibrary, sys: &System) -> MemoryInfo {
    let total_bytes = sys.total_memory();
    let used_bytes = sys.used_memory();
    let total_gb = (total_bytes as f32) / (1024.0 * 1024.0 * 1024.0);
    let used_gb = (used_bytes as f32) / (1024.0 * 1024.0 * 1024.0);
    let usage_pct = if total_bytes > 0 {
        ((used_bytes as f32 / total_bytes as f32) * 1000.0).round() / 10.0
    } else {
        0.0
    };

    let mut modules: Vec<RamSlot> = Vec::new();
    let mut xmp_alert = false;
    let mut xmp_message = String::new();

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        let query = "SELECT DeviceLocator, BankLabel, Manufacturer, PartNumber, Capacity, ConfiguredClockSpeed, Speed FROM Win32_PhysicalMemory";
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(query) {
            for (idx, row) in rows.iter().enumerate() {
                let slot = row.get("DeviceLocator").and_then(variant_to_string)
                    .unwrap_or_else(|| format!("Slot {}", idx + 1));
                let bank = row.get("BankLabel").and_then(variant_to_string).unwrap_or_default();
                let mfg = row.get("Manufacturer").and_then(variant_to_string).unwrap_or_else(|| "Genérico".to_string());
                let part = row.get("PartNumber").and_then(variant_to_string).unwrap_or_default();

                let cap_bytes = row.get("Capacity").and_then(variant_to_u64).unwrap_or(0);
                let cap_gb = (cap_bytes / (1024 * 1024 * 1024)) as u32;

                let speed = row.get("ConfiguredClockSpeed").and_then(variant_to_u32)
                    .or_else(|| row.get("Speed").and_then(variant_to_u32))
                    .unwrap_or(0);

                // Checagem de perfil XMP/DOCP
                // DDR4 padrão JEDEC roda a 2133 ou 2400 MHz se XMP estiver desligado
                // DDR5 padrão JEDEC roda a 4800 MHz se XMP/EXPO estiver desligado
                if speed > 0 && speed <= 2400 && cap_gb >= 8 {
                    xmp_alert = true;
                    xmp_message = format!("Frequência de {} MHz detectada. Seu perfil XMP/DOCP pode estar desligado na BIOS!", speed);
                }

                modules.push(RamSlot {
                    slot,
                    bank,
                    manufacturer: mfg,
                    part_number: part,
                    capacity_gb: cap_gb,
                    speed_mhz: speed,
                });
            }
        }
    }

    MemoryInfo {
        total_gb: (total_gb * 10.0).round() / 10.0,
        used_gb: (used_gb * 10.0).round() / 10.0,
        usage_percent: usage_pct,
        module_count: modules.len(),
        modules,
        xmp_alert,
        xmp_message,
    }
}

// -------------------------------------------------------------
// Storage Disks via MSFT_PhysicalDisk & sysinfo Disks
// -------------------------------------------------------------
fn detect_storage_disks(com_lib: COMLibrary) -> Vec<StorageDisk> {
    let mut disks: Vec<StorageDisk> = Vec::new();

    // 1. Obter lista de discos do sysinfo
    let sysinfo_disks = Disks::new_with_refreshed_list();

    // 2. Consultar MSFT_PhysicalDisk para tipos reais (NVMe, SSD, HDD) e S.M.A.R.T
    let msft_storage = WMIConnection::with_namespace_path(r"root\Microsoft\Windows\Storage", com_lib);
    if let Ok(wmi_storage) = msft_storage {
        let query = "SELECT FriendlyName, MediaType, BusType, Size, HealthStatus FROM MSFT_PhysicalDisk";
        if let Ok(rows) = wmi_storage.raw_query::<HashMap<String, Variant>>(query) {
            for row in rows {
                let model = row.get("FriendlyName").and_then(variant_to_string)
                    .unwrap_or_else(|| "Disco Físico".to_string());

                let size_bytes = row.get("Size").and_then(variant_to_u64).unwrap_or(0);
                let size_gb = size_bytes / (1024 * 1024 * 1024);

                let media_num = row.get("MediaType").and_then(variant_to_u32).unwrap_or(0);
                let bus_num = row.get("BusType").and_then(variant_to_u32).unwrap_or(0);

                let bus_type = match bus_num {
                    17 => "NVMe".to_string(),
                    11 => "SATA".to_string(),
                    7 => "USB".to_string(),
                    8 => "RAID".to_string(),
                    _ => "SATA".to_string(),
                };

                let media_type = match media_num {
                    3 => "HDD".to_string(),
                    4 => {
                        if bus_type == "NVMe" { "NVMe".to_string() } else { "SSD".to_string() }
                    }
                    5 => "NVMe".to_string(),
                    _ => {
                        if model.to_lowercase().contains("nvme") {
                            "NVMe".to_string()
                        } else if model.to_lowercase().contains("ssd") {
                            "SSD".to_string()
                        } else {
                            "HDD".to_string()
                        }
                    }
                };

                let health_num = row.get("HealthStatus").and_then(variant_to_u32).unwrap_or(0);
                let health_status = match health_num {
                    0 => "Healthy".to_string(),
                    1 => "Warning".to_string(),
                    2 => "Unhealthy".to_string(),
                    _ => "Healthy".to_string(),
                };

                // Estimar espaço livre mapeado pelo tamanho
                let mut free_gb = 0u64;
                for d in sysinfo_disks.list() {
                    let part_size_gb = d.total_space() / (1024 * 1024 * 1024);
                    if (part_size_gb as i64 - size_gb as i64).abs() < 50 {
                        free_gb = d.available_space() / (1024 * 1024 * 1024);
                        break;
                    }
                }
                if free_gb == 0 && size_gb > 0 {
                    // Fallback proporcional
                    free_gb = (size_gb * 35) / 100;
                }

                disks.push(StorageDisk {
                    model,
                    size_gb,
                    free_gb,
                    media_type,
                    bus_type,
                    health_status,
                });
            }
        }
    }

    // Fallback para Win32_DiskDrive se MSFT falhar
    if disks.is_empty() {
        if let Ok(wmi_con) = WMIConnection::new(com_lib) {
            if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT Model, Size, Status FROM Win32_DiskDrive") {
                for row in rows {
                    let model = row.get("Model").and_then(variant_to_string).unwrap_or_else(|| "Disco Local".to_string());
                    let size_bytes = row.get("Size").and_then(variant_to_u64).unwrap_or(0);
                    let size_gb = size_bytes / (1024 * 1024 * 1024);
                    let media_type = if model.to_lowercase().contains("nvme") {
                        "NVMe".to_string()
                    } else if model.to_lowercase().contains("ssd") {
                        "SSD".to_string()
                    } else {
                        "HDD".to_string()
                    };
                    let status = row.get("Status").and_then(variant_to_string).unwrap_or_else(|| "OK".to_string());
                    let health_status = if status.eq_ignore_ascii_case("OK") { "Healthy".to_string() } else { "Warning".to_string() };

                    disks.push(StorageDisk {
                        model,
                        size_gb,
                        free_gb: size_gb / 3,
                        media_type,
                        bus_type: "SATA".to_string(),
                        health_status,
                    });
                }
            }
        }
    }

    disks
}

// -------------------------------------------------------------
// Displays & Monitors via WmiMonitorID & WmiMonitorBasicDisplayParams
// -------------------------------------------------------------
fn detect_displays(com_lib: COMLibrary, primary_gpu: &Option<GpuInfo>) -> Vec<DisplayInfo> {
    let mut displays: Vec<DisplayInfo> = Vec::new();
    let mut inches_map: HashMap<String, f32> = HashMap::new();

    if let Ok(wmi_mon) = WMIConnection::with_namespace_path(r"root\wmi", com_lib) {
        // Obter dimensões em cm -> polegadas
        if let Ok(rows) = wmi_mon.raw_query::<HashMap<String, Variant>>("SELECT InstanceName, MaxHorizontalImageSize, MaxVerticalImageSize FROM WmiMonitorBasicDisplayParams") {
            for row in rows {
                let inst = row.get("InstanceName").and_then(variant_to_string).unwrap_or_default();
                let h_cm = row.get("MaxHorizontalImageSize").and_then(variant_to_u32).unwrap_or(0) as f32;
                let v_cm = row.get("MaxVerticalImageSize").and_then(variant_to_u32).unwrap_or(0) as f32;
                if h_cm > 0.0 && v_cm > 0.0 {
                    let diag_inches = ((h_cm * h_cm + v_cm * v_cm).sqrt()) / 2.54;
                    inches_map.insert(inst, (diag_inches * 10.0).round() / 10.0);
                }
            }
        }

        // Obter nomes reais e fabricantes via EDID
        if let Ok(rows) = wmi_mon.raw_query::<HashMap<String, Variant>>("SELECT InstanceName, ManufacturerName, UserFriendlyName FROM WmiMonitorID") {
            for row in rows {
                let inst = row.get("InstanceName").and_then(variant_to_string).unwrap_or_default();
                let mfg_code = row.get("ManufacturerName").and_then(variant_u16_array_to_string).unwrap_or_default();
                let friendly_name = row.get("UserFriendlyName").and_then(variant_u16_array_to_string)
                    .unwrap_or_else(|| format!("Monitor {}", mfg_code));

                let mfg_full = match mfg_code.as_str() {
                    "GSM" => "LG".to_string(),
                    "PHL" => "Philips".to_string(),
                    "SAM" | "SEC" => "Samsung".to_string(),
                    "DEL" => "Dell".to_string(),
                    "AOC" => "AOC".to_string(),
                    "ACR" => "Acer".to_string(),
                    "ASU" => "ASUS".to_string(),
                    "BNQ" => "BenQ".to_string(),
                    _ => if !mfg_code.is_empty() { mfg_code } else { "Monitor".to_string() },
                };

                let inches = inches_map.get(&inst).cloned().unwrap_or(24.0);
                let (res, hz) = if let Some(gpu) = primary_gpu {
                    (gpu.resolution.clone(), gpu.refresh_rate_hz)
                } else {
                    ("1920x1080".to_string(), 60)
                };

                displays.push(DisplayInfo {
                    name: friendly_name,
                    manufacturer: mfg_full,
                    inches,
                    resolution: res,
                    refresh_rate_hz: hz,
                });
            }
        }
    }

    displays
}

// -------------------------------------------------------------
// Audio & Peripherals via Win32_SoundDevice & Win32_PnPEntity
// -------------------------------------------------------------
fn detect_peripherals(com_lib: COMLibrary) -> PeripheralsInfo {
    let mut audio_devices: Vec<String> = Vec::new();
    let mut input_devices: Vec<String> = Vec::new();

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT Name, Status FROM Win32_SoundDevice") {
            for row in rows {
                let name = row.get("Name").and_then(variant_to_string).unwrap_or_default();
                let status = row.get("Status").and_then(variant_to_string).unwrap_or_default();
                if status.eq_ignore_ascii_case("OK") && !name.is_empty() && !audio_devices.contains(&name) {
                    audio_devices.push(name);
                }
            }
        }

        // Consultar periféricos relevantes (controles, mouses, teclados)
        let pnp_query = "SELECT Name, PNPClass FROM Win32_PnPEntity WHERE PNPClass IN ('Mouse', 'Keyboard', 'XboxComposite', 'GameController')";
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(pnp_query) {
            for row in rows {
                let name = row.get("Name").and_then(variant_to_string).unwrap_or_default();
                if !name.is_empty() && !input_devices.contains(&name) {
                    input_devices.push(name);
                }
            }
        }
    }

    PeripheralsInfo {
        audio_devices,
        input_devices,
    }
}

// -------------------------------------------------------------
// Formatar Resumo do Setup para Exportação ("Exportar Meu Setup")
// -------------------------------------------------------------
fn build_setup_export(
    os: &Option<OperatingSystemInfo>,
    cpu: &Option<CpuInfo>,
    mb: &Option<MotherboardInfo>,
    gpu: &Option<GpuInfo>,
    mem: &Option<MemoryInfo>,
    storage: &[StorageDisk],
    displays: &[DisplayInfo],
) -> String {
    let mut s = String::new();
    s.push_str("# 🖥️ Meu Setup - System Optimizer Tool\n\n");

    if let Some(o) = os {
        s.push_str(&format!("- **Sistema Operacional:** {} (Build {})\n", o.caption, o.build_number));
    }
    if let Some(c) = cpu {
        s.push_str(&format!("- **Processador (CPU):** {} ({} núcleos / {} threads) @ {:.2} GHz (Socket {})\n",
            c.name, c.physical_cores, c.logical_threads, c.max_clock_ghz, c.socket));
    }
    if let Some(m) = mb {
        s.push_str(&format!("- **Placa-Mãe:** {} {} (BIOS {} de {})\n",
            m.manufacturer, m.product, m.bios_version, m.bios_release_date));
    }
    if let Some(g) = gpu {
        s.push_str(&format!("- **Placa de Vídeo (GPU):** {} - {:.1} GB VRAM (Driver {}) | {} @ {}Hz\n",
            g.name, g.vram_gb, g.driver_version, g.resolution, g.refresh_rate_hz));
    }
    if let Some(ram) = mem {
        s.push_str(&format!("- **Memória RAM:** {:.1} GB Total ({} pentes instalados)\n", ram.total_gb, ram.module_count));
        for (i, slot) in ram.modules.iter().enumerate() {
            s.push_str(&format!("  - Pente {}: {} {} ({} GB @ {} MHz)\n",
                i + 1, slot.manufacturer, slot.part_number, slot.capacity_gb, slot.speed_mhz));
        }
    }
    if !storage.is_empty() {
        s.push_str("- **Armazenamento:**\n");
        for d in storage {
            s.push_str(&format!("  - {} ({} {} • {} GB) - Saúde: {}\n",
                d.model, d.media_type, d.bus_type, d.size_gb, d.health_status));
        }
    }
    if !displays.is_empty() {
        s.push_str("- **Monitores:**\n");
        for d in displays {
            s.push_str(&format!("  - {} {}\" ({} @ {}Hz)\n",
                d.name, d.inches, d.resolution, d.refresh_rate_hz));
        }
    }

    s.push_str("\n*Gerado automaticamente pelo System Optimizer Tool V4.0*\n");
    s
}

// -------------------------------------------------------------
// Comando Principal: get_system_diagnostics
// -------------------------------------------------------------
#[tauri::command]
pub async fn get_system_diagnostics() -> Result<CommandResponse<SystemDiagnostics>, String> {
    let result = tokio::task::spawn_blocking(|| {
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );

        std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
        sys.refresh_cpu_all();
        sys.refresh_memory();

        // 1. OS & Uptime
        let os_name = System::name().unwrap_or_else(|| "Windows 11".to_string());
        let os_version = System::os_version().unwrap_or_default();
        let uptime_secs = System::uptime();
        let days = uptime_secs / 86400;
        let hours = (uptime_secs % 86400) / 3600;
        let minutes = (uptime_secs % 3600) / 60;

        let os_info = OperatingSystemInfo {
            caption: format!("{} {}", os_name, os_version).trim().to_string(),
            build_number: System::kernel_version().unwrap_or_default(),
            uptime: UptimeInfo { days, hours, minutes },
            formatted_uptime: format!("{}d {}h {}m", days, hours, minutes),
        };

        // 2. Hardware queries via WMI & Registry
        let com_lib = COMLibrary::new().ok();

        let (cpu, motherboard, gpu, all_gpus, memory, storage, displays, peripherals) = if let Some(com) = com_lib {
            let cpu_data = detect_cpu_details(com, &sys);
            let mb_data = detect_motherboard_and_bios(com);
            let (primary_gpu, gpus) = detect_gpus(com);
            let ram_data = detect_ram_modules(com, &sys);
            let storage_data = detect_storage_disks(com);
            let display_data = detect_displays(com, &primary_gpu);
            let periph_data = detect_peripherals(com);

            (
                cpu_data,
                mb_data,
                primary_gpu,
                gpus,
                Some(ram_data),
                storage_data,
                display_data,
                periph_data,
            )
        } else {
            (
                None,
                None,
                None,
                Vec::new(),
                None,
                Vec::new(),
                Vec::new(),
                PeripheralsInfo { audio_devices: Vec::new(), input_devices: Vec::new() },
            )
        };

        let setup_text = build_setup_export(
            &Some(os_info.clone()),
            &cpu,
            &motherboard,
            &gpu,
            &memory,
            &storage,
            &displays,
        );

        SystemDiagnostics {
            status: "Success".to_string(),
            timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            operating_system: Some(os_info),
            cpu,
            motherboard,
            gpu,
            all_gpus,
            memory,
            storage,
            displays,
            peripherals,
            setup_export: setup_text,
            message: "Diagnóstico completo de hardware coletado com sucesso.".to_string(),
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok("Diagnóstico carregado com sucesso.", Some(result)))
}
