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
    pub current_clock_ghz: f32,
    pub max_clock_ghz: f32,
    pub boost_active: bool,
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
    pub resizable_bar: bool,
    pub whql_signed: bool,
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
    pub memory_type: String,
    pub voltage: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInfo {
    pub total_gb: f32,
    pub used_gb: f32,
    pub usage_percent: f32,
    pub module_count: usize,
    pub modules: Vec<RamSlot>,
    pub xmp_active: bool,
    pub xmp_status: String,
    pub xmp_alert: bool,
    pub xmp_message: String,
    pub memory_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageDisk {
    pub disk_number: u32,
    pub model: String,
    pub size_gb: u64,
    pub free_gb: u64,
    pub used_gb: u64,
    pub usage_percent: f32,
    pub drive_letters: Vec<String>,
    pub media_type: String,
    pub bus_type: String,
    pub health_status: String,
    pub serial_number: String,
    pub firmware_revision: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogicalVolume {
    pub letter: String,
    pub label: String,
    pub file_system: String,
    pub kind: String,
    pub total_gb: u64,
    pub free_gb: u64,
    pub used_gb: u64,
    pub usage_percent: f32,
    pub physical_disk_model: String,
    pub physical_disk_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub name: String,
    pub manufacturer: String,
    pub inches: f32,
    pub resolution: String,
    pub refresh_rate_hz: u32,
    pub is_internal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeripheralsInfo {
    pub audio_devices: Vec<String>,
    pub input_devices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub status: String,
    pub charge_percent: u32,
    pub is_charging: bool,
    pub health_percent: f32,
    pub wear_level_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityAndBootInfo {
    pub bios_mode: String,        // "UEFI" or "Legacy"
    pub secure_boot: bool,
    pub tpm_active: bool,
    pub tpm_version: String,      // "TPM 2.0", "TPM 1.2", "Disabled"
    pub vbs_active: bool,         // Core Isolation / HVCI
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsLicenseInfo {
    pub activation_status: String, // "Activated", "OEM", "Volume", "NotActivated"
    pub license_type: String,      // "Digital / Retail", "OEM", "Volume"
    pub product_key: String,
    pub masked_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDiagnostics {
    pub status: String,
    pub timestamp: String,
    pub device_type: String, // "Desktop" or "Laptop"
    pub battery: Option<BatteryInfo>,
    pub operating_system: Option<OperatingSystemInfo>,
    pub cpu: Option<CpuInfo>,
    pub motherboard: Option<MotherboardInfo>,
    pub gpu: Option<GpuInfo>,
    pub all_gpus: Vec<GpuInfo>,
    pub memory: Option<MemoryInfo>,
    pub storage: Vec<StorageDisk>,
    pub logical_volumes: Vec<LogicalVolume>,
    pub displays: Vec<DisplayInfo>,
    pub peripherals: PeripheralsInfo,
    pub security: SecurityAndBootInfo,
    pub license: WindowsLicenseInfo,
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
        Variant::UI2(n) => Some(n.to_string()),
        Variant::UI1(n) => Some(n.to_string()),
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
// Device Type (Desktop vs Laptop) & Battery Health Detection
// -------------------------------------------------------------
fn detect_chassis_and_battery(com_lib: COMLibrary) -> (String, Option<BatteryInfo>) {
    let mut is_laptop = false;
    let mut battery_info: Option<BatteryInfo> = None;

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        // 1. Check Win32_SystemEnclosure.ChassisTypes
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT ChassisTypes FROM Win32_SystemEnclosure") {
            for row in rows {
                if let Some(Variant::Array(arr)) = row.get("ChassisTypes") {
                    for item in arr {
                        if let Some(code) = variant_to_u32(item) {
                            // 8=Portable, 9=Laptop, 10=Notebook, 11=Hand Held, 14=Sub Notebook, 30=Tablet, 31=Convertible, 32=Detachable
                            if matches!(code, 8 | 9 | 10 | 11 | 12 | 14 | 18 | 21 | 30 | 31 | 32) {
                                is_laptop = true;
                            }
                        }
                    }
                }
            }
        }

        // 2. Check Win32_Battery
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT BatteryStatus, EstimatedChargeRemaining, DesignCapacity, FullChargeCapacity FROM Win32_Battery") {
            if let Some(row) = rows.first() {
                is_laptop = true;
                let bat_status_code = row.get("BatteryStatus").and_then(variant_to_u32).unwrap_or(2);
                let charge_pct = row.get("EstimatedChargeRemaining").and_then(variant_to_u32).unwrap_or(100);
                let is_charging = matches!(bat_status_code, 2 | 3 | 6 | 7 | 8 | 9);

                let status_str = match bat_status_code {
                    1 => "Discharging".to_string(),
                    2 => "AC Power".to_string(),
                    3 => "Fully Charged".to_string(),
                    6 | 7 | 8 | 9 => "Charging".to_string(),
                    _ => "AC Power".to_string(),
                };

                let mut design_cap = row.get("DesignCapacity").and_then(variant_to_u64).unwrap_or(0);
                let mut full_cap = row.get("FullChargeCapacity").and_then(variant_to_u64).unwrap_or(0);

                // Query root\wmi for accurate BatteryStaticData & BatteryFullChargedCapacity if needed
                if design_cap == 0 || full_cap == 0 {
                    if let Ok(wmi_root) = WMIConnection::with_namespace_path(r"root\wmi", com_lib) {
                        if let Ok(stat_rows) = wmi_root.raw_query::<HashMap<String, Variant>>("SELECT DesignedCapacity FROM BatteryStaticData") {
                            if let Some(r) = stat_rows.first() {
                                design_cap = r.get("DesignedCapacity").and_then(variant_to_u64).unwrap_or(design_cap);
                            }
                        }
                        if let Ok(full_rows) = wmi_root.raw_query::<HashMap<String, Variant>>("SELECT FullChargedCapacity FROM BatteryFullChargedCapacity") {
                            if let Some(r) = full_rows.first() {
                                full_cap = r.get("FullChargedCapacity").and_then(variant_to_u64).unwrap_or(full_cap);
                            }
                        }
                    }
                }

                let (health_pct, wear_pct) = if design_cap > 0 && full_cap > 0 && full_cap <= design_cap {
                    let health = ((full_cap as f32 / design_cap as f32) * 1000.0).round() / 10.0;
                    let wear = ((100.0 - health) * 10.0).round() / 10.0;
                    (health, wear.max(0.0))
                } else {
                    (100.0, 0.0)
                };

                battery_info = Some(BatteryInfo {
                    status: status_str,
                    charge_percent: charge_pct.min(100),
                    is_charging,
                    health_percent: health_pct,
                    wear_level_percent: wear_pct,
                });
            }
        }
    }

    let device_type = if is_laptop {
        "Laptop".to_string()
    } else {
        "Desktop".to_string()
    };

    (device_type, battery_info)
}

// -------------------------------------------------------------
// GPU 64-bit VRAM + Resizable BAR Detection
// -------------------------------------------------------------
fn detect_gpus(com_lib: COMLibrary) -> (Option<GpuInfo>, Vec<GpuInfo>) {
    let mut reg_vram_map: HashMap<String, (u64, String, bool)> = HashMap::new(); // desc -> (vram_mb, driver_ver, rebar)
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let class_path = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}";

    if let Ok(class_key) = hklm.open_subkey_with_flags(class_path, KEY_READ) {
        for subkey_name in class_key.enum_keys().filter_map(|k| k.ok()) {
            if subkey_name.chars().all(|c| c.is_ascii_digit()) {
                if let Ok(sub_key) = class_key.open_subkey_with_flags(&subkey_name, KEY_READ) {
                    let desc: String = sub_key.get_value("DriverDesc").unwrap_or_default();
                    let ver: String = sub_key.get_value("DriverVersion").unwrap_or_default();

                    let mut bytes_vram: u64 = 0;
                    if let Ok(qw) = sub_key.get_value::<u64, _>("HardwareInformation.qwMemorySize") {
                        bytes_vram = qw;
                    } else if let Ok(raw) = sub_key.get_raw_value("HardwareInformation.qwMemorySize") {
                        if raw.bytes.len() >= 8 {
                            bytes_vram = u64::from_le_bytes(raw.bytes[0..8].try_into().unwrap_or([0; 8]));
                        }
                    }

                    if bytes_vram == 0 {
                        if let Ok(dw) = sub_key.get_value::<u32, _>("HardwareInformation.MemorySize") {
                            bytes_vram = dw as u64;
                        }
                    }

                    // Check Resizable BAR / Smart Access Memory indicators in registry
                    let rebar = sub_key.get_value::<u32, _>("KMD_EnableReBar").map(|v| v == 1).unwrap_or(false)
                        || sub_key.get_value::<u32, _>("EnableResizableBar").map(|v| v == 1).unwrap_or(false)
                        || (bytes_vram >= 8 * 1024 * 1024 * 1024);

                    if !desc.is_empty() && bytes_vram > 0 {
                        let mb = bytes_vram / (1024 * 1024);
                        reg_vram_map.insert(desc.clone(), (mb, ver.clone(), rebar));
                        if !ver.is_empty() {
                            reg_vram_map.insert(ver, (mb, desc, rebar));
                        }
                    }
                }
            }
        }
    }

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

                let mut vram_mb = 0u64;
                let mut rebar = false;

                if let Some(&(mb, _, rb)) = reg_vram_map.get(&name) {
                    vram_mb = mb;
                    rebar = rb;
                } else if !driver_ver.is_empty() {
                    if let Some(&(mb, _, rb)) = reg_vram_map.get(&driver_ver) {
                        vram_mb = mb;
                        rebar = rb;
                    }
                }

                if vram_mb == 0 {
                    for (reg_name, &(mb, _, rb)) in &reg_vram_map {
                        if name.contains(reg_name) || reg_name.contains(&name) {
                            vram_mb = mb;
                            rebar = rb;
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

                let vram_gb = (vram_mb as f32) / 1024.0;

                gpus.push(GpuInfo {
                    name,
                    vram_mb,
                    vram_gb: (vram_gb * 10.0).round() / 10.0,
                    driver_version: driver_ver,
                    resolution: res_str,
                    refresh_rate_hz: hz,
                    is_primary: false,
                    resizable_bar: rebar,
                    whql_signed: true,
                });
            }
        }
    }

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
// CPU Details + Boost/Overclock Detection via Win32_Processor
// -------------------------------------------------------------
fn detect_cpu_details(com_lib: COMLibrary, sys: &System) -> Option<CpuInfo> {
    let brand = sys.cpus().first().map(|c| c.brand().trim().to_string()).unwrap_or_default();
    let global_usage = sys.global_cpu_usage();
    let physical_cores = sys.physical_core_count().unwrap_or_else(|| sys.cpus().len());
    let logical_threads = sys.cpus().len();
    let sys_freq_mhz = sys.cpus().first().map(|c| c.frequency() as u32).unwrap_or(0);

    let mut mfg = String::new();
    let mut base_clock_mhz = 0u32;
    let mut current_clock_mhz = 0u32;
    let mut l3_kb = 0u32;
    let mut socket = String::new();

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT Manufacturer, MaxClockSpeed, CurrentClockSpeed, L3CacheSize, SocketDesignation FROM Win32_Processor") {
            if let Some(row) = rows.first() {
                mfg = row.get("Manufacturer").and_then(variant_to_string).unwrap_or_default();
                base_clock_mhz = row.get("MaxClockSpeed").and_then(variant_to_u32).unwrap_or(0);
                current_clock_mhz = row.get("CurrentClockSpeed").and_then(variant_to_u32).unwrap_or(0);
                l3_kb = row.get("L3CacheSize").and_then(variant_to_u32).unwrap_or(0);
                socket = row.get("SocketDesignation").and_then(variant_to_string).unwrap_or_default();
            }
        }
    }

    if base_clock_mhz == 0 {
        base_clock_mhz = sys_freq_mhz;
    }
    if current_clock_mhz == 0 {
        current_clock_mhz = sys_freq_mhz.max(base_clock_mhz);
    }

    let base_ghz = ((base_clock_mhz as f32) / 1000.0 * 100.0).round() / 100.0;
    let current_ghz = ((current_clock_mhz as f32) / 1000.0 * 100.0).round() / 100.0;
    let max_ghz = current_ghz.max(base_ghz);
    let boost_active = current_clock_mhz >= base_clock_mhz && base_clock_mhz > 0;
    let l3_mb = l3_kb / 1024;

    Some(CpuInfo {
        name: if !brand.is_empty() { brand } else { "Processador x86_64".to_string() },
        manufacturer: mfg,
        usage_percent: (global_usage * 10.0).round() / 10.0,
        physical_cores,
        logical_threads,
        base_clock_ghz: base_ghz,
        current_clock_ghz: current_ghz,
        max_clock_ghz: max_ghz,
        boost_active,
        l3_cache_mb: l3_mb,
        socket,
    })
}

// -------------------------------------------------------------
// RAM Slots, BankLabel + DeviceLocator, DDR Type, Voltage & XMP
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
    let mut xmp_active = false;
    let mut xmp_message = String::new();
    let mut global_mem_type = "DDR4".to_string();

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        let query = "SELECT DeviceLocator, BankLabel, Manufacturer, PartNumber, Capacity, ConfiguredClockSpeed, Speed, SMBIOSMemoryType, ConfiguredVoltage FROM Win32_PhysicalMemory";
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(query) {
            let mut seen_labels: HashMap<String, usize> = HashMap::new();

            for (idx, row) in rows.iter().enumerate() {
                let raw_locator = row.get("DeviceLocator").and_then(variant_to_string)
                    .unwrap_or_else(|| format!("DIMM {}", idx + 1));
                let bank = row.get("BankLabel").and_then(variant_to_string).unwrap_or_default();
                let mfg = row.get("Manufacturer").and_then(variant_to_string).unwrap_or_else(|| "Generic".to_string());
                let part = row.get("PartNumber").and_then(variant_to_string).unwrap_or_default();

                // Concatenate BankLabel + DeviceLocator so slots never repeat identically
                let mut combined_slot = if !bank.is_empty() && !raw_locator.eq_ignore_ascii_case(&bank) {
                    format!("{} • {}", bank, raw_locator)
                } else {
                    raw_locator.clone()
                };

                let count = seen_labels.entry(combined_slot.clone()).or_insert(0);
                *count += 1;
                if *count > 1 {
                    combined_slot = format!("{} (#{})", combined_slot, idx + 1);
                }

                let cap_bytes = row.get("Capacity").and_then(variant_to_u64).unwrap_or(0);
                let cap_gb = (cap_bytes / (1024 * 1024 * 1024)) as u32;

                let speed = row.get("ConfiguredClockSpeed").and_then(variant_to_u32)
                    .or_else(|| row.get("Speed").and_then(variant_to_u32))
                    .unwrap_or(0);

                let smbios_type = row.get("SMBIOSMemoryType").and_then(variant_to_u32).unwrap_or(0);
                let mem_type = match smbios_type {
                    24 => "DDR3".to_string(),
                    26 => "DDR4".to_string(),
                    30 => "LPDDR4".to_string(),
                    34 => "DDR5".to_string(),
                    35 => "LPDDR5".to_string(),
                    _ => {
                        if speed >= 4400 {
                            "DDR5".to_string()
                        } else if speed >= 1866 {
                            "DDR4".to_string()
                        } else {
                            "DDR3".to_string()
                        }
                    }
                };
                global_mem_type = mem_type.clone();

                let raw_mv = row.get("ConfiguredVoltage").and_then(variant_to_u32).unwrap_or(0);
                let voltage = if raw_mv >= 800 && raw_mv <= 2000 {
                    format!("{:.2}V", (raw_mv as f32) / 1000.0)
                } else if mem_type.contains("DDR5") {
                    if speed >= 5200 { "1.25V".to_string() } else { "1.10V".to_string() }
                } else if speed >= 2666 {
                    "1.35V".to_string()
                } else {
                    "1.20V".to_string()
                };

                // Check XMP / DOCP / EXPO status
                if mem_type.contains("DDR5") {
                    if speed >= 5200 {
                        xmp_active = true;
                    } else if speed > 0 {
                        xmp_alert = true;
                        xmp_message = format!("{} @ {} MHz (JEDEC Base)", mem_type, speed);
                    }
                } else if mem_type.contains("DDR4") {
                    if speed >= 2666 {
                        xmp_active = true;
                    } else if speed > 0 && cap_gb >= 8 {
                        xmp_alert = true;
                        xmp_message = format!("{} @ {} MHz (JEDEC Base)", mem_type, speed);
                    }
                } else if speed >= 1600 {
                    xmp_active = true;
                }

                modules.push(RamSlot {
                    slot: combined_slot,
                    bank,
                    manufacturer: mfg,
                    part_number: part,
                    capacity_gb: cap_gb,
                    speed_mhz: speed,
                    memory_type: mem_type,
                    voltage,
                });
            }
        }
    }

    let top_speed = modules.first().map(|m| m.speed_mhz).unwrap_or(0);
    let xmp_status = if xmp_active {
        format!("XMP / DOCP / EXPO ({} MHz)", top_speed)
    } else if top_speed > 0 {
        format!("JEDEC ({} MHz)", top_speed)
    } else {
        "Standard".to_string()
    };

    MemoryInfo {
        total_gb: (total_gb * 10.0).round() / 10.0,
        used_gb: (used_gb * 10.0).round() / 10.0,
        usage_percent: usage_pct,
        module_count: modules.len(),
        modules,
        xmp_active,
        xmp_status,
        xmp_alert,
        xmp_message,
        memory_type: global_mem_type,
    }
}

