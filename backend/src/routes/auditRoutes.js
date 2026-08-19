const express = require("express");
const AuditLog = require("../models/AuditLog");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);
router.use(authorizePermissions(PERMISSIONS.VIEW_AUDIT_LOGS));

router.get("/", async (req, res) => {
  const logs = await AuditLog.find()
    .populate("changedByUserId", "displayName username")
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(logs);
});

module.exports = router;
