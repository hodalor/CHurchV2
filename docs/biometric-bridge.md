# Biometric Bridge

This project now includes a local fingerprint bridge for the check-in machine.

## Start the bridge

From `backend/`:

```powershell
npm run biometric:bridge
```

Default local URL:

```text
http://127.0.0.1:4113
```

The frontend fingerprint tools already use that address by default.

## Simple machine setup

For a new Windows check-in machine, run:

```powershell
cd "c:\Users\Lenovo\Documents\projects\reactjs\churchv2\backend"
powershell -ExecutionPolicy Bypass -File ".\scripts\setup-zkteco-biometric.ps1"
```

That script:

- downloads the ZKFinger SDK archive if needed
- extracts it
- launches the official ZKTeco installer with a UAC prompt
- creates the local `.venv-biometric`
- installs `pyzkfp`
- prints the `SLK20R` device status and whether `libzkfp.dll` is installed

## Current provider modes

### `operator_console` (default)

This mode is ready now and works through the terminal window where the bridge is running.

- enrollment requests prompt the operator to type a template reference, or press Enter to generate one
- identify requests prompt the operator to type the matched template reference
- this is useful for end-to-end testing while the exact scanner DLL binding is still being finalized

### `zkteco_sdk`

This mode is scaffolded but not fully bound yet.

Environment variables:

```powershell
$env:BIOMETRIC_BRIDGE_PROVIDER="zkteco_sdk"
$env:ZKTECO_SDK_DLL_PATH="C:\ZKTeco\ZKFingerSDK\lib\zkfp.dll"
npm run biometric:bridge
```

The bridge will report whether the DLL path is present, but the final scanner-family binding still needs to be completed against the exact SDK package on the machine.

## Health check

Open:

```text
http://127.0.0.1:4113/health
```

The response includes:

- bridge provider state
- Windows Biometric Service status
- detected biometric or fingerprint-related devices

## Church app flow

1. Start the normal backend
2. Start the biometric bridge on the same Windows machine connected to the scanner
3. Open a member or visitor record
4. In the `Fingerprint` section, test the bridge and capture a fingerprint
5. Open an attendance event
6. Use `Fingerprint Check-In`

## Notes

- the church app stores the enrolled `templateRef` against the member or visitor record
- the bridge is local on the check-in PC because USB scanner access is machine-local
- the current device scan showed a Windows biometric device, but the external ZKTeco USB scanner still needs its final SDK-specific binding path confirmed
