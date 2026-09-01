const Church = require("../models/Church");
const ChurchProfile = require("../models/ChurchProfile");
const Role = require("../models/Role");
const User = require("../models/User");
const { getRequestContext, setRequestContext } = require("../lib/requestContext");
const {
  seedDiscipleshipProgrammes,
  seedLookupData,
  seedMinistries,
  seedRoles,
  seedStrategicPlanningData,
} = require("../seed/bootstrap");
const { logAudit } = require("./auditService");
const { hashPin } = require("./authService");
const { getTenantConnection } = require("../config/db");
const { ROLE_PERMISSION_MAP, ROLES } = require("../utils/permissions");

function slugify(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeChurchId(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeEnabledNavigation(value = []) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];
}

async function ensureTenantRole(roleName) {
  const existingRole = await Role.findOne({ name: roleName });
  if (existingRole) {
    return existingRole;
  }

  return Role.create({
    name: roleName,
    description: `${roleName} role`,
    permissions: ROLE_PERMISSION_MAP[roleName] || [],
    isSystem: true,
  });
}

async function seedTenantBaseData({ churchName, adminPayload }) {
  await seedRoles();
  await seedLookupData();
  await seedDiscipleshipProgrammes();
  await seedMinistries();
  await seedStrategicPlanningData();
  await ensureTenantRole(ROLES.CHURCH_ADMINISTRATOR);
  const adminRole = await Role.findOne({ name: ROLES.CHURCH_ADMINISTRATOR });
  if (!adminRole) {
    throw new Error("Default tenant administrator role could not be prepared.");
  }

  const existingProfile = await ChurchProfile.findOne();
  if (!existingProfile) {
    await ChurchProfile.create({
      churchName,
    });
  }

  const existingAdmin = await User.findOne({ username: adminPayload.username });
  if (!existingAdmin) {
    const pinHash = await hashPin(adminPayload.pin);
    await User.create({
      username: adminPayload.username,
      pinHash,
      displayName: adminPayload.displayName,
      email: adminPayload.email || "",
      roles: [adminRole._id],
      permissions: ROLE_PERMISSION_MAP[ROLES.CHURCH_ADMINISTRATOR],
      permissionsConfigured: true,
      status: "Active",
    });
  }
}

async function withTenantContext(tenantDbName, callback) {
  getTenantConnection(tenantDbName);
  const previousStore = { ...(getRequestContext() || {}) };

  setRequestContext({
    ...previousStore,
    scope: "tenant",
    tenantDbName,
  });

  try {
    return await callback();
  } finally {
    setRequestContext(previousStore);
  }
}

async function listChurches() {
  return Church.find().sort({ createdAt: -1 });
}

async function createChurch({ payload = {}, user = null, ipAddress = "" }) {
  const name = String(payload.name || "").trim();
  const churchId = normalizeChurchId(payload.churchId || name);
  const slug = slugify(payload.slug || name || churchId);
  const adminUsername = String(payload.adminUsername || "").trim().toLowerCase();
  const adminPin = String(payload.adminPin || "").trim();
  const adminDisplayName = String(payload.adminDisplayName || "").trim();

  if (!name) {
    throw new Error("Church name is required.");
  }

  if (!churchId) {
    throw new Error("Church ID is required.");
  }

  if (!adminUsername || !adminPin || !adminDisplayName) {
    throw new Error("Default church admin details are required.");
  }

  const existingChurch = await Church.findOne({
    $or: [{ churchId }, { slug }, { dbName: `churchflow_tenant_${churchId}` }],
  });
  if (existingChurch) {
    throw new Error("A church with that ID or slug already exists.");
  }

  const dbName = `churchflow_tenant_${churchId}`;
  const enabledNavigation = normalizeEnabledNavigation(payload.enabledNavigation);

  const church = await Church.create({
    churchId,
    name,
    slug,
    dbName,
    status: payload.status === "suspended" ? "suspended" : "active",
    enabledNavigation,
    createdAdmin: {
      displayName: adminDisplayName,
      username: adminUsername,
      email: String(payload.adminEmail || "").trim().toLowerCase(),
    },
  });

  await withTenantContext(dbName, async () =>
    seedTenantBaseData({
      churchName: name,
      adminPayload: {
        username: adminUsername,
        pin: adminPin,
        displayName: adminDisplayName,
        email: String(payload.adminEmail || "").trim().toLowerCase(),
      },
    })
  );

  await logAudit({
    action: "create",
    module: "Church Management",
    recordType: "Church",
    recordId: church._id.toString(),
    newValue: church.toObject(),
    user,
    ipAddress,
  });

  return church;
}

module.exports = {
  createChurch,
  listChurches,
  normalizeEnabledNavigation,
};
