const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshTokenSession = require("../models/RefreshTokenSession");
const { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } = require("../utils/tokenUtils");

function getEffectivePermissions(user) {
  const rolePermissions = user.roles.flatMap((role) => role.permissions || []);
  const configuredPermissions = Array.isArray(user.permissions) ? user.permissions : [];
  return [
    ...new Set(user.permissionsConfigured ? configuredPermissions : rolePermissions),
  ];
}

async function authenticateWithUsernameAndPin({ username, pin, ipAddress = "", userAgent = "" }) {
  const user = await User.findOne({ username: String(username || "").toLowerCase() }).populate("roles");

  if (!user || user.status !== "Active") {
    throw new Error("Invalid username or PIN.");
  }

  const pinMatches = await bcrypt.compare(String(pin || ""), user.pinHash);
  if (!pinMatches) {
    throw new Error("Invalid username or PIN.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokensForUser(user, { ipAddress, userAgent });
}

async function refreshUserSession({ refreshToken, ipAddress = "", userAgent = "" }) {
  const decoded = verifyRefreshToken(refreshToken);
  const existingTokenHash = hashToken(refreshToken);

  const session = await RefreshTokenSession.findOne({
    tokenHash: existingTokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session || session.familyId !== decoded.familyId) {
    throw new Error("Refresh session is invalid or expired.");
  }

  const user = await User.findById(session.user).populate("roles");
  if (!user || user.status !== "Active") {
    throw new Error("User is no longer active.");
  }

  session.revokedAt = new Date();
  session.revokedByIp = ipAddress;

  const issued = await issueTokensForUser(user, { ipAddress, userAgent, existingSession: session });
  await session.save();

  return issued;
}

async function revokeSession({ refreshToken, ipAddress = "" }) {
  if (!refreshToken) {
    return;
  }

  try {
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
  const accessToken = createAccessToken({
    sub: user._id.toString(),
    username: user.username,
    roles: roleNames,
    permissions: uniquePermissions,
  });
  const refreshTokenPayload = createRefreshToken({
    sub: user._id.toString(),
    username: user.username,
  });
  const refreshTokenHash = hashToken(refreshTokenPayload.token);

  await RefreshTokenSession.create({
    user: user._id,
    tokenHash: refreshTokenHash,
    familyId: refreshTokenPayload.familyId,
    expiresAt: refreshTokenPayload.expiresAt,
    createdByIp: ipAddress,
    userAgent,
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
    },
  };
}

async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

module.exports = {
  authenticateWithUsernameAndPin,
  getEffectivePermissions,
  hashPin,
  refreshUserSession,
  revokeSession,
};
