// =================================================================
// SYSTEM OPTIMIZER - FRONTEND NATIVE TAURI BRIDGE & TYPINGS
// =================================================================

export interface CommandResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// -------------------------------------------------------------
// Tipagens do Módulo 1: Diagnóstico de Hardware
// -------------------------------------------------------------
export interface UptimeInfo {
  Days: number;
  Hours: number;
  Minutes: number;
}

export interface OperatingSystemInfo {
  Caption: string;
  BuildNumber: string;
  LastBootUpTime: string;
  Uptime: UptimeInfo;
  FormattedUptime?: string;
}

export interface CpuInfo {
  Name: string;
  UsagePercent?: number;
  PhysicalCores?: number;
}

export interface GpuInfo {
  Name: string;
  VramMb?: number;
}

export interface RamModule {
  CapacityGB: number;
  SpeedMHz: number;
}

export interface MemoryInfo {
  TotalGB: number;
  UsedGB?: number;
  UsagePercent?: number;
  ModuleCount: number;
  Modules: RamModule[];
  XmpAlert?: boolean;
}

export interface StorageDisk {
  Model: string;
  SizeGB: number;
  FreeGB?: number;
  MediaType: string;
  HealthStatus: string;
}

export interface SystemDiagnostics {
  Status: "Success" | "Warning" | "Error";
  Timestamp: string;
  OperatingSystem: OperatingSystemInfo | null;
  Cpu: CpuInfo | null;
  Gpu: GpuInfo | null;
  Memory: MemoryInfo | null;
  Storage: StorageDisk[];
  Message: string;
}

// -------------------------------------------------------------
// Tipagens do Módulo 2: Limpeza
// -------------------------------------------------------------
export interface CleanCategory {
  Name: string;
  BytesFreed: number;
  MbFreed: number;
  FilesDeleted: number;
  Status: string;
}

export interface CleanResult {
  TotalFreedMb: number;
  TotalFilesDeleted: number;
  Categories: CleanCategory[];
  Message: string;
  BytesFreed?: number;
}

// -------------------------------------------------------------
// Tipagens do Módulo 3: Gamer
// -------------------------------------------------------------
export interface GamerStatus {
  timerResolutionActive: boolean;
  currentResolutionMs: number;
  ramAutocleanActive: boolean;
}

// -------------------------------------------------------------
// Tipagens do Módulo 4: Sistema
// -------------------------------------------------------------
export interface DnsOptimizationResult {
  BestDns: string;
  CloudflarePingMs: number;
  GooglePingMs: number;
  Message: string;
}

export interface SfcScanResult {
  SfcExitCode: number;
  DismExitCode: number;
  Summary: string;
}

export interface BloatwareResult {
  RemovedCount: number;
  RemovedApps: string[];
}

// Resposta genérica para retrocompatibilidade
export interface ActionResponse {
  Status: "Success" | "Warning" | "Error";
  Message: string;
  BytesFreed?: number;
  Tweak?: string;
  Value?: string;
  Step?: string;
  Target?: string;
  Action?: string;
  BestDNS?: string;
  DeletedCount?: number;
  RemovedApps?: string[];
  Destination?: string;
}

/**
 * Invoca de forma tipada e segura um comando Tauri nativo em Rust
 */
export async function invokeCommand<T>(cmd: string, args: Record<string, unknown> = {}): Promise<CommandResponse<T>> {
  if (typeof window === "undefined") {
    throw new Error("Comando Tauri não pode ser executado em ambiente Server-Side.");
  }

  const isTauri = (window as any).__TAURI_INTERNALS__ !== undefined || (window as any).__TAURI__ !== undefined;
  if (!isTauri) {
    return {
      success: false,
      message: "A interface gráfica deve ser executada através do Tauri e não em um navegador web convencional.",
      data: undefined,
    };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<CommandResponse<T>>(cmd, args);
    return res;
  } catch (error: any) {
    console.error(`Erro ao invocar comando Tauri [${cmd}]:`, error);
    const msg = typeof error === "string" ? error : error?.message || "Erro desconhecido de execução no backend Rust.";
    return {
      success: false,
      message: msg,
      data: undefined,
    };
  }
}

