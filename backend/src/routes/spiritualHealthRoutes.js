const express = require("express");
const SpiritualHealthAlert = require("../models/SpiritualHealthAlert");
const TriggerRule = require("../models/TriggerRule");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { assignAlertFollowUp, evaluateTriggerRules } = require("../services/spiritualHealthService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/trigger-rules", authorizePermissions(PERMISSIONS.VIEW_SPIRITUAL_HEALTH), async (req, res) => {
  const rules = await TriggerRule.find().sort({ active: -1, createdAt: -1 });
  res.json(rules);
});

router.post("/trigger-rules", authorizePermissions(PERMISSIONS.MANAGE_SPIRITUAL_HEALTH), async (req, res) => {
  try {
    const rule = await TriggerRule.create(req.body);
    await logAudit({
      action: "create",
      module: "Spiritual Health",
      recordType: "TriggerRule",
      recordId: String(rule._id),
      newValue: rule.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/trigger-rules/:ruleId", authorizePermissions(PERMISSIONS.MANAGE_SPIRITUAL_HEALTH), async (req, res) => {
  const rule = await TriggerRule.findById(req.params.ruleId);
  if (!rule) {
    return res.status(404).json({ message: "Trigger rule not found." });
  }

  const previousValue = rule.toObject();
  Object.assign(rule, req.body);
  await rule.save();
  await logAudit({
    action: "update",
    module: "Spiritual Health",
    recordType: "TriggerRule",
    recordId: String(rule._id),
    previousValue,
    newValue: rule.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json(rule);
});

router.delete("/trigger-rules/:ruleId", authorizePermissions(PERMISSIONS.MANAGE_SPIRITUAL_HEALTH), async (req, res) => {
  const rule = await TriggerRule.findById(req.params.ruleId);
  if (!rule) {
    return res.status(404).json({ message: "Trigger rule not found." });
  }

  const previousValue = rule.toObject();
  await TriggerRule.deleteOne({ _id: rule._id });
  await logAudit({
    action: "delete",
    module: "Spiritual Health",
    recordType: "TriggerRule",
    recordId: String(rule._id),
    previousValue,
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json({ success: true });
});

router.post("/alerts/evaluate", authorizePermissions(PERMISSIONS.MANAGE_SPIRITUAL_HEALTH), async (req, res) => {
  try {
    const alerts = await evaluateTriggerRules(req.user);
    res.json(alerts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/alerts", authorizePermissions(PERMISSIONS.VIEW_SPIRITUAL_HEALTH), async (req, res) => {
  const filters = {};
  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.resolved === "false") {
    filters.resolvedAt = null;
  }

  const alerts = await SpiritualHealthAlert.find(filters)
    .populate("memberId", "memberId firstName lastName ministry")
    .populate("prospectId", "prospectId firstName surname")
    .populate("triggerRuleId")
    .populate("assignedToUserId", "displayName username")
    .populate("assignedActionId")
    .sort({ resolvedAt: 1, status: 1, createdAt: -1 });
  res.json(alerts);
});

router.post("/alerts/:alertId/assign", authorizePermissions(PERMISSIONS.MANAGE_SPIRITUAL_HEALTH), async (req, res) => {
  const alert = await SpiritualHealthAlert.findById(req.params.alertId)
    .populate("memberId", "memberId")
    .populate("prospectId", "prospectId")
    .populate("triggerRuleId");
  if (!alert) {
    return res.status(404).json({ message: "Spiritual health alert not found." });
  }

  try {
    const updatedAlert = await assignAlertFollowUp(alert, req.body.assignedToUserId || null, req.body.dueDate);
    await updatedAlert.populate("assignedToUserId", "displayName username");
    await updatedAlert.populate("assignedActionId");
    res.json(updatedAlert);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/alerts/:alertId/resolve", authorizePermissions(PERMISSIONS.MANAGE_SPIRITUAL_HEALTH), async (req, res) => {
  const alert = await SpiritualHealthAlert.findById(req.params.alertId);
  if (!alert) {
    return res.status(404).json({ message: "Spiritual health alert not found." });
  }

  alert.resolvedAt = new Date();
  alert.resolvedBy = req.user?._id || null;
  await alert.save();
  res.json(alert);
});

module.exports = router;
