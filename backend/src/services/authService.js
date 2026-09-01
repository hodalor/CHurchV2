const bcrypt = require("bcryptjs");
const Church = require("../models/Church");
const User = require("../models/User");
const RefreshTokenSession = require("../models/RefreshTokenSession");
const { setRequestContext } = require("../lib/requestContext");
const { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } = require("../utils/tokenUtils");
const { buildTenantAdminPermissions, ROLE_PERMISSION_MAP, ROLES } = require("../utils/permissions");

function getEffectivePermissions(user) {
  const rolePermissions = user.roles.flatMap((role) => role.permissions || []);
  const configuredPermissions = Array.isArray(user.permissions) ? user.permissions : [];
  return [
    ...new Set(user.permissionsConfigured ? configuredPermissions : rolePermissions),
  ];
}

async function syncDefaultTenantAdminPermissions(user, church) {
  if (!user || !church) {
    return user;
  }

  const isChurchAdministrator = user.roles.some((role) => role.name === ROLES.CHURCH_ADMINISTRATOR);
  const expectedUsername = String(church.createdAdmin?.username || "").trim().toLowerCase();
  const isDefaultTenantAdmin = expectedUsername && user.username === expectedUsername;

  if (!isChurchAdministrator || !isDefaultTenantAdmin) {
    return user;
  }

  const nextPermissions = buildTenantAdminPermissions(church.enabledNavigation);
  const currentPermissions = Array.isArray(user.permissions) ? user.permissions : [];
  const samePermissions =
    currentPermissions.length === nextPermissions.length &&
    nextPermissions.every((permission) => currentPermissions.includes(permission));

  if (samePermissions && user.permissionsConfigured) {
    return user;
  }

  user.permissions = nextPermissions;
  user.permissionsConfigured = true;
  await user.save();
  return user;
}

async function authenticateWithUsernameAndPin({ username, pin, ipAddress = "", userAgent = "" }) {
  setRequestContext({
    scope: "master",
    churchId: "",
    tenantDbName: "",
  });

  const user = await User.findOne({ username: String(username || "").toLowerCase() }).populate("roles");

  if (!user || user.status !== "Active") {
    throw new Error("Invalid username or PIN.");
  }

  if (!user.roles.some((role) => role.name === ROLES.SUPERADMIN)) {
    throw new Error("Church ID is required for tenant sign-in.");
  }

  const pinMatches = await bcrypt.compare(String(pin || ""), user.pinHash);
  if (!pinMatches) {
    throw new Error("Invalid username or PIN.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokensForUser(user, {
    ipAddress,
    userAgent,
    scope: "master",
  });
}

async function authenticateWithChurchIdUsernameAndPin({
  churchId,
  username,
  pin,
  ipAddress = "",
  userAgent = "",
}) {
  const normalizedChurchId = String(churchId || "").trim().toLowerCase();
  if (!normalizedChurchId) {
    throw new Error("Church ID is required.");
  }

  const church = await Church.findOne({ churchId: normalizedChurchId });
  if (!church || church.status !== "active") {
    throw new Error("Church account is unavailable.");
  }

  setRequestContext({
    scope: "tenant",
    churchId: church.churchId,
    tenantDbName: church.dbName,
  });

  const user = await User.findOne({ username: String(username || "").toLowerCase() }).populate("roles");

  if (!user || user.status !== "Active") {
    throw new Error("Invalid church ID, username, or PIN.");
  }

  const pinMatches = await bcrypt.compare(String(pin || ""), user.pinHash);
  if (!pinMatches) {
    throw new Error("Invalid church ID, username, or PIN.");
  }

  await syncDefaultTenantAdminPermissions(user, church);
  user.lastLoginAt = new Date();
  await user.save();

  return issueTokensForUser(user, {
    ipAddress,
    userAgent,
    scope: "tenant",
    church,
  });
}

