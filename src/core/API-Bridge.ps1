# =================================================================
# SYSTEM OPTIMIZER - API BRIDGE (TAURI / WEB FRONTEND INTERFACE)
# =================================================================

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        "Diagnostics", "OptimizeDeep", "OptimizeLite", "SetLatency", "SetPriority",
        "SetGameDVR", "SetMouse", "SetKeyboard", "SetNetwork", "SetRamClean",
        "SetDefenderExclusion", "ResetDirectX", "RepairWindowsUpdate", "OptimizeDns",
        "SystemScan", "RemoveOrphans", "RemoveBloatware", "DisableTelemetry",
        "SetTakeOwnership", "BackupDrivers", "RunWinUtil", "ActivateWindows",
        "ActivateOffice"
    )]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$Args = ""
)

# Determina o diretório base de forma consistente
if ($PSScriptRoot) { 
    $ScriptPath = $PSScriptRoot 
} else { 
    $ScriptPath = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition 
}

# Configura o stdout para codificação UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Carrega os módulos funcionais de lógica pura do backend (Sem UI/Controllers)
$BackendModules = @(
    "..\utils\Win32-Helper.ps1",
    "..\modules\Opt-Clean.ps1",
    "..\modules\Opt-Gamer.ps1",
    "..\modules\Opt-System.ps1",
    "..\modules\Opt-Diagnostics.ps1"
)

foreach ($Module in $BackendModules) {
    $Combined = Join-Path $PSScriptRoot $Module
    $FullPath = [System.IO.Path]::GetFullPath($Combined)
    if (Test-Path $FullPath) {
        . $FullPath
    } else {
        $ErrorObj = [PSCustomObject]@{
            Status  = "Error"
            Message = "Modulo ausente: $FullPath"
        }
        $ErrorObj | ConvertTo-Json -Depth 10 -Compress
        exit 1
    }
}

# Roteia a requisição da API de forma puramente programática
$OutputObj = $null
try {
    $ErrorActionPreference = 'Stop'
    switch ($Action) {
        "Diagnostics"          { $OutputObj = Get-SystemDiagnostics }
        "OptimizeDeep"         { 
            $Res = Invoke-Optimization 
            $OutputObj = $Res | Where-Object { $_.Step -eq "Summary" } | Select-Object -First 1
        }
        "OptimizeLite"         { 
            $Res = Invoke-LiteOptimization 
            $OutputObj = $Res | Where-Object { $_.Step -eq "Summary" } | Select-Object -First 1
        }
        "SetLatency" { 
            # Converte argumento string para Booleano
            $Val = [System.Convert]::ToBoolean($Args)
            $OutputObj = Set-LatencyResolution -Enable $Val 
        }
        "SetPriority"          { $OutputObj = Set-ProcessPriority -ProcessName $Args }
        "SetGameDVR"           { $OutputObj = Set-GameDVR }
        "SetMouse"             { $OutputObj = Set-MouseOptimization }
        "SetKeyboard"          { $OutputObj = Set-KeyboardOptimization }
        "SetNetwork"           { $OutputObj = Set-NetworkOptimization }
        "SetRamClean"          { $OutputObj = Start-RamAutoCleanJob }
        "SetDefenderExclusion" { $OutputObj = Add-DefenderExclusion -Path $Args }
        "ResetDirectX"         { $OutputObj = Reset-DirectXShader }
        "RepairWindowsUpdate"  { $OutputObj = Repair-WindowsUpdate }
        "OptimizeDns"          { $OutputObj = Set-DnsOptimization }
        "SystemScan"           { $OutputObj = Invoke-SystemSfcDism }
        "RemoveOrphans"        { $OutputObj = Remove-OrphanedTasks }
        "RemoveBloatware"      { $OutputObj = Remove-Bloatware }
        "DisableTelemetry"     { $OutputObj = Disable-Telemetry }
        "SetTakeOwnership"     { $OutputObj = Set-TakeOwnership }
        "BackupDrivers"        { $OutputObj = Backup-Drivers }
        
        # Novas Ações Mapeadas (Fase 9)
        "RunWinUtil" {
            $winutilPath = "$env:TEMP\winutil.ps1"
            if (-not (Test-Path $winutilPath) -or ((Get-Item $winutilPath).Length -lt 500)) {
                curl.exe -L -s -o $winutilPath "https://christitus.com/win"
            }
            Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$winutilPath`"" -Verb RunAs
            $OutputObj = [PSCustomObject]@{ Status = "Success"; Message = "WinUtil (Chris Titus) foi iniciado em uma nova janela de administrador." }
        }
        "ActivateWindows" {
            $masPath = "$env:TEMP\MAS_AIO.cmd"
            if (-not (Test-Path $masPath) -or ((Get-Item $masPath).Length -lt 500)) {
                curl.exe -L -s -o $masPath "https://raw.githubusercontent.com/massgravel/Microsoft-Activation-Scripts/master/MAS/All-In-One-Version-KL/MAS_AIO.cmd"
            }
            Start-Process cmd.exe -ArgumentList "/c `"$masPath`"" -Verb RunAs
            $OutputObj = [PSCustomObject]@{ Status = "Success"; Message = "MAS (Ativador de Windows HWID) foi iniciado em uma nova janela." }
        }
        "ActivateOffice" {
            $masPath = "$env:TEMP\MAS_AIO.cmd"
            if (-not (Test-Path $masPath) -or ((Get-Item $masPath).Length -lt 500)) {
                curl.exe -L -s -o $masPath "https://raw.githubusercontent.com/massgravel/Microsoft-Activation-Scripts/master/MAS/All-In-One-Version-KL/MAS_AIO.cmd"
            }
            Start-Process cmd.exe -ArgumentList "/c `"$masPath`"" -Verb RunAs
            $OutputObj = [PSCustomObject]@{ Status = "Success"; Message = "MAS (Ativador de Office) foi iniciado em uma nova janela." }
        }
    }
} catch {
    # Captura falha lógica e envelopa no formato JSON correspondente
    $OutputObj = [PSCustomObject]@{
        Status  = "Error"
        Message = "Excecao na execucao da acao '$Action' via Bridge: $($_.Exception.Message)"
    }
}

# Retorna estritamente a string JSON limpa e compactada
$OutputObj | ConvertTo-Json -Depth 10 -Compress
