const OperatorConsoleProvider = require("./operatorConsoleProvider");
const ZkTecoSdkProvider = require("./zktecoSdkProvider");

function createProvider() {
  const providerKey = String(process.env.BIOMETRIC_BRIDGE_PROVIDER || "operator_console").trim().toLowerCase();

  if (providerKey === "zkteco_sdk") {
    return new ZkTecoSdkProvider();
  }

  return new OperatorConsoleProvider();
}

module.exports = {
  createProvider,
};
