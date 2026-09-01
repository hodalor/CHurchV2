const mongoose = require("mongoose");

const tenantConnectionCache = new Map();
const MASTER_DB_NAME = process.env.MASTER_DB_NAME || "churchflow_master";

function getMasterConnection() {
  return mongoose.connection;
}

function getTenantConnection(tenantDbName) {
  const normalizedDbName = String(tenantDbName || "").trim();
  if (!normalizedDbName) {
    throw new Error("Tenant database name is required.");
  }

  if (tenantConnectionCache.has(normalizedDbName)) {
    return tenantConnectionCache.get(normalizedDbName);
  }

  const connection = mongoose.connection.useDb(normalizedDbName, { useCache: true });
  tenantConnectionCache.set(normalizedDbName, connection);
  return connection;
}

function getConnectionForScope({ scope = "master", tenantDbName = "" } = {}) {
  if (scope === "tenant") {
    return getTenantConnection(tenantDbName);
  }

  return getMasterConnection();
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn("MONGODB_URI is not set. Backend will start without a database connection.");
    return null;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: MASTER_DB_NAME,
    });
    console.log(`MongoDB connected successfully. Master DB: ${MASTER_DB_NAME}`);
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDatabase;
module.exports.MASTER_DB_NAME = MASTER_DB_NAME;
module.exports.getConnectionForScope = getConnectionForScope;
module.exports.getMasterConnection = getMasterConnection;
module.exports.getTenantConnection = getTenantConnection;
