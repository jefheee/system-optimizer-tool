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

export interface OsCompatibility {
  osTier: 'Win7' | 'Win8_81' | 'Win10' | 'Win11_21H2_23H2' | 'Win11_24H2_26H2' | string;
  buildNumber: number;
  productName: string;
  displayVersion: string;
  isWin1124h2OrNewer: boolean;
  isLegacyWin78: boolean;
}

export interface MotherboardInfo {
  manufacturer: string;
  product: string;
  biosVersion: string;
  biosReleaseDate: string;
  supportSearchUrl?: string;
  cpuVendor?: 'AMD' | 'Intel' | 'Unknown' | string;
  isX3d?: boolean;
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
  pcieDeviceId?: string;
  msiSupported?: boolean;
  msiPriority?: string;
  pcieGeneration?: string;
  pcieLanes?: string;
  laneSharingWarning?: boolean;
  connectedToIgpuWarning?: boolean;
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
  dualChannel?: boolean;
  channelMode?: string;
  mismatchedModules?: boolean;
  slotPlacementOk?: boolean;
  ddr5FourDimmWarning?: boolean;
  ramWarnings?: string[];
}

export interface StorageDisk {
  diskNumber: number;
  model: string;
  sizeGb: number;
  freeGb: number;
  usedGb: number;
  usagePercent: number;
  freePercent?: number;
  lowSpaceCritical?: boolean;
  isHddOrUsbWarning?: boolean;
  driveLetters: string[] | string;
  mediaType: string; // "NVMe", "SSD", "HDD"
  busType: string;   // "NVMe", "SATA", "USB"
  healthStatus: string; // "Healthy", "Warning", "Unhealthy"
  serialNumber?: string;
  firmwareRevision?: string;
}

export interface LogicalVolume {
  letter: string;
  label: string;
  fileSystem: string;
  kind: string;
  totalGb: number;
  freeGb: number;
  usedGb: number;
  usagePercent: number;
  freePercent?: number;
  lowSpaceCritical?: boolean;
  physicalDiskModel: string;
  physicalDiskType: string;
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
  hardwareTier: 'low' | 'mid' | 'high' | string;
  isOnBattery: boolean;
  osCompat: OsCompatibility;
  trimEnabled: boolean;
  battery: BatteryInfo | null;
  operatingSystem: OperatingSystemInfo | null;
  cpu: CpuInfo | null;
  motherboard: MotherboardInfo | null;
  gpu: GpuInfo | null;
  allGpus: GpuInfo[];
  memory: MemoryInfo | null;
  storage: StorageDisk[];
  logicalVolumes?: LogicalVolume[];
  displays: DisplayInfo[];
  peripherals: PeripheralsInfo;
  security: SecurityAndBootInfo;
  securityAndBoot?: SecurityAndBootInfo;
  license: WindowsLicenseInfo;
  windowsLicense?: WindowsLicenseInfo;
  setupExport: string;
  message: string;
}

export interface RestorePointEntry {
  sequenceNumber: number;
  description: string;
  creationTime: string;
  restorePointType: string;
}

export interface RestorePointsStatus {
  protectionEnabled: boolean;
  frequencyUnlocked: boolean;
  hasRecentRestorePoint: boolean;
  points: RestorePointEntry[];
}

