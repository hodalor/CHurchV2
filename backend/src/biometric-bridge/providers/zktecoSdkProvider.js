const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

class ZkTecoSdkProvider {
  async health() {
    return this.runBridgeCommand(["health"]);
  }

  async enroll(payload = {}) {
    const templateRef = String(payload.templateRef || "").trim();
    return this.runBridgeCommand([
      "enroll",
      ...(templateRef ? ["--template-ref", templateRef] : []),
      "--label",
      String(payload.label || ""),
      "--subject-type",
      String(payload.subjectType || ""),
      "--subject-id",
      String(payload.subjectId || ""),
      "--timeout",
      String(Number(payload.timeout || 20)),
    ]);
  }

  async identify(payload = {}) {
    return this.runBridgeCommand(["identify", "--timeout", String(Number(payload.timeout || 20))]);
  }

  async runBridgeCommand(args = []) {
    const pythonPath = this.getPythonPath();
    const scriptPath = path.resolve(__dirname, "..", "python_bridge.py");

    if (!fs.existsSync(pythonPath)) {
      throw new Error("Biometric Python runtime is not installed on this machine.");
    }

    if (!fs.existsSync(scriptPath)) {
      throw new Error("Biometric Python bridge script is missing.");
    }

    return new Promise((resolve, reject) => {
      const child = spawn(pythonPath, [scriptPath, ...args], {
        cwd: path.resolve(__dirname, ".."),
        env: {
          ...process.env,
          PYTHONDONTWRITEBYTECODE: "1",
        },
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        const payload = safeParseJson(stdout);
        if (code === 0 && payload) {
          resolve(payload);
          return;
        }

        reject(new Error(payload?.message || stderr.trim() || "ZKTeco SDK bridge command failed."));
      });
    });
  }

  getPythonPath() {
    const explicit = String(process.env.BIOMETRIC_BRIDGE_PYTHON || "").trim();
    if (explicit) {
      return explicit;
    }

    return path.resolve(__dirname, "..", "..", "..", ".venv-biometric", "Scripts", "python.exe");
  }
}

function safeParseJson(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.lastIndexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (nestedError) {
        return null;
      }
    }

    return null;
  }
}

module.exports = ZkTecoSdkProvider;
