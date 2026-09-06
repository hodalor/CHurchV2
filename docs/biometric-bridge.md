# Biometric Bridge

This project includes a local fingerprint helper for Windows scanner stations.

## Hosted deployment model

The church backend can stay fully hosted on Render or any other server.

Fingerprint capture does **not** run on the hosted backend because the USB scanner is attached to a staff machine, not the server.

Each scanner/check-in machine only needs the local helper:

- the hosted church app stays remote
- the local helper runs on `127.0.0.1:4113`
- the browser on that same machine talks directly to the local helper for enrollment and matching

Staff machines without the scanner do not need the helper.

For the current `SLK20R` setup, direct capture is Windows-only. Mac users should use QR or manual check-in unless you adopt hardware with an official macOS SDK.

## One-time machine setup

On a new Windows scanner machine, run:

```powershell
cd "c:\Users\Lenovo\Documents\projects\reactjs\churchv2\backend"
powershell -ExecutionPolicy Bypass -File ".\scripts\setup-zkteco-biometric.ps1"
```

That script:

- downloads the official ZKFinger SDK archive if needed
- extracts it
- launches the official ZKTeco installer with UAC elevation
- creates the local `.venv-biometric`
- installs `pyzkfp`
- verifies the `SLK20R` runtime and device visibility

## Start the helper

Manual foreground start for troubleshooting:

```powershell
cd "c:\Users\Lenovo\Documents\projects\reactjs\churchv2\backend"
powershell -ExecutionPolicy Bypass -File ".\scripts\start-biometric-station.ps1" -Foreground
```

Normal station start:

```powershell
cd "c:\Users\Lenovo\Documents\projects\reactjs\churchv2\backend"
powershell -ExecutionPolicy Bypass -File ".\scripts\start-biometric-station.ps1"
```

That launcher:

- checks whether the helper is already running
- starts the helper in a minimized PowerShell window if needed
- waits for the `/health` endpoint to respond

## Install desktop and startup shortcuts

To create a normal desktop shortcut for staff:

```powershell
cd "c:\Users\Lenovo\Documents\projects\reactjs\churchv2\backend"
powershell -ExecutionPolicy Bypass -File ".\scripts\install-biometric-station.ps1"
```

To also start the helper automatically when that Windows user signs in:

```powershell
cd "c:\Users\Lenovo\Documents\projects\reactjs\churchv2\backend"
powershell -ExecutionPolicy Bypass -File ".\scripts\install-biometric-station.ps1" -InstallStartup
```

The installer creates shortcuts that point to the hidden launcher:

- `scripts\start-biometric-station.vbs`
- which in turn calls `scripts\start-biometric-station.ps1`

For testing or restricted environments, you can override the target folders:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\install-biometric-station.ps1" `
  -DesktopPath ".\tmp-shortcuts\desktop" `
  -StartupPath ".\tmp-shortcuts\startup"
```

## Health check

Open:

```text
http://127.0.0.1:4113/health
```

The response includes:

- helper readiness
- active provider details
- Windows biometric diagnostics
- detected fingerprint-related devices

## Church app flow

1. Start the local helper on the scanner machine.
2. Open the hosted church app in a browser on that same machine.
3. Open a member or visitor record.
4. In the `Fingerprint` section, test the helper and enroll the fingerprint.
5. Open an attendance event.
6. Use `Fingerprint Check-In`.

The UI now shows:

- waiting/instruction messages while scanning
- a captured fingerprint preview image
- a success message with the matched person during attendance check-in

## Notes

- the church app stores the enrolled `templateRef` and biometric metadata against the member or visitor record
- fingerprint template capture and matching are handled by the local helper because USB access is machine-local
- the current helper auto-selects the ZKTeco SDK path when the Windows runtime and local biometric Python environment are present