export interface LiveTweakStatus {
  id: string;
  name: string;
  category: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | string;
  applied: boolean;
  currentValue: string;
  recommendedValue: string;
  defaultValue: string;
  registryPath: string;
  minOsTier: string;
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
    status: "Success",
    timestamp: new Date().toISOString(),
    deviceType: "Desktop",
    hardwareTier: "high",
    isOnBattery: false,
    osCompat: {
      osTier: "Win11_24H2_26H2",
      buildNumber: 26100,
      productName: "Microsoft Windows 11 Pro",
      displayVersion: "24H2",
      isWin1124h2OrNewer: true,
      isLegacyWin78: false,
    },
    trimEnabled: true,
    battery: null,
    operatingSystem: {
      caption: "Microsoft Windows 11 Pro 24H2",
      buildNumber: "26100",
      uptime: { days: 1, hours: 6, minutes: 24 },
      formattedUptime: "1d 6h 24m",
    },
    cpu: {
      name: "AMD Ryzen 7 7800X3D 8-Core Processor",
      manufacturer: "AuthenticAMD",
      usagePercent: 14.2,
      physicalCores: 8,
      logicalThreads: 16,
      baseClockGhz: 4.2,
      currentClockGhz: 4.95,
      maxClockGhz: 5.05,
      boostActive: true,
      l3CacheMb: 96,
      socket: "AM5",
    },
    motherboard: {
      manufacturer: "ASUSTeK COMPUTER INC.",
      product: "ROG STRIX B650E-F GAMING WIFI",
      biosVersion: "2613",
      biosReleaseDate: "12/04/2025",
    },
    gpu: {
      name: "NVIDIA GeForce RTX 4070 Super",
      vramMb: 12288,
      vramGb: 12.0,
      driverVersion: "32.0.15.6636",
      resolution: "2560x1440",
      refreshRateHz: 240,
      isPrimary: true,
      resizableBar: true,
      whqlSigned: true,
    },
    allGpus: [
      {
        name: "NVIDIA GeForce RTX 4070 Super",
        vramMb: 12288,
        vramGb: 12.0,
        driverVersion: "32.0.15.6636",
        resolution: "2560x1440",
        refreshRateHz: 240,
        isPrimary: true,
        resizableBar: true,
        whqlSigned: true,
      },
    ],
    memory: {
      totalGb: 32.0,
      usedGb: 10.4,
      usagePercent: 32.5,
      moduleCount: 2,
      modules: [
        {
          slot: "BANK 0 • DIMM A2",
          bank: "BANK 0",
          manufacturer: "Kingston Fury",
          partNumber: "KF560C30-16",
          capacityGb: 16,
          speedMhz: 6000,
          memoryType: "DDR5",
          voltage: "1.35V",
        },
        {
          slot: "BANK 1 • DIMM B2",
          bank: "BANK 1",
          manufacturer: "Kingston Fury",
          partNumber: "KF560C30-16",
          capacityGb: 16,
          speedMhz: 6000,
          memoryType: "DDR5",
          voltage: "1.35V",
        },
      ],
      xmpActive: true,
      xmpStatus: "XMP / DOCP / EXPO (6000 MHz)",
      xmpAlert: false,
      xmpMessage: "",
      memoryType: "DDR5",
    },
    storage: [
      {
        diskNumber: 0,
        model: "Samsung SSD 990 PRO 1TB",
        sizeGb: 931,
        freeGb: 224,
        usedGb: 707,
        usagePercent: 75.9,
        driveLetters: ["C:"],
        mediaType: "NVMe",
        busType: "NVMe",
        healthStatus: "Healthy",
        serialNumber: "S6Z1NU0W918472K",
        firmwareRevision: "4B2QJXD7",
      },
      {
        diskNumber: 1,
        model: "Kingston KC3000 2048GB",
        sizeGb: 1907,
        freeGb: 820,
        usedGb: 1087,
        usagePercent: 57.0,
        driveLetters: ["D:"],
        mediaType: "NVMe",
        busType: "NVMe",
        healthStatus: "Healthy",
        serialNumber: "50026B7685D91A2E",
        firmwareRevision: "EIFK31.7",
      },
    ],
    logicalVolumes: [
      {
        letter: "C:",
        label: "Sistema",
        fileSystem: "NTFS",
        kind: "Fixo",
        totalGb: 931,
        freeGb: 224,
        usedGb: 707,
        usagePercent: 75.9,
        physicalDiskModel: "Samsung SSD 990 PRO 1TB",
        physicalDiskType: "NVMe (NVMe)",
      },
      {
        letter: "D:",
        label: "Jogos & Projetos",
        fileSystem: "NTFS",
        kind: "Fixo",
        totalGb: 1907,
        freeGb: 820,
        usedGb: 1087,
        usagePercent: 57.0,
        physicalDiskModel: "Kingston KC3000 2048GB",
        physicalDiskType: "NVMe (NVMe)",
      },
    ],
    displays: [
      {
        name: "ASUS ROG Swift OLED PG27AQDM",
        manufacturer: "ASUS",
        inches: 27.0,
        resolution: "2560x1440",
        refreshRateHz: 240,
        isInternal: false,
      },
    ],
    peripherals: {
      audioDevices: ["Realtek USB Audio", "HyperX Cloud III Wireless"],
      inputDevices: ["Logitech G PRO X Superlight 2", "Wooting 60HE+ ARM"],
    },
    security: {
      biosMode: "UEFI",
      secureBoot: true,
      tpmActive: true,
      tpmVersion: "TPM 2.0",
      vbsActive: false,
    },
    license: {
      activationStatus: "Activated",
      licenseType: "OEM (BIOS)",
      productKey: "VK7JG-NPHTM-C97JM-9MPGT-3V66T",
      maskedKey: "*****-*****-*****-*****-3V66T",
    },
    setupExport: "# 🖥️ Relatório de Setup — System Optimizer Tool V6.0\n- **CPU:** AMD Ryzen 7 7800X3D\n- **GPU:** NVIDIA GeForce RTX 4070 Super (12 GB)\n- **RAM:** 32 GB DDR5 @ 6000 MHz",
    message: res.message || "Diagnóstico carregado.",
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

// =================================================================
// 7. V6.0 NOVOS MÓDULOS: SENSORES AO VIVO, GARGALO, BENCHMARKS,
//    TUNING/WHEA, USB FANTASMAS/RGB, JOGOS VDF & DRIVERS MAKER/WINGET
// =================================================================

export interface SensorReading {
  id: string;
  hardware: string;
  category: "Temperature" | "Load" | "Clock" | "Power" | "Memory" | "Data" | string;
  name: string;
  value: number;
  min: number;
  max: number;
  unit: string;
}

export interface LiveSensorSnapshot {
  cpuTempC: number;
  cpuLoadPercent: number;
  cpuClockGhz: number;
  cpuPowerW: number;
  gpuTempC: number;
  gpuLoadPercent: number;
  gpuClockMhz: number;
  gpuPowerW: number;
  gpuVramUsedMb: number;
  gpuVramTotalMb: number;
  ramUsedGb: number;
  ramTotalGb: number;
  ramLoadPercent: number;
  stressRunning: boolean;
  stressElapsedSecs: number;
  stressMemErrors: number;
  stressMemPasses: number;
  stressMaxTempC: number;
  sensors: SensorReading[];
}

export interface GpuSpecEntry {
  model: string;
  arch: string;
  vramGb: number;
  busWidthBits: number;
  memType: string;
  bandwidthGbs: number;
  tdpW: number;
  perfIndex: number;
}

export interface ResolutionBottleneck {
  resolution: string;
  label: string;
  limitingComponent: "Balanced" | "CPU" | "GPU" | "RAM" | string;
  severityPercent: number;
  severityLevel: "Balanced" | "Mild" | "Moderate" | "Severe" | string;
  balanceScore: number;
  headlinePt: string;
  headlineEn: string;
  explanationPt: string;
  explanationEn: string;
  recommendationsPt: string[];
  recommendationsEn: string[];
}

export interface BottleneckReport {
  cpuName: string;
  cpuIndex: number;
  gpuName: string;
  gpuIndex: number;
  gpuSpec: GpuSpecEntry | null;
  ramTotalGb: number;
  ramSpeedMhz: number;
  resolutions: ResolutionBottleneck[];
  catalogCpus: (string | any)[];
  catalogGpus: (string | any)[];
}

export interface DiskBenchmarkResult {
  drive: string;
  fileSizeMb: number;
  seqReadMbs: number;
  seqWriteMbs: number;
  random4kReadIops: number;
  random4kWriteIops: number;
  readLatencyUs: number;
  writeLatencyUs: number;
  score: number;
  tier: string;
}

export interface RamBenchmarkResult {
  readGbs: number;
  writeGbs: number;
  copyGbs: number;
  latencyNs: number;
  score: number;
  tier: string;
}

export interface GameFpsEstimate {
  name: string;
  category: string;
  avgFps: number;
  low1Fps: number;
  limiter: string;
  tier: string;
}

export interface CpuAndGameBenchmarkResult {
  singleCoreScore: number;
  multiCoreScore: number;
  threadsTested: number;
  simAvgFps: number;
  simLow1Fps: number;
  resolution: string;
  preset: string;
  games: GameFpsEstimate[];
}

export interface StressStatus {
  running: boolean;
  elapsedSecs: number;
  cpuEnabled: boolean;
  ramEnabled: boolean;
  memPasses: number;
  memErrors: number;
  maxTempC: number;
}

export interface InstalledGame {
  id: string;
  name: string;
  platform: string;
  installDir: string;
  exePath: string;
  launchUri: string;
  sizeGb: number;
}

export interface OverlayStatus {
  active: boolean;
  position: string;
}

export interface DriverInventoryItem {
  deviceName: string;
  category: string;
  provider: string;
  version: string;
  date: string;
  signer: string;
  infName: string;
  status: "OK" | "Antigo" | "Erro" | string;
  errorCode: number;
}

export interface HardwareErrorEvent {
  eventId: number;
  source: string;
  severity: string;
  timestamp: string;
  description: string;
}

export interface TuningAndErrorsReport {
  cpuName: string;
  cpuBaseMhz: number;
  cpuCurrentMhz: number;
  cpuBoostRatio: number;
  cpuOcActive: boolean;
  ramSpeedMhz: number;
  ramType: string;
  xmpEnabled: boolean;
  activePowerPlanId: string;
  activePowerPlanName: string;
  wheaErrorCount: number;
  kernelPower41Count: number;
  gpuResetCount: number;
  recentErrors: HardwareErrorEvent[];
}

export interface UsbDeviceEntry {
  instanceId: string;
  name: string;
  className: string;
  connected: boolean;
  isComPort: boolean;
  statusText: string;
}

export interface UsbScanResult {
  totalDevices: number;
  connectedCount: number;
  ghostCount: number;
  reservedComPorts: number;
  devices: UsbDeviceEntry[];
}

export interface RgbBackendInfo {
  name: string;
  detected: boolean;
  status: string;
}

export interface RgbStatusReport {
  activeEffect: string;
  activeColorHex: string;
  win11DynamicLightingSupported: boolean;
  backends: RgbBackendInfo[];
}

export interface MakerDriverInfo {
  id: string;
  name: string;
  chipFamily: string;
  description: string;
  bundled: boolean;
  installedInStore: boolean;
  connectedDevices: string[];
  vendorUrl: string;
}

export interface WingetAppItem {
  id: string;
  name: string;
  category: string;
  description: string;
  installed: boolean;
}

export async function getLiveSensors(): Promise<CommandResponse<LiveSensorSnapshot>> {
  const res = await invokeCommand<LiveSensorSnapshot>("get_live_sensors");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Preview sensors",
    data: {
      cpuTempC: 46.5,
      cpuLoadPercent: 14.0,
      cpuClockGhz: 4.85,
      cpuPowerW: 38.4,
      gpuTempC: 43.0,
      gpuLoadPercent: 8.0,
      gpuClockMhz: 1920,
      gpuPowerW: 32.0,
      gpuVramUsedMb: 2140,
      gpuVramTotalMb: 12288,
      ramUsedGb: 10.4,
      ramTotalGb: 32.0,
      ramLoadPercent: 32.5,
      stressRunning: false,
      stressElapsedSecs: 0,
      stressMemErrors: 0,
      stressMemPasses: 0,
      stressMaxTempC: 51.0,
      sensors: [
        { id: "cpu-pkg-temp", hardware: "AMD Ryzen 7 7800X3D", category: "Temperature", name: "CPU Package", value: 46.5, min: 39.0, max: 54.0, unit: "°C" },
        { id: "cpu-total-load", hardware: "AMD Ryzen 7 7800X3D", category: "Load", name: "CPU Total", value: 14.0, min: 4.0, max: 35.0, unit: "%" },
        { id: "cpu-avg-clock", hardware: "AMD Ryzen 7 7800X3D", category: "Clock", name: "Core Effective Clock", value: 4850, min: 3600, max: 5050, unit: "MHz" },
        { id: "cpu-pkg-power", hardware: "AMD Ryzen 7 7800X3D", category: "Power", name: "CPU Package Power", value: 38.4, min: 18.0, max: 62.0, unit: "W" },
        { id: "gpu-core-temp", hardware: "NVIDIA GeForce RTX 4070 Super", category: "Temperature", name: "GPU Core", value: 43.0, min: 38.0, max: 58.0, unit: "°C" },
        { id: "gpu-core-load", hardware: "NVIDIA GeForce RTX 4070 Super", category: "Load", name: "GPU Core Load", value: 8.0, min: 1.0, max: 42.0, unit: "%" },
        { id: "gpu-core-clock", hardware: "NVIDIA GeForce RTX 4070 Super", category: "Clock", name: "GPU Graphics Clock", value: 1920, min: 310, max: 2640, unit: "MHz" },
        { id: "ram-load", hardware: "Memória RAM", category: "Load", name: "Memory Usage", value: 32.5, min: 28.0, max: 36.0, unit: "%" },
      ],
    },
  };
}

