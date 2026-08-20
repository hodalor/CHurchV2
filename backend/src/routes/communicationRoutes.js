const express = require("express");
const CommunicationGroup = require("../models/CommunicationGroup");
const CommunicationLog = require("../models/CommunicationLog");
const CommunicationPreference = require("../models/CommunicationPreference");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const {
  createCommunicationLogs,
  enforceCommunicationPreferences,
  freezeCommunicationGroup,
  resolveCommunicationAudience,
} = require("../services/communicationService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/groups", authorizePermissions(PERMISSIONS.VIEW_COMMUNICATION), async (req, res) => {
  const groups = await CommunicationGroup.find().sort({ createdAt: -1 });
  res.json(groups);
});

router.post("/groups", authorizePermissions(PERMISSIONS.MANAGE_COMMUNICATION), async (req, res) => {
  try {
    const group = await CommunicationGroup.create(req.body);
    await logAudit({
      action: "create",
      module: "Communication",
      recordType: "CommunicationGroup",
      recordId: String(group._id),
      newValue: group.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/groups/:groupId", authorizePermissions(PERMISSIONS.MANAGE_COMMUNICATION), async (req, res) => {
  const group = await CommunicationGroup.findById(req.params.groupId);
  if (!group) {
    return res.status(404).json({ message: "Communication group not found." });
  }

  const previousValue = group.toObject();
  Object.assign(group, req.body);
  await group.save();
  await logAudit({
    action: "update",
    module: "Communication",
    recordType: "CommunicationGroup",
    recordId: String(group._id),
    previousValue,
    newValue: group.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json(group);
});

router.delete("/groups/:groupId", authorizePermissions(PERMISSIONS.MANAGE_COMMUNICATION), async (req, res) => {
  const group = await CommunicationGroup.findById(req.params.groupId);
  if (!group) {
    return res.status(404).json({ message: "Communication group not found." });
  }

  const previousValue = group.toObject();
  await CommunicationGroup.deleteOne({ _id: group._id });
  await CommunicationLog.deleteMany({ groupId: group._id });
  await logAudit({
    action: "delete",
    module: "Communication",
    recordType: "CommunicationGroup",
    recordId: String(group._id),
    previousValue,
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json({ success: true });
});

router.post("/groups/:groupId/freeze", authorizePermissions(PERMISSIONS.MANAGE_COMMUNICATION), async (req, res) => {
  try {
    const group = await freezeCommunicationGroup(req.params.groupId);
    res.json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/audience/preview", authorizePermissions(PERMISSIONS.VIEW_COMMUNICATION), async (req, res) => {
  try {
    const group = req.body.groupId ? await CommunicationGroup.findById(req.body.groupId) : null;
    const rawAudience = await resolveCommunicationAudience(req.body.filterCriteria || group?.filterCriteria || {}, group);
    const filteredAudience = req.body.channelId
      ? await enforceCommunicationPreferences(rawAudience, req.body.channelId)
      : rawAudience;
    res.json({
      members: filteredAudience.members,
      visitors: filteredAudience.visitors,
      totals: {
        members: filteredAudience.members.length,
        visitors: filteredAudience.visitors.length,
        total: filteredAudience.members.length + filteredAudience.visitors.length,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/preferences", authorizePermissions(PERMISSIONS.VIEW_COMMUNICATION), async (req, res) => {
  const preferences = await CommunicationPreference.find()
    .populate("memberId", "memberId firstName lastName phone email")
    .populate("visitorId", "visitorId firstName surname phone email")
    .populate("channel", "label key")
    .sort({ updatedAt: -1, createdAt: -1 });
  res.json(preferences);
});

router.post("/preferences", authorizePermissions(PERMISSIONS.MANAGE_COMMUNICATION), async (req, res) => {
  try {
    const preference = await CommunicationPreference.findOneAndUpdate(
      {
        memberId: req.body.memberId || null,
        visitorId: req.body.visitorId || null,
        channel: req.body.channel,
      },
      {
        $set: {
          memberId: req.body.memberId || null,
          visitorId: req.body.visitorId || null,
          channel: req.body.channel,
          optedIn: req.body.optedIn !== false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("memberId", "memberId firstName lastName phone email")
      .populate("visitorId", "visitorId firstName surname phone email")
      .populate("channel", "label key");
    res.status(201).json(preference);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/logs", authorizePermissions(PERMISSIONS.VIEW_COMMUNICATION), async (req, res) => {
  const logs = await CommunicationLog.find()
    .populate("groupId", "name")
    .populate("memberId", "memberId firstName lastName")
    .populate("visitorId", "visitorId firstName surname")
    .populate("channel", "label key")
    .populate("status", "label key")
    .populate("sentBy", "displayName username")
    .sort({ sentAt: -1, createdAt: -1 });
  res.json(logs);
});

router.post("/send", authorizePermissions(PERMISSIONS.MANAGE_COMMUNICATION), async (req, res) => {
  try {
    const group = req.body.groupId ? await CommunicationGroup.findById(req.body.groupId) : null;
    const audience = await resolveCommunicationAudience(req.body.filterCriteria || group?.filterCriteria || {}, group);
    const filteredAudience = await enforceCommunicationPreferences(audience, req.body.channelId);
    const logs = await createCommunicationLogs({
      groupId: group?._id || null,
      channelId: req.body.channelId,
      content: req.body.content || "",
      audience: filteredAudience,
      user: req.user,
    });
    await logAudit({
      action: "create",
      module: "Communication",
      recordType: "CommunicationDispatch",
      recordId: String(group?._id || "ad_hoc_dispatch"),
      newValue: {
        channelId: req.body.channelId,
        recipients: logs.length,
      },
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json({
      sentCount: logs.length,
      logs,
      providerStatus: "stub_only",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/export", async (req, res) => {
  const hasPermission = (req.user?.permissions || []).includes(PERMISSIONS.EXPORT_CONTACTS);
  const group = req.body.groupId ? await CommunicationGroup.findById(req.body.groupId) : null;
  const filterCriteria = req.body.filterCriteria || group?.filterCriteria || {};

  if (!hasPermission) {
    await logAudit({
      action: "export_denied",
      module: "Communication",
      recordType: "CommunicationContacts",
      recordId: String(group?._id || "ad_hoc_export"),
      newValue: {
        filterCriteria,
        success: false,
        count: 0,
      },
      user: req.user,
      ipAddress: req.ip,
    });
    return res.status(403).json({ message: "You do not have permission to export contact lists." });
  }

  try {
    const audience = await resolveCommunicationAudience(filterCriteria, group);
    const result = {
      members: audience.members.map((member) => ({
        memberId: member.memberId,
        fullName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
        phone: member.phone || "",
        email: member.email || "",
      })),
      visitors: audience.visitors.map((visitor) => ({
        visitorId: visitor.visitorId,
        fullName: `${visitor.firstName || ""} ${visitor.surname || ""}`.trim(),
        phone: visitor.phone || "",
        email: visitor.email || "",
      })),
    };
    await logAudit({
      action: "export",
      module: "Communication",
      recordType: "CommunicationContacts",
      recordId: String(group?._id || "ad_hoc_export"),
      newValue: {
        filterCriteria,
        success: true,
        count: result.members.length + result.visitors.length,
      },
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    await logAudit({
      action: "export_failed",
      module: "Communication",
      recordType: "CommunicationContacts",
      recordId: String(group?._id || "ad_hoc_export"),
      newValue: {
        filterCriteria,
        success: false,
        message: error.message,
      },
      user: req.user,
      ipAddress: req.ip,
    });
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
