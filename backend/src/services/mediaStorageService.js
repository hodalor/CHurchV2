const crypto = require("crypto");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

function getStorageSettings() {
  const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "";
  const publicBaseUrl =
    process.env.GOOGLE_CLOUD_STORAGE_PUBLIC_BASE_URL ||
    (bucketName ? `https://storage.googleapis.com/${bucketName}` : "");
  const objectPrefix = String(process.env.GOOGLE_CLOUD_STORAGE_PREFIX || "churchflow").replace(/^\/+|\/+$/g, "");

  return {
    bucketName,
    publicBaseUrl,
    objectPrefix,
  };
}

function isStorageConfigured() {
  return Boolean(getStorageSettings().bucketName);
}

function createStorageClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || undefined;
  const credentialPayload = parseCredentialPayload(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY || "");

  if (credentialPayload) {
    return new Storage({
      projectId: projectId || credentialPayload.project_id,
      credentials: credentialPayload,
    });
  }

  return new Storage({ projectId });
}

async function uploadBufferToGoogleStorage({ buffer, originalName = "", mimeType = "", folder = "general" }) {
  if (!isStorageConfigured()) {
    throw new Error("Google Cloud Storage is not configured. Add GOOGLE_CLOUD_STORAGE_BUCKET first.");
  }

  if (!buffer?.length) {
    throw new Error("Upload file is empty.");
  }

  const { bucketName, publicBaseUrl, objectPrefix } = getStorageSettings();
  const safeFolder = String(folder || "general").replace(/[^a-z0-9/_-]/gi, "-").replace(/^\/+|\/+$/g, "");
  const extension = path.extname(originalName || "").toLowerCase();
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
  const objectName = [objectPrefix, safeFolder, fileName].filter(Boolean).join("/");

  const storage = createStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType || "application/octet-stream",
      cacheControl: "public, max-age=31536000",
    },
  });

  return {
    url: `${publicBaseUrl.replace(/\/+$/g, "")}/${objectName}`,
    label: originalName || fileName,
    contentType: mimeType || "application/octet-stream",
    objectName,
  };
}

function parseCredentialPayload(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    try {
      return JSON.parse(Buffer.from(rawValue, "base64").toString("utf8"));
    } catch (nestedError) {
      throw new Error("GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY must be valid JSON or base64-encoded JSON.");
    }
  }
}

module.exports = {
  getStorageSettings,
  isStorageConfigured,
  uploadBufferToGoogleStorage,
};