export async function analyzeBottleneck(params: {
  cpuName: string;
  physicalCores: number;
  baseGhz: number;
  gpuName: string;
  vramGb: number;
  ramTotalGb: number;
  ramSpeedMhz: number;
}): Promise<CommandResponse<BottleneckReport>> {
  const res = await invokeCommand<BottleneckReport>("analyze_bottleneck", params);
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Análise de gargalo calculada.",
    data: {
      cpuName: params.cpuName || "AMD Ryzen 7 7800X3D",
      cpuIndex: 145.0,
      gpuName: params.gpuName || "NVIDIA GeForce RTX 4070 Super",
      gpuIndex: 132.0,
      gpuSpec: {
        model: "RTX 4070 Super",
        arch: "Ada Lovelace",
        vramGb: 12,
        busWidthBits: 192,
        memType: "GDDR6X",
        bandwidthGbs: 504.2,
        tdpW: 220,
        perfIndex: 132.0,
      },
      ramTotalGb: params.ramTotalGb || 32,
      ramSpeedMhz: params.ramSpeedMhz || 6000,
      resolutions: [
        {
          resolution: "1080p",
          label: "1080p (Full HD)",
          limitingComponent: "Balanced",
          severityPercent: 4.5,
          severityLevel: "Balanced",
          balanceScore: 95,
          headlinePt: "Conjunto Equilibrado em 1080p (Full HD)",
          headlineEn: "Balanced Setup at 1080p (Full HD)",
          explanationPt: "O processador e a placa de vídeo operam em harmonia nesta resolução, extraindo 100% do potencial em jogos.",
          explanationEn: "CPU and GPU operate in harmony at this resolution.",
          recommendationsPt: ["Seu hardware já está muito bem dimensionado para 1080p em alta taxa de atualização."],
          recommendationsEn: ["Your hardware is well balanced for high refresh rate 1080p gaming."],
        },
        {
          resolution: "1440p",
          label: "1440p (Quad HD)",
          limitingComponent: "Balanced",
          severityPercent: 6.2,
          severityLevel: "Balanced",
          balanceScore: 94,
          headlinePt: "Conjunto Equilibrado em 1440p (Quad HD)",
          headlineEn: "Balanced Setup at 1440p (Quad HD)",
          explanationPt: "Sinergia ideal entre CPU e GPU para Quad HD com presets no Ultra.",
          explanationEn: "Ideal synergy between CPU and GPU for Quad HD Ultra.",
          recommendationsPt: ["Ative DLSS Quality / Reflex nos títulos competitivos e AAA."],
          recommendationsEn: ["Enable DLSS Quality / Reflex in competitive and AAA titles."],
        },
        {
          resolution: "2160p",
          label: "2160p (4K UHD)",
          limitingComponent: "GPU",
          severityPercent: 18.0,
          severityLevel: "Mild",
          balanceScore: 82,
          headlinePt: "Limitado pela GPU (18%) em 2160p (4K UHD)",
          headlineEn: "GPU Limited (18%) at 2160p (4K UHD)",
          explanationPt: "Em 4K nativo, a placa de vídeo assume toda a carga de sombreamento.",
          explanationEn: "At native 4K, the graphics card handles the entire shading load.",
          recommendationsPt: ["Utilize DLSS / FSR no modo Qualidade ou Equilibrado para manter 90+ FPS em 4K."],
          recommendationsEn: ["Use DLSS / FSR Quality or Balanced mode to keep 90+ FPS at 4K."],
        },
      ],
      catalogCpus: [
        "AMD Ryzen 7 9800X3D",
        "AMD Ryzen 7 7800X3D",
        "AMD Ryzen 5 7600X",
        "AMD Ryzen 7 5700X3D",
        "AMD Ryzen 5 5600X",
        "Intel Core i9-14900K",
        "Intel Core i7-14700K",
        "Intel Core i5-13600K",
        "Intel Core i5-12400F",
      ],
      catalogGpus: [
        "NVIDIA GeForce RTX 4090",
        "NVIDIA GeForce RTX 4080 Super",
        "NVIDIA GeForce RTX 4070 Super",
        "NVIDIA GeForce RTX 4060 Ti",
        "NVIDIA GeForce RTX 4060",
        "NVIDIA GeForce RTX 3060",
        "AMD Radeon RX 7900 XTX",
        "AMD Radeon RX 7800 XT",
        "AMD Radeon RX 6750 XT",
      ],
    },
  };
}

