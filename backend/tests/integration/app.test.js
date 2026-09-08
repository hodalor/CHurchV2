const request = require("supertest");
const { createApp } = require("../../src/app");

describe("backend app integration", () => {
  const app = createApp();

  it("serves the health endpoint", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Church management backend is running.");
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("serves the metrics endpoint", async () => {
    const response = await request(app).get("/api/metrics");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        uptimeSeconds: expect.any(Number),
        memoryUsage: expect.any(Object),
        nodeVersion: expect.any(String),
      })
    );
  });

  it("downloads the biometric helper launcher script", async () => {
    const response = await request(app).get("/api/setup/biometric-helper/windows/download");
    const payloadText =
      response.text || (Buffer.isBuffer(response.body) ? response.body.toString("utf8") : "");

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain("ChurchV2-Biometric-Setup.cmd");
    expect(payloadText).toContain("ChurchV2 Fingerprint Bridge Installer");
    expect(payloadText).toContain("bootstrap.ps1");
  });

  it("serves helper package.json asset", async () => {
    const response = await request(app)
      .get("/api/setup/biometric-helper/windows/file")
      .query({ path: "package.json" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        name: "churchv2-biometric-bridge",
        scripts: {
          "biometric:bridge": "node src/biometric-bridge/server.js",
        },
      })
    );
  });
});