// -------------------------------------------------------------
// Funções Específicas do Backend em Rust Nativo
// -------------------------------------------------------------

// Diagnóstico
export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  const res = await invokeCommand<SystemDiagnostics>("get_system_diagnostics");
  if (res.success && res.data) {
    return res.data;
  }
  return {
    Status: "Error",
    Timestamp: new Date().toISOString(),
    OperatingSystem: null,
    Cpu: null,
    Gpu: null,
    Memory: null,
    Storage: [],
    Message: res.message || "Falha ao ler dados de diagnóstico do sistema.",
  };
}

// Limpeza
export async function runDeepClean(): Promise<CommandResponse<CleanResult>> {
  return invokeCommand<CleanResult>("run_deep_clean");
}

export async function runLiteClean(): Promise<CommandResponse<CleanResult>> {
  return invokeCommand<CleanResult>("run_lite_clean");
}

// Gamer
export async function getGamerStatus(): Promise<CommandResponse<GamerStatus>> {
  return invokeCommand<GamerStatus>("get_gamer_status");
}

export async function toggleTimerResolution(enable: boolean): Promise<CommandResponse<GamerStatus>> {
  return invokeCommand<GamerStatus>("toggle_timer_resolution", { enable });
}

export async function setGamePriority(exeName: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("set_game_priority", { exeName });
}

export async function disableFullscreenOptimizations(disable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("disable_fullscreen_optimizations", { disable });
}

export async function optimizeMouse(enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("optimize_mouse", { enable });
}

export async function optimizeKeyboard(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("optimize_keyboard");
}

export async function optimizeTcpNetwork(): Promise<CommandResponse<number>> {
  return invokeCommand<number>("optimize_tcp_network");
}

export async function toggleRamAutoclean(enable: boolean): Promise<CommandResponse<GamerStatus>> {
  return invokeCommand<GamerStatus>("toggle_ram_autoclean", { enable });
}

export async function addDefenderExclusion(folderPath: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("add_defender_exclusion", { folderPath });
}

export async function resetShaderCache(): Promise<CommandResponse<number>> {
  return invokeCommand<number>("reset_shader_cache");
}

// Sistema
export async function checkAdmin(): Promise<boolean> {
  const res = await invokeCommand<boolean>("check_admin");
  return Boolean(res.data);
}

export async function restartAsAdmin(): Promise<void> {
  await invokeCommand<boolean>("restart_as_admin");
}

export async function launchWinUtil(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_winutil");
}

export async function launchMasActivator(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_mas_activator");
}

export async function repairWindowsUpdate(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("repair_windows_update");
}

export async function optimizeDns(): Promise<CommandResponse<DnsOptimizationResult>> {
  return invokeCommand<DnsOptimizationResult>("optimize_dns");
}

export async function runSfcScan(): Promise<CommandResponse<SfcScanResult>> {
  return invokeCommand<SfcScanResult>("run_sfc_scan");
}

export async function cleanOrphanTasks(): Promise<CommandResponse<number>> {
  return invokeCommand<number>("clean_orphan_tasks");
}

export async function removeBloatware(): Promise<CommandResponse<BloatwareResult>> {
  return invokeCommand<BloatwareResult>("remove_bloatware");
}

export async function disableTelemetry(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("disable_telemetry");
}

export async function restoreWindowsStore(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("restore_windows_store");
}

export async function removeOneDrive(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("remove_onedrive");
}

export async function resetFontCache(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("reset_font_cache");
}

export async function fixBluetoothCache(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("fix_bluetooth_cache");
}

export async function toggleTakeOwnershipMenu(enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("toggle_take_ownership_menu", { enable });
}

export async function backupDrivers(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("backup_drivers");
}

