use serde::{Deserialize, Serialize};
use crate::state::CommandResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuSpecEntry {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub arch: String,
    pub chip: String,
    pub process: String,
    pub vram_gb: u32,
    pub mem_type: String,
    pub shaders: u32,
    pub tdp_w: u32,
    pub perf_index: f64, // RTX 4070 = 100.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuSpecEntry {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub cores: u32,
    pub threads: u32,
    pub boost_ghz: f32,
    pub perf_index: f64, // Ryzen 7 7700X = 100.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionAnalysis {
    pub resolution: String,       // "1080p", "1440p", "2160p"
    pub label: String,            // "1920x1080 (Full HD)", etc.
    pub bottleneck_percent: f64,  // 0.0 .. 100.0
    pub limiting_component: String, // "CPU", "GPU", "Balanced"
    pub balance_ratio: f64,
    pub status_label: String,
    pub recommendation_pt: String,
    pub recommendation_en: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BottleneckReport {
    pub cpu_name: String,
    pub cpu_index: f64,
    pub gpu_name: String,
    pub gpu_index: f64,
    pub gpu_spec: Option<GpuSpecEntry>,
    pub resolutions: Vec<ResolutionAnalysis>,
    pub catalog_cpus: Vec<CpuSpecEntry>,
    pub catalog_gpus: Vec<GpuSpecEntry>,
}

pub fn get_gpu_catalog() -> Vec<GpuSpecEntry> {
    vec![
        GpuSpecEntry { id: "rtx5090".into(), name: "NVIDIA GeForce RTX 5090".into(), vendor: "NVIDIA".into(), arch: "Blackwell".into(), chip: "GB202".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 32, mem_type: "GDDR7".into(), shaders: 21760, tdp_w: 575, perf_index: 265.0 },
        GpuSpecEntry { id: "rtx5080".into(), name: "NVIDIA GeForce RTX 5080".into(), vendor: "NVIDIA".into(), arch: "Blackwell".into(), chip: "GB203".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 16, mem_type: "GDDR7".into(), shaders: 10752, tdp_w: 360, perf_index: 175.0 },
        GpuSpecEntry { id: "rtx5070ti".into(), name: "NVIDIA GeForce RTX 5070 Ti".into(), vendor: "NVIDIA".into(), arch: "Blackwell".into(), chip: "GB203".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 16, mem_type: "GDDR7".into(), shaders: 8960, tdp_w: 300, perf_index: 150.0 },
        GpuSpecEntry { id: "rtx5070".into(), name: "NVIDIA GeForce RTX 5070".into(), vendor: "NVIDIA".into(), arch: "Blackwell".into(), chip: "GB205".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 12, mem_type: "GDDR7".into(), shaders: 6144, tdp_w: 250, perf_index: 118.0 },
        GpuSpecEntry { id: "rtx4090".into(), name: "NVIDIA GeForce RTX 4090".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD102".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 24, mem_type: "GDDR6X".into(), shaders: 16384, tdp_w: 450, perf_index: 210.0 },
        GpuSpecEntry { id: "rtx4080s".into(), name: "NVIDIA GeForce RTX 4080 SUPER".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD103".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 16, mem_type: "GDDR6X".into(), shaders: 10240, tdp_w: 320, perf_index: 160.0 },
        GpuSpecEntry { id: "rtx4070tis".into(), name: "NVIDIA GeForce RTX 4070 Ti SUPER".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD103".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 16, mem_type: "GDDR6X".into(), shaders: 8448, tdp_w: 285, perf_index: 136.0 },
        GpuSpecEntry { id: "rtx4070s".into(), name: "NVIDIA GeForce RTX 4070 SUPER".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD104".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 12, mem_type: "GDDR6X".into(), shaders: 7168, tdp_w: 220, perf_index: 116.0 },
        GpuSpecEntry { id: "rtx4070".into(), name: "NVIDIA GeForce RTX 4070".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD104".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 12, mem_type: "GDDR6X".into(), shaders: 5888, tdp_w: 200, perf_index: 100.0 },
        GpuSpecEntry { id: "rtx4060ti".into(), name: "NVIDIA GeForce RTX 4060 Ti".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD106".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 4352, tdp_w: 160, perf_index: 82.0 },
        GpuSpecEntry { id: "rtx4060".into(), name: "NVIDIA GeForce RTX 4060".into(), vendor: "NVIDIA".into(), arch: "Ada Lovelace".into(), chip: "AD107".into(), process: "TSMC 4N (5 nm)".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 3072, tdp_w: 115, perf_index: 70.0 },
        GpuSpecEntry { id: "rtx3080".into(), name: "NVIDIA GeForce RTX 3080".into(), vendor: "NVIDIA".into(), arch: "Ampere".into(), chip: "GA102".into(), process: "Samsung 8 nm".into(), vram_gb: 10, mem_type: "GDDR6X".into(), shaders: 8704, tdp_w: 320, perf_index: 112.0 },
        GpuSpecEntry { id: "rtx3070".into(), name: "NVIDIA GeForce RTX 3070".into(), vendor: "NVIDIA".into(), arch: "Ampere".into(), chip: "GA104".into(), process: "Samsung 8 nm".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 5888, tdp_w: 220, perf_index: 86.0 },
        GpuSpecEntry { id: "rtx3060ti".into(), name: "NVIDIA GeForce RTX 3060 Ti".into(), vendor: "NVIDIA".into(), arch: "Ampere".into(), chip: "GA104".into(), process: "Samsung 8 nm".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 4864, tdp_w: 200, perf_index: 78.0 },
        GpuSpecEntry { id: "rtx3060".into(), name: "NVIDIA GeForce RTX 3060".into(), vendor: "NVIDIA".into(), arch: "Ampere".into(), chip: "GA106".into(), process: "Samsung 8 nm".into(), vram_gb: 12, mem_type: "GDDR6".into(), shaders: 3584, tdp_w: 170, perf_index: 60.0 },
        GpuSpecEntry { id: "rtx3050".into(), name: "NVIDIA GeForce RTX 3050".into(), vendor: "NVIDIA".into(), arch: "Ampere".into(), chip: "GA106".into(), process: "Samsung 8 nm".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 2560, tdp_w: 130, perf_index: 42.0 },
        GpuSpecEntry { id: "gtx1660s".into(), name: "NVIDIA GeForce GTX 1660 SUPER".into(), vendor: "NVIDIA".into(), arch: "Turing".into(), chip: "TU116".into(), process: "TSMC 12 nm".into(), vram_gb: 6, mem_type: "GDDR6".into(), shaders: 1408, tdp_w: 125, perf_index: 38.0 },
        GpuSpecEntry { id: "gtx1650".into(), name: "NVIDIA GeForce GTX 1650".into(), vendor: "NVIDIA".into(), arch: "Turing".into(), chip: "TU117".into(), process: "TSMC 12 nm".into(), vram_gb: 4, mem_type: "GDDR6".into(), shaders: 896, tdp_w: 75, perf_index: 28.0 },
        GpuSpecEntry { id: "rx9070xt".into(), name: "AMD Radeon RX 9070 XT".into(), vendor: "AMD".into(), arch: "RDNA 4".into(), chip: "Navi 48".into(), process: "TSMC N4P (4 nm)".into(), vram_gb: 16, mem_type: "GDDR6".into(), shaders: 4096, tdp_w: 304, perf_index: 160.0 },
        GpuSpecEntry { id: "rx7900xtx".into(), name: "AMD Radeon RX 7900 XTX".into(), vendor: "AMD".into(), arch: "RDNA 3".into(), chip: "Navi 31".into(), process: "TSMC 5 nm".into(), vram_gb: 24, mem_type: "GDDR6".into(), shaders: 6144, tdp_w: 355, perf_index: 170.0 },
        GpuSpecEntry { id: "rx7800xt".into(), name: "AMD Radeon RX 7800 XT".into(), vendor: "AMD".into(), arch: "RDNA 3".into(), chip: "Navi 32".into(), process: "TSMC 5 nm".into(), vram_gb: 16, mem_type: "GDDR6".into(), shaders: 3840, tdp_w: 263, perf_index: 115.0 },
        GpuSpecEntry { id: "rx7700xt".into(), name: "AMD Radeon RX 7700 XT".into(), vendor: "AMD".into(), arch: "RDNA 3".into(), chip: "Navi 32".into(), process: "TSMC 5 nm".into(), vram_gb: 12, mem_type: "GDDR6".into(), shaders: 3456, tdp_w: 245, perf_index: 98.0 },
        GpuSpecEntry { id: "rx7600".into(), name: "AMD Radeon RX 7600".into(), vendor: "AMD".into(), arch: "RDNA 3".into(), chip: "Navi 33".into(), process: "TSMC 6 nm".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 2048, tdp_w: 165, perf_index: 70.0 },
        GpuSpecEntry { id: "rx6700xt".into(), name: "AMD Radeon RX 6700 XT".into(), vendor: "AMD".into(), arch: "RDNA 2".into(), chip: "Navi 22".into(), process: "TSMC 7 nm".into(), vram_gb: 12, mem_type: "GDDR6".into(), shaders: 2560, tdp_w: 230, perf_index: 82.0 },
        GpuSpecEntry { id: "rx6600".into(), name: "AMD Radeon RX 6600".into(), vendor: "AMD".into(), arch: "RDNA 2".into(), chip: "Navi 23".into(), process: "TSMC 7 nm".into(), vram_gb: 8, mem_type: "GDDR6".into(), shaders: 1792, tdp_w: 132, perf_index: 58.0 },
        GpuSpecEntry { id: "arcb580".into(), name: "Intel Arc B580".into(), vendor: "Intel".into(), arch: "Battlemage".into(), chip: "BMG-G21".into(), process: "TSMC N5".into(), vram_gb: 12, mem_type: "GDDR6".into(), shaders: 2560, tdp_w: 190, perf_index: 80.0 },
    ]
}

pub fn get_cpu_catalog() -> Vec<CpuSpecEntry> {
    vec![
        CpuSpecEntry { id: "r7_9800x3d".into(), name: "AMD Ryzen 7 9800X3D".into(), vendor: "AMD".into(), cores: 8, threads: 16, boost_ghz: 5.2, perf_index: 140.0 },
        CpuSpecEntry { id: "r7_7800x3d".into(), name: "AMD Ryzen 7 7800X3D".into(), vendor: "AMD".into(), cores: 8, threads: 16, boost_ghz: 5.0, perf_index: 128.0 },
        CpuSpecEntry { id: "r9_7950x".into(), name: "AMD Ryzen 9 7950X".into(), vendor: "AMD".into(), cores: 16, threads: 32, boost_ghz: 5.7, perf_index: 106.0 },
        CpuSpecEntry { id: "r7_7700x".into(), name: "AMD Ryzen 7 7700X".into(), vendor: "AMD".into(), cores: 8, threads: 16, boost_ghz: 5.4, perf_index: 100.0 },
        CpuSpecEntry { id: "r5_7600x".into(), name: "AMD Ryzen 5 7600X".into(), vendor: "AMD".into(), cores: 6, threads: 12, boost_ghz: 5.3, perf_index: 96.0 },
        CpuSpecEntry { id: "r7_5700x3d".into(), name: "AMD Ryzen 7 5700X3D".into(), vendor: "AMD".into(), cores: 8, threads: 16, boost_ghz: 4.1, perf_index: 92.0 },
        CpuSpecEntry { id: "r7_5700x".into(), name: "AMD Ryzen 7 5700X".into(), vendor: "AMD".into(), cores: 8, threads: 16, boost_ghz: 4.6, perf_index: 78.0 },
        CpuSpecEntry { id: "r5_5600x".into(), name: "AMD Ryzen 5 5600X".into(), vendor: "AMD".into(), cores: 6, threads: 12, boost_ghz: 4.6, perf_index: 76.0 },
        CpuSpecEntry { id: "r5_5600".into(), name: "AMD Ryzen 5 5600".into(), vendor: "AMD".into(), cores: 6, threads: 12, boost_ghz: 4.4, perf_index: 73.0 },
        CpuSpecEntry { id: "r5_3600".into(), name: "AMD Ryzen 5 3600".into(), vendor: "AMD".into(), cores: 6, threads: 12, boost_ghz: 4.2, perf_index: 56.0 },
        CpuSpecEntry { id: "i9_14900k".into(), name: "Intel Core i9-14900K".into(), vendor: "Intel".into(), cores: 24, threads: 32, boost_ghz: 6.0, perf_index: 116.0 },
        CpuSpecEntry { id: "i7_14700k".into(), name: "Intel Core i7-14700K".into(), vendor: "Intel".into(), cores: 20, threads: 28, boost_ghz: 5.6, perf_index: 112.0 },
        CpuSpecEntry { id: "i5_14600k".into(), name: "Intel Core i5-14600K".into(), vendor: "Intel".into(), cores: 14, threads: 20, boost_ghz: 5.3, perf_index: 104.0 },
        CpuSpecEntry { id: "i7_13700k".into(), name: "Intel Core i7-13700K".into(), vendor: "Intel".into(), cores: 16, threads: 24, boost_ghz: 5.4, perf_index: 108.0 },
        CpuSpecEntry { id: "i5_13400f".into(), name: "Intel Core i5-13400F".into(), vendor: "Intel".into(), cores: 10, threads: 16, boost_ghz: 4.6, perf_index: 84.0 },
        CpuSpecEntry { id: "i5_12400f".into(), name: "Intel Core i5-12400F".into(), vendor: "Intel".into(), cores: 6, threads: 12, boost_ghz: 4.4, perf_index: 78.0 },
        CpuSpecEntry { id: "i5_10400f".into(), name: "Intel Core i5-10400F".into(), vendor: "Intel".into(), cores: 6, threads: 12, boost_ghz: 4.3, perf_index: 58.0 },
    ]
}

pub fn lookup_gpu_index(gpu_name: &str) -> (f64, Option<GpuSpecEntry>) {
    let lower = gpu_name.to_lowercase();
    let catalog = get_gpu_catalog();
    // Match longest model substring first
    let mut best: Option<GpuSpecEntry> = None;
    let mut best_len = 0usize;

    for item in &catalog {
        let short = item.name
            .replace("NVIDIA GeForce ", "")
            .replace("AMD Radeon ", "")
            .replace("Intel ", "")
            .to_lowercase();
        if lower.contains(&short) && short.len() > best_len {
            best_len = short.len();
            best = Some(item.clone());
        }
    }

    if let Some(found) = best {
        return (found.perf_index, Some(found));
    }

    // Heuristic fallback
    if lower.contains("4090") { (210.0, None) }
    else if lower.contains("4080") { (158.0, None) }
    else if lower.contains("4070") { (105.0, None) }
    else if lower.contains("4060") { (74.0, None) }
    else if lower.contains("3080") { (112.0, None) }
    else if lower.contains("3070") { (86.0, None) }
    else if lower.contains("3060") { (64.0, None) }
    else if lower.contains("2060") { (48.0, None) }
    else if lower.contains("1650") || lower.contains("1050") { (28.0, None) }
    else if lower.contains("radeon") && !lower.contains("rx") { (15.0, None) }
    else if lower.contains("uhd") || lower.contains("iris") { (12.0, None) }
    else { (65.0, None) }
}

pub fn lookup_cpu_index(cpu_name: &str, physical_cores: usize, base_ghz: f32) -> f64 {
    let lower = cpu_name.to_lowercase();
    for item in get_cpu_catalog() {
        let short = item.name
            .replace("AMD Ryzen 9 ", "")
            .replace("AMD Ryzen 7 ", "")
            .replace("AMD Ryzen 5 ", "")
            .replace("Intel Core ", "")
            .to_lowercase();
        if lower.contains(&short) {
            return item.perf_index;
        }
    }

    // Heuristic by generation + core count
    let core_factor = (physical_cores.max(4) as f64 / 8.0).clamp(0.5, 1.5);
    let clock_factor = (base_ghz.max(2.5) as f64 / 3.8).clamp(0.65, 1.35);
    (75.0 * core_factor * clock_factor).clamp(35.0, 135.0)
}

fn analyze_for_resolution(cpu_idx: f64, gpu_idx: f64, res_key: &str, label: &str, res_gpu_weight: f64) -> ResolutionAnalysis {
    // At higher resolutions, GPU workload scales up heavily while CPU stays relatively constant
    let effective_gpu = gpu_idx * res_gpu_weight;
    let ratio = effective_gpu / cpu_idx.max(1.0);

    let (limiting_component, bottleneck_pct, status_label, rec_pt, rec_en) = if ratio > 1.28 {
        let pct = ((1.0 - (cpu_idx / effective_gpu)) * 100.0).clamp(5.0, 65.0);
        (
            "CPU".to_string(),
            (pct * 10.0).round() / 10.0,
            "Gargalo de Processador (CPU Bound)".to_string(),
            "A placa de vídeo sobra nesta resolução e o processador limita o máximo de FPS. Suba a qualidade gráfica, ative XMP/EXPO na BIOS, ative o Timer de 0.5ms e feche processos em segundo plano.".to_string(),
            "Your GPU has headroom at this resolution while the CPU caps maximum FPS. Increase graphics presets, enable XMP/EXPO in BIOS, enable the 0.5ms Kernel Timer, and close background tasks.".to_string(),
        )
    } else if ratio < 0.76 {
        let pct = ((1.0 - (effective_gpu / cpu_idx)) * 100.0).clamp(5.0, 65.0);
        (
            "GPU".to_string(),
            (pct * 10.0).round() / 10.0,
            "Limitado pela Placa de Vídeo (GPU Bound)".to_string(),
            "O processador entrega folga de sobra e a placa de vídeo trabalha a 99% (cenário normal em jogos pesados). Para ganhar mais FPS, ative DLSS/FSR, reduza sombras/volumetria ou ative Resizable BAR.".to_string(),
            "Your CPU has plenty of headroom and the GPU runs at 99% (normal in heavy games). For higher FPS, enable DLSS/FSR, lower volumetric shadows, or enable Resizable BAR.".to_string(),
        )
    } else {
        let pct = ((ratio - 1.0).abs() * 28.0).clamp(1.5, 11.5);
        (
            "Balanced".to_string(),
            (pct * 10.0).round() / 10.0,
            "Sistema Equilibrado (Sinergia Ideal)".to_string(),
            "Excelente equilíbrio entre CPU e GPU nesta resolução! Os dois componentes trabalham em harmonia sem subutilização severa.".to_string(),
            "Excellent balance between CPU and GPU at this resolution! Both components work in harmony without severe underutilization.".to_string(),
        )
    };

    ResolutionAnalysis {
        resolution: res_key.to_string(),
        label: label.to_string(),
        bottleneck_percent: bottleneck_pct,
        limiting_component,
        balance_ratio: (ratio * 100.0).round() / 100.0,
        status_label,
        recommendation_pt: rec_pt,
        recommendation_en: rec_en,
    }
}

#[tauri::command]
pub async fn analyze_bottleneck(
    custom_cpu_id: Option<String>,
    custom_gpu_id: Option<String>,
    detected_cpu_name: Option<String>,
    detected_gpu_name: Option<String>,
    detected_cores: Option<usize>,
    detected_ghz: Option<f32>,
) -> Result<CommandResponse<BottleneckReport>, String> {
    let cpus = get_cpu_catalog();
    let gpus = get_gpu_catalog();

    let (cpu_name, cpu_idx) = if let Some(cid) = custom_cpu_id.filter(|s| !s.is_empty() && s != "detected") {
        if let Some(c) = cpus.iter().find(|x| x.id == cid) {
            (c.name.clone(), c.perf_index)
        } else {
            let name = detected_cpu_name.unwrap_or_else(|| "Processador Detectado".to_string());
            let idx = lookup_cpu_index(&name, detected_cores.unwrap_or(6), detected_ghz.unwrap_or(3.6));
            (name, idx)
        }
    } else {
        let name = detected_cpu_name.unwrap_or_else(|| "AMD Ryzen 7 7700X".to_string());
        let idx = lookup_cpu_index(&name, detected_cores.unwrap_or(6), detected_ghz.unwrap_or(3.6));
        (name, idx)
    };

    let (gpu_name, gpu_idx, gpu_spec) = if let Some(gid) = custom_gpu_id.filter(|s| !s.is_empty() && s != "detected") {
        if let Some(g) = gpus.iter().find(|x| x.id == gid) {
            (g.name.clone(), g.perf_index, Some(g.clone()))
        } else {
            let name = detected_gpu_name.unwrap_or_else(|| "GPU Detectada".to_string());
            let (idx, spec) = lookup_gpu_index(&name);
            (name, idx, spec)
        }
    } else {
        let name = detected_gpu_name.unwrap_or_else(|| "NVIDIA GeForce RTX 4070".to_string());
        let (idx, spec) = lookup_gpu_index(&name);
        (name, idx, spec)
    };

    let resolutions = vec![
        analyze_for_resolution(cpu_idx, gpu_idx, "1080p", "1920x1080 (Full HD)", 1.15),
        analyze_for_resolution(cpu_idx, gpu_idx, "1440p", "2560x1440 (Quad HD)", 0.85),
        analyze_for_resolution(cpu_idx, gpu_idx, "2160p", "3840x2160 (4K Ultra HD)", 0.52),
    ];

    let report = BottleneckReport {
        cpu_name,
        cpu_index: (cpu_idx * 10.0).round() / 10.0,
        gpu_name,
        gpu_index: (gpu_idx * 10.0).round() / 10.0,
        gpu_spec,
        resolutions,
        catalog_cpus: cpus,
        catalog_gpus: gpus,
    };

    Ok(CommandResponse::ok("Análise de gargalo calculada com sucesso.", Some(report)))
}
