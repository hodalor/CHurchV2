const fs = require("fs");

class ZkTecoSdkProvider {
  async health() {
    const sdkDllPath = String(process.env.ZKTECO_SDK_DLL_PATH || "").trim();
    const sdkDllFound = sdkDllPath ? fs.existsSync(sdkDllPath) : false;

    return {
      provider: "zkteco_sdk",
      ready: false,
      sdkDllPath,
      sdkDllFound,
      message: sdkDllFound
        ? "ZKTeco SDK DLL was found, but the adapter bindings still need to be finalized for this scanner family."
        : "ZKTeco SDK DLL path is not configured yet.",
    };
  }

  async enroll() {
    throw new Error("ZKTeco SDK adapter is not finalized yet. Use operator_console bridge for now.");
  }

  async identify() {
    throw new Error("ZKTeco SDK adapter is not finalized yet. Use operator_console bridge for now.");
  }
}

module.exports = ZkTecoSdkProvider;