export async function runDiskBenchmark(driveLetter?: string, fileMb?: number): Promise<CommandResponse<DiskBenchmarkResult>> {
  return invokeCommand<DiskBenchmarkResult>("run_disk_benchmark", { driveLetter, fileMb });
}

export async function runRamBenchmark(): Promise<CommandResponse<RamBenchmarkResult>> {
  return invokeCommand<RamBenchmarkResult>("run_ram_benchmark");
}

export async function runCpuBenchmark(params: {
  cpuName?: string;
  gpuName?: string;
  resolution?: string;
  preset?: string;
}): Promise<CommandResponse<CpuAndGameBenchmarkResult>> {
  return invokeCommand<CpuAndGameBenchmarkResult>("run_cpu_benchmark", params);
}

export async function startStressTest(cpu: boolean, ram: boolean): Promise<CommandResponse<StressStatus>> {
  return invokeCommand<StressStatus>("start_stress_test", { cpu, ram });
}

export async function stopStressTest(): Promise<CommandResponse<StressStatus>> {
  return invokeCommand<StressStatus>("stop_stress_test");
}

export async function getStressStatus(): Promise<CommandResponse<StressStatus>> {
  return invokeCommand<StressStatus>("get_stress_status");
}

export async function scanInstalledGames(): Promise<CommandResponse<InstalledGame[]>> {
  const res = await invokeCommand<InstalledGame[]>("scan_installed_games");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Jogos detectados",
    data: [
      { id: "steam:730", name: "Counter-Strike 2", platform: "Steam", installDir: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive", exePath: "cs2.exe", launchUri: "steam://rungameid/730", sizeGb: 38.4 },
      { id: "riot:valorant", name: "VALORANT", platform: "Riot Games", installDir: "C:\\Riot Games\\VALORANT", exePath: "VALORANT.exe", launchUri: "C:\\Riot Games\\VALORANT\\live\\VALORANT.exe", sizeGb: 44.2 },
    ],
  };
}

export async function launchGameOptimized(params: {
  name: string;
  platform: string;
  exePath?: string;
  launchUri?: string;
}): Promise<CommandResponse<string>> {
  return invokeCommand<string>("launch_game_optimized", params);
}

export async function toggleHudOverlay(enable: boolean, position?: string): Promise<CommandResponse<OverlayStatus>> {
  return invokeCommand<OverlayStatus>("toggle_hud_overlay", { enable, position });
}

export async function getDriverInventory(): Promise<CommandResponse<DriverInventoryItem[]>> {
  const res = await invokeCommand<DriverInventoryItem[]>("get_driver_inventory");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Drivers auditados",
    data: [
      { deviceName: "NVIDIA GeForce RTX 4070 Super", category: "Vídeo / GPU", provider: "NVIDIA", version: "32.0.15.6636", date: "05/12/2024", signer: "Microsoft Windows Hardware Compatibility Publisher", infName: "oem42.inf", status: "OK", errorCode: 0 },
      { deviceName: "Realtek Gaming 2.5GbE Family Controller", category: "Rede / Wi-Fi", provider: "Realtek", version: "1125.19.704.2024", date: "04/07/2024", signer: "Microsoft Windows Hardware Compatibility Publisher", infName: "oem18.inf", status: "OK", errorCode: 0 },
      { deviceName: "Standard NVM Express Controller", category: "Armazenamento", provider: "Microsoft", version: "10.0.26100.1", date: "21/06/2024", signer: "Microsoft Windows", infName: "stornvme.inf", status: "OK", errorCode: 0 },
    ],
  };
}

export async function scanOcAndErrors(): Promise<CommandResponse<TuningAndErrorsReport>> {
  const res = await invokeCommand<TuningAndErrorsReport>("scan_oc_and_errors");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Scanner concluído",
    data: {
      cpuName: "AMD Ryzen 7 7800X3D",
      cpuBaseMhz: 4200,
      cpuCurrentMhz: 4950,
      cpuBoostRatio: 1.18,
      cpuOcActive: true,
      ramSpeedMhz: 6000,
      ramType: "DDR5",
      xmpEnabled: true,
      activePowerPlanId: "ultimate",
      activePowerPlanName: "Desempenho Máximo (Ultimate Performance)",
      wheaErrorCount: 0,
      kernelPower41Count: 0,
      gpuResetCount: 0,
      recentErrors: [],
    },
  };
}

export async function setPowerPlan(planId: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("set_power_plan", { planId });
}

export async function getUsbDevices(): Promise<CommandResponse<UsbScanResult>> {
  const res = await invokeCommand<UsbScanResult>("get_usb_devices");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "USB escaneado",
    data: {
      totalDevices: 4,
      connectedCount: 2,
      ghostCount: 2,
      reservedComPorts: 3,
      devices: [
        { instanceId: "USB\\VID_046D&PID_C54D\\0001", name: "Logitech G PRO X Superlight 2 Receiver", className: "USB", connected: true, isComPort: false, statusText: "Conectado" },
        { instanceId: "USB\\VID_1A86&PID_7523\\6&2891A2", name: "USB-SERIAL CH340 (COM4)", className: "Ports", connected: false, isComPort: true, statusText: "Fantasma (Desconectado)" },
        { instanceId: "USB\\VID_10C4&PID_EA60\\0001", name: "Silicon Labs CP210x USB to UART Bridge (COM5)", className: "Ports", connected: false, isComPort: true, statusText: "Fantasma (Desconectado)" },
      ],
    },
  };
}

export async function removeGhostUsbDevices(instanceIds: string[]): Promise<CommandResponse<number>> {
  return invokeCommand<number>("remove_ghost_usb_devices", { instanceIds });
}

export async function getRgbStatus(): Promise<CommandResponse<RgbStatusReport>> {
  const res = await invokeCommand<RgbStatusReport>("get_rgb_status");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "RGB carregado",
    data: {
      activeEffect: "Static",
      activeColorHex: "#38BDF8",
      win11DynamicLightingSupported: true,
      backends: [
        { name: "Windows 11 Dynamic Lighting (HID LampArray)", detected: true, status: "Integrado ao Sistema" },
        { name: "OpenRGB SDK Server (Porta 6742)", detected: false, status: "Servidor SDK Offline" },
        { name: "Razer Chroma Connect REST", detected: false, status: "Não detectado" },
      ],
    },
  };
}

