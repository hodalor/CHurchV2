const express = require("express");
const fs = require("fs");
const path = require("path");
const ChurchProfile = require("../models/ChurchProfile");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { listDepositAccounts, saveDepositAccount } = require("../services/churchProfileService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
const DEFAULT_CURRENCIES = [{ code: "GHS", name: "Ghana Cedi", symbol: "GH¢" }];
const WINDOWS_BIOMETRIC_HELPER_FILE_MAP = {
  "scripts/setup-zkteco-biometric.ps1": path.resolve(__dirname, "..", "..", "scripts", "setup-zkteco-biometric.ps1"),
  "scripts/start-biometric-station.ps1": path.resolve(__dirname, "..", "..", "scripts", "start-biometric-station.ps1"),
  "scripts/start-biometric-station.vbs": path.resolve(__dirname, "..", "..", "scripts", "start-biometric-station.vbs"),
  "scripts/install-biometric-station.ps1": path.resolve(__dirname, "..", "..", "scripts", "install-biometric-station.ps1"),
  "src/biometric-bridge/server.js": path.resolve(__dirname, "..", "biometric-bridge", "server.js"),
  "src/biometric-bridge/windowsDiagnostics.js": path.resolve(__dirname, "..", "biometric-bridge", "windowsDiagnostics.js"),
  "src/biometric-bridge/python_bridge.py": path.resolve(__dirname, "..", "biometric-bridge", "python_bridge.py"),
  "src/biometric-bridge/providers/index.js": path.resolve(__dirname, "..", "biometric-bridge", "providers", "index.js"),
  "src/biometric-bridge/providers/operatorConsoleProvider.js": path.resolve(
    __dirname,
    "..",
    "biometric-bridge",
    "providers",
    "operatorConsoleProvider.js"
  ),
  "src/biometric-bridge/providers/zktecoSdkProvider.js": path.resolve(
    __dirname,
    "..",
    "biometric-bridge",
    "providers",
    "zktecoSdkProvider.js"
  ),
};
const WINDOWS_BIOMETRIC_HELPER_FILES = [
  "package.json",
  ...Object.keys(WINDOWS_BIOMETRIC_HELPER_FILE_MAP),
];

function normalizeCurrencies(currencies = []) {
  const normalized = Array.isArray(currencies)
    ? currencies
        .map((item) => ({
          code: String(item?.code || "").trim().toUpperCase(),
          name: String(item?.name || "").trim(),
          symbol: String(item?.symbol || "").trim(),
        }))
        .filter((item) => item.code && item.name)
    : [];

  const uniqueByCode = normalized.filter(
    (item, index, collection) => collection.findIndex((entry) => entry.code === item.code) === index
  );

  return uniqueByCode.length ? uniqueByCode : DEFAULT_CURRENCIES;
}

function getRequestOrigin(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.get("host") || "")
    .split(",")[0]
    .trim();

  return `${forwardedProtocol || "https"}://${forwardedHost}`;
}