async function refreshUserSession({ refreshToken, ipAddress = "", userAgent = "" }) {
  const decoded = verifyRefreshToken(refreshToken);
  setRequestContext({
    scope: decoded.scope === "tenant" ? "tenant" : "master",
    churchId: decoded.churchId || "",
    tenantDbName: decoded.tenantDbName || "",
  });
  const existingTokenHash = hashToken(refreshToken);

  const session = await RefreshTokenSession.findOne({
    tokenHash: existingTokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session || session.familyId !== decoded.familyId) {
    throw new Error("Refresh session is invalid or expired.");
  }

  let church = null;
  if (decoded.scope === "tenant") {
    church = await Church.findOne({ churchId: decoded.churchId });
    if (!church || church.status !== "active") {
      throw new Error("Church account is unavailable.");
    }

    setRequestContext({
      scope: "tenant",
      churchId: church.churchId,
      tenantDbName: church.dbName,
    });
  }

  const user = await User.findById(session.user).populate("roles");
  if (!user || user.status !== "Active") {
    throw new Error("User is no longer active.");
  }

  if (church) {
    await syncDefaultTenantAdminPermissions(user, church);
  }

  session.revokedAt = new Date();
  session.revokedByIp = ipAddress;

  const issued = await issueTokensForUser(user, {
    ipAddress,
    userAgent,
    existingSession: session,
    scope: decoded.scope === "tenant" ? "tenant" : "master",
    church,
  });
  await session.save();

  return issued;
}

async function revokeSession({ refreshToken, ipAddress = "" }) {
  if (!refreshToken) {
    return;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    setRequestContext({
      scope: decoded.scope === "tenant" ? "tenant" : "master",
      churchId: decoded.churchId || "",
      tenantDbName: decoded.tenantDbName || "",
    });
    const tokenHash = hashToken(refreshToken);
    const session = await RefreshTokenSession.findOne({ tokenHash, revokedAt: null });
    if (!session) {
      return;
    }

    session.revokedAt = new Date();
    session.revokedByIp = ipAddress;
    await session.save();
  } catch (error) {
    // Ignore logout cleanup failures for already-expired tokens.
  }
}

async function issueTokensForUser(user, { ipAddress = "", userAgent = "", existingSession = null }) {
  const uniquePermissions = getEffectivePermissions(user);
  const roleNames = user.roles.map((role) => role.name);
  const scope = arguments[1]?.scope || "master";
  const church = arguments[1]?.church || null;
  const resolvedChurchId = scope === "master" ? "master" : church?.churchId || "";
  const resolvedChurchName = scope === "master" ? "Master" : church?.name || "";
  const resolvedTenantDbName = scope === "master" ? "" : church?.dbName || "";
  const accessToken = createAccessToken({
    sub: user._id.toString(),
    username: user.username,
    roles: roleNames,
    permissions: uniquePermissions,
    scope,
    churchId: resolvedChurchId,
    tenantDbName: resolvedTenantDbName,
  });
  const refreshTokenPayload = createRefreshToken({
    sub: user._id.toString(),
    username: user.username,
    scope,
    churchId: resolvedChurchId,
    tenantDbName: resolvedTenantDbName,
  });
  const refreshTokenHash = hashToken(refreshTokenPayload.token);

  await RefreshTokenSession.create({
    user: user._id,
    tokenHash: refreshTokenHash,
    familyId: refreshTokenPayload.familyId,
    expiresAt: refreshTokenPayload.expiresAt,
    createdByIp: ipAddress,
    userAgent,
    scope,
    churchId: resolvedChurchId,
  });

  if (existingSession) {
    existingSession.replacedByTokenHash = refreshTokenHash;
  }

  return {
    accessToken,
    refreshToken: refreshTokenPayload.token,
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      memberId: user.memberId || "",
      roles: roleNames,
      permissions: uniquePermissions,
      scope,
      churchId: resolvedChurchId,
      churchName: resolvedChurchName,
      enabledNavigation: Array.isArray(church?.enabledNavigation) ? church.enabledNavigation : [],
    },
  };
}

async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

module.exports = {
  authenticateWithUsernameAndPin,
  authenticateWithChurchIdUsernameAndPin,
  getEffectivePermissions,
  hashPin,
  refreshUserSession,
  revokeSession,
};
