const cors = require("cors");
const express = require("express");
const { createProvider } = require("./providers");
const { getWindowsBiometricDiagnostics } = require("./windowsDiagnostics");

const app = express();
const provider = createProvider();
const port = Number(process.env.BIOMETRIC_BRIDGE_PORT || 4113);
const host = process.env.BIOMETRIC_BRIDGE_HOST || "127.0.0.1";

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (req, res) => {
  const [providerStatus, diagnostics] = await Promise.all([
    provider.health(),
    getWindowsBiometricDiagnostics(),
  ]);

  res.json({
    ok: Boolean(providerStatus.ready),
    provider: providerStatus,
    diagnostics,
    message: providerStatus.message || "Fingerprint bridge is running.",
  });
});

app.post("/fingerprints/enroll", async (req, res) => {
  try {
    const result = await provider.enroll(req.body || {});
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to enroll fingerprint.",
    });
  }
});

app.post("/fingerprints/identify", async (req, res) => {
  try {
    const result = await provider.identify(req.body || {});
    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message || "Unable to identify fingerprint.",
    });
  }
});

app.listen(port, host, () => {
  console.log(`[biometric-bridge] listening on http://${host}:${port}`);
  console.log(
    `[biometric-bridge] provider=${String(process.env.BIOMETRIC_BRIDGE_PROVIDER || "operator_console")}`
  );
});