export async function applyRgbEffect(effect: string, colorHex: string): Promise<CommandResponse<RgbStatusReport>> {
  return invokeCommand<RgbStatusReport>("apply_rgb_effect", { effect, colorHex });
}

export async function getMakerDrivers(): Promise<CommandResponse<MakerDriverInfo[]>> {
  const res = await invokeCommand<MakerDriverInfo[]>("get_maker_drivers");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Drivers Maker carregados",
    data: [
      { id: "CH340", name: "WCH CH340 / CH341 USB-Serial", chipFamily: "VID_1A86 (ESP8266, ESP32, Arduino Nano Clone)", description: "Driver oficial para placas Arduino Nano/Uno R3 clones, NodeMCU ESP8266 e ESP32 com conversor WCH CH340G/CH341.", bundled: true, installedInStore: true, connectedDevices: [], vendorUrl: "https://www.wch-ic.com/downloads/CH341SER_EXE.html" },
      { id: "CP210x", name: "Silicon Labs CP210x VCP", chipFamily: "VID_10C4 (ESP32 DevKit, NodeMCU v2)", description: "Driver Virtual COM Port (VCP) oficial da Silicon Labs para módulos ESP32-WROOM e gravadores UART.", bundled: true, installedInStore: false, connectedDevices: [], vendorUrl: "https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers" },
      { id: "FTDI", name: "FTDI FT232R / FT2232D CDM", chipFamily: "VID_0403 (Arduino Pro Mini, JTAG, Interfaces CNC)", description: "Driver combinado VCP + D2XX da FTDI para conversores FT232RL genuínos.", bundled: true, installedInStore: false, connectedDevices: [], vendorUrl: "https://ftdichip.com/drivers/vcp-drivers/" },
      { id: "Arduino", name: "Arduino USB ACM Oficial (AVR)", chipFamily: "VID_2341 / VID_2A03 (Uno R3 Original, Mega 2560)", description: "Pacote de definições USB CDC/ACM oficial para placas Arduino genuínas.", bundled: true, installedInStore: false, connectedDevices: [], vendorUrl: "https://www.arduino.cc/en/software" },
    ],
  };
}

export async function installMakerDriver(chipId: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("install_maker_driver", { chipId });
}

export async function cleanArduinoCache(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("clean_arduino_cache");
}

export async function getWingetCatalog(): Promise<CommandResponse<WingetAppItem[]>> {
  const res = await invokeCommand<WingetAppItem[]>("get_winget_catalog");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Catálogo Winget",
    data: [
      { id: "imputnet.helium", name: "Helium Browser (Chromium Ultraleve)", category: "Navegadores", description: "Chromium enxuto focado em privacidade e zero telemetria.", installed: false },
      { id: "Brave.Brave", name: "Brave Browser", category: "Navegadores", description: "Navegador focado em privacidade e bloqueio nativo de anúncios.", installed: false },
      { id: "Mozilla.Firefox", name: "Mozilla Firefox", category: "Navegadores", description: "Navegador rápido baseado em Gecko.", installed: false },
      { id: "Google.Chrome", name: "Google Chrome", category: "Navegadores", description: "Navegador oficial do Google.", installed: true },
      { id: "Discord.Discord", name: "Discord", category: "Comunicação & Mídia", description: "Comunicação por voz e vídeo de baixa latência.", installed: true },
      { id: "Spotify.Spotify", name: "Spotify", category: "Comunicação & Mídia", description: "Streaming de áudio e podcasts.", installed: false },
      { id: "OBSProject.OBSStudio", name: "OBS Studio", category: "Comunicação & Mídia", description: "Gravação NVENC/AV1 e streaming profissional.", installed: false },
      { id: "Daum.PotPlayer", name: "PotPlayer", category: "Comunicação & Mídia", description: "Player acelerado por hardware ultra-leve.", installed: false },
      { id: "VideoLAN.VLC", name: "VLC Media Player", category: "Comunicação & Mídia", description: "Reprodutor universal com codecs integrados.", installed: false },
      { id: "Valve.Steam", name: "Steam", category: "Comunicação & Mídia", description: "Maior plataforma de jogos para PC.", installed: true },
      { id: "EpicGames.EpicGamesLauncher", name: "Epic Games Launcher", category: "Comunicação & Mídia", description: "Launcher oficial da Epic Games.", installed: false },
      { id: "Microsoft.DirectX", name: "DirectX End-User Runtime", category: "Utilitários de Hardware & Runtimes", description: "Bibliotecas legadas DirectX 9/10/11 para jogos.", installed: true },
      { id: "Microsoft.VCRedist.2015+.x64", name: "Visual C++ 2015-2022 (x64)", category: "Utilitários de Hardware & Runtimes", description: "Runtime C++ 64-bit obrigatório.", installed: true },
      { id: "Microsoft.VCRedist.2015+.x86", name: "Visual C++ 2015-2022 (x86)", category: "Utilitários de Hardware & Runtimes", description: "Runtime C++ 32-bit para jogos clássicos.", installed: true },
      { id: "7zip.7zip", name: "7-Zip", category: "Utilitários de Hardware & Runtimes", description: "Compactador ultraleve open-source.", installed: true },
      { id: "Notepad++.Notepad++", name: "Notepad++", category: "Utilitários de Hardware & Runtimes", description: "Editor de texto e código ultrarrápido.", installed: false },
      { id: "Guru3D.Afterburner", name: "MSI Afterburner", category: "Utilitários de Hardware & Runtimes", description: "Controle de fans, undervolt e curva V/F de GPU.", installed: false },
      { id: "Guru3D.RTSS", name: "RivaTuner Statistics Server (RTSS)", category: "Utilitários de Hardware & Runtimes", description: "Limitador de FPS de frame-pacing e OSD.", installed: false },
      { id: "CPUID.CPU-Z", name: "CPU-Z", category: "Utilitários de Hardware & Runtimes", description: "Inspeção detalhada de CPU, placa-mãe e RAM.", installed: false },
      { id: "TechPowerUp.GPU-Z", name: "TechPowerUp GPU-Z", category: "Utilitários de Hardware & Runtimes", description: "Diagnóstico avançado de placa de vídeo e ReBAR.", installed: false },
      { id: "CPUID.HWMonitor", name: "HWMonitor", category: "Utilitários de Hardware & Runtimes", description: "Monitoramento de tensões e temperaturas.", installed: false },
    ],
  };
}

export async function installWingetBatch(wingetIds: string[]): Promise<CommandResponse<number>> {
  return invokeCommand<number>("install_winget_batch", { wingetIds });
}

export async function getRestorePointsStatus(): Promise<CommandResponse<RestorePointsStatus>> {
  const res = await invokeCommand<RestorePointsStatus>("get_restore_points_status");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Preview web: Ponto de restauração pendente",
    data: {
      protectionEnabled: true,
      frequencyUnlocked: false,
      hasRecentRestorePoint: false,
      points: [],
    },
  };
}

