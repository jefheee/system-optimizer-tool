// =================================================================
// SYSTEM OPTIMIZER - FRONTEND NATIVE TAURI BRIDGE & TYPINGS V5.0
// =================================================================

export interface CommandResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface StepEvent {
  stepId: string;
  stepName: string;
  status: 'running' | 'success' | 'error' | 'info';
  details: string;
  current: number;
  total: number;
}

// -------------------------------------------------------------
// Tipagens do Módulo 1: Diagnóstico de Hardware & Profiler V5.0
// -------------------------------------------------------------
export interface UptimeInfo {
  days: number;
  hours: number;
  minutes: number;
}

export interface OperatingSystemInfo {
  caption: string;
  buildNumber: string;
  architecture?: string;
  uptime: UptimeInfo;
  formattedUptime: string;
  uptimeFormatted?: string;
}

export interface CpuInfo {
  name: string;
  manufacturer: string;
  usagePercent: number;
  physicalCores: number;
  logicalThreads: number;
  baseClockGhz: number;
  currentClockGhz: number;
  maxClockGhz: number;
  boostActive: boolean;
  l3CacheMb: number;
  socket: string;
}

export interface MotherboardInfo {
  manufacturer: string;
  product: string;
  biosVersion: string;
  biosReleaseDate: string;
}

export interface GpuInfo {
  name: string;
  vramMb: number;
  vramGb: number;
  driverVersion: string;
  resolution: string;
  refreshRateHz: number;
  isPrimary: boolean;
  resizableBar: boolean;
  whqlSigned: boolean;
}

export interface RamSlot {
  slot: string;
  bank: string;
  manufacturer: string;
  partNumber: string;
  capacityGb: number;
  speedMhz: number;
  memoryType: string;
  voltage: string;
}

export interface MemoryInfo {
  totalGb: number;
  usedGb: number;
  usagePercent: number;
  moduleCount: number;
  modules: RamSlot[];
  xmpActive: boolean;
  xmpStatus: string;
  xmpAlert: boolean;
  xmpMessage: string;
  memoryType: string;
}

export interface StorageDisk {
  diskNumber: number;
  model: string;
  sizeGb: number;
  freeGb: number;
  usedGb: number;
  usagePercent: number;
  driveLetters: string[] | string;
  mediaType: string; // "NVMe", "SSD", "HDD"
  busType: string;   // "NVMe", "SATA", "USB"
  healthStatus: string; // "Healthy", "Warning", "Unhealthy"
}

export interface DisplayInfo {
  name: string;
  manufacturer: string;
  inches: number;
  diagonalInches?: number;
  resolution: string;
  refreshRateHz: number;
  isInternal: boolean;
  connection?: string;
}

export interface PeripheralsInfo {
  audioDevices: string[];
  inputDevices: string[];
  mice?: string[];
  keyboards?: string[];
}

export interface BatteryInfo {
  status: string;
  chargePercent: number;
  isCharging: boolean;
  healthPercent: number;
  wearLevelPercent: number;
}

export interface SecurityAndBootInfo {
  biosMode: string; // "UEFI" | "Legacy"
  secureBoot: boolean;
  tpmActive: boolean;
  tpmVersion: string;
  vbsActive: boolean;
}

export interface WindowsLicenseInfo {
  activationStatus: string; // "Activated" | "NotActivated"
  licenseType: string;      // "Digital / Retail" | "OEM (BIOS)" | "OEM"
  productKey: string;
  maskedKey: string;
}

export interface SystemDiagnostics {
  status: string;
  timestamp: string;
  deviceType: 'Desktop' | 'Laptop' | string;
  battery: BatteryInfo | null;
  operatingSystem: OperatingSystemInfo | null;
  cpu: CpuInfo | null;
  motherboard: MotherboardInfo | null;
  gpu: GpuInfo | null;
  allGpus: GpuInfo[];
  memory: MemoryInfo | null;
  storage: StorageDisk[];
  displays: DisplayInfo[];
  peripherals: PeripheralsInfo;
  security: SecurityAndBootInfo;
  securityAndBoot?: SecurityAndBootInfo;
  license: WindowsLicenseInfo;
  windowsLicense?: WindowsLicenseInfo;
  setupExport: string;
  message: string;
}

// -------------------------------------------------------------
// Tipagens do Módulo 2: Limpeza
// -------------------------------------------------------------
export interface CleanCategory {
  name: string;
  bytesFreed: number;
  mbFreed: number;
  filesDeleted: number;
  status: string;
}

export interface CleanResult {
  totalFreedMb: number;
  totalFilesDeleted: number;
  categories: CleanCategory[];
  message: string;
  bytesFreed: number;
}

