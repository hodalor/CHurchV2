param(
  [switch]$SkipDownload,
  [switch]$SkipInstaller,
  [switch]$SkipPython
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendRoot = Join-Path $projectRoot "backend"
$vendorRoot = Join-Path $backendRoot "vendor\zkteco"
$sdkArchive = Join-Path $vendorRoot "ZKFingerSDK-Windows.rar"
$sdkUrl = "https://new-website-file.s3.ap-southeast-1.amazonaws.com/files/20220725/9774a946c3f659ddf2ae90bc8dadc3eb.rar"
$sdkExtractedRoot = Join-Path $vendorRoot "ZKFingerSDK_Windows_Standard"
$venvPath = Join-Path $backendRoot ".venv-biometric"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $vendorRoot | Out-Null

if (-not $SkipDownload) {
  if (-not (Test-Path $sdkArchive)) {
    Write-Host "Downloading ZKFinger SDK..."
    Invoke-WebRequest -Uri $sdkUrl -OutFile $sdkArchive
  } else {
    Write-Host "SDK archive already exists."
  }

  if (-not (Test-Path $sdkExtractedRoot)) {
    Write-Host "Extracting SDK archive..."
    tar -xf $sdkArchive -C $vendorRoot
  } else {
    Write-Host "SDK archive already extracted."
  }
}

$setupExe = Get-ChildItem -Path $sdkExtractedRoot -Recurse -Filter "setup.exe" |
  Sort-Object FullName |
  Select-Object -First 1

if (-not $setupExe) {
  throw "Unable to locate ZKTeco setup.exe in $sdkExtractedRoot"
}

if (-not $SkipInstaller) {
  Write-Host "Launching official ZKTeco installer with admin prompt..."
  Start-Process -FilePath $setupExe.FullName -Verb RunAs
  Write-Host "Approve the Windows UAC prompt and complete the installer."
}

if (-not $SkipPython) {
  if (-not (Test-Path $pythonPath)) {
    Write-Host "Creating local biometric virtual environment..."
    py -m venv $venvPath
  } else {
    Write-Host "Biometric virtual environment already exists."
  }

  Write-Host "Installing pyzkfp into the local virtual environment..."
  & $pythonPath -m pip install pyzkfp
}

Write-Host ""
Write-Host "Checks"
Write-Host "------"
Get-PnpDevice -FriendlyName "SLK20R" -ErrorAction SilentlyContinue |
  Select-Object Status, FriendlyName, InstanceId, Problem, Present |
  Format-List

Get-ChildItem "C:\Windows\System32", "C:\Windows\SysWOW64" -Filter "libzkfp.dll" -ErrorAction SilentlyContinue |
  Select-Object FullName

Write-Host ""
Write-Host "Next:"
Write-Host "1. Finish the SDK installer if it is still open."
Write-Host "2. Restart the fingerprint bridge or run: npm run biometric:bridge"
Write-Host "3. Test http://127.0.0.1:4113/health"