// -------------------------------------------------------------
// Adaptador de Compatibilidade Retroativa (Ponte Nativa Rust)
// Mapeia chamadas antigas para os novos comandos Rust de forma direta
// -------------------------------------------------------------
export async function invokePowerShell<T>(action: string, args: string = ""): Promise<T> {
  switch (action) {
    case "Diagnostics": {
      const diag = await getSystemDiagnostics();
      return diag as unknown as T;
    }
    case "OptimizeDeep": {
      const res = await runDeepClean();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        BytesFreed: res.data?.TotalFreedMb || 0,
      } as unknown as T;
    }
    case "OptimizeLite": {
      const res = await runLiteClean();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        BytesFreed: res.data?.TotalFreedMb || 0,
      } as unknown as T;
    }
    case "SetLatency": {
      const isEnable = args === "true";
      const res = await toggleTimerResolution(isEnable);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "Timer Resolution",
        Value: res.data?.timerResolutionActive ? "0.5ms" : "Default",
      } as unknown as T;
    }
    case "SetPriority": {
      const res = await setGamePriority(args);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "CpuPriorityClass",
        Value: `${args} -> High`,
      } as unknown as T;
    }
    case "SetGameDVR": {
      const res = await disableFullscreenOptimizations(true);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "GameDVR_FSEBehaviorMode",
        Value: "Disabled (2)",
      } as unknown as T;
    }
    case "SetMouse": {
      const res = await optimizeMouse(true);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "MouseSpeed",
        Value: "0",
      } as unknown as T;
    }
    case "SetKeyboard": {
      const res = await optimizeKeyboard();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "AutoRepeatDelay",
        Value: "150",
      } as unknown as T;
    }
    case "SetNetwork": {
      const res = await optimizeTcpNetwork();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "TcpAckFrequency",
        Value: `Enabled (${res.data || 0})`,
      } as unknown as T;
    }
    case "SetRamClean": {
      const res = await toggleRamAutoclean(true);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "RAM Auto-Clean Job",
        Value: "10min Loop",
      } as unknown as T;
    }
    case "SetDefenderExclusion": {
      const res = await addDefenderExclusion(args);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "Defender Exclusion",
        Value: args,
      } as unknown as T;
    }
    case "ResetDirectX": {
      const res = await resetShaderCache();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Tweak: "DirectX Shader Cache Reset",
        Value: `${res.data || 0} files`,
      } as unknown as T;
    }
    case "RepairWindowsUpdate": {
      const res = await repairWindowsUpdate();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Repair Windows Update",
      } as unknown as T;
    }
    case "OptimizeDns": {
      const res = await optimizeDns();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Optimize DNS",
        BestDNS: res.data?.BestDns || "",
      } as unknown as T;
    }
    case "SystemScan": {
      const res = await runSfcScan();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "System File Scan",
      } as unknown as T;
    }
    case "RemoveOrphans": {
      const res = await cleanOrphanTasks();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Clean Orphaned Tasks",
        DeletedCount: res.data || 0,
      } as unknown as T;
    }
    case "RemoveBloatware": {
      const res = await removeBloatware();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Remove Bloatware",
        RemovedApps: res.data?.RemovedApps || [],
      } as unknown as T;
    }
    case "DisableTelemetry": {
      const res = await disableTelemetry();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Disable Telemetry",
      } as unknown as T;
    }
    case "SetTakeOwnership": {
      const res = await toggleTakeOwnershipMenu(true);
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Add Take Ownership Context Menu",
      } as unknown as T;
    }
    case "BackupDrivers": {
      const res = await backupDrivers();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
        Action: "Backup Drivers",
        Destination: "C:\\Backup_Drivers",
      } as unknown as T;
    }
    case "RunWinUtil": {
      const res = await launchWinUtil();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
      } as unknown as T;
    }
    case "ActivateWindows":
    case "ActivateOffice": {
      const res = await launchMasActivator();
      return {
        Status: res.success ? "Success" : "Error",
        Message: res.message,
      } as unknown as T;
    }
    default:
      return {
        Status: "Error",
        Message: `Ação não reconhecida: ${action}`,
      } as unknown as T;
  }
}