function normalizeHelperAssetPath(value = "") {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

function getWindowsHelperPackageJson() {
  return JSON.stringify(
    {
      name: "churchv2-biometric-bridge",
      version: "1.0.0",
      private: true,
      description: "Portable ChurchV2 biometric bridge helper",
      main: "src/biometric-bridge/server.js",
      scripts: {
        "biometric:bridge": "node src/biometric-bridge/server.js",
      },
      dependencies: {
        cors: "^2.8.6",
        express: "^5.2.1",
      },
    },
    null,
    2
  );
}

function getWindowsHelperAsset(normalizedPath = "") {
  if (normalizedPath === "package.json") {
    return {
      content: `${getWindowsHelperPackageJson()}\n`,
      contentType: "application/json; charset=utf-8",
    };
  }

  const filePath = WINDOWS_BIOMETRIC_HELPER_FILE_MAP[normalizedPath];
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType =
    extension === ".json"
      ? "application/json; charset=utf-8"
      : extension === ".py"
        ? "text/x-python; charset=utf-8"
        : "text/plain; charset=utf-8";

  return {
    content: fs.readFileSync(filePath, "utf8"),
    contentType,
  };
}

function buildWindowsBootstrapScript(req) {
  const baseUrl = `${getRequestOrigin(req)}/api/setup/biometric-helper/windows`;
  const downloadList = WINDOWS_BIOMETRIC_HELPER_FILES.map((item) => `'${item}'`).join(",\n  ");

  return [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    `$baseUrl = '${baseUrl}'`,
    "$installDir = Join-Path $env:LOCALAPPDATA 'ChurchV2BiometricBridge'",
    "$files = @(",
    `  ${downloadList}`,
    ")",
    "",
    "function Save-HelperFile {",
    "  param(",
    "    [string]$RelativePath",
    "  )",
    "",
    "  $targetPath = Join-Path $installDir ($RelativePath -replace '/', '\\')",
    "  $targetDirectory = Split-Path -Parent $targetPath",
    "  if ($targetDirectory -and -not (Test-Path $targetDirectory)) {",
    "    New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null",
    "  }",
    "",
    "  $encodedPath = [System.Uri]::EscapeDataString($RelativePath)",
    "  Invoke-WebRequest -UseBasicParsing -Uri \"$baseUrl/file?path=$encodedPath\" -OutFile $targetPath",
    "}",
    "",
    "Write-Host ''",
    "Write-Host 'ChurchV2 Fingerprint Bridge Installer'",
    "Write-Host '-----------------------------------'",
    "Write-Host \"Install folder: $installDir\"",
    "New-Item -ItemType Directory -Force -Path $installDir | Out-Null",
    "",
    "foreach ($file in $files) {",
    "  Write-Host \"Downloading $file\"",
    "  Save-HelperFile -RelativePath $file",
    "}",
    "",
    "$setupScript = Join-Path $installDir 'scripts\\setup-zkteco-biometric.ps1'",
    "$shortcutScript = Join-Path $installDir 'scripts\\install-biometric-station.ps1'",
    "$startScript = Join-Path $installDir 'scripts\\start-biometric-station.ps1'",
    "",
    "Write-Host ''",
    "Write-Host 'Running helper setup...'",
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setupScript",
    "if ($LASTEXITCODE -ne 0) {",
    "  throw 'ChurchV2 fingerprint helper setup failed.'",
    "}",
    "",
    "Write-Host ''",
    "Write-Host 'Creating desktop and startup shortcuts...'",
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $shortcutScript -InstallStartup",
    "if ($LASTEXITCODE -ne 0) {",
    "  throw 'ChurchV2 fingerprint helper shortcut setup failed.'",
    "}",
    "",
    "Write-Host ''",
    "Write-Host 'Starting fingerprint helper...'",
    "& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript -OpenHealth",
    "if ($LASTEXITCODE -ne 0) {",
    "  throw 'ChurchV2 fingerprint helper did not start correctly.'",
    "}",
    "",
    "Write-Host ''",
    "Write-Host 'Done. You can now use fingerprint enrollment and attendance check-in from the browser on this machine.'",
    "Write-Host 'A desktop shortcut named ChurchV2 Fingerprint Bridge was created for this Windows user.'",
    "Write-Host ''",
    "Read-Host 'Press Enter to close this installer'",
  ].join("\r\n");
}

function buildWindowsInstallerCommand(req) {
  const bootstrapUrl = `${getRequestOrigin(req)}/api/setup/biometric-helper/windows/bootstrap.ps1`;
  return [
    "@echo off",
    "setlocal",
    "title ChurchV2 Fingerprint Bridge Installer",
    "echo.",
    "echo Starting ChurchV2 fingerprint installer...",
    `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; $script = Invoke-WebRequest -UseBasicParsing -Uri '${bootstrapUrl}'; Invoke-Expression $script.Content"`,
    "if errorlevel 1 (",
    "  echo.",
    "  echo ChurchV2 fingerprint installer did not finish successfully.",
    "  pause",
    "  exit /b 1",
    ")",
    "exit /b 0",
  ].join("\r\n");
}

router.get("/branding", async (req, res) => {
  try {
    const profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/app-config", authenticate, async (req, res) => {
  try {
    const profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
    res.json({
      appName: profile?.appName || "ChurchSuite Pro",
      appLogoUrl: profile?.appLogoUrl || "",
      currencies: normalizeCurrencies(profile?.currencies),
      defaultCurrencyCode:
        profile?.defaultCurrencyCode ||
        normalizeCurrencies(profile?.currencies)[0]?.code ||
        DEFAULT_CURRENCIES[0].code,
      depositAccounts: Array.isArray(profile?.depositAccounts) ? profile.depositAccounts : [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/biometric-helper/guide", async (req, res) => {
  try {
    const guidePath = path.resolve(__dirname, "..", "..", "..", "docs", "biometric-bridge.md");
    if (!fs.existsSync(guidePath)) {
      return res.status(404).json({ message: "Biometric helper guide was not found." });
    }

    return res.type("text/plain").send(fs.readFileSync(guidePath, "utf8"));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/biometric-helper/windows/download", async (req, res) => {
  res.setHeader("Content-Disposition", 'attachment; filename="ChurchV2-Biometric-Setup.cmd"');
  res.type("application/octet-stream");
  res.send(buildWindowsInstallerCommand(req));
});

router.get("/biometric-helper/windows/bootstrap.ps1", async (req, res) => {
  res.type("text/plain");
  res.send(buildWindowsBootstrapScript(req));
});

router.get("/biometric-helper/windows/file", async (req, res) => {
  const normalizedPath = normalizeHelperAssetPath(req.query.path);
  const asset = getWindowsHelperAsset(normalizedPath);

  if (!asset) {
    return res.status(404).json({ message: "Biometric helper file was not found." });
  }

  res.type(asset.contentType);
  return res.send(asset.content);
});

router.put("/branding", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SYSTEM), async (req, res) => {
  try {
    const existingProfile = await ChurchProfile.findOne();
    const brandingPayload = {
      churchName: req.body.churchName,
      address: req.body.address || "",
      phone: req.body.phone || "",
      email: req.body.email || "",
      website: req.body.website || "",
    };

    if (!existingProfile) {
      const createdProfile = await ChurchProfile.create(brandingPayload);
      return res.status(201).json(createdProfile);
    }

    Object.assign(existingProfile, brandingPayload);
    await existingProfile.save();
    return res.json(existingProfile);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/app-config", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const existingProfile = await ChurchProfile.findOne();
    const currencies = normalizeCurrencies(req.body.currencies);
    const requestedDefault = String(req.body.defaultCurrencyCode || "").trim().toUpperCase();
    const appConfigPayload = {
      appName: req.body.appName || "ChurchSuite Pro",
      appLogoUrl: req.body.appLogoUrl || "",
      currencies,
      defaultCurrencyCode:
        currencies.find((item) => item.code === requestedDefault)?.code || currencies[0]?.code || DEFAULT_CURRENCIES[0].code,
      depositAccounts: Array.isArray(req.body.depositAccounts) ? req.body.depositAccounts : existingProfile?.depositAccounts || [],
    };

    if (!existingProfile) {
      const createdProfile = await ChurchProfile.create({
        churchName: "ChurchFlow Central",
        ...appConfigPayload,
      });
      return res.status(201).json(createdProfile);
    }

    Object.assign(existingProfile, appConfigPayload);
    await existingProfile.save();
    return res.json(existingProfile);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/deposit-accounts", authenticate, authorizePermissions(PERMISSIONS.VIEW_SETUP), async (req, res) => {
  try {
    res.json(await listDepositAccounts());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/deposit-accounts", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const accounts = await saveDepositAccount({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json(accounts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/deposit-accounts/:accountId", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const accounts = await saveDepositAccount({
      accountId: req.params.accountId,
      payload: req.body,
      user: req.user,
      ipAddress: req.ip,
    });
    res.json(accounts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
