param(
  [switch]$InstallStartup,
  [string]$DesktopPath = [Environment]::GetFolderPath("Desktop"),
  [string]$StartupPath = [Environment]::GetFolderPath("Startup")
)

$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
$launcherPath = Join-Path $PSScriptRoot "start-biometric-station.vbs"
$desktopDir = $DesktopPath
$startupDir = $StartupPath
$desktopShortcut = Join-Path $desktopDir "ChurchV2 Fingerprint Bridge.lnk"
$startupShortcut = Join-Path $startupDir "ChurchV2 Fingerprint Bridge.lnk"
$shell = New-Object -ComObject WScript.Shell

function New-Shortcut {
  param(
    [string]$ShortcutPath
  )

  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = "wscript.exe"
  $shortcut.Arguments = "`"$launcherPath`""
  $shortcut.WorkingDirectory = $backendRoot
  $shortcut.WindowStyle = 7
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
  $shortcut.Description = "Start the ChurchV2 local fingerprint bridge."
  $shortcut.Save()
}

if (-not (Test-Path $launcherPath)) {
  throw "Missing launcher file: $launcherPath"
}

if (-not (Test-Path $desktopDir)) {
  New-Item -ItemType Directory -Path $desktopDir -Force | Out-Null
}

New-Shortcut -ShortcutPath $desktopShortcut
Write-Host "Desktop shortcut created:"
Write-Host $desktopShortcut

if ($InstallStartup) {
  if (-not (Test-Path $startupDir)) {
    New-Item -ItemType Directory -Path $startupDir -Force | Out-Null
  }
  New-Shortcut -ShortcutPath $startupShortcut
  Write-Host "Startup shortcut created:"
  Write-Host $startupShortcut
}

Write-Host ""
Write-Host "Double-click the desktop shortcut to start the local fingerprint helper."
if ($InstallStartup) {
  Write-Host "It will also start automatically when this Windows user signs in."
}