// -------------------------------------------------------------
// Tipagens do Módulo 3: Gamer & Process Freezer
// -------------------------------------------------------------
export interface GamerStatus {
  timerResolutionActive: boolean;
  currentResolutionMs: number;
  ramAutocleanActive: boolean;
}

export interface HeavyProcess {
  pid: number;
  name: string;
  memoryMb: number;
  cpuPercent: number;
}

export type HeavyProcessItem = HeavyProcess;

// -------------------------------------------------------------
// Tipagens do Módulo 4: Sistema, Auditoria & Startup Manager
// -------------------------------------------------------------
export interface DnsProviderPing {
  name: string;
  primaryIp: string;
  secondaryIp: string;
  pingMs: number;
}

export interface DnsBenchmarkResult {
  providers: DnsProviderPing[];
  fastest: string;
  fastestIp: string;
  message: string;
}

export interface DnsOptimizationResult {
  bestDns: string;
  cloudflarePingMs: number;
  googlePingMs: number;
  message: string;
}

export interface SfcScanResult {
  sfcExitCode: number;
  dismExitCode: number;
  summary: string;
}

export interface BloatwareResult {
  removedCount: number;
  removedApps: string[];
}

export interface SystemAuditResult {
  estimatedJunkMb: number;
  estimatedJunkGb?: number;
  estimatedJunkFiles: number;
  timer05msActive: boolean;
  ultimatePowerActive: boolean;
  telemetryDisabled: boolean;
  hibernationDisabled: boolean;
  mousePrecisionActive: boolean;
  fsoDisabled: boolean;
  vbsDisabled: boolean;
  classicContextMenu: boolean;
  showFileExtensions: boolean;
  showHiddenFiles: boolean;
  bingSearchDisabled: boolean;
  windowsAdsDisabled: boolean;
  hagsActive: boolean;
  startupAppsCount: number;
  optimizationScore: number;
}

export interface StartupApp {
  name: string;
  command: string;
  location: string; // "HKCU Run" | "HKLM Run" | "Startup Folder"
  enabled: boolean;
}

export type StartupAppItem = StartupApp;

export interface InstalledToolsStatus {
  cpuzInstalled: boolean;
  cpuzPath?: string | null;
  hwmonitorInstalled: boolean;
  hwmonitorPath?: string | null;
  gpuzInstalled: boolean;
  gpuzPath?: string | null;
}

// -------------------------------------------------------------
// Invocação Base do Tauri
// -------------------------------------------------------------
export async function invokeCommand<T>(cmd: string, args: Record<string, unknown> = {}): Promise<CommandResponse<T>> {
  if (typeof window === "undefined") {
    throw new Error("Comando Tauri não pode ser executado em ambiente Server-Side.");
  }

  const isTauri = (window as any).__TAURI_INTERNALS__ !== undefined || (window as any).__TAURI__ !== undefined;
  if (!isTauri) {
    return {
      success: false,
      message: "Ambiente do navegador detectado. Execute o aplicativo nativo Tauri.",
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
// Listener de Eventos de Otimização em Tempo Real (Drawer)
// -------------------------------------------------------------
export async function listenToOptimizationSteps(
  callback: (step: StepEvent) => void
): Promise<() => void> {
  if (typeof window === "undefined") return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<StepEvent>("optimization-step", (event) => {
      callback(event.payload);
    });
    return unlisten;
  } catch (err) {
    console.warn("Falha ao registrar listener de passos:", err);
    return () => {};
  }
}

// -------------------------------------------------------------
// Controles de Janela Frameless (Window API)
// -------------------------------------------------------------
export async function minimizeWindow(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  } catch (e) {
    console.error("Erro ao minimizar janela:", e);
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  } catch (e) {
    console.error("Erro ao alternar maximizar janela:", e);
  }
}

export async function closeWindow(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch (e) {
    console.error("Erro ao fechar janela:", e);
  }
}

// -------------------------------------------------------------
// Funções da API Nativas em Rust
// -------------------------------------------------------------

// 1. Diagnóstico de Hardware & Profiler
export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  const res = await invokeCommand<SystemDiagnostics>("get_system_diagnostics");
  if (res.success && res.data) {
    return res.data;
  }
  return {
    status: "Error",
    timestamp: new Date().toISOString(),
    deviceType: "Desktop",
    battery: null,
    operatingSystem: null,
    cpu: null,
    motherboard: null,
    gpu: null,
    allGpus: [],
    memory: null,
    storage: [],
    displays: [],
    peripherals: { audioDevices: [], inputDevices: [] },
    security: {
      biosMode: "UEFI",
      secureBoot: false,
      tpmActive: false,
      tpmVersion: "TPM 2.0",
      vbsActive: false,
    },
    license: {
      activationStatus: "Activated",
      licenseType: "Digital / Retail",
      productKey: "",
      maskedKey: "*****-*****-*****-*****-*****",
    },
    setupExport: "",
    message: res.message || "Falha ao ler dados de diagnóstico do sistema.",
  };
}