// -------------------------------------------------------------
// Storage Disks: Exact Mapping PhysicalDisk -> Partition -> LogicalDisk
// -------------------------------------------------------------
fn detect_storage_disks(com_lib: COMLibrary) -> (Vec<StorageDisk>, Vec<LogicalVolume>) {
    let mut disks: Vec<StorageDisk> = Vec::new();

    // 1. Collect exact free space, size, label, and filesystem per drive letter ("C:", "D:", "E:", etc.)
    // Map: "C:" -> (total_bytes, free_bytes, label, file_system, drive_type_code)
    let mut logical_map: HashMap<String, (u64, u64, String, String, u32)> = HashMap::new();

    let sysinfo_disks = Disks::new_with_refreshed_list();
    for d in sysinfo_disks.list() {
        let mount = d.mount_point().to_string_lossy().to_uppercase();
        let letter = mount.trim_end_matches('\\').trim().to_string();
        if !letter.is_empty() {
            let fs = d.file_system().to_string_lossy().to_string();
            let label = d.name().to_string_lossy().to_string();
            logical_map.insert(
                letter,
                (
                    d.total_space(),
                    d.available_space(),
                    label,
                    if fs.is_empty() { "NTFS".to_string() } else { fs },
                    3,
                ),
            );
        }
    }

    // Map physical disk number (0, 1, 2...) -> Vec<DriveLetter> ("C:", "D:")
    let mut disk_to_letters: HashMap<u32, Vec<String>> = HashMap::new();
    // Map physical disk number -> (serial_number, firmware_revision) from Win32_DiskDrive
    let mut disk_serial_fw: HashMap<u32, (String, String)> = HashMap::new();

    if let Ok(wmi_con) = WMIConnection::new(com_lib) {
        // Supplement logical_map from Win32_LogicalDisk
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(
            "SELECT DeviceID, VolumeName, FileSystem, DriveType, Size, FreeSpace FROM Win32_LogicalDisk",
        ) {
            for row in rows {
                if let Some(dev_id) = row.get("DeviceID").and_then(variant_to_string) {
                    let letter = dev_id.trim().to_uppercase();
                    let sz = row.get("Size").and_then(variant_to_u64).unwrap_or(0);
                    let fr = row.get("FreeSpace").and_then(variant_to_u64).unwrap_or(0);
                    let vol_name = row.get("VolumeName").and_then(variant_to_string).unwrap_or_default();
                    let fs = row
                        .get("FileSystem")
                        .and_then(variant_to_string)
                        .unwrap_or_else(|| "NTFS".to_string());
                    let dtype = row.get("DriveType").and_then(variant_to_u32).unwrap_or(3);
                    if sz > 0 {
                        logical_map.insert(letter, (sz, fr, vol_name, fs, dtype));
                    }
                }
            }
        }

        // Read SerialNumber and FirmwareRevision from Win32_DiskDrive
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(
            "SELECT Index, SerialNumber, FirmwareRevision FROM Win32_DiskDrive",
        ) {
            for row in rows {
                if let Some(idx) = row.get("Index").and_then(variant_to_u32) {
                    let sn = row
                        .get("SerialNumber")
                        .and_then(variant_to_string)
                        .unwrap_or_default();
                    let fw = row
                        .get("FirmwareRevision")
                        .and_then(variant_to_string)
                        .unwrap_or_default();
                    disk_serial_fw.insert(idx, (sn, fw));
                }
            }
        }

        // Map Disk #X -> Drive Letter via Win32_LogicalDiskToPartition
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(
            "SELECT Antecedent, Dependent FROM Win32_LogicalDiskToPartition",
        ) {
            for row in rows {
                let ant = row.get("Antecedent").and_then(variant_to_string).unwrap_or_default();
                let dep = row.get("Dependent").and_then(variant_to_string).unwrap_or_default();

                // Extract Disk number from 'Disk #0,'
                let disk_num_opt = ant.find("Disk #").and_then(|pos| {
                    let after = &ant[pos + 6..];
                    let digits: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
                    digits.parse::<u32>().ok()
                });

                // Extract Drive letter from 'DeviceID="C:"'
                let letter_opt = dep.rfind("DeviceID=\"").and_then(|pos| {
                    let after = &dep[pos + 10..];
                    let end = after.find('"')?;
                    Some(after[..end].trim().to_uppercase())
                });

                if let (Some(d_num), Some(letter)) = (disk_num_opt, letter_opt) {
                    let entry = disk_to_letters.entry(d_num).or_default();
                    if !entry.contains(&letter) {
                        entry.push(letter);
                    }
                }
            }
        }
    }

    // 2. Query MSFT_Partition & MSFT_PhysicalDisk in root\Microsoft\Windows\Storage
    if let Ok(wmi_storage) = WMIConnection::with_namespace_path(r"root\Microsoft\Windows\Storage", com_lib) {
        if let Ok(part_rows) = wmi_storage.raw_query::<HashMap<String, Variant>>(
            "SELECT DiskNumber, DriveLetter FROM MSFT_Partition",
        ) {
            for row in part_rows {
                if let Some(d_num) = row.get("DiskNumber").and_then(variant_to_u32) {
                    let letter_opt = match row.get("DriveLetter") {
                        Some(Variant::UI2(c)) if (*c as u8).is_ascii_alphabetic() => {
                            Some(format!("{}:", (*c as u8 as char).to_ascii_uppercase()))
                        }
                        Some(Variant::UI1(c)) if c.is_ascii_alphabetic() => {
                            Some(format!("{}:", (*c as char).to_ascii_uppercase()))
                        }
                        Some(Variant::String(s)) if !s.trim().is_empty() => {
                            let ch = s.trim().chars().next().unwrap_or(' ');
                            if ch.is_ascii_alphabetic() {
                                Some(format!("{}:", ch.to_ascii_uppercase()))
                            } else {
                                None
                            }
                        }
                        _ => None,
                    };

                    if let Some(letter) = letter_opt {
                        let entry = disk_to_letters.entry(d_num).or_default();
                        if !entry.contains(&letter) {
                            entry.push(letter);
                        }
                    }
                }
            }
        }

        let query = "SELECT DeviceId, FriendlyName, MediaType, BusType, Size, HealthStatus, SerialNumber, FirmwareVersion FROM MSFT_PhysicalDisk";
        if let Ok(rows) = wmi_storage.raw_query::<HashMap<String, Variant>>(query) {
            for (idx, row) in rows.iter().enumerate() {
                let disk_number = row
                    .get("DeviceId")
                    .and_then(variant_to_string)
                    .and_then(|s| s.trim().parse::<u32>().ok())
                    .unwrap_or(idx as u32);

                let model = row
                    .get("FriendlyName")
                    .and_then(variant_to_string)
                    .unwrap_or_else(|| format!("Physical Disk #{}", disk_number));

                let size_bytes = row.get("Size").and_then(variant_to_u64).unwrap_or(0);
                let mut size_gb = size_bytes / (1024 * 1024 * 1024);

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
                        if bus_type == "NVMe" {
                            "NVMe".to_string()
                        } else {
                            "SSD".to_string()
                        }
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

                let (fallback_sn, fallback_fw) = disk_serial_fw
                    .get(&disk_number)
                    .cloned()
                    .unwrap_or_else(|| (String::new(), String::new()));

                let serial_number = row
                    .get("SerialNumber")
                    .and_then(variant_to_string)
                    .filter(|s| !s.is_empty())
                    .unwrap_or(fallback_sn);

                let firmware_revision = row
                    .get("FirmwareVersion")
                    .and_then(variant_to_string)
                    .filter(|s| !s.is_empty())
                    .unwrap_or(fallback_fw);

                let mut letters = disk_to_letters.get(&disk_number).cloned().unwrap_or_default();
                letters.sort();

                // Calculate exact free space from the logical volumes mounted on this physical disk
                let mut free_bytes_sum = 0u64;
                let mut total_logical_bytes = 0u64;
                for letter in &letters {
                    if let Some(&(vol_total, vol_free, _, _, _)) = logical_map.get(letter) {
                        total_logical_bytes += vol_total;
                        free_bytes_sum += vol_free;
                    }
                }

                if size_gb == 0 && total_logical_bytes > 0 {
                    size_gb = total_logical_bytes / (1024 * 1024 * 1024);
                }

                let free_gb = free_bytes_sum / (1024 * 1024 * 1024);
                let used_gb = size_gb.saturating_sub(free_gb);
                let usage_percent = if size_gb > 0 {
                    ((used_gb as f32 / size_gb as f32) * 1000.0).round() / 10.0
                } else {
                    0.0
                };

                disks.push(StorageDisk {
                    disk_number,
                    model,
                    size_gb,
                    free_gb,
                    used_gb,
                    usage_percent,
                    drive_letters: letters,
                    media_type,
                    bus_type,
                    health_status,
                    serial_number,
                    firmware_revision,
                });
            }
        }
    }

    // Sort so disk with C: comes first, then by disk_number
    disks.sort_by(|a, b| {
        let a_has_c = a.drive_letters.iter().any(|l| l == "C:");
        let b_has_c = b.drive_letters.iter().any(|l| l == "C:");
        b_has_c.cmp(&a_has_c).then(a.disk_number.cmp(&b.disk_number))
    });

    // Build LogicalVolume list mapped to physical disks
    let mut volumes: Vec<LogicalVolume> = Vec::new();
    for (letter, (total_b, free_b, label, fs, dtype)) in &logical_map {
        let total_gb = total_b / (1024 * 1024 * 1024);
        if total_gb == 0 {
            continue;
        }
        let free_gb = free_b / (1024 * 1024 * 1024);
        let used_gb = total_gb.saturating_sub(free_gb);
        let usage_percent = ((used_b_ratio(*total_b, *free_b) * 1000.0).round()) / 10.0;

        let matched_disk = disks.iter().find(|d| d.drive_letters.contains(letter));
        let physical_disk_model = matched_disk
            .map(|d| d.model.clone())
            .unwrap_or_else(|| "Volume Lógico".to_string());
        let physical_disk_type = matched_disk
            .map(|d| format!("{} ({})", d.media_type, d.bus_type))
            .unwrap_or_else(|| "Fixo".to_string());

        let kind = match dtype {
            2 => "Removível".to_string(),
            4 => "Rede".to_string(),
            5 => "Óptico".to_string(),
            _ => "Fixo".to_string(),
        };

        volumes.push(LogicalVolume {
            letter: letter.clone(),
            label: if label.is_empty() {
                " Volume Local".trim().to_string()
            } else {
                label.clone()
            },
            file_system: fs.clone(),
            kind,
            total_gb,
            free_gb,
            used_gb,
            usage_percent,
            physical_disk_model,
            physical_disk_type,
        });
    }

    volumes.sort_by(|a, b| a.letter.cmp(&b.letter));

    (disks, volumes)
}

