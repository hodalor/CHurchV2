const express = require("express");
const User = require("../models/User");
const authenticate = require("../middleware/authenticate");
const {
  authenticateWithChurchIdUsernameAndPin,
  authenticateWithUsernameAndPin,
  getEffectivePermissions,
  refreshUserSession,
  revokeSession,
} = require("../services/authService");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const loginPayload = {
      username: req.body.username,
      pin: req.body.pin,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    };
    const result = req.body.churchId
      ? await authenticateWithChurchIdUsernameAndPin({
          churchId: req.body.churchId,
          ...loginPayload,
        })
      : await authenticateWithUsernameAndPin(loginPayload);

    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

router.post("/refresh", async (req, res) => {
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
