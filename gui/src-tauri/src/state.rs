use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tokio::sync::watch;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}

impl<T> CommandResponse<T> {
    pub fn ok(message: impl Into<String>, data: Option<T>) -> Self {
        Self {
            success: true,
            message: message.into(),
            data,
        }
    }

    pub fn err(message: impl Into<String>) -> Self {
        Self {
            success: false,
            message: message.into(),
            data: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StepEvent {
    pub step_id: String,
    pub step_name: String,
    pub status: String, // "running", "success", "error", "info"
    pub details: String,
    pub current: usize,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GamerStatus {
    pub timer_resolution_active: bool,
    pub current_resolution_ms: f32,
    pub ram_autoclean_active: bool,
}

pub struct GamerStateInner {
    pub timer_resolution_active: bool,
    pub current_resolution_100ns: u32,
    pub ram_autoclean_active: bool,
    pub ram_autoclean_cancel: Option<watch::Sender<bool>>,
}

pub struct StressStateShared {
    pub running: Arc<AtomicBool>,
    pub start_epoch_ms: Arc<AtomicU64>,
    pub mem_errors: Arc<AtomicU64>,
    pub mem_passes: Arc<AtomicU64>,
    pub max_temp_mc: Arc<AtomicU32>,
    pub cpu_enabled: Arc<AtomicBool>,
    pub ram_enabled: Arc<AtomicBool>,
}

pub struct AppState {
    pub gamer: Mutex<GamerStateInner>,
    pub stress: StressStateShared,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            gamer: Mutex::new(GamerStateInner {
                timer_resolution_active: false,
                current_resolution_100ns: 156250, // 15.625 ms default
                ram_autoclean_active: false,
                ram_autoclean_cancel: None,
            }),
            stress: StressStateShared {
                running: Arc::new(AtomicBool::new(false)),
                start_epoch_ms: Arc::new(AtomicU64::new(0)),
                mem_errors: Arc::new(AtomicU64::new(0)),
                mem_passes: Arc::new(AtomicU64::new(0)),
                max_temp_mc: Arc::new(AtomicU32::new(0)),
                cpu_enabled: Arc::new(AtomicBool::new(true)),
                ram_enabled: Arc::new(AtomicBool::new(true)),
            },
        }
    }
}