fn used_b_ratio(total: u64, free: u64) -> f32 {
    if total == 0 {
        return 0.0;
    }
    let used = total.saturating_sub(free);
    (used as f64 / total as f64) as f32
}

// -------------------------------------------------------------
// Displays & Monitors via WmiMonitorID & WmiMonitorBasicDisplayParams
// -------------------------------------------------------------
fn detect_displays(com_lib: COMLibrary, primary_gpu: &Option<GpuInfo>, is_laptop: bool) -> Vec<DisplayInfo> {
    let mut displays: Vec<DisplayInfo> = Vec::new();
    let mut inches_map: HashMap<String, f32> = HashMap::new();

    if let Ok(wmi_mon) = WMIConnection::with_namespace_path(r"root\wmi", com_lib) {
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

        if let Ok(rows) = wmi_mon.raw_query::<HashMap<String, Variant>>("SELECT InstanceName, ManufacturerName, UserFriendlyName FROM WmiMonitorID") {
            for (idx, row) in rows.iter().enumerate() {
                let inst = row.get("InstanceName").and_then(variant_to_string).unwrap_or_default();
                let mfg_code = row.get("ManufacturerName").and_then(variant_u16_array_to_string).unwrap_or_default();
                let friendly_name = row.get("UserFriendlyName").and_then(variant_u16_array_to_string)
                    .unwrap_or_else(|| {
                        if is_laptop && idx == 0 {
                            format!("Internal Display ({})", mfg_code)
                        } else {
                            format!("Monitor {}", mfg_code)
                        }
                    });

                let mfg_full = match mfg_code.as_str() {
                    "GSM" | "LGD" => "LG".to_string(),
                    "PHL" => "Philips".to_string(),
                    "SAM" | "SEC" | "SDC" => "Samsung".to_string(),
                    "DEL" => "Dell".to_string(),
                    "AOC" => "AOC".to_string(),
                    "ACR" => "Acer".to_string(),
                    "ASU" => "ASUS".to_string(),
                    "BNQ" => "BenQ".to_string(),
                    "BOE" => "BOE".to_string(),
                    "AUO" => "AU Optronics".to_string(),
                    "CMN" => "InnoLux".to_string(),
                    _ => if !mfg_code.is_empty() { mfg_code } else { "Display".to_string() },
                };

                let inches = inches_map.get(&inst).cloned().unwrap_or(if is_laptop && idx == 0 { 15.6 } else { 24.0 });
                let (res, hz) = if let Some(gpu) = primary_gpu {
                    (gpu.resolution.clone(), gpu.refresh_rate_hz)
                } else {
                    ("1920x1080".to_string(), 60)
                };

                let is_internal = is_laptop && (idx == 0 || inches <= 18.0 || matches!(mfg_full.as_str(), "BOE" | "AU Optronics" | "InnoLux"));

                displays.push(DisplayInfo {
                    name: friendly_name,
                    manufacturer: mfg_full,
                    inches,
                    resolution: res,
                    refresh_rate_hz: hz,
                    is_internal,
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
// Security, UEFI, Secure Boot, TPM & VBS Detection
// -------------------------------------------------------------
fn detect_security_and_boot(com_lib: Option<COMLibrary>) -> SecurityAndBootInfo {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // 1. Secure Boot & UEFI Mode
    let mut secure_boot = false;
    let mut bios_mode = "Legacy".to_string();

    if let Ok(sb_key) = hklm.open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\SecureBoot\State", KEY_READ) {
        bios_mode = "UEFI".to_string();
        if let Ok(val) = sb_key.get_value::<u32, _>("UEFISecureBootEnabled") {
            secure_boot = val == 1;
        }
    } else if let Ok(ctrl_key) = hklm.open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control", KEY_READ) {
        if let Ok(fw_type) = ctrl_key.get_value::<u32, _>("PEFirmwareType") {
            if fw_type == 2 {
                bios_mode = "UEFI".to_string();
            }
        }
    }

    // 2. TPM 2.0 Detection
    let mut tpm_active = false;
    let mut tpm_version = "Disabled".to_string();

    if let Some(com) = com_lib {
        if let Ok(wmi_tpm) = WMIConnection::with_namespace_path(r"root\cimv2\Security\MicrosoftTpm", com) {
            if let Ok(rows) = wmi_tpm.raw_query::<HashMap<String, Variant>>("SELECT IsEnabled_InitialValue, SpecVersion FROM Win32_Tpm") {
                if let Some(row) = rows.first() {
                    tpm_active = true;
                    let spec = row.get("SpecVersion").and_then(variant_to_string).unwrap_or_else(|| "2.0".to_string());
                    let ver_num = spec.split(',').next().unwrap_or("2.0").trim();
                    tpm_version = format!("TPM {}", ver_num);
                }
            }
        }
    }

    if !tpm_active {
        // Fallback registry check for TPM service/device
        if hklm.open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Services\TPM\WMI", KEY_READ).is_ok() {
            tpm_active = true;
            tpm_version = "TPM 2.0".to_string();
        }
    }

    // 3. Core Isolation / VBS / HVCI
    let mut vbs_active = false;
    if let Ok(hvci_key) = hklm.open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity", KEY_READ) {
        if let Ok(enabled) = hvci_key.get_value::<u32, _>("Enabled") {
            vbs_active = enabled == 1;
        }
    }

    SecurityAndBootInfo {
        bios_mode,
        secure_boot,
        tpm_active,
        tpm_version,
        vbs_active,
    }
}

// -------------------------------------------------------------
// Decode Windows Product Key from DigitalProductId or BIOS OEM
// -------------------------------------------------------------
fn decode_digital_product_id(digital_product_id: &[u8]) -> Option<String> {
    if digital_product_id.len() < 67 {
        return None;
    }

    let key_offset = 52;
    let mut buf = [0u8; 15];
    buf.copy_from_slice(&digital_product_id[key_offset..key_offset + 15]);

    let is_win8_or_later = ((buf[14] >> 3) & 1) != 0;
    buf[14] = (buf[14] & 0xF7) | ((is_win8_or_later as u8 & 2) << 2);

    const CHARS: &[u8] = b"BCDFGHJKMPQRTVWXY2346789";
    let mut key_chars = Vec::with_capacity(25);
    let mut last = 0usize;

    for _ in 0..25 {
        let mut cur: u32 = 0;
        for j in (0..15).rev() {
            cur = (cur << 8) ^ (buf[j] as u32);
            buf[j] = (cur / 24) as u8;
            cur %= 24;
        }
        key_chars.push(CHARS[cur as usize] as char);
        last = cur as usize;
    }

    key_chars.reverse();

    if is_win8_or_later {
        let insert_pos = last.min(key_chars.len().saturating_sub(1));
        if !key_chars.is_empty() {
            key_chars.remove(0);
            if insert_pos <= key_chars.len() {
                key_chars.insert(insert_pos, 'N');
            }
        }
    }

    if key_chars.len() == 25 {
        let s: String = key_chars.into_iter().collect();
        Some(format!(
            "{}-{}-{}-{}-{}",
            &s[0..5],
            &s[5..10],
            &s[10..15],
            &s[15..20],
            &s[20..25]
        ))
    } else {
        None
    }
}

fn detect_windows_license(com_lib: Option<COMLibrary>) -> WindowsLicenseInfo {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let mut product_key = String::new();
    let mut license_type = "Digital / Retail".to_string();

    // 1. Try OEM BIOS Key via WMI SoftwareLicensingService
    if let Some(com) = com_lib {
        if let Ok(wmi_con) = WMIConnection::new(com) {
            if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT OA3xOriginalProductKey FROM SoftwareLicensingService") {
                if let Some(row) = rows.first() {
                    if let Some(oem_key) = row.get("OA3xOriginalProductKey").and_then(variant_to_string) {
                        if oem_key.len() >= 25 {
                            product_key = oem_key;
                            license_type = "OEM (BIOS)".to_string();
                        }
                    }
                }
            }
        }
    }

    // 2. Try BackupProductKeyDefault in SoftwareProtectionPlatform
    if product_key.is_empty() {
        if let Ok(spp_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform", KEY_READ) {
            if let Ok(backup_key) = spp_key.get_value::<String, _>("BackupProductKeyDefault") {
                if backup_key.trim().len() >= 25 {
                    product_key = backup_key.trim().to_string();
                }
            }
        }
    }

    // 3. Try decoding DigitalProductId from CurrentVersion
    if product_key.is_empty() {
        if let Ok(cv_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", KEY_READ) {
            if let Ok(raw) = cv_key.get_raw_value("DigitalProductId") {
                if let Some(decoded) = decode_digital_product_id(&raw.bytes) {
                    if !decoded.starts_with("BBBBB") {
                        product_key = decoded;
                    }
                }
            }
            if let Ok(prod_id) = cv_key.get_value::<String, _>("ProductId") {
                if prod_id.contains("OEM") {
                    license_type = "OEM".to_string();
                }
            }
        }
    }

    let activation_status = if !product_key.is_empty() {
        "Activated".to_string()
    } else {
        "NotActivated".to_string()
    };

    let masked_key = if product_key.len() >= 29 {
        let last_segment = &product_key[product_key.len() - 5..];
        format!("*****-*****-*****-*****-{}", last_segment)
    } else {
        "*****-*****-*****-*****-*****".to_string()
    };

    WindowsLicenseInfo {
        activation_status,
        license_type,
        product_key,
        masked_key,
    }
}

// -------------------------------------------------------------
// Build Setup Export Markdown
// -------------------------------------------------------------
fn build_setup_export(
    device_type: &str,
    os: &Option<OperatingSystemInfo>,
    cpu: &Option<CpuInfo>,
    mb: &Option<MotherboardInfo>,
    gpu: &Option<GpuInfo>,
    mem: &Option<MemoryInfo>,
    storage: &[StorageDisk],
    displays: &[DisplayInfo],
    security: &SecurityAndBootInfo,
) -> String {
    let mut s = String::new();
    s.push_str("# 🖥️ Relatório de Setup — System Optimizer Tool\n\n");
    s.push_str(&format!("- **Tipo de Dispositivo:** {}\n", device_type));

    if let Some(o) = os {
        s.push_str(&format!("- **Sistema Operacional:** {} (Build {})\n", o.caption, o.build_number));
    }
    if let Some(c) = cpu {
        s.push_str(&format!(
            "- **Processador (CPU):** {} ({} núcleos / {} threads) | Base {:.2} GHz / Boost {:.2} GHz ({})\n",
            c.name, c.physical_cores, c.logical_threads, c.base_clock_ghz, c.max_clock_ghz, c.socket
        ));
    }
    if let Some(m) = mb {
        s.push_str(&format!(
            "- **Placa-Mãe:** {} {} (BIOS {} de {})\n",
            m.manufacturer, m.product, m.bios_version, m.bios_release_date
        ));
    }
    if let Some(g) = gpu {
        s.push_str(&format!(
            "- **Placa de Vídeo (GPU):** {} - {:.1} GB VRAM (Driver {}) | {} @ {}Hz\n",
            g.name, g.vram_gb, g.driver_version, g.resolution, g.refresh_rate_hz
        ));
    }
    if let Some(ram) = mem {
        let rounded_ram = ram.total_gb.round() as u64;
        s.push_str(&format!(
            "- **Memória RAM:** {} GB {} ({} pentes • {})\n",
            rounded_ram, ram.memory_type, ram.module_count, ram.xmp_status
        ));
        for slot in &ram.modules {
            s.push_str(&format!(
                "  - {}: {} {} ({} GB {} @ {} MHz • {})\n",
                slot.slot, slot.manufacturer, slot.part_number, slot.capacity_gb, slot.memory_type, slot.speed_mhz, slot.voltage
            ));
        }
    }
    if !storage.is_empty() {
        s.push_str("- **Armazenamento:**\n");
        for d in storage {
            let drives = if d.drive_letters.is_empty() {
                format!("Disk #{}", d.disk_number)
            } else {
                d.drive_letters.join(", ")
            };
            s.push_str(&format!(
                "  - [{}] {} ({} {} • {} GB Total / {} GB Livres • {:.1}% Usado) - Saúde: {}\n",
                drives, d.model, d.media_type, d.bus_type, d.size_gb, d.free_gb, d.usage_percent, d.health_status
            ));
        }
    }
    if !displays.is_empty() {
        s.push_str("- **Monitores / Displays:**\n");
        for d in displays {
            s.push_str(&format!(
                "  - {} {}\" ({} @ {}Hz)\n",
                d.name, d.inches, d.resolution, d.refresh_rate_hz
            ));
        }
    }
    s.push_str(&format!(
        "- **Segurança & Firmware:** BIOS {} | Secure Boot: {} | {} | VBS: {}\n",
        security.bios_mode,
        if security.secure_boot { "Ativo" } else { "Desativado" },
        security.tpm_version,
        if security.vbs_active { "Ativo" } else { "Desativado" }
    ));

    s.push_str("\n*Gerado automaticamente pelo System Optimizer Tool V6.0*\n");
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

        let com_lib = COMLibrary::new().ok();

        let (device_type, battery, cpu, motherboard, gpu, all_gpus, memory, storage, logical_volumes, displays, peripherals) = if let Some(com) = com_lib {
            let (dev_type, bat_data) = detect_chassis_and_battery(com);
            let is_laptop = dev_type == "Laptop";
            let cpu_data = detect_cpu_details(com, &sys);
            let mb_data = detect_motherboard_and_bios(com);
            let (primary_gpu, gpus) = detect_gpus(com);
            let ram_data = detect_ram_modules(com, &sys);
            let (storage_data, logical_vols) = detect_storage_disks(com);
            let display_data = detect_displays(com, &primary_gpu, is_laptop);
            let periph_data = detect_peripherals(com);

            (
                dev_type,
                bat_data,
                cpu_data,
                mb_data,
                primary_gpu,
                gpus,
                Some(ram_data),
                storage_data,
                logical_vols,
                display_data,
                periph_data,
            )
        } else {
            (
                "Desktop".to_string(),
                None,
                None,
                None,
                None,
                Vec::new(),
                None,
                Vec::new(),
                Vec::new(),
                Vec::new(),
                PeripheralsInfo { audio_devices: Vec::new(), input_devices: Vec::new() },
            )
        };

        let security = detect_security_and_boot(com_lib);
        let license = detect_windows_license(com_lib);

        let setup_text = build_setup_export(
            &device_type,
            &Some(os_info.clone()),
            &cpu,
            &motherboard,
            &gpu,
            &memory,
            &storage,
            &displays,
            &security,
        );

        SystemDiagnostics {
            status: "Success".to_string(),
            timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            device_type,
            battery,
            operating_system: Some(os_info),
            cpu,
            motherboard,
            gpu,
            all_gpus,
            memory,
            storage,
            logical_volumes,
            displays,
            peripherals,
            security,
            license,
            setup_export: setup_text,
            message: "Diagnóstico completo de hardware coletado com sucesso.".to_string(),
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok("Diagnóstico carregado com sucesso.", Some(result)))
}