// 2. Presets Inteligentes
export async function runPreset(presetId: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("run_preset", { presetId });
}

// 3. Limpeza & Armazenamento
export async function runDeepClean(): Promise<CommandResponse<CleanResult>> {
  return invokeCommand<CleanResult>("run_deep_clean");
}

export async function runLiteClean(): Promise<CommandResponse<CleanResult>> {
  return invokeCommand<CleanResult>("run_lite_clean");
}

export async function toggleHibernation(disable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("toggle_hibernation", { disable });
}

export async function cleanOldWindowsInstallations(): Promise<CommandResponse<CleanResult>> {
  return invokeCommand<CleanResult>("clean_old_windows_installations");
}

// 4. Gamer & Baixa Latência + Process Freezer
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

export async function flushRamNow(): Promise<CommandResponse<number>> {
  return invokeCommand<number>("flush_ram_now");
}

export async function addDefenderExclusion(folderPath: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("add_defender_exclusion", { folderPath });
}

export async function resetShaderCache(): Promise<CommandResponse<number>> {
  return invokeCommand<number>("reset_shader_cache");
}

export async function enableUltimatePerformancePlan(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("enable_ultimate_performance_plan");
}

export async function toggleVbs(disable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("toggle_vbs", { disable });
}

export async function getHeavyProcesses(): Promise<CommandResponse<HeavyProcess[]>> {
  return invokeCommand<HeavyProcess[]>("get_heavy_processes");
}

export async function killProcess(pid: number): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("kill_process", { pid });
}

// 5. Sistema, Rede, Privacidade, Auditoria, Pós-Formatação & Startup
export async function checkAdmin(): Promise<boolean> {
  const res = await invokeCommand<boolean>("check_admin");
  return Boolean(res.data);
}

export async function restartAsAdmin(): Promise<void> {
  await invokeCommand<boolean>("restart_as_admin");
}

export async function createRestorePoint(description: string = ""): Promise<CommandResponse<string>> {
  return invokeCommand<string>("create_restore_point", { description });
}

export async function resetNetworkStack(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("reset_network_stack");
}

export async function toggleClassicContextMenu(enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("toggle_classic_context_menu", { enable });
}

export async function benchmarkDns(): Promise<CommandResponse<DnsBenchmarkResult>> {
  return invokeCommand<DnsBenchmarkResult>("benchmark_dns");
}

export async function optimizeDns(): Promise<CommandResponse<DnsOptimizationResult>> {
  return invokeCommand<DnsOptimizationResult>("optimize_dns");
}

export async function repairWindowsUpdate(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("repair_windows_update");
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

export async function runSystemAudit(): Promise<CommandResponse<SystemAuditResult>> {
  return invokeCommand<SystemAuditResult>("run_system_audit");
}

export async function togglePostFormatTweak(tweakId: string, enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("toggle_post_format_tweak", { tweakId, enable });
}

export async function getStartupApps(): Promise<CommandResponse<StartupApp[]>> {
  return invokeCommand<StartupApp[]>("get_startup_apps");
}

export async function toggleStartupApp(name: string, location: string, enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("toggle_startup_app", { name, location, enable });
}

export async function removeStartupApp(name: string, location: string): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("remove_startup_app", { name, location });
}

export async function generateBatteryOrEnergyReport(_isLaptop?: boolean): Promise<CommandResponse<string>> {
  return invokeCommand<string>("generate_battery_or_energy_report");
}

export async function openExternalUrl(url: string): Promise<CommandResponse<boolean>> {
  if (typeof window !== "undefined") {
    const isTauri = (window as any).__TAURI_INTERNALS__ !== undefined || (window as any).__TAURI__ !== undefined;
    if (!isTauri) {
      window.open(url, "_blank", "noopener,noreferrer");
      return { success: true, message: "Opened in browser" };
    }
  }
  return invokeCommand<boolean>("open_external_url", { url });
}

// 6. Hub da Comunidade & Ferramentas Externas
export async function checkInstalledTools(): Promise<CommandResponse<InstalledToolsStatus>> {
  return invokeCommand<InstalledToolsStatus>("check_installed_tools");
}

export async function launchOrInstallTool(toolId: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_or_install_tool", { toolId });
}

export async function launchWinUtil(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_winutil");
}

export async function launchMasActivator(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_mas_activator");
}

export async function launchOoShutup10(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_ooshutup10");
}

export async function runWingetUpgrade(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("run_winget_upgrade");
}

export async function launchAdwCleaner(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_adwcleaner");
}

export async function installQuickTool(toolId: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_or_install_tool", { toolId });
}