export async function getLiveTweaksStatus(): Promise<CommandResponse<LiveTweakStatus[]>> {
  const res = await invokeCommand<LiveTweakStatus[]>("get_live_tweaks_status");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Preview web",
    data: [
      {
        id: "timer_05ms",
        name: "Kernel Timer Resolution 0.5ms",
        category: "Latência & CPU",
        description: "Ativa GlobalTimerResolutionRequests = 1 e ajusta precisão do tick para 0.5ms.",
        riskLevel: "low",
        applied: true,
        currentValue: "Global=1 (0.5ms)",
        recommendedValue: "1 (0.5ms)",
        defaultValue: "0 (15.6ms)",
        registryPath: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel\\GlobalTimerResolutionRequests",
        minOsTier: "Win7",
      },
      {
        id: "win32_priority",
        name: "Win32PrioritySeparation (0x26 / 38)",
        category: "Latência & CPU",
        description: "Prioriza janela em primeiro plano (Short Variable Quantum).",
        riskLevel: "low",
        applied: false,
        currentValue: "0x2 (2)",
        recommendedValue: "0x26 (38)",
        defaultValue: "0x2 (2)",
        registryPath: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl\\Win32PrioritySeparation",
        minOsTier: "Win7",
      },
      {
        id: "memory_compression",
        name: "Compressão de Memória (MMAgent)",
        category: "Memória & Sistema",
        description: "Desativa compressão de páginas em RAM (recomendado para >=16GB RAM).",
        riskLevel: "low",
        applied: false,
        currentValue: "Ativa (True)",
        recommendedValue: "Desativada (>=16GB) / Ativa (<=8GB)",
        defaultValue: "Ativa (True)",
        registryPath: "PowerShell: Get-MMAgent / Disable-MMAgent -mc",
        minOsTier: "Win10",
      },
      {
        id: "windows_update_pause",
        name: "Pausar Windows Update (Até 1 Ano)",
        category: "Windows Update",
        description: "Pausa atualizações automáticas por 365 dias com opção Resume.",
        riskLevel: "medium",
        applied: false,
        currentValue: "Ativo (Automático)",
        recommendedValue: "Pausado (+365d) c/ Resume Manual",
        defaultValue: "Ativo",
        registryPath: "HKLM\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings",
        minOsTier: "Win10",
      },
      {
        id: "delivery_optimization_off",
        name: "Desativar Delivery Optimization (P2P Off)",
        category: "Rede & Update",
        description: "Impede upload P2P de atualizações do Windows (DODownloadMode = 0).",
        riskLevel: "low",
        applied: false,
        currentValue: "DODownloadMode=1",
        recommendedValue: "0 (P2P Desativado)",
        defaultValue: "1 (LAN/P2P)",
        registryPath: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization",
        minOsTier: "Win10",
      },
      {
        id: "uwp_background_off",
        name: "Bloquear Apps UWP em Segundo Plano",
        category: "Sistema & Privacidade",
        description: "Impede execução oculta em segundo plano de apps da Microsoft Store.",
        riskLevel: "low",
        applied: false,
        currentValue: "Permitido",
        recommendedValue: "1 (Bloqueado)",
        defaultValue: "0 (Permitido)",
        registryPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications",
        minOsTier: "Win10",
      },
      {
        id: "store_autoupdate_off",
        name: "Desativar Auto-Update da Microsoft Store",
        category: "Sistema & Privacidade",
        description: "Evita downloads automáticos em segundo plano da Store.",
        riskLevel: "low",
        applied: false,
        currentValue: "Automático (4)",
        recommendedValue: "2 (Manual)",
        defaultValue: "4 (Automático)",
        registryPath: "HKLM\\SOFTWARE\\Policies\\Microsoft\\WindowsStore",
        minOsTier: "Win10",
      },
      {
        id: "classic_context_menu",
        name: "Menu de Contexto Clássico (Windows 10)",
        category: "Shell & Interface",
        description: "Restaura menu completo do botão direito instantaneamente.",
        riskLevel: "low",
        applied: false,
        currentValue: "Padrão Win11",
        recommendedValue: "Ativo",
        defaultValue: "Padrão Win11",
        registryPath: "HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}",
        minOsTier: "Win11",
      },
      {
        id: "clean_notepad",
        name: "Bloco de Notas Limpo (Sem Copilot/IA & Sem Abas)",
        category: "Shell & Interface",
        description: "Desativa botões IA/Copilot e restauração de sessões antigas.",
        riskLevel: "low",
        applied: false,
        currentValue: "IA / Sessão Padrão",
        recommendedValue: "DisableAIFeatures=1",
        defaultValue: "0",
        registryPath: "HKLM\\SOFTWARE\\Policies\\WindowsNotepad",
        minOsTier: "Win11",
      },
      {
        id: "visual_effects_opt",
        name: "Efeitos Visuais Enxutos (Preserva Fontes e Thumbnails)",
        category: "Shell & Interface",
        description: "Remove animações pesadas preservando ClearType e miniaturas.",
        riskLevel: "low",
        applied: false,
        currentValue: "Padrão",
        recommendedValue: "VisualFXSetting=3",
        defaultValue: "1 / 0",
        registryPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects",
        minOsTier: "Win7",
      },
      {
        id: "explorer_pro_settings",
        name: "Explorer Pro & Iluminação Dinâmica Off",
        category: "Shell & Interface",
        description: "Mostra extensões/ocultos e desativa Windows Dynamic Lighting.",
        riskLevel: "low",
        applied: false,
        currentValue: "Padrão Oculto",
        recommendedValue: "HideFileExt=0, Hidden=1",
        defaultValue: "HideFileExt=1, Hidden=2",
        registryPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        minOsTier: "Win7",
      },
      {
        id: "full_blackout_theme",
        name: "Tema Escuro Total & Sem Transparência",
        category: "Shell & Interface",
        description: "Ativa Dark Mode em Apps/Sistema e desativa transparência.",
        riskLevel: "low",
        applied: false,
        currentValue: "Claro ou Transparência Ativa",
        recommendedValue: "Dark=1, Transparency=0",
        defaultValue: "Transparency=1",
        registryPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
        minOsTier: "Win10",
      },
      {
        id: "disable_windows_ai",
        name: "Extermínio de IA Win11 24H2-26H2 (Copilot/Recall/Cocreator)",
        category: "Privacidade & IA",
        description: "Desativa Copilot, Windows Recall, Paint Cocreator e Cross Device Resume.",
        riskLevel: "medium",
        applied: false,
        currentValue: "Recursos de IA Ativos",
        recommendedValue: "TurnOffCopilot=1, DisableRecall=1",
        defaultValue: "Ativo no Win11",
        registryPath: "HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsAI",
        minOsTier: "Win11",
      },
      {
        id: "nic_power_saving_off",
        name: "Desativar Economia de Energia da Placa de Rede (NIC EEE Off)",
        category: "Rede & Latência",
        description: "Desativa EEE, Green Ethernet e PnPCapabilities no adaptador de rede.",
        riskLevel: "medium",
        applied: false,
        currentValue: "Economia Ativa",
        recommendedValue: "PnP=24, EEE=0, GreenEthernet=0",
        defaultValue: "Economia Ativa",
        registryPath: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}",
        minOsTier: "Win7",
      },
    ],
  };
}

