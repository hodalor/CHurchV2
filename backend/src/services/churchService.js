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
const { buildTenantAdminPermissions, ROLE_PERMISSION_MAP, ROLES } = require("../utils/permissions");

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

function normalizeCurrencyCode(value = "", currencies = []) {
  const requested = String(value || "").trim().toUpperCase();
  return currencies.find((item) => item.code === requested)?.code || currencies[0]?.code || "GHS";
}

function normalizeCurrencies(currencies = []) {
  const normalized = Array.isArray(currencies)
    ? currencies
        .map((item) => ({
          code: String(item?.code || "").trim().toUpperCase(),
          name: String(item?.name || "").trim(),
          symbol: String(item?.symbol || "").trim(),
        }))
        .filter((item) => item.code && item.name)
    : [];

  return normalized.length
    ? normalized
    : [{ code: "GHS", name: "Ghana Cedi", symbol: "GH¢" }];
}

async function seedTenantBaseData({ churchName, adminPayload, appConfig = {}, enabledNavigation = [] }) {
  await Promise.all([
    seedRoles(),
    seedLookupData(),
    seedDiscipleshipProgrammes(),
    seedMinistries(),
  ]);

  const adminRole = await Role.findOne({ name: ROLES.CHURCH_ADMINISTRATOR });
  if (!adminRole) {
    throw new Error("Default tenant administrator role could not be prepared.");
  }

  const existingProfile = await ChurchProfile.findOne();
  const currencies = normalizeCurrencies(appConfig.currencies);
  const defaultCurrencyCode = normalizeCurrencyCode(appConfig.defaultCurrencyCode, currencies);
  if (!existingProfile) {
    await ChurchProfile.create({
      churchName,
      appName: appConfig.appName || "ChurchSuite Pro",
      appLogoUrl: appConfig.appLogoUrl || "",
      currencies,
      defaultCurrencyCode,
    });
  } else {
    existingProfile.churchName = churchName;
    existingProfile.appName = appConfig.appName || existingProfile.appName || "ChurchSuite Pro";
    existingProfile.appLogoUrl = appConfig.appLogoUrl || existingProfile.appLogoUrl || "";
    existingProfile.currencies = currencies;
    existingProfile.defaultCurrencyCode = defaultCurrencyCode;
    await existingProfile.save();
  }

  const existingAdmin = await User.findOne({ username: adminPayload.username });
  const tenantAdminPermissions = buildTenantAdminPermissions(enabledNavigation);
  if (!existingAdmin) {
    const pinHash = await hashPin(adminPayload.pin);
    await User.create({
      username: adminPayload.username,
      pinHash,
      displayName: adminPayload.displayName,
      email: adminPayload.email || "",
      roles: [adminRole._id],
      permissions: tenantAdminPermissions,
      permissionsConfigured: true,
      status: "Active",
    });
  } else {
    existingAdmin.displayName = adminPayload.displayName || existingAdmin.displayName;
    existingAdmin.email = adminPayload.email || existingAdmin.email || "";
    existingAdmin.permissions = tenantAdminPermissions;
    existingAdmin.permissionsConfigured = true;
    await existingAdmin.save();
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

async function getMasterAppConfig() {
  const profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
  const currencies = normalizeCurrencies(profile?.currencies);

  return {
    appName: profile?.appName || "ChurchSuite Pro",
    appLogoUrl: profile?.appLogoUrl || "",
    currencies,
    defaultCurrencyCode: normalizeCurrencyCode(profile?.defaultCurrencyCode, currencies),
  };
}

async function createChurch({ payload = {}, user = null, ipAddress = "" }) {
  const name = String(payload.name || "").trim();
  const churchId = normalizeChurchId(payload.churchId || name);
  const slug = slugify(name || churchId);
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
  const masterAppConfig = await getMasterAppConfig();
  const currencyCode = normalizeCurrencyCode(payload.currencyCode, masterAppConfig.currencies);

  const church = await Church.create({
    churchId,
    name,
    slug,
    dbName,
    status: payload.status === "suspended" ? "suspended" : "active",
    currencyCode,
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
      appConfig: {
        ...masterAppConfig,
        defaultCurrencyCode: currencyCode,
      },
      enabledNavigation,
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

async function updateChurch({ churchId = "", payload = {}, user = null, ipAddress = "" }) {
  const existingChurch = await Church.findOne({ churchId: normalizeChurchId(churchId) });
  if (!existingChurch) {
    throw new Error("Church not found.");
  }

  const previousValue = existingChurch.toObject();
  const masterAppConfig = await getMasterAppConfig();
  const normalizedName = String(payload.name || existingChurch.name || "").trim();
  const normalizedEnabledNavigation = normalizeEnabledNavigation(
    Array.isArray(payload.enabledNavigation) ? payload.enabledNavigation : existingChurch.enabledNavigation
  );
  const normalizedCurrencyCode = normalizeCurrencyCode(
    payload.currencyCode || existingChurch.currencyCode,
    masterAppConfig.currencies
  );

  existingChurch.name = normalizedName || existingChurch.name;
  existingChurch.slug = slugify(existingChurch.name || existingChurch.churchId);
  existingChurch.status = payload.status === "suspended" ? "suspended" : "active";
  existingChurch.currencyCode = normalizedCurrencyCode;
  existingChurch.enabledNavigation = normalizedEnabledNavigation;
  existingChurch.createdAdmin = {
    displayName: String(payload.adminDisplayName || existingChurch.createdAdmin?.displayName || "").trim(),
    username: String(payload.adminUsername || existingChurch.createdAdmin?.username || "").trim().toLowerCase(),
    email: String(payload.adminEmail || existingChurch.createdAdmin?.email || "").trim().toLowerCase(),
  };
  await existingChurch.save();

  await withTenantContext(existingChurch.dbName, async () => {
    const tenantProfile = await ChurchProfile.findOne().sort({ createdAt: -1 });
    if (tenantProfile) {
      tenantProfile.churchName = existingChurch.name;
      tenantProfile.appName = masterAppConfig.appName;
      tenantProfile.appLogoUrl = masterAppConfig.appLogoUrl;
      tenantProfile.currencies = masterAppConfig.currencies;
      tenantProfile.defaultCurrencyCode = normalizedCurrencyCode;
      await tenantProfile.save();
    }

    if (payload.adminDisplayName || payload.adminEmail || payload.adminUsername) {
      const previousAdminUsername = String(previousValue?.createdAdmin?.username || "").trim().toLowerCase();
      const tenantAdmin = await User.findOne({
        username: previousAdminUsername || existingChurch.createdAdmin.username,
      });
      if (tenantAdmin) {
        tenantAdmin.username = existingChurch.createdAdmin.username || tenantAdmin.username;
        tenantAdmin.displayName = existingChurch.createdAdmin.displayName || tenantAdmin.displayName;
        tenantAdmin.email = existingChurch.createdAdmin.email || tenantAdmin.email || "";
        tenantAdmin.permissions = buildTenantAdminPermissions(existingChurch.enabledNavigation);
        tenantAdmin.permissionsConfigured = true;
        await tenantAdmin.save();
      }
    } else {
      const tenantAdmin = await User.findOne({ username: existingChurch.createdAdmin.username });
      if (tenantAdmin) {
        tenantAdmin.permissions = buildTenantAdminPermissions(existingChurch.enabledNavigation);
        tenantAdmin.permissionsConfigured = true;
        await tenantAdmin.save();
      }
    }
  });

  await logAudit({
    action: "update",
    module: "Church Management",
    recordType: "Church",
    recordId: existingChurch._id.toString(),
    previousValue,
    newValue: existingChurch.toObject(),
    user,
    ipAddress,
  });

  return existingChurch;
}

module.exports = {
  createChurch,
  listChurches,
  normalizeEnabledNavigation,
  normalizeCurrencies,
  updateChurch,
};
