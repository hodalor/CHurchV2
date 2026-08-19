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
      username: req.body.username,
      pinHash,
      displayName: req.body.displayName,
      email: req.body.email || "",
      memberId: req.body.memberId || "",
      roles: roleIds,
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

module.exports = router;
