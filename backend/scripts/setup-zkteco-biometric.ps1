param(
  [switch]$SkipDownload,
  [switch]$SkipInstaller,
  [switch]$SkipPython
)

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$vendorRoot = Join-Path $backendRoot "vendor\zkteco"
$sdkArchive = Join-Path $vendorRoot "ZKFingerSDK-Windows.rar"
$sdkUrl = "https://new-website-file.s3.ap-southeast-1.amazonaws.com/files/20220725/9774a946c3f659ddf2ae90bc8dadc3eb.rar"
$sdkExtractedRoot = Join-Path $vendorRoot "ZKFingerSDK_Windows_Standard"
$venvPath = Join-Path $backendRoot ".venv-biometric"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"

function Find-CommandPath {
  param(
    [string]$Name
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

function Install-WithWinget {
  param(
    [string]$PackageId,
    [string]$DisplayName
  )

  $wingetPath = Find-CommandPath "winget.exe"
  if (-not $wingetPath) {
    throw "$DisplayName is required. Install it on this machine, then run the installer again."
  }

  Write-Host "Installing $DisplayName with winget..."
  & $wingetPath install --id $PackageId -e --accept-package-agreements --accept-source-agreements
}

function Resolve-NodePath {
  $existing = Find-CommandPath "node.exe"
  if ($existing) {
    return $existing
  }

  $defaultPath = Join-Path ${env:ProgramFiles} "nodejs\node.exe"
  if (Test-Path $defaultPath) {
    return $defaultPath
  }

  Install-WithWinget -PackageId "OpenJS.NodeJS.LTS" -DisplayName "Node.js LTS"

  $refreshed = Find-CommandPath "node.exe"
  if ($refreshed) {
    return $refreshed
  }

  if (Test-Path $defaultPath) {
    return $defaultPath
  }

  throw "Node.js LTS is still not available after installation."
}

function Resolve-NpmPath {
  $existing = Find-CommandPath "npm.cmd"
  if ($existing) {
    return $existing
  }

  $defaultPath = Join-Path ${env:ProgramFiles} "nodejs\npm.cmd"
  if (Test-Path $defaultPath) {
    return $defaultPath
  }

  throw "npm is not available on this machine."
}

function Resolve-PythonLauncherPath {
  $existing = Find-CommandPath "py.exe"
  if ($existing) {
    return $existing
  }

  Install-WithWinget -PackageId "Python.Python.3.11" -DisplayName "Python 3.11"

  $refreshed = Find-CommandPath "py.exe"
  if ($refreshed) {
    return $refreshed
  }

  $fallbackPaths = @(
    (Join-Path ${env:LocalAppData} "Programs\Python\Launcher\py.exe"),
    (Join-Path ${env:WINDIR} "py.exe")
  )

  foreach ($pathValue in $fallbackPaths) {
    if (Test-Path $pathValue) {
      return $pathValue
    }
  }

  throw "Python launcher is still not available after installation."
}

$nodePath = Resolve-NodePath
$npmPath = Resolve-NpmPath
$pyLauncherPath = Resolve-PythonLauncherPath

New-Item -ItemType Directory -Force -Path $vendorRoot | Out-Null

Write-Host "Installing local bridge dependencies..."
Push-Location $backendRoot
try {
  & $npmPath install --no-fund --no-audit
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed for the local fingerprint helper."
  }
} finally {
  Pop-Location
}

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
    & $pyLauncherPath -m venv $venvPath
  } else {
    Write-Host "Biometric virtual environment already exists."
  }

  Write-Host "Installing biometric Python packages into the local virtual environment..."
  & $pythonPath -m pip install --upgrade pip
  & $pythonPath -m pip install pyzkfp Pillow
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
