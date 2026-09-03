const express = require("express");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");
const { createRateLimiter } = require("../middleware/security");
const {
  authenticateWithChurchIdUsernameAndPin,
  authenticateWithUsernameAndPin,
  getEffectivePermissions,
  refreshUserSession,
  revokeSession,
} = require("../services/authService");

const router = express.Router();
const loginRateLimiter = createRateLimiter({
  keyPrefix: "auth-login",
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});
const refreshRateLimiter = createRateLimiter({
  keyPrefix: "auth-refresh",
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  message: "Too many session refresh attempts. Please sign in again.",
});

router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const loginPayload = {
      username: req.body.username,
      pin: req.body.pin,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    };
    const normalizedChurchId = String(req.body.churchId || "").trim().toLowerCase();
    const result = normalizedChurchId && normalizedChurchId !== "master"
      ? await authenticateWithChurchIdUsernameAndPin({
          churchId: normalizedChurchId,
          ...loginPayload,
        })
      : await authenticateWithUsernameAndPin(loginPayload);

    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

router.post("/refresh", refreshRateLimiter, async (req, res) => {
  try {
    const result = await refreshUserSession({
      refreshToken: req.body.refreshToken,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

router.post("/logout", async (req, res) => {
  await revokeSession({
    refreshToken: req.body.refreshToken,
    ipAddress: req.ip,
  });

  res.status(204).send();
});

router.get("/me", authenticate, async (req, res) => {
  const user = await User.findById(req.user._id).populate("roles");
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    memberId: user.memberId || "",
    roles: user.roles.map((role) => role.name),
    permissions: getEffectivePermissions(user),
    scope: req.user.scope || "master",
    churchId: req.user.churchId || "",
    churchName: req.user.churchName || "",
    enabledNavigation: Array.isArray(req.user.enabledNavigation) ? req.user.enabledNavigation : [],
  });
});

module.exports = router;
