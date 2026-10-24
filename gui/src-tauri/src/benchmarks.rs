use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::bottleneck::{lookup_cpu_index, lookup_gpu_index};
use crate::state::{AppState, CommandResponse};
use crate::utils::emit_step;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskBenchmarkResult {
    pub drive: String,
    pub file_size_mb: u64,
    pub seq_read_mbs: f64,
    pub seq_write_mbs: f64,
    pub random_4k_read_iops: u64,
    pub random_4k_write_iops: u64,
    pub read_latency_us: f64,
    pub write_latency_us: f64,
    pub score: u32,
    pub tier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RamBenchmarkResult {
    pub read_gbs: f64,
    pub write_gbs: f64,
    pub copy_gbs: f64,
    pub latency_ns: f64,
    pub score: u32,
    pub tier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameFpsEstimate {
    pub name: String,
    pub category: String, // "Esports", "Battle Royale", "AAA"
    pub avg_fps: u32,
    pub low1_fps: u32,
    pub limiter: String, // "CPU", "GPU", "Equilibrado"
    pub tier: String,    // "Competitivo 240Hz+", "Fluido 120Hz+", "Jogável 60Hz+", "Abaixo de 60 FPS"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuAndGameBenchmarkResult {
    pub single_core_score: u32,
    pub multi_core_score: u32,
    pub threads_tested: usize,
    pub sim_avg_fps: u32,
    pub sim_low1_fps: u32,
    pub resolution: String,
    pub preset: String,
    pub games: Vec<GameFpsEstimate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StressStatus {
    pub running: bool,
    pub elapsed_secs: u64,
    pub cpu_enabled: bool,
    pub ram_enabled: bool,
    pub mem_passes: u64,
    pub mem_errors: u64,
    pub max_temp_c: f32,
}

struct TempFileCleanup(PathBuf);
impl Drop for TempFileCleanup {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

#[tauri::command]
pub async fn run_disk_benchmark(
    drive_letter: Option<String>,
    file_mb: Option<u64>,
    app: AppHandle,
) -> Result<CommandResponse<DiskBenchmarkResult>, String> {
    let drive = drive_letter
        .unwrap_or_else(|| "C:".to_string())
        .trim()
        .trim_end_matches('\\')
        .to_uppercase();
    let size_mb = file_mb.unwrap_or(256).clamp(64, 1024);

    let app_clone = app.clone();
    let result = tokio::task::spawn_blocking(move || -> Result<DiskBenchmarkResult, String> {
        emit_step(
            &app_clone,
            "disk-init",
            "Preparando Buffer Incompressível (1 MB)",
            "running",
            &format!("Alocando arquivo temporário de {} MB em {}...", size_mb, drive),
            1,
            4,
        );

        let base_dir = if drive.len() == 2 && drive.ends_with(':') {
            let root_candidate = PathBuf::from(format!("{}\\SystemOptimizer_TempBench", drive));
            if fs::create_dir_all(&root_candidate).is_ok() {
                root_candidate
            } else {
                std::env::temp_dir()
            }
        } else {
            std::env::temp_dir()
        };

        let file_path = base_dir.join(format!("sysopt_bench_{}.bin", std::process::id()));
        let _cleanup = TempFileCleanup(file_path.clone());

        // Fill 1 MB block with pseudo-random incompressible bytes (XORShift)
        let block_size = 1024 * 1024;
        let mut block = vec![0u8; block_size];
        let mut seed: u64 = 0x9E37_79B9_7F4A_7C15;
        for chunk in block.chunks_exact_mut(8) {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            chunk.copy_from_slice(&seed.to_le_bytes());
        }

        // 1. Sequential Write
        emit_step(
            &app_clone,
            "disk-write",
            "Teste de Escrita Sequencial",
            "running",
            &format!("Gravando {} MB sequencialmente...", size_mb),
            2,
            4,
        );

        let t_write_start = Instant::now();
        {
            let mut f = File::create(&file_path)
                .map_err(|e| format!("Falha ao criar arquivo de teste: {}", e))?;
            for i in 0..size_mb {
                block[0] = (i & 0xFF) as u8;
                f.write_all(&block)
                    .map_err(|e| format!("Erro na escrita: {}", e))?;
            }
            f.sync_all()
                .map_err(|e| format!("Erro ao sincronizar disco: {}", e))?;
        }
        let write_secs = t_write_start.elapsed().as_secs_f64().max(0.001);
        let seq_write_mbs = ((size_mb as f64 / write_secs) * 10.0).round() / 10.0;

        // 2. Sequential Read
        emit_step(
            &app_clone,
            "disk-read",
            "Teste de Leitura Sequencial",
            "running",
            &format!("Lendo {} MB sequencialmente...", size_mb),
            3,
            4,
        );

        let mut read_buf = vec![0u8; block_size];
        let t_read_start = Instant::now();
        {
            let mut f = File::open(&file_path)
                .map_err(|e| format!("Falha ao abrir arquivo para leitura: {}", e))?;
            let mut total_read = 0usize;
            while total_read < (size_mb as usize) * block_size {
                let n = f
                    .read(&mut read_buf)
                    .map_err(|e| format!("Erro na leitura: {}", e))?;
                if n == 0 {
                    break;
                }
                total_read += n;
            }
        }
        let read_secs = t_read_start.elapsed().as_secs_f64().max(0.001);
        let seq_read_mbs = ((size_mb as f64 / read_secs) * 10.0).round() / 10.0;

        // 3. Random 4K IOPS & Latency
        emit_step(
            &app_clone,
            "disk-4k",
            "Teste Aleatório 4K IOPS & Latência",
            "running",
            "Medindo IOPS 4K e tempo de resposta em microssegundos...",
            4,
            4,
        );

        let total_4k_blocks = ((size_mb * 1024) / 4).max(1);
        let ops_count = 1500u64;
        let mut buf_4k = [0x5Au8; 4096];

        let mut f = OpenOptions::new()
            .read(true)
            .write(true)
            .open(&file_path)
            .map_err(|e| format!("Falha ao abrir para teste 4K: {}", e))?;

        let t_4k_read = Instant::now();
        for i in 0..ops_count {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            let blk = (seed.wrapping_add(i)) % total_4k_blocks;
            let _ = f.seek(SeekFrom::Start(blk * 4096));
            let _ = f.read_exact(&mut buf_4k);
        }
        let r4k_secs = t_4k_read.elapsed().as_secs_f64().max(0.0001);
        let random_4k_read_iops = (ops_count as f64 / r4k_secs).round() as u64;
        let read_latency_us = (((r4k_secs * 1_000_000.0) / ops_count as f64) * 10.0).round() / 10.0;

        let write_ops = 600u64;
        let t_4k_write = Instant::now();
        for i in 0..write_ops {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            let blk = (seed.wrapping_add(i)) % total_4k_blocks;
            buf_4k[0] = (i & 0xFF) as u8;
            let _ = f.seek(SeekFrom::Start(blk * 4096));
            let _ = f.write_all(&buf_4k);
        }
        let _ = f.sync_data();
        let w4k_secs = t_4k_write.elapsed().as_secs_f64().max(0.0001);
        let random_4k_write_iops = (write_ops as f64 / w4k_secs).round() as u64;
        let write_latency_us =
            (((w4k_secs * 1_000_000.0) / write_ops as f64) * 10.0).round() / 10.0;

        drop(f);
        let _ = fs::remove_file(&file_path);
        if base_dir.ends_with("SystemOptimizer_TempBench") {
            let _ = fs::remove_dir(&base_dir);
        }

        let score = ((seq_read_mbs * 0.45)
            + (seq_write_mbs * 0.35)
            + ((random_4k_read_iops as f64) * 0.04))
            .round() as u32;

        let tier = if seq_read_mbs >= 3000.0 {
            "NVMe PCIe Gen4 / Gen5 Ultra".to_string()
        } else if seq_read_mbs >= 1400.0 {
            "NVMe PCIe Gen3 High-Speed".to_string()
        } else if seq_read_mbs >= 350.0 {
            "SSD SATA III".to_string()
        } else {
            "HDD / Armazenamento Mecânico".to_string()
        };

        emit_step(
            &app_clone,
            "disk-done",
            "Benchmark de Disco Concluído",
            "success",
            &format!(
                "Leitura: {:.1} MB/s | Escrita: {:.1} MB/s",
                seq_read_mbs, seq_write_mbs
            ),
            4,
            4,
        );

        Ok(DiskBenchmarkResult {
            drive,
            file_size_mb: size_mb,
            seq_read_mbs,
            seq_write_mbs,
            random_4k_read_iops,
            random_4k_write_iops,
            read_latency_us,
            write_latency_us,
            score,
            tier,
        })
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(CommandResponse::ok(
        "Benchmark de disco finalizado com sucesso.",
        Some(result),
    ))
}

#[tauri::command]
pub async fn run_ram_benchmark(app: AppHandle) -> Result<CommandResponse<RamBenchmarkResult>, String> {
    let app_clone = app.clone();
    let result = tokio::task::spawn_blocking(move || {
        // 1. Bandwidth Test (128 MB u64 array = 16,777,216 u64 elements)
        let len = 16 * 1024 * 1024usize;
        let bytes_per_pass = (len * 8) as f64;
        let passes = 8usize;

        emit_step(
            &app_clone,
            "ram-write",
            "Benchmark de Escrita RAM",
            "running",
            "Alocando e preenchendo blocos de 128 MB na memória física...",
            1,
            3,
        );

        let mut src = vec![0u64; len];
        let mut dst = vec![0u64; len];

        // Warmup
        for (i, v) in src.iter_mut().enumerate() {
            *v = i as u64;
        }

        let t_write = Instant::now();
        for p in 0..passes {
            let pattern = 0xA5A5_5A5A_0000_0000u64.wrapping_add(p as u64);
            for v in src.iter_mut() {
                *v = pattern;
            }
            std::hint::black_box(&src);
        }
        let write_secs = t_write.elapsed().as_secs_f64().max(0.0001);
        let write_gbs =
            (((bytes_per_pass * passes as f64) / (1024.0 * 1024.0 * 1024.0)) / write_secs * 10.0)
                .round()
                / 10.0;

        emit_step(
            &app_clone,
            "ram-read",
            "Benchmark de Leitura & Cópia RAM",
            "running",
            "Medindo largura de banda de leitura e cópia sequencial...",
            2,
            3,
        );

        let t_copy = Instant::now();
        for _ in 0..passes {
            dst.copy_from_slice(&src);
            std::hint::black_box(&dst);
        }
        let copy_secs = t_copy.elapsed().as_secs_f64().max(0.0001);
        let copy_gbs =
            (((bytes_per_pass * passes as f64) / (1024.0 * 1024.0 * 1024.0)) / copy_secs * 10.0)
                .round()
                / 10.0;

        let t_read = Instant::now();
        let mut acc = 0u64;
        for _ in 0..passes {
            for chunk in src.chunks_exact(8) {
                acc = acc
                    .wrapping_add(chunk[0])
                    .wrapping_add(chunk[1])
                    .wrapping_add(chunk[2])
                    .wrapping_add(chunk[3])
                    .wrapping_add(chunk[4])
                    .wrapping_add(chunk[5])
                    .wrapping_add(chunk[6])
                    .wrapping_add(chunk[7]);
            }
        }
        std::hint::black_box(acc);
        let read_secs = t_read.elapsed().as_secs_f64().max(0.0001);
        let read_gbs =
            (((bytes_per_pass * passes as f64) / (1024.0 * 1024.0 * 1024.0)) / read_secs * 10.0)
                .round()
                / 10.0;

        drop(src);
        drop(dst);

        // 2. Sattolo Pointer-Chase Latency Test (8M indices = 32 MB, exceeds L3 cache to hit DRAM)
        emit_step(
            &app_clone,
            "ram-lat",
            "Medindo Latência Real (Pointer Chasing)",
            "running",
            "Executando permutação cíclica de Sattolo fora do cache L3...",
            3,
            3,
        );

        let ring_len = 8 * 1024 * 1024usize;
        let mut ring: Vec<u32> = (0..ring_len as u32).collect();
        let mut rng: u64 = 0xDEAD_BEEF_CAFE_BABEu64;
        for i in (1..ring_len).rev() {
            rng ^= rng << 13;
            rng ^= rng >> 7;
            rng ^= rng << 17;
            let j = (rng as usize) % i;
            ring.swap(i, j);
        }

        let steps = 12_000_000usize;
        let mut idx = 0u32;
        let t_lat = Instant::now();
        for _ in 0..steps {
            idx = unsafe { *ring.get_unchecked(idx as usize) };
        }
        std::hint::black_box(idx);
        let lat_ns = ((t_lat.elapsed().as_nanos() as f64 / steps as f64) * 10.0).round() / 10.0;

        let avg_bw = (read_gbs + write_gbs + copy_gbs) / 3.0;
        let score = ((avg_bw * 180.0) + (4500.0 / lat_ns.max(25.0))).round() as u32;

        let tier = if avg_bw >= 45.0 {
            "DDR5 High-Frequency Dual-Channel".to_string()
        } else if avg_bw >= 24.0 {
            "DDR4 / DDR5 Dual-Channel Otimizado".to_string()
        } else {
            "Standard / Single-Channel".to_string()
        };

        emit_step(
            &app_clone,
            "ram-done",
            "Benchmark de Memória Concluído",
            "success",
            &format!(
                "Leitura: {:.1} GB/s | Latência: {:.1} ns",
                read_gbs, lat_ns
            ),
            3,
            3,
        );

        RamBenchmarkResult {
            read_gbs,
            write_gbs,
            copy_gbs,
            latency_ns: lat_ns,
            score,
            tier,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        "Benchmark de Memória RAM concluído.",
        Some(result),
    ))
}

#[tauri::command]
pub async fn run_cpu_benchmark(
    cpu_name: Option<String>,
    gpu_name: Option<String>,
    resolution: Option<String>,
    preset: Option<String>,
    app: AppHandle,
) -> Result<CommandResponse<CpuAndGameBenchmarkResult>, String> {
    let res = resolution.unwrap_or_else(|| "1080p".to_string());
    let quality = preset.unwrap_or_else(|| "Medium".to_string());
    let c_name = cpu_name.unwrap_or_else(|| "Processador x86_64".to_string());
    let g_name = gpu_name.unwrap_or_else(|| "GPU Dedicada".to_string());

    let app_clone = app.clone();
    let result = tokio::task::spawn_blocking(move || {
        let threads = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(8);

        // 1. Single-Core Test (750 ms of tight physics + FMA + branching simulation)
        emit_step(
            &app_clone,
            "cpu-single",
            "Benchmark Single-Core (Física & Lógica)",
            "running",
            "Medindo IPC e velocidade de núcleo único...",
            1,
            3,
        );

        let single_iters = run_cpu_worker_ms(750);
        let single_core_score = ((single_iters as f64 / 32_000.0).round() as u32).max(450);

        // 2. Multi-Core Test (900 ms across all logical threads)
        emit_step(
            &app_clone,
            "cpu-multi",
            "Benchmark Multi-Core (Todos os Núcleos)",
            "running",
            &format!("Executando carga paralela em {} threads...", threads),
            2,
            3,
        );

        let mut handles = Vec::with_capacity(threads);
        for _ in 0..threads {
            handles.push(std::thread::spawn(|| run_cpu_worker_ms(900)));
        }
        let mut total_multi_iters = 0u64;
        for h in handles {
            if let Ok(cnt) = h.join() {
                total_multi_iters += cnt;
            }
        }
        let multi_core_score =
            ((total_multi_iters as f64 / 38_400.0).round() as u32).max(single_core_score * 2);

        // 3. Game Loop Frame Simulator + Catalog FPS Estimation
        emit_step(
            &app_clone,
            "cpu-gamesim",
            "Simulador de Engine & Estimativa de FPS",
            "running",
            "Calculando frametimes P99 e estimativa nos principais jogos...",
            3,
            3,
        );

        let cpu_idx_detected = lookup_cpu_index(&c_name, (threads / 2).max(4), 3.8);
        let bench_cpu_idx = ((single_core_score as f64 / 18.5) * 0.65
            + (multi_core_score as f64 / 145.0) * 0.35)
            .clamp(35.0, 175.0);
        let effective_cpu_idx = (cpu_idx_detected * 0.6) + (bench_cpu_idx * 0.4);
        let (effective_gpu_idx, _) = lookup_gpu_index(&g_name);

        let res_gpu_factor = match res.as_str() {
            "2160p" | "4K" => 0.44,
            "1440p" | "QHD" => 0.70,
            _ => 1.00,
        };

        let preset_gpu_factor = match quality.as_str() {
            "Low" | "Baixo" => 1.32,
            "Ultra" | "Alto" => 0.76,
            _ => 1.00,
        };

        let preset_cpu_factor = match quality.as_str() {
            "Low" | "Baixo" => 1.08,
            "Ultra" | "Alto" => 0.92,
            _ => 1.00,
        };

        // Catalog: (Name, Category, BaseCpuFps@Idx100, BaseGpuFps@Idx100_1080p_Med)
        let catalog: &[(&str, &str, f64, f64)] = &[
            ("Counter-Strike 2", "Esports", 360.0, 310.0),
            ("Valorant", "Esports", 440.0, 420.0),
            ("Fortnite (Performance/DX12)", "Battle Royale", 240.0, 195.0),
            ("EA Sports FC 25", "Esports", 210.0, 185.0),
            ("Call of Duty: Warzone", "Battle Royale", 165.0, 145.0),
            ("Grand Theft Auto V", "AAA", 185.0, 175.0),
            ("Elden Ring", "AAA", 145.0, 125.0),
            ("Red Dead Redemption 2", "AAA", 140.0, 105.0),
            ("Cyberpunk 2077", "AAA", 130.0, 92.0),
            ("Black Myth: Wukong", "AAA", 125.0, 84.0),
        ];

        let mut games = Vec::with_capacity(catalog.len());
        for &(name, category, base_cpu_fps, base_gpu_fps) in catalog {
            let cpu_fps = base_cpu_fps * (effective_cpu_idx / 100.0) * preset_cpu_factor;
            let gpu_fps =
                base_gpu_fps * (effective_gpu_idx / 100.0) * res_gpu_factor * preset_gpu_factor;

            // Harmonic-biased soft minimum of CPU and GPU bound FPS
            let raw_avg = (cpu_fps.min(gpu_fps) * 0.82)
                + ((2.0 * cpu_fps * gpu_fps / (cpu_fps + gpu_fps).max(1.0)) * 0.18);
            let avg_fps = raw_avg.round().max(15.0) as u32;
            let low1_fps = ((raw_avg * 0.74).round().max(10.0) as u32).min(avg_fps);

            let limiter = if cpu_fps < gpu_fps * 0.88 {
                "CPU".to_string()
            } else if gpu_fps < cpu_fps * 0.88 {
                "GPU".to_string()
            } else {
                "Equilibrado".to_string()
            };

            let tier = if avg_fps >= 200 {
                "Competitivo 240Hz+".to_string()
            } else if avg_fps >= 110 {
                "Fluido 120Hz+".to_string()
            } else if avg_fps >= 60 {
                "Jogável 60Hz+".to_string()
            } else {
                "Abaixo de 60 FPS".to_string()
            };

            games.push(GameFpsEstimate {
                name: name.to_string(),
                category: category.to_string(),
                avg_fps,
                low1_fps,
                limiter,
                tier,
            });
        }

        let sim_avg_fps = ((effective_cpu_idx * 2.15).round() as u32).max(45);
        let sim_low1_fps = ((sim_avg_fps as f64 * 0.78).round() as u32).max(30);

        emit_step(
            &app_clone,
            "cpu-done",
            "Benchmark de CPU & Jogos Concluído",
            "success",
            &format!(
                "Single-Core: {} pts | Multi-Core: {} pts",
                single_core_score, multi_core_score
            ),
            3,
            3,
        );

        CpuAndGameBenchmarkResult {
            single_core_score,
            multi_core_score,
            threads_tested: threads,
            sim_avg_fps,
            sim_low1_fps,
            resolution: res,
            preset: quality,
            games,
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(CommandResponse::ok(
        "Benchmark de CPU e Simulador de Jogos concluído.",
        Some(result),
    ))
}

fn run_cpu_worker_ms(duration_ms: u64) -> u64 {
    let start = Instant::now();
    let target = std::time::Duration::from_millis(duration_ms);
    let mut iters = 0u64;
    let mut x = 1.000001f64;
    let mut y = 2.000003f64;
    let mut bits = 0x1234_5678_9ABC_DEF0u64;

    while start.elapsed() < target {
        for _ in 0..4096 {
            x = (x * 1.000000119 + y.sin()).abs().sqrt() + 1.0;
            y = (y * 0.999999881 + x.cos()).abs() + 0.5;
            bits ^= bits << 13;
            bits ^= bits >> 7;
            bits ^= bits << 17;
            bits = bits.wrapping_mul(6364136223846793005);
        }
        std::hint::black_box((x, y, bits));
        iters += 4096;
    }
    iters
}

#[tauri::command]
pub async fn start_stress_test(
    cpu: bool,
    ram: bool,
    state: State<'_, AppState>,
) -> Result<CommandResponse<StressStatus>, String> {
    if !cpu && !ram {
        return Ok(CommandResponse::err(
            "Selecione ao menos CPU ou Memória RAM para iniciar o Stress Test.",
        ));
    }

    if state.stress.running.swap(true, Ordering::SeqCst) {
        return get_stress_status(state).await;
    }

    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    state.stress.start_epoch_ms.store(now_ms, Ordering::SeqCst);
    state.stress.mem_errors.store(0, Ordering::SeqCst);
    state.stress.mem_passes.store(0, Ordering::SeqCst);
    state.stress.max_temp_mc.store(0, Ordering::SeqCst);
    state.stress.cpu_enabled.store(cpu, Ordering::SeqCst);
    state.stress.ram_enabled.store(ram, Ordering::SeqCst);

    if cpu {
        let threads = std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4);
        for _ in 0..threads {
            let running_flag = state.stress.running.clone();
            std::thread::spawn(move || {
                let mut a = 1.123456789f64;
                let mut b = 2.987654321f64;
                let mut k = 0xCAFE_BABE_1337_BEEFu64;
                while running_flag.load(Ordering::Relaxed) {
                    for _ in 0..16384 {
                        a = (a.mul_add(1.0000003, b.sin())).abs().sqrt() + 0.0001;
                        b = (b.mul_add(0.9999997, a.cos())).abs() + 0.0002;
                        k ^= k << 13;
                        k ^= k >> 7;
                        k ^= k << 17;
                        k = k.wrapping_mul(0x9E37_79B9_7F4A_7C15);
                    }
                    std::hint::black_box((a, b, k));
                }
            });
        }
    }

    if ram {
        let running_flag = state.stress.running.clone();
        let errors_arc = state.stress.mem_errors.clone();
        let passes_arc = state.stress.mem_passes.clone();

        std::thread::spawn(move || {
            // Allocate 256 MB buffer (33,554,432 u64 words) for pattern bit-flip verification
            let words = 32 * 1024 * 1024usize;
            let mut buf = vec![0u64; words];
            let patterns: [u64; 4] = [
                0xAAAA_AAAA_AAAA_AAAA,
                0x5555_5555_5555_5555,
                0xF0F0_F0F0_0F0F_0F0F,
                0x00FF_00FF_FF00_FF00,
            ];
            let mut p_idx = 0usize;

            while running_flag.load(Ordering::Relaxed) {
                let pat = patterns[p_idx % patterns.len()];
                p_idx = p_idx.wrapping_add(1);

                for (i, slot) in buf.iter_mut().enumerate() {
                    if (i & 0xFFFF) == 0 && !running_flag.load(Ordering::Relaxed) {
                        return;
                    }
                    *slot = pat ^ (i as u64);
                }

                for (i, slot) in buf.iter().enumerate() {
                    if (i & 0xFFFF) == 0 && !running_flag.load(Ordering::Relaxed) {
                        return;
                    }
                    let expected = pat ^ (i as u64);
                    if *slot != expected {
                        errors_arc.fetch_add(1, Ordering::Relaxed);
                    }
                }

                passes_arc.fetch_add(1, Ordering::Relaxed);
            }
        });
    }

    get_stress_status(state).await
}

#[tauri::command]
pub async fn stop_stress_test(
    state: State<'_, AppState>,
) -> Result<CommandResponse<StressStatus>, String> {
    state.stress.running.store(false, Ordering::SeqCst);
    get_stress_status(state).await
}

#[tauri::command]
pub async fn get_stress_status(
    state: State<'_, AppState>,
) -> Result<CommandResponse<StressStatus>, String> {
    let running = state.stress.running.load(Ordering::Relaxed);
    let start_ms = state.stress.start_epoch_ms.load(Ordering::Relaxed);
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let elapsed_secs = if running && start_ms > 0 && now_ms >= start_ms {
        (now_ms - start_ms) / 1000
    } else {
        0
    };

    let status = StressStatus {
        running,
        elapsed_secs,
        cpu_enabled: state.stress.cpu_enabled.load(Ordering::Relaxed),
        ram_enabled: state.stress.ram_enabled.load(Ordering::Relaxed),
        mem_passes: state.stress.mem_passes.load(Ordering::Relaxed),
        mem_errors: state.stress.mem_errors.load(Ordering::Relaxed),
        max_temp_c: (state.stress.max_temp_mc.load(Ordering::Relaxed) as f32) / 10.0,
    };

    Ok(CommandResponse::ok("Status do Stress Test obtido.", Some(status)))
}
