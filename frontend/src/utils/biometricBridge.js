const BIOMETRIC_BRIDGE_STORAGE_KEY = "churchv2_biometric_bridge_url";
const DEFAULT_BIOMETRIC_BRIDGE_URL = "http://127.0.0.1:4113";

function normalizeUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

function resolveAppApiBaseUrl() {
  const configuredUrl = normalizeUrl(process.env.REACT_APP_API_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname);

    if (isLocalHost) {
      return "http://127.0.0.1:5100/api";
    }

    return `${origin}/api`;
  }

  return "http://127.0.0.1:5100/api";
}

export function getBiometricBridgeUrl() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return DEFAULT_BIOMETRIC_BRIDGE_URL;
  }

  return window.localStorage.getItem(BIOMETRIC_BRIDGE_STORAGE_KEY) || DEFAULT_BIOMETRIC_BRIDGE_URL;
}

export function setBiometricBridgeUrl(value) {
  const normalized = String(value || "").trim() || DEFAULT_BIOMETRIC_BRIDGE_URL;
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    window.localStorage.setItem(BIOMETRIC_BRIDGE_STORAGE_KEY, normalized);
  }
  return normalized;
}

export function getBiometricHelperGuideUrl() {
  return `${resolveAppApiBaseUrl()}/setup/biometric-helper/guide`;
}

export function getBiometricHelperInstallerUrl() {
  return `${resolveAppApiBaseUrl()}/setup/biometric-helper/windows/download`;
}

export async function testBiometricBridge() {
  return callBiometricBridge("/health", { method: "GET" });
}

export async function enrollFingerprint(payload = {}) {
  return callBiometricBridge("/fingerprints/enroll", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function identifyFingerprint(payload = {}) {
  return callBiometricBridge("/fingerprints/identify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function callBiometricBridge(path, options = {}) {
  const baseUrl = getBiometricBridgeUrl();
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error("Fingerprint bridge is not reachable. Start the local scanner bridge and try again.");
  }

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload.message || "Fingerprint bridge request failed.");
  }

  return payload;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}
