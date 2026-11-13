use std::collections::{HashMap, HashSet};
use std::fs;
use std::net::{SocketAddr, TcpStream};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use winreg::enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE};
use winreg::RegKey;
use wmi::{COMLibrary, Variant, WMIConnection};

use crate::state::CommandResponse;
use crate::utils::{emit_step, CREATE_NO_WINDOW};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriverInventoryItem {
    pub device_name: String,
    pub category: String,
    pub provider: String,
    pub version: String,
    pub date: String,
    pub signer: String,
    pub inf_name: String,
    pub status: String, // "OK", "Antigo", "Erro"
    pub error_code: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareErrorEvent {
    pub event_id: u32,
    pub source: String, // "WHEA-Logger", "Kernel-Power", "Display"
    pub severity: String, // "Crítico", "Alerta", "Aviso"
    pub timestamp: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuningAndErrorsReport {
    pub cpu_name: String,
    pub cpu_base_mhz: u32,
    pub cpu_current_mhz: u32,
    pub cpu_boost_ratio: f32,
    pub cpu_oc_active: bool,
    pub ram_speed_mhz: u32,
    pub ram_type: String,
    pub xmp_enabled: bool,
    pub active_power_plan_id: String, // "balanced", "high", "ultimate"
    pub active_power_plan_name: String,
    pub whea_error_count: u32,
    pub kernel_power_41_count: u32,
    pub gpu_reset_count: u32,
    pub recent_errors: Vec<HardwareErrorEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbDeviceEntry {
    pub instance_id: String,
    pub name: String,
    pub class_name: String,
    pub connected: bool,
    pub is_com_port: bool,
    pub status_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbScanResult {
    pub total_devices: usize,
    pub connected_count: usize,
    pub ghost_count: usize,
    pub reserved_com_ports: usize,
    pub devices: Vec<UsbDeviceEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbBackendInfo {
    pub name: String,
    pub detected: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RgbStatusReport {
    pub active_effect: String,
    pub active_color_hex: String,
    pub win11_dynamic_lighting_supported: bool,
    pub backends: Vec<RgbBackendInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakerDriverInfo {
    pub id: String,
    pub name: String,
    pub chip_family: String,
    pub description: String,
    pub bundled: bool,
    pub installed_in_store: bool,
    pub connected_devices: Vec<String>,
    pub vendor_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WingetAppItem {
    pub id: String,
    pub name: String,
    pub category: String, // "Navegadores", "Comunicação & Jogos", "Utilitários", "Runtimes & Diagnóstico"
    pub description: String,
    pub installed: bool,
}

fn variant_to_string(v: &Variant) -> Option<String> {
    match v {
        Variant::String(s) => {
            let t = s.trim().to_string();
            if t.is_empty() {
                None
            } else {
                Some(t)
            }
        }
        Variant::UI4(n) => Some(n.to_string()),
        Variant::UI8(n) => Some(n.to_string()),
        _ => None,
    }
}

fn variant_to_u32(v: &Variant) -> Option<u32> {
    match v {
        Variant::UI4(n) => Some(*n),
        Variant::UI2(n) => Some(*n as u32),
        Variant::UI1(n) => Some(*n as u32),
        Variant::I4(n) => Some(*n as u32),
        Variant::String(s) => s.trim().parse::<u32>().ok(),
        _ => None,
    }
}

// -------------------------------------------------------------
// 1. Driver Inventory Auditor (Win32_PnPSignedDriver)
// -------------------------------------------------------------
#[tauri::command]
pub async fn get_driver_inventory() -> Result<CommandResponse<Vec<DriverInventoryItem>>, String> {
    let items = tokio::task::spawn_blocking(|| {
        let mut list: Vec<DriverInventoryItem> = Vec::new();
        let com_lib = match COMLibrary::new() {
            Ok(c) => c,
            Err(_) => return list,
        };
        let wmi_con = match WMIConnection::new(com_lib) {
            Ok(w) => w,
            Err(_) => return list,
        };

        // Map DeviceID -> ConfigManagerErrorCode from Win32_PnPEntity
        let mut err_map: HashMap<String, u32> = HashMap::new();
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(
            "SELECT DeviceID, ConfigManagerErrorCode FROM Win32_PnPEntity WHERE ConfigManagerErrorCode <> 0",
        ) {
            for row in rows {
                if let (Some(id), Some(code)) = (
                    row.get("DeviceID").and_then(variant_to_string),
                    row.get("ConfigManagerErrorCode").and_then(variant_to_u32),
                ) {
                    err_map.insert(id.to_uppercase(), code);
                }
            }
        }

        let query = "SELECT DeviceName, DeviceID, DeviceClass, DriverProviderName, DriverVersion, DriverDate, Signer, InfName FROM Win32_PnPSignedDriver WHERE DeviceName IS NOT NULL";
        if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(query) {
            let mut seen = std::collections::HashSet::new();
            for row in rows {
                let device_name = row
                    .get("DeviceName")
                    .and_then(variant_to_string)
                    .unwrap_or_default();
                if device_name.is_empty()
                    || device_name.starts_with("WAN Miniport")
                    || device_name.contains("Generic PnP")
                    || device_name.contains("Volume Genérico")
                {
                    continue;
                }

                let dev_class = row
                    .get("DeviceClass")
                    .and_then(variant_to_string)
                    .unwrap_or_default()
                    .to_uppercase();

                let category = match dev_class.as_str() {
                    "DISPLAY" => "Vídeo / GPU",
                    "NET" => "Rede / Wi-Fi",
                    "MEDIA" | "AUDIOENDPOINT" => "Áudio",
                    "PORTS" | "USB" => "USB / Serial",
                    "SCSIADAPTER" | "HDC" | "NVME" => "Armazenamento",
                    "SYSTEM" | "PROCESSOR" => "Chipset / Sistema",
                    _ => continue,
                };

                let provider = row
                    .get("DriverProviderName")
                    .and_then(variant_to_string)
                    .unwrap_or_else(|| "Microsoft".to_string());
                if category == "Chipset / Sistema" && provider.eq_ignore_ascii_case("Microsoft") {
                    continue;
                }

                if !seen.insert(format!("{}:{}", category, device_name)) {
                    continue;
                }

                let version = row
                    .get("DriverVersion")
                    .and_then(variant_to_string)
                    .unwrap_or_else(|| "N/A".to_string());
                let raw_date = row
                    .get("DriverDate")
                    .and_then(variant_to_string)
                    .unwrap_or_default();
                let (date_fmt, year) = if raw_date.len() >= 8
                    && raw_date.chars().take(8).all(|c| c.is_ascii_digit())
                {
                    let yr = raw_date[0..4].parse::<u32>().unwrap_or(2024);
                    (
                        format!("{}/{}/{}", &raw_date[6..8], &raw_date[4..6], &raw_date[0..4]),
                        yr,
                    )
                } else {
                    ("Recente".to_string(), 2024)
                };

                let signer = row
                    .get("Signer")
                    .and_then(variant_to_string)
                    .unwrap_or_else(|| "WHQL".to_string());
                let inf_name = row
                    .get("InfName")
                    .and_then(variant_to_string)
                    .unwrap_or_default();
                let dev_id = row
                    .get("DeviceID")
                    .and_then(variant_to_string)
                    .unwrap_or_default()
                    .to_uppercase();

                let error_code = err_map.get(&dev_id).copied().unwrap_or(0);
                let status = if error_code != 0 {
                    "Erro".to_string()
                } else if year > 2006 && year <= 2020 {
                    "Antigo".to_string()
                } else {
                    "OK".to_string()
                };

                list.push(DriverInventoryItem {
                    device_name,
                    category: category.to_string(),
                    provider,
                    version,
                    date: date_fmt,
                    signer,
                    inf_name,
                    status,
                    error_code,
                });
            }
        }

        list.sort_by(|a, b| {
            a.category
                .cmp(&b.category)
                .then(a.device_name.cmp(&b.device_name))
        });
        list
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        format!("{} drivers principais auditados.", items.len()),
        Some(items),
    ))
}

// -------------------------------------------------------------
// 2. Overclock / XMP / Power Plan & WHEA Hardware Errors Scanner
// -------------------------------------------------------------
#[tauri::command]
pub async fn scan_oc_and_errors() -> Result<CommandResponse<TuningAndErrorsReport>, String> {
    let report = tokio::task::spawn_blocking(|| {
        let mut cpu_name = "Processador x86_64".to_string();
        let mut cpu_base_mhz = 3600u32;
        let mut cpu_current_mhz = 4200u32;
        let mut ram_speed_mhz = 3200u32;
        let mut ram_type = "DDR4".to_string();

        if let Ok(com_lib) = COMLibrary::new() {
            if let Ok(wmi_con) = WMIConnection::new(com_lib) {
                if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(
                    "SELECT Name, MaxClockSpeed, CurrentClockSpeed FROM Win32_Processor",
                ) {
                    if let Some(row) = rows.first() {
                        cpu_name = row
                            .get("Name")
                            .and_then(variant_to_string)
                            .unwrap_or(cpu_name);
                        cpu_base_mhz = row
                            .get("MaxClockSpeed")
                            .and_then(variant_to_u32)
                            .unwrap_or(3600);
                        cpu_current_mhz = row
                            .get("CurrentClockSpeed")
                            .and_then(variant_to_u32)
                            .unwrap_or(cpu_base_mhz);
                    }
                }

                if let Ok(rows) = wmi_con.raw_query::<HashMap<String, Variant>>(
                    "SELECT ConfiguredClockSpeed, Speed, SMBIOSMemoryType FROM Win32_PhysicalMemory",
                ) {
                    if let Some(row) = rows.first() {
                        ram_speed_mhz = row
                            .get("ConfiguredClockSpeed")
                            .and_then(variant_to_u32)
                            .or_else(|| row.get("Speed").and_then(variant_to_u32))
                            .unwrap_or(3200);
                        let smbios = row
                            .get("SMBIOSMemoryType")
                            .and_then(variant_to_u32)
                            .unwrap_or(26);
                        ram_type = if smbios == 34 || smbios == 35 || ram_speed_mhz >= 4400 {
                            "DDR5".to_string()
                        } else {
                            "DDR4".to_string()
                        };
                    }
                }
            }
        }

        let cpu_boost_ratio = if cpu_base_mhz > 0 {
            ((cpu_current_mhz as f32 / cpu_base_mhz as f32) * 100.0).round() / 100.0
        } else {
            1.0
        };
        let cpu_oc_active = cpu_current_mhz >= cpu_base_mhz;
        let xmp_enabled = if ram_type == "DDR5" {
            ram_speed_mhz >= 5200
        } else {
            ram_speed_mhz >= 2666
        };

        // Detect active Power Plan via powercfg /getactivescheme
        let mut active_power_plan_id = "balanced".to_string();
        let mut active_power_plan_name = "Equilibrado (Balanced)".to_string();
        if let Ok(out) = Command::new("powercfg")
            .args(["/getactivescheme"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout).to_lowercase();
            if stdout.contains("e9a42b02-d5df-448d-aa00-03f14749eb61")
                || stdout.contains("desempenho máximo")
                || stdout.contains("ultimate")
            {
                active_power_plan_id = "ultimate".to_string();
                active_power_plan_name = "Desempenho Máximo (Ultimate Performance)".to_string();
            } else if stdout.contains("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c")
                || stdout.contains("alto desempenho")
                || stdout.contains("high performance")
            {
                active_power_plan_id = "high".to_string();
                active_power_plan_name = "Alto Desempenho (High Performance)".to_string();
            }
        }

        // Query Windows Event Log for WHEA-Logger, Kernel-Power 41, Display 4101
        let mut whea_error_count = 0u32;
        let mut kernel_power_41_count = 0u32;
        let mut gpu_reset_count = 0u32;
        let mut recent_errors: Vec<HardwareErrorEvent> = Vec::new();

        // Check WHEA-Logger events
        if let Ok(out) = Command::new("wevtutil")
            .args([
                "qe",
                "System",
                "/q:*[System[Provider[@Name='Microsoft-Windows-WHEA-Logger']]]",
                "/c:10",
                "/rd:true",
                "/f:text",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for block in text.split("Event[") {
                if block.contains("WHEA-Logger") {
                    whea_error_count += 1;
                    let date = extract_wevtutil_field(block, "Date:").unwrap_or_else(|| "Recente".to_string());
                    let ev_id = extract_wevtutil_field(block, "Event ID:")
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(18);
                    recent_errors.push(HardwareErrorEvent {
                        event_id: ev_id,
                        source: "WHEA-Logger".to_string(),
                        severity: "Crítico".to_string(),
                        timestamp: date,
                        description: "Erro de hardware reportado pela CPU/PCIe/Cache (possível instabilidade de Undervolt/OC).".to_string(),
                    });
                }
            }
        }

        // Check Kernel-Power 41 events
        if let Ok(out) = Command::new("wevtutil")
            .args([
                "qe",
                "System",
                "/q:*[System[Provider[@Name='Microsoft-Windows-Kernel-Power'] and (EventID=41)]]",
                "/c:5",
                "/rd:true",
                "/f:text",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for block in text.split("Event[") {
                if block.contains("Kernel-Power") {
                    kernel_power_41_count += 1;
                    let date = extract_wevtutil_field(block, "Date:").unwrap_or_else(|| "Recente".to_string());
                    recent_errors.push(HardwareErrorEvent {
                        event_id: 41,
                        source: "Kernel-Power".to_string(),
                        severity: "Alerta".to_string(),
                        timestamp: date,
                        description: "O sistema reiniciou sem desligar limpamente (queda de energia, reset forçado ou BSOD).".to_string(),
                    });
                }
            }
        }

        // Check Display 4101 TDR GPU driver resets
        if let Ok(out) = Command::new("wevtutil")
            .args([
                "qe",
                "System",
                "/q:*[System[(EventID=4101)]]",
                "/c:5",
                "/rd:true",
                "/f:text",
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for block in text.split("Event[") {
                if block.contains("4101") {
                    gpu_reset_count += 1;
                    let date = extract_wevtutil_field(block, "Date:").unwrap_or_else(|| "Recente".to_string());
                    recent_errors.push(HardwareErrorEvent {
                        event_id: 4101,
                        source: "Display (TDR)".to_string(),
                        severity: "Aviso".to_string(),
                        timestamp: date,
                        description: "O driver de vídeo parou de responder e se recuperou com êxito (TDR Timeout).".to_string(),
                    });
                }
            }
        }

        TuningAndErrorsReport {
            cpu_name,
            cpu_base_mhz,
            cpu_current_mhz,
            cpu_boost_ratio,
            cpu_oc_active,
            ram_speed_mhz,
            ram_type,
            xmp_enabled,
            active_power_plan_id,
            active_power_plan_name,
            whea_error_count,
            kernel_power_41_count,
            gpu_reset_count,
            recent_errors,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        "Scanner de Overclock, Energia e WHEA concluído.",
        Some(report),
    ))
}

fn extract_wevtutil_field(block: &str, prefix: &str) -> Option<String> {
    for line in block.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with(prefix) {
            return Some(trimmed[prefix.len()..].trim().to_string());
        }
    }
    None
}

#[tauri::command]
pub async fn set_power_plan(plan_id: String) -> Result<CommandResponse<String>, String> {
    let msg = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let guid = match plan_id.as_str() {
            "ultimate" => {
                let _ = Command::new("powercfg")
                    .args(["-duplicatescheme", "e9a42b02-d5df-448d-aa00-03f14749eb61"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
                "e9a42b02-d5df-448d-aa00-03f14749eb61"
            }
            "high" => "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
            _ => "381b4222-f694-41f0-9685-ff5bb260df2e",
        };

        let out = Command::new("powercfg")
            .args(["/setactive", guid])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Falha ao executar powercfg: {}", e))?;

        if !out.status.success() && plan_id == "ultimate" {
            // Fallback to High Performance if Ultimate GUID was assigned a dynamic GUID
            let _ = Command::new("powercfg")
                .args(["/setactive", "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }

        let friendly = match plan_id.as_str() {
            "ultimate" => "Desempenho Máximo (Ultimate Performance)",
            "high" => "Alto Desempenho (High Performance)",
            _ => "Equilibrado (Balanced)",
        };
        Ok(format!("Plano de energia '{}' ativado com sucesso!", friendly))
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(CommandResponse::ok(msg.clone(), Some(msg)))
}

// -------------------------------------------------------------
// 3. Ghost USB & COM Port Cleaner (Definitive 3-Layer Scanner)
// -------------------------------------------------------------
fn clean_reg_device_desc(raw: &str) -> String {
    if let Some((_, after_semi)) = raw.rsplit_once(';') {
        after_semi.trim().to_string()
    } else {
        raw.trim().to_string()
    }
}

fn scan_usb_from_registry(devices: &mut Vec<UsbDeviceEntry>, seen_ids: &mut HashSet<String>) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let enum_roots = [
        (r"SYSTEM\CurrentControlSet\Enum\USB", "USB"),
        (r"SYSTEM\CurrentControlSet\Enum\FTDIBUS", "Ports"),
        (r"SYSTEM\CurrentControlSet\Enum\BTHENUM", "Bluetooth"),
    ];

    for (root_path, default_class) in enum_roots {
        let Ok(root_key) = hklm.open_subkey_with_flags(root_path, KEY_READ) else {
            continue;
        };
        for dev_name in root_key.enum_keys().flatten() {
            let Ok(dev_key) = root_key.open_subkey_with_flags(&dev_name, KEY_READ) else {
                continue;
            };
            for inst_name in dev_key.enum_keys().flatten() {
                let Ok(inst_key) = dev_key.open_subkey_with_flags(&inst_name, KEY_READ) else {
                    continue;
                };
                let bus = root_path.rsplit('\\').next().unwrap_or("USB");
                let instance_id = format!(r"{}\{}\{}", bus, dev_name, inst_name);
                let id_upper = instance_id.to_uppercase();
                if seen_ids.contains(&id_upper) {
                    continue;
                }

                let friendly: String = inst_key
                    .get_value::<String, _>("FriendlyName")
                    .ok()
                    .or_else(|| inst_key.get_value::<String, _>("DeviceDesc").ok())
                    .map(|s| clean_reg_device_desc(&s))
                    .unwrap_or_default();

                if friendly.contains("Root Hub") || friendly.contains("Host Controller") {
                    continue;
                }

                let class_name: String = inst_key
                    .get_value::<String, _>("Class")
                    .unwrap_or_else(|_| default_class.to_string());

                // Em Enum\<Bus>\<Dev>\<Inst>, subchave "Control" em memória indica dispositivo ativo conectado
                let connected = inst_key.open_subkey_with_flags("Control", KEY_READ).is_ok();
                let is_com_port = class_name.eq_ignore_ascii_case("Ports") || friendly.contains("(COM");

                seen_ids.insert(id_upper);
                devices.push(UsbDeviceEntry {
                    instance_id: instance_id.clone(),
                    name: if friendly.is_empty() { instance_id } else { friendly },
                    class_name,
                    connected,
                    is_com_port,
                    status_text: if connected {
                        "Conectado".to_string()
                    } else {
                        "Fantasma (Desconectado)".to_string()
                    },
                });
            }
        }
    }
}

pub fn scan_usb_devices_sync() -> UsbScanResult {
    let mut devices: Vec<UsbDeviceEntry> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();

    // Camada 1: PowerShell Get-PnpDevice JSON (Win 8.1/10/11 — independente de idioma e sem exigir Admin)
    let ps_cmd = r#"
        @(Get-PnpDevice -PresentOnly:$false -ErrorAction SilentlyContinue | Where-Object {
            $_.Class -in @('USB','Ports','HIDClass','Bluetooth','Media','Mouse','Keyboard','XboxComposite','XnaComposite') -or
            $_.InstanceId -match '^(USB|FTDIBUS|BTHENUM|HID)\\'
        } | Select-Object InstanceId, FriendlyName, Class, Status) | ConvertTo-Json -Compress
    "#;

    if let Ok(out) = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", ps_cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        if out.status.success() {
            let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&raw) {
                let items: Vec<&serde_json::Value> = match &val {
                    serde_json::Value::Array(arr) => arr.iter().collect(),
                    serde_json::Value::Object(_) => vec![&val],
                    _ => Vec::new(),
                };
                for item in items {
                    let id = item.get("InstanceId").and_then(|v| v.as_str()).unwrap_or("").trim();
                    let desc = item.get("FriendlyName").and_then(|v| v.as_str()).unwrap_or("").trim();
                    let class = item.get("Class").and_then(|v| v.as_str()).unwrap_or("USB").trim();
                    let status = item.get("Status").and_then(|v| v.as_str()).unwrap_or("").trim();
                    if !id.is_empty() && !seen_ids.contains(&id.to_uppercase()) {
                        push_usb_entry(id, desc, class, status, &mut devices, &mut seen_ids);
                    }
                }
            }
        }
    }

    // Camada 2: Fallback via pnputil /enum-devices (caso PowerShell PnpDevice nao exista, ex: Win 7 / Server Core)
    if devices.is_empty() {
        if let Ok(out) = Command::new("pnputil")
            .args(["/enum-devices"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            let mut cur_id = String::new();
            let mut cur_desc = String::new();
            let mut cur_class = String::new();
            let mut cur_status = String::new();

            for line in text.lines() {
                let t = line.trim();
                if t.is_empty() {
                    if !cur_id.is_empty() && !seen_ids.contains(&cur_id.to_uppercase()) {
                        push_usb_entry(&cur_id, &cur_desc, &cur_class, &cur_status, &mut devices, &mut seen_ids);
                    }
                    cur_id.clear();
                    cur_desc.clear();
                    cur_class.clear();
                    cur_status.clear();
                    continue;
                }
                if let Some((k, v)) = t.split_once(':') {
                    let key = k.trim().to_lowercase();
                    let val = v.trim().to_string();
                    if key.contains("instance id") || key.contains("id da instância") || val.starts_with("USB\\") || val.starts_with("FTDIBUS\\") || val.starts_with("HID\\") {
                        cur_id = val;
                    } else if key.contains("device description") || key.contains("descrição") {
                        cur_desc = val;
                    } else if key.contains("class name") || key.contains("nome da classe") {
                        cur_class = val;
                    } else if key.contains("status") {
                        cur_status = val;
                    }
                }
            }
            if !cur_id.is_empty() && !seen_ids.contains(&cur_id.to_uppercase()) {
                push_usb_entry(&cur_id, &cur_desc, &cur_class, &cur_status, &mut devices, &mut seen_ids);
            }
        }
    }

    // Camada 3: Fallback direto de Registro (HKLM\SYSTEM\CurrentControlSet\Enum\USB & FTDIBUS & BTHENUM)
    if devices.is_empty() {
        scan_usb_from_registry(&mut devices, &mut seen_ids);
    }

    // Count reserved COM ports in ComDB bitmask
    let mut reserved_com_ports = 0usize;
    if let Ok(com_arb) = RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags(r"SYSTEM\CurrentControlSet\Control\COM Name Arbiter", KEY_READ)
    {
        if let Ok(raw) = com_arb.get_raw_value("ComDB") {
            reserved_com_ports = raw.bytes.iter().map(|b| b.count_ones() as usize).sum();
        }
    }

    // Sort: Ghost (desconectado) ou porta COM primeiro, depois conectados em ordem alfabética
    devices.sort_by(|a, b| {
        a.connected
            .cmp(&b.connected)
            .then(b.is_com_port.cmp(&a.is_com_port))
            .then(a.name.cmp(&b.name))
    });

    let connected_count = devices.iter().filter(|d| d.connected).count();
    let ghost_count = devices.iter().filter(|d| !d.connected).count();

    UsbScanResult {
        total_devices: devices.len(),
        connected_count,
        ghost_count,
        reserved_com_ports,
        devices,
    }
}

#[tauri::command]
pub async fn get_usb_devices() -> Result<CommandResponse<UsbScanResult>, String> {
    let res = tokio::task::spawn_blocking(scan_usb_devices_sync)
        .await
        .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        format!(
            "{} dispositivos USB/Seriais analisados ({} conectados • {} fantasmas desconectados).",
            res.total_devices, res.connected_count, res.ghost_count
        ),
        Some(res),
    ))
}

#[tauri::command]
pub async fn scan_usb_devices() -> Result<CommandResponse<UsbScanResult>, String> {
    get_usb_devices().await
}

fn push_usb_entry(
    id: &str,
    desc: &str,
    class: &str,
    status: &str,
    out: &mut Vec<UsbDeviceEntry>,
    seen_ids: &mut HashSet<String>,
) {
    let upper_id = id.to_uppercase();
    let upper_class = class.to_uppercase();
    let is_usb_or_port = upper_id.starts_with("USB\\")
        || upper_id.starts_with("FTDIBUS\\")
        || upper_id.starts_with("BTHENUM\\")
        || upper_id.starts_with("HID\\")
        || matches!(
            upper_class.as_str(),
            "PORTS" | "USB" | "BLUETOOTH" | "HIDCLASS" | "MOUSE" | "KEYBOARD" | "MEDIA" | "XBOXCOMPOSITE" | "XNACOMPOSITE"
        );
    if !is_usb_or_port {
        return;
    }
    if desc.contains("Root Hub") || desc.contains("Host Controller") {
        return;
    }

    let status_lower = status.to_lowercase();
    let connected = status_lower.contains("started")
        || status_lower.contains("iniciado")
        || status_lower == "ok";
    let is_com_port = upper_class == "PORTS" || desc.contains("(COM") || upper_id.starts_with("FTDIBUS\\");

    seen_ids.insert(upper_id);
    out.push(UsbDeviceEntry {
        instance_id: id.to_string(),
        name: if desc.is_empty() {
            id.to_string()
        } else {
            desc.to_string()
        },
        class_name: if class.is_empty() {
            "USB".to_string()
        } else {
            class.to_string()
        },
        connected,
        is_com_port,
        status_text: if connected {
            "Conectado".to_string()
        } else {
            "Fantasma (Desconectado)".to_string()
        },
    });
}

#[tauri::command]
pub async fn remove_ghost_usb_devices(
    instance_ids: Vec<String>,
    app: AppHandle,
) -> Result<CommandResponse<u32>, String> {
    if instance_ids.is_empty() {
        return Ok(CommandResponse::ok(
            "Nenhum dispositivo selecionado para remoção.",
            Some(0),
        ));
    }

    let app_clone = app.clone();
    let removed = tokio::task::spawn_blocking(move || {
        let total = instance_ids.len();
        let mut count = 0u32;
        for (i, id) in instance_ids.iter().enumerate() {
            emit_step(
                &app_clone,
                "usb-clean",
                "Removendo Dispositivo USB Fantasma",
                "running",
                &format!("pnputil /remove-device {}", id),
                i + 1,
                total,
            );
            if let Ok(out) = Command::new("pnputil")
                .args(["/remove-device", id])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
            {
                if out.status.success() {
                    count += 1;
                }
            }
        }
        emit_step(
            &app_clone,
            "usb-clean-done",
            "Limpeza de USB Concluída",
            "success",
            &format!("{} dispositivos fantasmas removidos.", count),
            total,
            total,
        );
        count
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        format!(
            "{} dispositivo(s) USB fantasma(s) removido(s) com sucesso!",
            removed
        ),
        Some(removed),
    ))
}

// -------------------------------------------------------------
// 4. RGB Sync & Windows 11 Dynamic Lighting (LightBackends.cs port)
// -------------------------------------------------------------
#[tauri::command]
pub async fn get_rgb_status() -> Result<CommandResponse<RgbStatusReport>, String> {
    let report = tokio::task::spawn_blocking(|| {
        let mut active_effect = "Static".to_string();
        let mut active_color_hex = "#38BDF8".to_string();

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let win11_supported = hkcu
            .open_subkey_with_flags(r"Software\Microsoft\Lighting", KEY_READ)
            .map(|k| {
                if let Ok(eff) = k.get_value::<String, _>("SysOptEffect") {
                    active_effect = eff;
                }
                if let Ok(col) = k.get_value::<String, _>("SysOptColor") {
                    active_color_hex = col;
                }
                true
            })
            .unwrap_or(true);

        let openrgb_online = TcpStream::connect_timeout(
            &"127.0.0.1:6742".parse::<SocketAddr>().unwrap(),
            Duration::from_millis(120),
        )
        .is_ok();

        let razer_online = TcpStream::connect_timeout(
            &"127.0.0.1:54235".parse::<SocketAddr>().unwrap(),
            Duration::from_millis(120),
        )
        .is_ok()
            || Path::new(r"C:\Program Files (x86)\Razer\ChromaBroadcast").exists();

        let icue_installed = Path::new(r"C:\Program Files\Corsair\CORSAIR iCUE 4 Software").exists()
            || Path::new(r"C:\Program Files\Corsair\CORSAIR iCUE 5 Software").exists();

        let aura_installed =
            Path::new(r"C:\Program Files (x86)\LightingService").exists();

        let backends = vec![
            RgbBackendInfo {
                name: "Windows 11 Dynamic Lighting (HID LampArray)".to_string(),
                detected: win11_supported,
                status: "Integrado ao Sistema".to_string(),
            },
            RgbBackendInfo {
                name: "OpenRGB SDK Server (Porta 6742)".to_string(),
                detected: openrgb_online,
                status: if openrgb_online {
                    "Servidor SDK Online".to_string()
                } else {
                    "Servidor SDK Offline".to_string()
                },
            },
            RgbBackendInfo {
                name: "Razer Chroma Connect REST".to_string(),
                detected: razer_online,
                status: if razer_online {
                    "Detectado".to_string()
                } else {
                    "Não detectado".to_string()
                },
            },
            RgbBackendInfo {
                name: "Corsair iCUE SDK".to_string(),
                detected: icue_installed,
                status: if icue_installed {
                    "Instalado".to_string()
                } else {
                    "Não instalado".to_string()
                },
            },
            RgbBackendInfo {
                name: "ASUS Aura / Armoury Crate LightingService".to_string(),
                detected: aura_installed,
                status: if aura_installed {
                    "Instalado".to_string()
                } else {
                    "Não instalado".to_string()
                },
            },
        ];

        RgbStatusReport {
            active_effect,
            active_color_hex,
            win11_dynamic_lighting_supported: win11_supported,
            backends,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok("Status RGB carregado.", Some(report)))
}

#[tauri::command]
pub async fn apply_rgb_effect(
    effect: String,
    color_hex: String,
) -> Result<CommandResponse<RgbStatusReport>, String> {
    tokio::task::spawn_blocking(move || {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok((key, _)) = hkcu.create_subkey(r"Software\Microsoft\Lighting") {
            let is_off = effect.eq_ignore_ascii_case("Off");
            let _ = key.set_value("AmbientLightingEnabled", if is_off { &0u32 } else { &1u32 });
            let _ = key.set_value("SysOptEffect", &effect);
            let _ = key.set_value("SysOptColor", &color_hex);
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    get_rgb_status().await
}

// -------------------------------------------------------------
// 5. Maker Serial Drivers (CH340, CP210x, FTDI, Arduino)
// -------------------------------------------------------------
fn resolve_bundled_driver_dir(chip_folder: &str) -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("drivers").join(chip_folder),
        PathBuf::from("src-tauri").join("drivers").join(chip_folder),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("drivers").join(chip_folder)))
            .unwrap_or_default(),
    ];
    for c in candidates {
        if c.exists() {
            return Some(c);
        }
    }
    None
}

#[tauri::command]
pub async fn get_maker_drivers() -> Result<CommandResponse<Vec<MakerDriverInfo>>, String> {
    let list = tokio::task::spawn_blocking(|| {
        let specs = [
            (
                "CH340",
                "WCH CH340 / CH341 USB-Serial",
                "VID_1A86 (ESP8266, ESP32, Arduino Nano Clone)",
                "Driver oficial para placas Arduino Nano/Uno R3 clones, NodeMCU ESP8266 e ESP32 com conversor WCH CH340G/CH341.",
                "ch341ser.inf",
                "https://www.wch-ic.com/downloads/CH341SER_EXE.html",
            ),
            (
                "CP210x",
                "Silicon Labs CP210x VCP",
                "VID_10C4 (ESP32 DevKit, NodeMCU v2)",
                "Driver Virtual COM Port (VCP) oficial da Silicon Labs para módulos ESP32-WROOM, telemetria e gravadores UART.",
                "silabser.inf",
                "https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers",
            ),
            (
                "FTDI",
                "FTDI FT232R / FT2232D CDM",
                "VID_0403 (Arduino Pro Mini, JTAG, Interfaces OBD/CNC)",
                "Driver combinado VCP + D2XX da FTDI para conversores FT232RL genuínos e interfaces industriais.",
                "ftdiport.inf",
                "https://ftdichip.com/drivers/vcp-drivers/",
            ),
            (
                "Arduino",
                "Arduino USB ACM Oficial (AVR)",
                "VID_2341 / VID_2A03 (Uno R3 Original, Mega 2560, Leonardo)",
                "Pacote de definições USB CDC/ACM oficial para placas Arduino genuínas com ATmega16U2 / ATmega32U4.",
                "arduino.inf",
                "https://www.arduino.cc/en/software",
            ),
        ];

        // Check DriverStore via pnputil /enum-drivers
        let store_out = Command::new("pnputil")
            .args(["/enum-drivers"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_lowercase())
            .unwrap_or_default();

        let mut results = Vec::new();
        for (id, name, family, desc, inf_needle, url) in specs {
            let bundled = resolve_bundled_driver_dir(id).is_some();
            let installed_in_store = store_out.contains(inf_needle);

            results.push(MakerDriverInfo {
                id: id.to_string(),
                name: name.to_string(),
                chip_family: family.to_string(),
                description: desc.to_string(),
                bundled,
                installed_in_store,
                connected_devices: Vec::new(),
                vendor_url: url.to_string(),
            });
        }
        results
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        "Catálogo de Drivers Maker carregado.",
        Some(list),
    ))
}

#[tauri::command]
pub async fn install_maker_driver(
    chip_id: String,
    app: AppHandle,
) -> Result<CommandResponse<String>, String> {
    let app_clone = app.clone();
    let msg = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let dir = resolve_bundled_driver_dir(&chip_id).ok_or_else(|| {
            format!(
                "Pasta de driver '{}' não localizada no pacote local.",
                chip_id
            )
        })?;

        let inf_pattern = dir.join("*.inf").to_string_lossy().to_string();
        emit_step(
            &app_clone,
            "maker-drv",
            &format!("Instalando Driver Serial {}", chip_id),
            "running",
            &format!("pnputil /add-driver \"{}\" /subdirs /install", inf_pattern),
            1,
            1,
        );

        let out = Command::new("pnputil")
            .args(["/add-driver", &inf_pattern, "/subdirs", "/install"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Falha ao executar pnputil: {}", e))?;

        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        if out.status.success() || stdout.to_lowercase().contains("published") || stdout.to_lowercase().contains("adicionado") {
            emit_step(
                &app_clone,
                "maker-drv-done",
                &format!("Driver {} Instalado!", chip_id),
                "success",
                "Pacote INF injetado na DriverStore do Windows com sucesso.",
                1,
                1,
            );
            Ok(format!(
                "Driver {} instalado com sucesso na DriverStore do Windows!",
                chip_id
            ))
        } else {
            Err(format!(
                "Execução do pnputil requer privilégio de Administrador: {}",
                stdout.lines().next().unwrap_or("Acesso negado")
            ))
        }
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(CommandResponse::ok(msg.clone(), Some(msg)))
}

#[tauri::command]
pub async fn clean_arduino_cache(app: AppHandle) -> Result<CommandResponse<String>, String> {
    let app_clone = app.clone();
    let msg = tokio::task::spawn_blocking(move || {
        emit_step(
            &app_clone,
            "arduino-clean",
            "Limpando Cache do Arduino IDE (Arduino15)",
            "running",
            "Removendo pacotes temporários de staging e índices corrompidos...",
            1,
            1,
        );

        let local_app = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let arduino15 = PathBuf::from(local_app).join("Arduino15");
        let mut removed_mb = 0u64;

        if arduino15.exists() {
            let staging = arduino15.join("staging");
            if staging.exists() {
                if let Ok(entries) = fs::read_dir(&staging) {
                    for e in entries.flatten() {
                        removed_mb += e.metadata().map(|m| m.len()).unwrap_or(0);
                    }
                }
                let _ = fs::remove_dir_all(&staging);
            }
        }

        let mb = removed_mb / (1024 * 1024);
        emit_step(
            &app_clone,
            "arduino-clean-done",
            "Cache Arduino15 Limpo",
            "success",
            &format!("Staging limpo ({} MB liberados).", mb),
            1,
            1,
        );

        format!(
            "Cache de staging do Arduino15 limpo com sucesso ({} MB liberados).",
            mb
        )
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(msg.clone(), Some(msg)))
}

// -------------------------------------------------------------
// 6. Winget Post-Format Batch App Installer (AppInstaller.cs port)
// -------------------------------------------------------------
#[tauri::command]
pub async fn get_winget_catalog() -> Result<CommandResponse<Vec<WingetAppItem>>, String> {
    let catalog = tokio::task::spawn_blocking(|| {
        // Collect installed display names from Registry Uninstall keys
        let mut installed_names: Vec<String> = Vec::new();
        let paths = [
            (
                HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            ),
            (
                HKEY_LOCAL_MACHINE,
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            ),
            (
                HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Uninstall",
            ),
        ];

        for (root, sub) in paths {
            if let Ok(key) = RegKey::predef(root).open_subkey_with_flags(sub, KEY_READ) {
                for sub_name in key.enum_keys().flatten() {
                    if let Ok(sk) = key.open_subkey_with_flags(&sub_name, KEY_READ) {
                        if let Ok(dn) = sk.get_value::<String, _>("DisplayName") {
                            installed_names.push(dn.to_lowercase());
                        }
                    }
                }
            }
        }

        let raw_apps = [
            // Navegadores
            ("imputnet.helium", "Helium Browser (Chromium Ultraleve)", "Navegadores", "Chromium enxuto de altíssima velocidade focado em privacidade e zero telemetria.", "helium"),
            ("Brave.Brave", "Brave Browser", "Navegadores", "Navegador focado em privacidade, Shields integrados e bloqueio nativo de anúncios.", "brave"),
            ("Mozilla.Firefox", "Mozilla Firefox", "Navegadores", "Navegador rápido e independente baseado no motor Gecko.", "firefox"),
            ("Google.Chrome", "Google Chrome", "Navegadores", "Navegador oficial do Google com sincronização em nuvem.", "chrome"),
            // Comunicação & Mídia
            ("Discord.Discord", "Discord", "Comunicação & Mídia", "Comunicação por voz, vídeo e chat de baixa latência para gamers.", "discord"),
            ("Spotify.Spotify", "Spotify", "Comunicação & Mídia", "Cliente oficial de streaming de áudio e podcasts.", "spotify"),
            ("OBSProject.OBSStudio", "OBS Studio", "Comunicação & Mídia", "Gravação NVENC/AV1 sem perdas e streaming profissional de baixa sobrecarga.", "obs studio"),
            ("Daum.PotPlayer", "PotPlayer", "Comunicação & Mídia", "Player de vídeo acelerado por hardware ultra-leve com decodificação avançada.", "potplayer"),
            ("VideoLAN.VLC", "VLC Media Player", "Comunicação & Mídia", "Reprodutor multimídia universal com todos os codecs integrados.", "vlc"),
            ("Valve.Steam", "Steam", "Comunicação & Mídia", "Maior plataforma e biblioteca de jogos para PC.", "steam"),
            ("EpicGames.EpicGamesLauncher", "Epic Games Launcher", "Comunicação & Mídia", "Launcher oficial da Epic Games e Unreal Engine.", "epic games"),
            // Utilitários de Hardware & Runtimes
            ("Microsoft.DirectX", "DirectX End-User Runtime", "Utilitários de Hardware & Runtimes", "Bibliotecas essenciais DirectX 9/10/11 (XInput, D3DX9) exigidas por jogos clássicos.", "directx"),
            ("Microsoft.VCRedist.2015+.x64", "Visual C++ 2015-2022 (x64)", "Utilitários de Hardware & Runtimes", "Runtime C++ 64-bit obrigatório para jogos e drivers modernos.", "visual c++ 2015-2022"),
            ("Microsoft.VCRedist.2015+.x86", "Visual C++ 2015-2022 (x86)", "Utilitários de Hardware & Runtimes", "Runtime C++ 32-bit exigido por launchers e jogos DirectX 9/11.", "x86"),
            ("7zip.7zip", "7-Zip", "Utilitários de Hardware & Runtimes", "Compactador e descompactador open-source ultraleve (.7z, .zip, .rar).", "7-zip"),
            ("Notepad++.Notepad++", "Notepad++", "Utilitários de Hardware & Runtimes", "Editor de código, logs e arquivos de configuração ultrarrápido.", "notepad++"),
            ("Guru3D.Afterburner", "MSI Afterburner", "Utilitários de Hardware & Runtimes", "Controle de curva de fans, undervolt V/F e overclock seguro de GPU.", "afterburner"),
            ("Guru3D.RTSS", "RivaTuner Statistics Server (RTSS)", "Utilitários de Hardware & Runtimes", "Limitador de FPS de frame-pacing perfeito (scanline/async) e OSD.", "rivatuner"),
            ("CPUID.CPU-Z", "CPU-Z", "Utilitários de Hardware & Runtimes", "Inspeção de clock, stepping, timings XMP/EXPO e largura de banda PCIe.", "cpu-z"),
            ("TechPowerUp.GPU-Z", "TechPowerUp GPU-Z", "Utilitários de Hardware & Runtimes", "Diagnóstico de GPU, PCIe link speed, ReBAR e sensores de Hotspot.", "gpu-z"),
            ("CPUID.HWMonitor", "HWMonitor", "Utilitários de Hardware & Runtimes", "Monitoramento completo de tensões Vcore, temperaturas e RPMs.", "hwmonitor"),
        ];

        raw_apps
            .iter()
            .map(|(id, name, cat, desc, needle)| {
                let installed = installed_names.iter().any(|n| n.contains(needle));
                WingetAppItem {
                    id: id.to_string(),
                    name: name.to_string(),
                    category: cat.to_string(),
                    description: desc.to_string(),
                    installed,
                }
            })
            .collect::<Vec<_>>()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        "Catálogo Winget carregado.",
        Some(catalog),
    ))
}

#[tauri::command]
pub async fn install_winget_batch(
    winget_ids: Vec<String>,
    app: AppHandle,
) -> Result<CommandResponse<u32>, String> {
    if winget_ids.is_empty() {
        return Ok(CommandResponse::err(
            "Selecione ao menos um aplicativo para instalar.",
        ));
    }

    let app_clone = app.clone();
    let installed_count = tokio::task::spawn_blocking(move || {
        let total = winget_ids.len();
        let mut ok_count = 0u32;

        for (idx, pkg_id) in winget_ids.iter().enumerate() {
            emit_step(
                &app_clone,
                "winget-pkg",
                &format!("Instalando {} via Winget", pkg_id),
                "running",
                &format!(
                    "winget install --id {} -e --silent ({} de {})",
                    pkg_id,
                    idx + 1,
                    total
                ),
                idx + 1,
                total,
            );

            if let Ok(out) = Command::new("winget")
                .args([
                    "install",
                    "--id",
                    pkg_id,
                    "-e",
                    "--accept-source-agreements",
                    "--accept-package-agreements",
                    "--silent",
                ])
                .creation_flags(CREATE_NO_WINDOW)
                .output()
            {
                if out.status.success() {
                    ok_count += 1;
                }
            }
        }

        emit_step(
            &app_clone,
            "winget-done",
            "Instalação em Lote Concluída",
            "success",
            &format!("{} de {} pacotes instalados via Winget.", ok_count, total),
            total,
            total,
        );

        ok_count
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        format!(
            "{} aplicativo(s) instalado(s) silenciosamente via Winget!",
            installed_count
        ),
        Some(installed_count),
    ))
}

// ============================================================================
// MÓDULO 2: GERADOR NATIVO DE FORMATAÇÃO LIMPA (autounattend.xml + $OEM$)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanInstallUsbResult {
    pub autounattend_path: String,
    pub setup_complete_path: Option<String>,
    pub local_username: String,
    pub bypass_win11_reqs: bool,
    pub skip_oobe_telemetry: bool,
    pub inject_oem_driver_block: bool,
}

fn sanitize_xml_text(raw: &str) -> String {
    let trimmed = raw.trim();
    let base = if trimmed.is_empty() { "User" } else { trimmed };
    let mut out = String::with_capacity(base.len());
    for ch in base.chars() {
        match ch {
            '<' | '>' | '&' | '"' | '\'' | '\\' | '/' | ':' | '*' | '?' | '|' => {}
            _ if ch.is_control() => {}
            _ => out.push(ch),
        }
    }
    let final_name = out.trim();
    if final_name.is_empty() {
        "User".to_string()
    } else {
        final_name.chars().take(20).collect()
    }
}

/// Construtor determinístico do autounattend.xml (Windows 10/11 Pro/Home)
pub fn build_autounattend_xml(
    local_username: &str,
    bypass_win11_reqs: bool,
    skip_oobe_telemetry: bool,
) -> String {
    let safe_user = sanitize_xml_text(local_username);

    let winpe_bypass_block = if bypass_win11_reqs {
        r#"            <RunSynchronous>
                <RunSynchronousCommand wcm:action="add">
                    <Order>1</Order>
                    <Path>reg add HKLM\SYSTEM\Setup\LabConfig /v BypassTPMCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>2</Order>
                    <Path>reg add HKLM\SYSTEM\Setup\LabConfig /v BypassSecureBootCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>3</Order>
                    <Path>reg add HKLM\SYSTEM\Setup\LabConfig /v BypassRAMCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>4</Order>
                    <Path>reg add HKLM\SYSTEM\Setup\LabConfig /v BypassCPUCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>5</Order>
                    <Path>reg add HKLM\SYSTEM\Setup\LabConfig /v BypassStorageCheck /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
                <RunSynchronousCommand wcm:action="add">
                    <Order>6</Order>
                    <Path>reg add HKLM\SYSTEM\Setup\MoSetup /v AllowUpgradesWithUnsupportedTPMOrCPU /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
            </RunSynchronous>
"#
    } else {
        ""
    };

    let oobe_block = if skip_oobe_telemetry {
        r#"            <OOBE>
                <HideEULAPage>true</HideEULAPage>
                <HideLocalAccountScreen>true</HideLocalAccountScreen>
                <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
                <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
                <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
                <NetworkLocation>Home</NetworkLocation>
                <ProtectYourPC>3</ProtectYourPC>
                <SkipMachineOOBE>false</SkipMachineOOBE>
                <SkipUserOOBE>false</SkipUserOOBE>
            </OOBE>"#
    } else {
        r#"            <OOBE>
                <HideEULAPage>true</HideEULAPage>
                <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
                <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
            </OOBE>"#
    };

    format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
    <settings pass="windowsPE">
        <component name="Microsoft-Windows-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
{winpe_bypass_block}            <UserData>
                <AcceptEula>true</AcceptEula>
            </UserData>
        </component>
    </settings>
    <settings pass="specialize">
        <component name="Microsoft-Windows-Deployment" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
            <RunSynchronous>
                <RunSynchronousCommand wcm:action="add">
                    <Order>1</Order>
                    <Path>reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE /v BypassNRO /t REG_DWORD /d 1 /f</Path>
                </RunSynchronousCommand>
            </RunSynchronous>
        </component>
    </settings>
    <settings pass="oobeSystem">
        <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
{oobe_block}
            <UserAccounts>
                <LocalAccounts>
                    <LocalAccount wcm:action="add">
                        <Password>
                            <Value></Value>
                            <PlainText>true</PlainText>
                        </Password>
                        <Description>Local Admin Account created by System Optimizer Tool</Description>
                        <DisplayName>{safe_user}</DisplayName>
                        <Group>Administrators</Group>
                        <Name>{safe_user}</Name>
                    </LocalAccount>
                </LocalAccounts>
            </UserAccounts>
            <AutoLogon>
                <Password>
                    <Value></Value>
                    <PlainText>true</PlainText>
                </Password>
                <Enabled>true</Enabled>
                <LogonCount>1</LogonCount>
                <Username>{safe_user}</Username>
            </AutoLogon>
            <FirstLogonCommands>
                <SynchronousCommand wcm:action="add">
                    <Order>1</Order>
                    <Description>Run SetupComplete pre-boot policy enforcement</Description>
                    <CommandLine>cmd /c if exist C:\Windows\Setup\Scripts\SetupComplete.cmd call C:\Windows\Setup\Scripts\SetupComplete.cmd</CommandLine>
                </SynchronousCommand>
            </FirstLogonCommands>
        </component>
    </settings>
</unattend>
"#
    )
}

/// Construtor determinístico do $OEM$\$$\Setup\Scripts\SetupComplete.cmd (pré-carregamento do Desktop)
pub fn build_setup_complete_cmd() -> String {
    r#"@echo off
REM System Optimizer Tool - Pre-Boot Driver & OEM Bloatware Prevention
REM Runs silently before first user logon

REM 1. Block automatic driver installation via Windows Update (Group Policy + DriverSearching)
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" /v ExcludeWUDriversInQualityUpdate /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\DriverSearching" /v SearchOrderConfig /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata" /v PreventDeviceMetadataFromNetwork /t REG_DWORD /d 1 /f >nul 2>&1

REM 2. Disable silent OEM motherboard/peripheral auto-installer prompts (ASUS Armoury Crate, MSI Center, Gigabyte GCC)
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\DeviceInstall\Settings" /v DisableSendGenericDriverNotFoundToWER /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\CloudContent" /v DisableSoftLanding /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f >nul 2>&1

exit /b 0
"#
    .to_string()
}

#[tauri::command]
pub async fn generate_clean_install_usb(
    target_path: String,
    local_username: String,
    bypass_win11_reqs: bool,
    skip_oobe_telemetry: bool,
    inject_oem_driver_block: bool,
) -> Result<CommandResponse<CleanInstallUsbResult>, String> {
    tokio::task::spawn_blocking(move || {
        let trimmed = target_path.trim();
        if trimmed.is_empty() {
            return Ok(CommandResponse::err(
                "Informe a letra da unidade USB (ex: E:\\) ou o caminho de uma pasta local.",
            ));
        }

        let normalized = if trimmed.len() == 2 && trimmed.ends_with(':') {
            format!("{}\\", trimmed)
        } else {
            trimmed.to_string()
        };

        let base_dir = PathBuf::from(&normalized);
        if !base_dir.exists() {
            if let Err(e) = fs::create_dir_all(&base_dir) {
                return Ok(CommandResponse::err(format!(
                    "Não foi possível acessar/criar o destino {}: {}",
                    base_dir.display(),
                    e
                )));
            }
        }

        let safe_user = sanitize_xml_text(&local_username);
        let xml_content = build_autounattend_xml(&safe_user, bypass_win11_reqs, skip_oobe_telemetry);
        let xml_path = base_dir.join("autounattend.xml");
        if let Err(e) = fs::write(&xml_path, xml_content.as_bytes()) {
            return Ok(CommandResponse::err(format!(
                "Falha ao gravar autounattend.xml em {}: {}",
                xml_path.display(),
                e
            )));
        }

        let mut setup_complete_path_out: Option<String> = None;
        if inject_oem_driver_block {
            let scripts_dir = base_dir.join("$OEM$").join("$$").join("Setup").join("Scripts");
            if let Err(e) = fs::create_dir_all(&scripts_dir) {
                return Ok(CommandResponse::err(format!(
                    "Falha ao criar estrutura $OEM$ em {}: {}",
                    scripts_dir.display(),
                    e
                )));
            }
            let cmd_path = scripts_dir.join("SetupComplete.cmd");
            let cmd_content = build_setup_complete_cmd();
            if let Err(e) = fs::write(&cmd_path, cmd_content.as_bytes()) {
                return Ok(CommandResponse::err(format!(
                    "Falha ao gravar SetupComplete.cmd em {}: {}",
                    cmd_path.display(),
                    e
                )));
            }
            setup_complete_path_out = Some(cmd_path.to_string_lossy().to_string());
        }

        let result = CleanInstallUsbResult {
            autounattend_path: xml_path.to_string_lossy().to_string(),
            setup_complete_path: setup_complete_path_out,
            local_username: safe_user,
            bypass_win11_reqs,
            skip_oobe_telemetry,
            inject_oem_driver_block,
        };

        Ok(CommandResponse::ok(
            format!(
                "Kit Clean Install gerado com sucesso em {}!",
                base_dir.display()
            ),
            Some(result),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_account_control_panel(tool: String) -> Result<CommandResponse<bool>, String> {
    tokio::task::spawn_blocking(move || {
        let target = match tool.as_str() {
            "lusrmgr" => "lusrmgr.msc",
            _ => "netplwiz",
        };
        let status = Command::new("cmd")
            .args(["/C", "start", "", target])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn();
        match status {
            Ok(_) => Ok(CommandResponse::ok(
                format!("Utilitário '{}' aberto.", target),
                Some(true),
            )),
            Err(e) => Ok(CommandResponse::err(format!(
                "Não foi possível abrir '{}': {}",
                target, e
            ))),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// ============================================================================
// MÓDULO 4: PÓS-PROCESSAMENTO INTELIGENTE DE APLICATIVOS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPostProcessResult {
    pub shortcuts_flattened: u32,
    pub empty_folders_removed: u32,
    pub browsers_optimized: Vec<String>,
    pub discord_spotify_optimized: bool,
    pub details: Vec<String>,
}

fn is_whitelisted_start_menu_dir(folder_name: &str) -> bool {
    let lower = folder_name.to_lowercase();
    matches!(
        lower.as_str(),
        "accessories"
            | "administrative tools"
            | "system tools"
            | "startup"
            | "accessibility"
            | "windows powershell"
            | "windows system"
            | "maintenance"
            | "windows accessories"
            | "windows administrative tools"
            | "windows ease of access"
            | "acessórios"
            | "acessórios do windows"
            | "ferramentas administrativas"
            | "ferramentas administrativas do windows"
            | "ferramentas do sistema"
            | "inicializar"
            | "sistema do windows"
            | "facilidade de acesso"
            | "acessibilidade"
    )
}

fn move_lnk_files_up(
    dir: &Path,
    programs_root: &Path,
    moved: &mut u32,
    removed_dirs: &mut u32,
) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            move_lnk_files_up(&p, programs_root, moved, removed_dirs);
        } else if p.is_file() {
            if let Some(ext) = p.extension().and_then(|e| e.to_str()) {
                if ext.eq_ignore_ascii_case("lnk") {
                    if let Some(file_name) = p.file_name() {
                        let dest = programs_root.join(file_name);
                        if !dest.exists() && fs::rename(&p, &dest).is_ok() {
                            *moved += 1;
                        }
                    }
                }
            }
        }
    }

    if let Ok(mut remaining) = fs::read_dir(dir) {
        if remaining.next().is_none() && fs::remove_dir(dir).is_ok() {
            *removed_dirs += 1;
        }
    }
}

#[tauri::command]
pub async fn run_app_post_processing(
    flatten_shortcuts: bool,
    optimize_browsers: bool,
    optimize_discord_spotify: bool,
    disable_browser_hw_accel: bool,
) -> Result<CommandResponse<AppPostProcessResult>, String> {
    tokio::task::spawn_blocking(move || {
        let mut shortcuts_flattened = 0u32;
        let mut empty_folders_removed = 0u32;
        let mut browsers_optimized = Vec::new();
        let mut discord_spotify_optimized = false;
        let mut details = Vec::new();

        // 1. Nivelar atalhos de pastas aninhadas no Menu Iniciar
        if flatten_shortcuts {
            let mut roots = vec![PathBuf::from(
                r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
            )];
            if let Ok(appdata) = std::env::var("APPDATA") {
                roots.push(
                    PathBuf::from(appdata)
                        .join("Microsoft")
                        .join("Windows")
                        .join("Start Menu")
                        .join("Programs"),
                );
            }

            for root in roots {
                if !root.exists() {
                    continue;
                }
                if let Ok(entries) = fs::read_dir(&root) {
                    for entry in entries.flatten() {
                        let p = entry.path();
                        if p.is_dir() {
                            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                                if !is_whitelisted_start_menu_dir(name) {
                                    move_lnk_files_up(
                                        &p,
                                        &root,
                                        &mut shortcuts_flattened,
                                        &mut empty_folders_removed,
                                    );
                                }
                            }
                        }
                    }
                }
            }
            details.push(format!(
                "Menu Iniciar nivelado: {} atalho(s) movido(s), {} pasta(s) vazia(s) removida(s).",
                shortcuts_flattened, empty_folders_removed
            ));
        }

        // 2. Otimizar Navegadores (Brave / Chrome / Edge) via Políticas de Registro + Updaters
        if optimize_browsers {
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            let targets = [
                ("Chrome", r"SOFTWARE\Policies\Google\Chrome"),
                ("Brave", r"SOFTWARE\Policies\BraveSoftware\Brave"),
                ("Edge", r"SOFTWARE\Policies\Microsoft\Edge"),
            ];

            for (label, reg_path) in targets {
                if let Ok((key, _)) = hklm.create_subkey(reg_path) {
                    let _ = key.set_value("BackgroundModeEnabled", &0u32);
                    let _ = key.set_value("HighEfficiencyModeEnabled", &1u32);
                    if disable_browser_hw_accel {
                        let _ = key.set_value("HardwareAccelerationModeEnabled", &0u32);
                    } else {
                        let _ = key.delete_value("HardwareAccelerationModeEnabled");
                    }
                    browsers_optimized.push(label.to_string());
                }
            }

            // Desativar serviços e tarefas em segundo plano de updaters pesados
            for svc in ["gupdate", "gupdatem", "brave", "bravem"] {
                let _ = Command::new("sc")
                    .args(["config", svc, "start=", "disabled"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
                let _ = Command::new("sc")
                    .args(["stop", svc])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
            }
            for task in [
                "GoogleUpdateTaskMachineCore",
                "GoogleUpdateTaskMachineUA",
                "BraveSoftwareUpdateTaskMachineCore",
                "BraveSoftwareUpdateTaskMachineUA",
            ] {
                let _ = Command::new("schtasks")
                    .args(["/Change", "/TN", task, "/DISABLE"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
            }

            details.push(format!(
                "Navegadores otimizados via GPO/Registro ({}): BackgroundMode OFF, Efficiency ON{}.",
                browsers_optimized.join(", "),
                if disable_browser_hw_accel {
                    ", HW Accel OFF"
                } else {
                    ""
                }
            ));
        }

        // 3. Otimizar Discord & Spotify (remover Auto-Start + settings.json do Discord)
        if optimize_discord_spotify {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok(run_key) = hkcu.open_subkey_with_flags(
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                KEY_WRITE,
            ) {
                for val_name in ["Discord", "Spotify", "Spotify Web Helper"] {
                    let _ = run_key.delete_value(val_name);
                }
            }

            if let Ok(appdata) = std::env::var("APPDATA") {
                let discord_settings = PathBuf::from(&appdata).join("discord").join("settings.json");
                let mut json_obj = if discord_settings.exists() {
                    fs::read_to_string(&discord_settings)
                        .ok()
                        .and_then(|txt| serde_json::from_str::<serde_json::Value>(&txt).ok())
                        .unwrap_or_else(|| serde_json::json!({}))
                } else {
                    serde_json::json!({})
                };

                if let Some(map) = json_obj.as_object_mut() {
                    map.insert("MINIMIZE_TO_TRAY".to_string(), serde_json::json!(false));
                    map.insert("OPEN_ON_STARTUP".to_string(), serde_json::json!(false));
                    map.insert(
                        "enableHardwareAcceleration".to_string(),
                        serde_json::json!(false),
                    );
                    if let Some(parent) = discord_settings.parent() {
                        let _ = fs::create_dir_all(parent);
                    }
                    if let Ok(formatted) = serde_json::to_string_pretty(&json_obj) {
                        let _ = fs::write(&discord_settings, formatted);
                    }
                }
            }

            discord_spotify_optimized = true;
            details.push(
                "Discord e Spotify otimizados: removidos do auto-boot e Minimize to Tray/HW Accel desativados."
                    .to_string(),
            );
        }

        let res = AppPostProcessResult {
            shortcuts_flattened,
            empty_folders_removed,
            browsers_optimized,
            discord_spotify_optimized,
            details: details.clone(),
        };

        let summary = if details.is_empty() {
            "Nenhuma opção de pós-processamento selecionada.".to_string()
        } else {
            details.join(" | ")
        };

        Ok(CommandResponse::ok(summary, Some(res)))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Desativa ou restaura a economia de energia em todos os controladores USB e dispositivos HID no Registro
/// e no plano de energia ativo (Selective Suspend / EnhancedPowerManagementEnabled / AllowIdleIrpInD3).
#[tauri::command]
pub async fn disable_usb_power_saving(revert: bool) -> Result<CommandResponse<usize>, String> {
    tokio::task::spawn_blocking(move || {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let enum_roots = [
            r"SYSTEM\CurrentControlSet\Enum\USB",
            r"SYSTEM\CurrentControlSet\Enum\HID",
        ];

        let target_val: u32 = if revert { 1 } else { 0 };
        let mut updated = 0usize;

        for root_path in enum_roots {
            let Ok(root_key) = hklm.open_subkey_with_flags(root_path, KEY_READ) else {
                continue;
            };
            for dev_name in root_key.enum_keys().flatten() {
                let Ok(dev_key) = root_key.open_subkey_with_flags(&dev_name, KEY_READ) else {
                    continue;
                };
                for inst_name in dev_key.enum_keys().flatten() {
                    let dp_path = format!(r"{}\{}\{}\Device Parameters", root_path, dev_name, inst_name);
                    if let Ok(dp_key) = hklm.open_subkey_with_flags(&dp_path, KEY_WRITE) {
                        let _ = dp_key.set_value("EnhancedPowerManagementEnabled", &target_val);
                        let _ = dp_key.set_value("AllowIdleIrpInD3", &target_val);
                        let _ = dp_key.set_value("DeviceSelectiveSuspended", &target_val);
                        let _ = dp_key.set_value("SelectiveSuspendEnabled", &target_val);
                        updated += 1;
                    }
                }
            }
        }

        // Desativa / restaura USB Selective Suspend no plano de energia ativo via powercfg
        let ac_dc = if revert { "1" } else { "0" };
        let _ = Command::new("powercfg")
            .args([
                "/SETACVALUEINDEX",
                "SCHEME_CURRENT",
                "2a737441-1930-4402-8d77-b2bebba308a3",
                "48e6b7a6-50f5-4782-a5d4-53bb8f07e226",
                ac_dc,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        let _ = Command::new("powercfg")
            .args([
                "/SETDCVALUEINDEX",
                "SCHEME_CURRENT",
                "2a737441-1930-4402-8d77-b2bebba308a3",
                "48e6b7a6-50f5-4782-a5d4-53bb8f07e226",
                ac_dc,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        let _ = Command::new("powercfg")
            .args(["/SETACTIVE", "SCHEME_CURRENT"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        let msg = if revert {
            format!(
                "Economia de energia USB/HID restaurada ao padrão em {} dispositivos + USB Selective Suspend reativado.",
                updated
            )
        } else {
            format!(
                "Economia de energia desativada em {} controladores/dispositivos USB & HID! (Dica: se mudar o mouse/controle de porta USB, clique aqui novamente).",
                updated
            )
        };

        Ok(CommandResponse::ok(msg, Some(updated)))
    })
    .await
    .map_err(|e| e.to_string())?
}
