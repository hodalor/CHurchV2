const express = require("express");
const EmergingLeaderFlag = require("../models/EmergingLeaderFlag");
const LeadershipRole = require("../models/LeadershipRole");
const LeadershipTrainingRecord = require("../models/LeadershipTrainingRecord");
const Member = require("../models/Member");
const MentorAssignment = require("../models/MentorAssignment");
const SkillTalent = require("../models/SkillTalent");
const SuccessionReadiness = require("../models/SuccessionReadiness");
const SuccessionRequirement = require("../models/SuccessionRequirement");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

registerCrudRoutes({
  path: "/roles",
  Model: LeadershipRole,
  viewPermission: PERMISSIONS.VIEW_LEADERSHIP,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "LeadershipRole",
  populateQuery: (query) =>
    query
      .populate("memberId", "memberId firstName lastName ministry")
      .populate("roleName", "label key")
      .sort({ startDate: -1, createdAt: -1 }),
});

registerCrudRoutes({
  path: "/skills",
  Model: SkillTalent,
  viewPermission: PERMISSIONS.VIEW_LEADERSHIP,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "SkillTalent",
  populateQuery: (query) => query.populate("memberId", "memberId firstName lastName ministry").sort({ createdAt: -1 }),
});

registerCrudRoutes({
  path: "/emerging-flags",
  Model: EmergingLeaderFlag,
  viewPermission: PERMISSIONS.VIEW_LEADERSHIP,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "EmergingLeaderFlag",
  populateQuery: (query) =>
    query
      .populate("memberId", "memberId firstName lastName ministry")
      .populate("flaggedBy", "displayName username")
      .populate("status", "label key")
      .sort({ flaggedDate: -1, createdAt: -1 }),
});

registerCrudRoutes({
  path: "/mentors",
  Model: MentorAssignment,
  viewPermission: PERMISSIONS.VIEW_LEADERSHIP,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "MentorAssignment",
  populateQuery: (query) =>
    query
      .populate("menteeId", "memberId firstName lastName ministry")
      .populate("mentorId", "memberId firstName lastName ministry")
      .populate("status", "label key")
      .sort({ startDate: -1, createdAt: -1 }),
});

registerCrudRoutes({
  path: "/training-records",
  Model: LeadershipTrainingRecord,
  viewPermission: PERMISSIONS.VIEW_LEADERSHIP,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "LeadershipTrainingRecord",
  populateQuery: (query) => query.populate("memberId", "memberId firstName lastName ministry").sort({ date: -1, createdAt: -1 }),
});

registerCrudRoutes({
  path: "/succession-requirements",
  Model: SuccessionRequirement,
  viewPermission: PERMISSIONS.VIEW_SUCCESSION_SENSITIVE,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "SuccessionRequirement",
  populateQuery: (query) => query.populate("roleName", "label key").sort({ createdAt: -1 }),
});

registerCrudRoutes({
  path: "/succession-readiness",
  Model: SuccessionReadiness,
  viewPermission: PERMISSIONS.VIEW_SUCCESSION_SENSITIVE,
  managePermission: PERMISSIONS.MANAGE_LEADERSHIP,
  moduleName: "Leadership",
  recordType: "SuccessionReadiness",
  populateQuery: (query) =>
    query
      .populate("memberId", "memberId firstName lastName ministry")
      .populate("targetRoleName", "label key")
      .populate("readinessCategory", "label key")
      .populate("assessedBy", "displayName username")
      .sort({ assessedDate: -1, createdAt: -1 }),
});

router.get("/reports/pipeline", authorizePermissions(PERMISSIONS.VIEW_LEADERSHIP), async (req, res) => {
  const [roles, readiness, members] = await Promise.all([
    LeadershipRole.find().populate("roleName", "label key").populate("memberId", "ministry"),
    SuccessionReadiness.find()
      .populate("readinessCategory", "label key")
      .populate("memberId", "ministry"),
    Member.find({}, { ministry: 1 }).lean(),
  ]);

  const byRole = roles.reduce((acc, item) => {
    const label = item.roleName?.label || "Unassigned";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const byReadiness = readiness.reduce((acc, item) => {
    const label = item.readinessCategory?.label || "Unassigned";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const byMinistry = members.reduce((acc, item) => {
    const label = item.ministry ? String(item.ministry) : "unassigned";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  res.json({
    totals: {
      currentRoles: roles.length,
      readinessRecords: readiness.length,
    },
    byRole: toSeries(byRole),
    byReadiness: toSeries(byReadiness),
    byMinistry: toSeries(byMinistry),
  });
});

function registerCrudRoutes({ path, Model, viewPermission, managePermission, moduleName, recordType, populateQuery }) {
  router.get(path, authorizePermissions(viewPermission), async (req, res) => {
    const query = Model.find();
    const records = populateQuery ? await populateQuery(query) : await query.sort({ createdAt: -1 });
    res.json(records);
  });

  router.post(path, authorizePermissions(managePermission), async (req, res) => {
    try {
      const record = await Model.create(req.body);
      const hydratedRecord = populateQuery ? await populateQuery(Model.find({ _id: record._id })) : [record];
      await logAudit({
        action: "create",
        module: moduleName,
        recordType,
        recordId: String(record._id),
        newValue: record.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      res.status(201).json(Array.isArray(hydratedRecord) ? hydratedRecord[0] : hydratedRecord);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.put(`${path}/:id`, authorizePermissions(managePermission), async (req, res) => {
    const record = await Model.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: `${recordType} not found.` });
    }

    const previousValue = record.toObject();
    Object.assign(record, req.body);
    await record.save();
    await logAudit({
      action: "update",
      module: moduleName,
      recordType,
      recordId: String(record._id),
      previousValue,
      newValue: record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    const hydratedRecord = populateQuery ? await populateQuery(Model.find({ _id: record._id })) : [record];
    return res.json(Array.isArray(hydratedRecord) ? hydratedRecord[0] : hydratedRecord);
  });

  router.delete(`${path}/:id`, authorizePermissions(managePermission), async (req, res) => {
    const record = await Model.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: `${recordType} not found.` });
    }

    const previousValue = record.toObject();
    await Model.deleteOne({ _id: record._id });
    await logAudit({
      action: "delete",
      module: moduleName,
      recordType,
      recordId: String(record._id),
      previousValue,
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json({ success: true });
  });
}

function toSeries(map) {
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

module.exports = router;
