const { promisify } = require("util");
const { execFile } = require("child_process");

const execFileAsync = promisify(execFile);

async function getWindowsBiometricDiagnostics() {
  if (process.platform !== "win32") {
    return {
      platform: process.platform,
      biometricService: null,
      devices: [],
    };
  }

  try {
    const script = [
      "& {",
      "  $service = Get-Service -Name wbiosrvc -ErrorAction SilentlyContinue | Select-Object Name, Status, StartType",
      "  $devices = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.Class -eq 'Biometric' -or $_.FriendlyName -match 'ZK|ZKTeco|Fingerprint|Bio' } | Select-Object Status, Class, FriendlyName, InstanceId",
      "  [PSCustomObject]@{",
      "    platform = 'win32'",
      "    biometricService = $service",
      "    devices = @($devices)",
      "  } | ConvertTo-Json -Depth 5",
      "}",
    ].join("\n");

    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      }
    );

    const parsed = stdout ? JSON.parse(stdout) : {};
    return {
      platform: parsed.platform || "win32",
      biometricService: parsed.biometricService || null,
      devices: Array.isArray(parsed.devices)
        ? parsed.devices
        : parsed.devices
          ? [parsed.devices]
          : [],
    };
  } catch (error) {
    return {
      platform: "win32",
      biometricService: null,
      devices: [],
      error: error.message || "Unable to inspect Windows biometric devices.",
    };
  }
}

module.exports = {
  getWindowsBiometricDiagnostics,
};
