param(
  [switch]$Foreground,
  [switch]$OpenHealth
)

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$bridgeUrl = "http://127.0.0.1:4113/health"

function Test-BridgeHealth {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $bridgeUrl -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

if (Test-BridgeHealth) {
  Write-Host "Fingerprint bridge is already running."
  if ($OpenHealth) {
    Start-Process $bridgeUrl
  }
  exit 0
}

if ($Foreground) {
  Set-Location $backendRoot
  & npm.cmd run biometric:bridge
  exit $LASTEXITCODE
}

$command = "Set-Location '$backendRoot'; npm.cmd run biometric:bridge"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command -WindowStyle Minimized

for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
  Start-Sleep -Milliseconds 500
  if (Test-BridgeHealth) {
    Write-Host "Fingerprint bridge started successfully."
    if ($OpenHealth) {
      Start-Process $bridgeUrl
    }
    exit 0
  }
}

throw "Fingerprint bridge did not start in time. Run npm run biometric:bridge to inspect it directly."