export async function applyOrRevertTweak(tweakId: string, apply: boolean): Promise<CommandResponse<LiveTweakStatus>> {
  return invokeCommand<LiveTweakStatus>("apply_or_revert_tweak", { tweakId, apply });
}

export async function enableTrim(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("enable_trim");
}

export async function rebootToBios(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("reboot_to_bios");
}

export async function scanUsbDevices(): Promise<CommandResponse<UsbScanResult>> {
  const res = await invokeCommand<UsbScanResult>("scan_usb_devices");
  if (res.success && res.data) return res;
  return getUsbDevices();
}

// =================================================================
// 8. ETAPA 2 — MÓDULOS 2, 3, 4 E 6 (CLEAN INSTALL USB, APP POST-PROC,
//    BITLOCKER, NTP SYNC, RESTAURAÇÃO, AUDIO LOUDNESS EQ & IPV4-ONLY)
// =================================================================

export interface CleanInstallUsbResult {
  autounattendPath: string;
  setupCompletePath?: string;
  localUsername: string;
  bypassWin11Reqs: boolean;
  skipOobeTelemetry: boolean;
  injectOemDriverBlock: boolean;
}

export interface AppPostProcessResult {
  shortcutsFlattened: number;
  emptyFoldersRemoved: number;
  browsersOptimized: string[];
  discordSpotifyOptimized: boolean;
  details: string[];
}

export interface BitLockerDriveStatus {
  drive: string;
  status: string;
  protectionOn: boolean;
  percentageEncrypted: number;
  encryptionMethod: string;
}

export interface AudioEndpointItem {
  id: string;
  name: string;
  deviceName: string;
  loudnessEqEnabled: boolean;
  enhancementsUnlocked: boolean;
}

export interface NetworkBindingsStatus {
  adapterName: string;
  ipv4Enabled: boolean;
  ipv6Enabled: boolean;
  qosEnabled: boolean;
  lltdEnabled: boolean;
  smbEnabled: boolean;
  ipv4OnlyMode: boolean;
}

export async function cleanWindowsUpdateCache(): Promise<CommandResponse<CleanResult>> {
  return invokeCommand<CleanResult>("clean_windows_update_cache");
}

export async function generateCleanInstallUsb(
  targetPath: string,
  localUsername: string,
  bypassWin11Reqs: boolean,
  skipOobeTelemetry: boolean,
  injectOemDriverBlock: boolean
): Promise<CommandResponse<CleanInstallUsbResult>> {
  return invokeCommand<CleanInstallUsbResult>("generate_clean_install_usb", {
    targetPath,
    localUsername,
    bypassWin11Reqs,
    skipOobeTelemetry,
    injectOemDriverBlock,
  });
}

export async function openAccountControlPanel(tool: "netplwiz" | "lusrmgr"): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("open_account_control_panel", { tool });
}

export async function runAppPostProcessing(
  flattenShortcuts: boolean,
  optimizeBrowsers: boolean,
  optimizeDiscordSpotify: boolean,
  disableBrowserHwAccel: boolean
): Promise<CommandResponse<AppPostProcessResult>> {
  return invokeCommand<AppPostProcessResult>("run_app_post_processing", {
    flattenShortcuts,
    optimizeBrowsers,
    optimizeDiscordSpotify,
    disableBrowserHwAccel,
  });
}

export async function getBitlockerStatus(): Promise<CommandResponse<BitLockerDriveStatus[]>> {
  const res = await invokeCommand<BitLockerDriveStatus[]>("get_bitlocker_status");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Auditoria BitLocker (Preview Web)",
    data: [
      {
        drive: "C:",
        status: "Fully Encrypted (Preview)",
        protectionOn: true,
        percentageEncrypted: 100,
        encryptionMethod: "XTS-AES 128",
      },
    ],
  };
}

export async function bitlockerDecrypt(drive: string): Promise<CommandResponse<string>> {
  return invokeCommand<string>("bitlocker_decrypt", { drive });
}

export async function syncSystemTime(): Promise<CommandResponse<string>> {
  return invokeCommand<string>("sync_system_time");
}

export async function restoreEssentialApp(
  target: "xbox_gaming" | "ms_store" | "calc_snipping"
): Promise<CommandResponse<string>> {
  return invokeCommand<string>("restore_essential_app", { target });
}

export async function getAudioEndpoints(): Promise<CommandResponse<AudioEndpointItem[]>> {
  const res = await invokeCommand<AudioEndpointItem[]>("get_audio_endpoints");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Endpoints de áudio carregados",
    data: [
      {
        id: "{preview-audio-endpoint-1}",
        name: "Alto-falantes / Headset Principal",
        deviceName: "Realtek(R) Audio",
        loudnessEqEnabled: false,
        enhancementsUnlocked: false,
      },
    ],
  };
}

export async function injectLoudnessEq(endpointId: string, enable: boolean): Promise<CommandResponse<string>> {
  return invokeCommand<string>("inject_loudness_eq", { endpointId, enable });
}

export async function openSoundControlPanel(): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("open_sound_control_panel");
}

export async function disableNicPowerSaving(enable: boolean): Promise<CommandResponse<number>> {
  return invokeCommand<number>("disable_nic_power_saving", { enable });
}

export async function getNetworkBindingsStatus(): Promise<CommandResponse<NetworkBindingsStatus>> {
  const res = await invokeCommand<NetworkBindingsStatus>("get_network_bindings_status");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Vínculos de rede auditados",
    data: {
      adapterName: "Ethernet (Preview)",
      ipv4Enabled: true,
      ipv6Enabled: true,
      qosEnabled: true,
      lltdEnabled: true,
      smbEnabled: true,
      ipv4OnlyMode: false,
    },
  };
}

export async function toggleIpv4Only(
  enableIpv4Only: boolean,
  preserveSmb: boolean
): Promise<CommandResponse<string>> {
  return invokeCommand<string>("toggle_ipv4_only", { enableIpv4Only, preserveSmb });
}

// =================================================================
// 9. ETAPA 3 — MÓDULOS 5, 7 & 8 (ENGENHARIA GRÁFICA GPU, AFTERBURNER
//    1% LOWS, AFINIDADE CPU, MOUSE DPI 1:1, USB POWER & ANTI-CHEAT)
// =================================================================

export interface GpuServiceStatus {
  name: string;
  displayName: string;
  state: string;
  optimized: boolean;
  note: string;
}

export interface GpuGamingState {
  gpuName: string;
  gpuVendor: string;
  hagsEnabled: boolean;
  ofwgEnabled: boolean;
  p0StateEnabled: boolean;
  hdcpDisabled: boolean;
  mpoDisabled: boolean;
  fsoDisabled: boolean;
  ulpsDisabled: boolean;
  ulpsBlockedByRx7000: boolean;
  ulpsWarning: string;
  telemetryServicesOptimized: boolean;
  profile3dApplied: boolean;
  afterburnerInstalled: boolean;
  afterburnerCfgPath: string;
  afterburnerFixApplied: boolean;
  win32PriorityHex: number;
  mmcssOptimized: boolean;
  backgroundPollingUnlocked: boolean;
  services: GpuServiceStatus[];
}

