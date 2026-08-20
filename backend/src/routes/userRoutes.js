const express = require("express");
const User = require("../models/User");
const Role = require("../models/Role");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { hashPin } = require("../services/authService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/", authorizePermissions(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  const users = await User.find().populate("roles", "name permissions").sort({ createdAt: -1 });
  res.json(users);
});

router.get("/roles", authorizePermissions(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  const roles = await Role.find().sort({ name: 1 });
  res.json(roles);
});

router.post("/", authorizePermissions(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const roleIds = Array.isArray(req.body.roleIds) ? req.body.roleIds : [];
    const pinHash = await hashPin(req.body.pin);
    const user = await User.create({
      username: String(req.body.username || "").toLowerCase(),
      pinHash,
      displayName: req.body.displayName,
      email: req.body.email || "",
      memberId: req.body.memberId || "",
      roles: roleIds,
      permissions: Array.isArray(req.body.permissions) ? req.body.permissions : [],
      permissionsConfigured: Array.isArray(req.body.permissions),
      status: req.body.status || "Active",
    });

    await logAudit({
      action: "create",
      module: "System",
      recordType: "User",
      recordId: user._id.toString(),
      newValue: user.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });

    const populatedUser = await User.findById(user._id).populate("roles", "name permissions");
    res.status(201).json(populatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:userId", authorizePermissions(PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const previousValue = user.toObject();
    const roleIds = Array.isArray(req.body.roleIds) ? req.body.roleIds : user.roles;

    user.username = String(req.body.username || user.username || "").toLowerCase();
    user.displayName = req.body.displayName || user.displayName;
    user.email = req.body.email || "";
    user.memberId = req.body.memberId || "";
    user.roles = roleIds;
    user.status = req.body.status || user.status || "Active";
    user.permissions = Array.isArray(req.body.permissions) ? req.body.permissions : user.permissions || [];
    user.permissionsConfigured = Array.isArray(req.body.permissions) ? true : user.permissionsConfigured;

    if (String(req.body.pin || "").trim()) {
      user.pinHash = await hashPin(req.body.pin);
    }

    await user.save();

    await logAudit({
      action: "update",
      module: "System",
      recordType: "User",
      recordId: user._id.toString(),
      previousValue,
      newValue: user.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });

    const populatedUser = await User.findById(user._id).populate("roles", "name permissions");
    return res.json(populatedUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
