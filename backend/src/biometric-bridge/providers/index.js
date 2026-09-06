const OperatorConsoleProvider = require("./operatorConsoleProvider");
const ZkTecoSdkProvider = require("./zktecoSdkProvider");
const fs = require("fs");
const path = require("path");

function createProvider() {
  const providerKey = String(process.env.BIOMETRIC_BRIDGE_PROVIDER || "").trim().toLowerCase();

  if (providerKey === "zkteco_sdk") {
    return new ZkTecoSdkProvider();
  }

  if (!providerKey && canUseZkTecoSdk()) {
    return new ZkTecoSdkProvider();
  }

  return new OperatorConsoleProvider();
}

function canUseZkTecoSdk() {
  const pythonPath = path.resolve(__dirname, "..", "..", "..", ".venv-biometric", "Scripts", "python.exe");
  const libzkfpX64 = path.join(process.env.windir || "C:\\Windows", "System32", "libzkfp.dll");
  return fs.existsSync(pythonPath) && fs.existsSync(libzkfpX64);
}

module.exports = {
  createProvider,
};
