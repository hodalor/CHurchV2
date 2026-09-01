const bcrypt = require("bcryptjs");
const Church = require("../models/Church");
const User = require("../models/User");
const RefreshTokenSession = require("../models/RefreshTokenSession");
const { setRequestContext } = require("../lib/requestContext");
const { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } = require("../utils/tokenUtils");
const { ROLES } = require("../utils/permissions");

function getEffectivePermissions(user) {
  const rolePermissions = user.roles.flatMap((role) => role.permissions || []);
  const configuredPermissions = Array.isArray(user.permissions) ? user.permissions : [];
  return [
    ...new Set(user.permissionsConfigured ? configuredPermissions : rolePermissions),
  ];
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
  const accessToken = createAccessToken({
    sub: user._id.toString(),
    username: user.username,
    roles: roleNames,
    permissions: uniquePermissions,
    scope,
    churchId: church?.churchId || "",
    tenantDbName: church?.dbName || "",
  });
  const refreshTokenPayload = createRefreshToken({
    sub: user._id.toString(),
    username: user.username,
    scope,
    churchId: church?.churchId || "",
    tenantDbName: church?.dbName || "",
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
    churchId: church?.churchId || "",
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
      churchId: church?.churchId || "",
      churchName: church?.name || "",
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
