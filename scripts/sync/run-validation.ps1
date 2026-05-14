# PM Scheduler - Nightly Synergy Order Validation Runner
# Run this script via Windows Task Scheduler at 5:30 AM daily (after the 5 AM sync)

$ErrorActionPreference = "Stop"
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

# ----------------------------------------------------------------
# Create logs directory if it doesn't exist
# ----------------------------------------------------------------
$logsDir = Join-Path $projectRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# ----------------------------------------------------------------
# Environment variables - read from repo .env.local so key rotations
# only need to touch one file. Supabase disabled legacy JWT keys on
# 2026-05-13; .env.local holds the new sb_secret_ key.
# ----------------------------------------------------------------
$envFile = Join-Path $projectRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing .env.local at $envFile - cannot load Supabase credentials."
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$') {
        Set-Item -Path "env:$($Matches[1])" -Value $Matches[2]
    }
}
# Python script reads SUPABASE_URL, but .env.local exposes it as NEXT_PUBLIC_SUPABASE_URL
if (-not $env:SUPABASE_URL -and $env:NEXT_PUBLIC_SUPABASE_URL) {
    $env:SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
}
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY not found in .env.local."
    exit 1
}

# ----------------------------------------------------------------
# Run the validation script
# ----------------------------------------------------------------
$pythonExe  = "C:\Users\Caleb Lindsey\AppData\Local\Python\pythoncore-3.14-64\python.exe"
$valScript  = Join-Path $scriptDir "validate-synergy-orders.py"
$logFile    = Join-Path $logsDir "validation-$(Get-Date -Format 'yyyy-MM-dd').log"

Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Starting Synergy order validation..." | Tee-Object -FilePath $logFile -Append

& $pythonExe $valScript 2>&1 | Tee-Object -FilePath $logFile -Append

$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Validation finished with exit code $exitCode (check log for details)." | Tee-Object -FilePath $logFile -Append
    exit $exitCode
} else {
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') Validation completed successfully." | Tee-Object -FilePath $logFile -Append
    exit 0
}