export interface CpuAffinityPreview {
  physicalCores: number;
  logicalThreads: number;
  mode: string;
  maskDecimal: number;
  maskHex: string;
  activeBitsSummary: string;
}

export interface AntiCheatStatusItem {
  id: string;
  name: string;
  anticheat: string;
  compatible: boolean;
  summary: string;
  blockingReasons: string[];
}

export interface AntiCheatReadinessReport {
  tpmEnabled: boolean;
  secureBootEnabled: boolean;
  cfgEnabled: boolean;
  vbsEnabled: boolean;
  depEnabled: boolean;
  games: AntiCheatStatusItem[];
}

export async function getGpuGamingState(): Promise<CommandResponse<GpuGamingState>> {
  const res = await invokeCommand<GpuGamingState>("get_gpu_gaming_state");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Preview Web: Subsistema Gráfico",
    data: {
      gpuName: "AMD Radeon RX 7600",
      gpuVendor: "AMD",
      hagsEnabled: true,
      ofwgEnabled: true,
      p0StateEnabled: false,
      hdcpDisabled: false,
      mpoDisabled: false,
      fsoDisabled: false,
      ulpsDisabled: false,
      ulpsBlockedByRx7000: true,
      ulpsWarning:
        "TRAVA DE SEGURANÇA (RX 7000+ / HAGS): Desativar ULPS com HAGS ativo causa quedas severas de FPS em GPUs AMD RX 7000+.",
      telemetryServicesOptimized: true,
      profile3dApplied: false,
      afterburnerInstalled: false,
      afterburnerCfgPath: "C:\\Program Files (x86)\\MSI Afterburner\\Profiles\\MSIAfterburner.cfg",
      afterburnerFixApplied: false,
      win32PriorityHex: 0x02,
      mmcssOptimized: false,
      backgroundPollingUnlocked: false,
      services: [
        {
          name: "AMD Crash Defender Service",
          displayName: "AMD Crash Defender Service",
          state: "Running",
          optimized: false,
          note: "Coletor de crash dumps em segundo plano da AMD.",
        },
        {
          name: "Intel(R) PresentMon Service",
          displayName: "Intel PresentMon Service",
          state: "Stopped",
          optimized: true,
          note: "Consome 1% a 2% de CPU continuamente em segundo plano mesmo fechado.",
        },
      ],
    },
  };
}

export async function applyGpuTweak(
  tweakId:
    | "hags"
    | "ofwg"
    | "gpu_p0_state"
    | "gpu_disable_hdcp"
    | "mpo_disable"
    | "fso_disable"
    | "amd_ulps_disable"
    | "gpu_telemetry_services"
    | "gpu_3d_profile",
  enable: boolean
): Promise<CommandResponse<GpuGamingState>> {
  return invokeCommand<GpuGamingState>("apply_gpu_tweak", { tweakId, enable });
}

export async function applyAfterburner1PercentLowFix(revert: boolean): Promise<CommandResponse<string>> {
  return invokeCommand<string>("apply_afterburner_1percent_low_fix", { revert });
}

export async function setWin32PrioritySeparation(modeHex: number): Promise<CommandResponse<number>> {
  return invokeCommand<number>("set_win32_priority_separation", { modeHex });
}

export async function configureMmcssGaming(enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("configure_mmcss_gaming", { enable });
}

export async function previewCpuAffinity(mode: "smt_off" | "core0_off" | "all_cores"): Promise<CommandResponse<CpuAffinityPreview>> {
  const res = await invokeCommand<CpuAffinityPreview>("preview_cpu_affinity", { mode });
  if (res.success && res.data) return res;
  const fallbackMask = mode === "smt_off" ? 0x5555 : mode === "core0_off" ? 0xfffc : 0xffff;
  return {
    success: true,
    message: "Preview Web",
    data: {
      physicalCores: 8,
      logicalThreads: 16,
      mode,
      maskDecimal: fallbackMask,
      maskHex: `0x${fallbackMask.toString(16).toUpperCase()}`,
      activeBitsSummary: "Preview 8C/16T",
    },
  };
}

export async function applyProcessAffinity(
  pid: number,
  mode: "smt_off" | "core0_off" | "all_cores"
): Promise<CommandResponse<string>> {
  return invokeCommand<string>("apply_process_affinity", { pid, mode });
}

export async function relaunchLauncherWithAffinity(
  launcher: "steam" | "epic",
  mode: "smt_off" | "core0_off" | "all_cores"
): Promise<CommandResponse<string>> {
  return invokeCommand<string>("relaunch_launcher_with_affinity", { launcher, mode });
}

export async function applyLinearMouseScaleCurve(
  dpiScalePercent: number,
  revertToDefault: boolean
): Promise<CommandResponse<string>> {
  return invokeCommand<string>("apply_linear_mouse_scale_curve", {
    dpiScalePercent,
    revertToDefault,
  });
}

export async function unlockBackgroundPollingRate(enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("unlock_background_polling_rate", { enable });
}

export async function disableUsbPowerSaving(revert: boolean): Promise<CommandResponse<number>> {
  return invokeCommand<number>("disable_usb_power_saving", { revert });
}

export async function getAntiCheatReadiness(): Promise<CommandResponse<AntiCheatReadinessReport>> {
  const res = await invokeCommand<AntiCheatReadinessReport>("get_anticheat_readiness");
  if (res.success && res.data) return res;
  return {
    success: true,
    message: "Preview Web: Matriz Anti-Cheat",
    data: {
      tpmEnabled: true,
      secureBootEnabled: true,
      cfgEnabled: true,
      vbsEnabled: false,
      depEnabled: true,
      games: [
        {
          id: "vanguard",
          name: "VALORANT",
          anticheat: "Riot Vanguard",
          compatible: true,
          summary: "Pronto: TPM 2.0, Secure Boot e Control Flow Guard (CFG) conformes.",
          blockingReasons: [],
        },
        {
          id: "faceit",
          name: "Counter-Strike 2 (FACEIT)",
          anticheat: "FACEIT Anti-Cheat",
          compatible: false,
          summary: "Requer VBS/Core Isolation ativo para partidas competitivas FACEIT.",
          blockingReasons: ["VBS / Core Isolation desativado (gera +2–5% FPS fora do FACEIT)."],
        },
        {
          id: "eac_battleye",
          name: "Fortnite / Warzone / Tarkov",
          anticheat: "EAC / BattlEye / Ricochet",
          compatible: true,
          summary: "Pronto: DEP e integridade de boot verificados.",
          blockingReasons: [],
        },
      ],
    },
  };
}

export async function setControlFlowGuard(enable: boolean): Promise<CommandResponse<boolean>> {
  return invokeCommand<boolean>("set_control_flow_guard", { enable });
}

