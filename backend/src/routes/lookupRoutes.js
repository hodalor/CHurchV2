const express = require("express");
const LookupType = require("../models/LookupType");
const LookupValue = require("../models/LookupValue");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const types = await LookupType.find().sort({ module: 1, label: 1 });
  const values = await LookupValue.find().populate("type", "key label module").sort({ sortOrder: 1, label: 1 });
  res.json({ types, values });
});

router.post("/types", authorizePermissions(PERMISSIONS.MANAGE_LOOKUPS), async (req, res) => {
  try {
    const lookupType = await LookupType.create(req.body);
    await logAudit({
      action: "create",
      module: "System",
      recordType: "LookupType",
      recordId: lookupType._id.toString(),
      newValue: lookupType.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(lookupType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/values", authorizePermissions(PERMISSIONS.MANAGE_LOOKUPS), async (req, res) => {
  try {
    const lookupValue = await LookupValue.create(req.body);
    await logAudit({
      action: "create",
      module: "System",
      recordType: "LookupValue",
      recordId: lookupValue._id.toString(),
      newValue: lookupValue.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(lookupValue);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
