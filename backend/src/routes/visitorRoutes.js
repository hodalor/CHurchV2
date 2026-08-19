const express = require("express");
const User = require("../models/User");
const Visitor = require("../models/Visitor");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const {
  addChurchVisit,
  addHomeVisit,
  assignVisitorFollowUp,
  convertVisitorToMember,
  convertVisitorToProspect,
  createVisitor,
  generateNextVisitorId,
  getRetentionMetrics,
  populateVisitorQuery,
} = require("../services/visitorService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/next-id", authorizePermissions(PERMISSIONS.VIEW_VISITORS), async (req, res) => {
  const visitorId = await generateNextVisitorId();
  res.json({ visitorId });
});

router.get("/", authorizePermissions(PERMISSIONS.VIEW_VISITORS), async (req, res) => {
  const query = {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  const visitors = await populateVisitorQuery(query);
  res.json(visitors);
});

router.get("/retention-metrics", authorizePermissions(PERMISSIONS.VIEW_VISITORS), async (req, res) => {
  const windowDays = Number(req.query.windowDays || 30);
  const metrics = await getRetentionMetrics({ windowDays });
  res.json(metrics);
});

router.post("/", authorizePermissions(PERMISSIONS.MANAGE_VISITORS), async (req, res) => {
  try {
    const visitor = await createVisitor(req.body);
    const populatedVisitor = await Visitor.findById(visitor._id)
      .populate("howHeard", "label key")
      .populate("status", "label key")
      .populate("assignedFollowUpUserId", "displayName username");
    await logAudit({
      action: "create",
      module: "Visitor Management",
      recordType: "Visitor",
      recordId: visitor.visitorId,
      newValue: visitor.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(populatedVisitor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:visitorId", authorizePermissions(PERMISSIONS.MANAGE_VISITORS), async (req, res) => {
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
  if (!visitor) {
    return res.status(404).json({ message: "Visitor not found." });
  }

  const previousValue = visitor.toObject();
  visitor.firstName = req.body.firstName ?? visitor.firstName;
  visitor.surname = req.body.surname ?? visitor.surname;
  visitor.phone = req.body.phone ?? visitor.phone;
  visitor.email = req.body.email ?? visitor.email;
  visitor.residentialArea = req.body.residentialArea ?? visitor.residentialArea;
  visitor.firstVisitDate = req.body.firstVisitDate ? new Date(req.body.firstVisitDate) : visitor.firstVisitDate;
  visitor.howHeard = req.body.howHeard || visitor.howHeard;
  visitor.assignedFollowUpUserId = req.body.assignedFollowUpUserId || visitor.assignedFollowUpUserId;
  await visitor.save();
  const populatedVisitor = await Visitor.findById(visitor._id)
    .populate("howHeard", "label key")
    .populate("status", "label key")
    .populate("assignedFollowUpUserId", "displayName username");

  await logAudit({
    action: "update",
    module: "Visitor Management",
    recordType: "Visitor",
    recordId: visitor.visitorId,
    previousValue,
    newValue: visitor.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });

  return res.json(populatedVisitor);
});

router.post("/:visitorId/church-visits", authorizePermissions(PERMISSIONS.MANAGE_VISITORS), async (req, res) => {
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
  if (!visitor) {
    return res.status(404).json({ message: "Visitor not found." });
  }

  const previousValue = visitor.toObject();
  const updatedVisitor = await addChurchVisit(visitor, req.body);
  await logAudit({
    action: "update",
    module: "Visitor Management",
    recordType: "Visitor",
    recordId: updatedVisitor.visitorId,
    previousValue,
    newValue: updatedVisitor.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json(updatedVisitor);
});

router.post("/:visitorId/assign", authorizePermissions(PERMISSIONS.ASSIGN_VISITOR_FOLLOWUP), async (req, res) => {
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
  if (!visitor) {
    return res.status(404).json({ message: "Visitor not found." });
  }

  const assignedUser = await User.findById(req.body.assignedUserId);
  if (!assignedUser) {
    return res.status(404).json({ message: "Assigned user not found." });
  }

  const previousValue = visitor.toObject();
  const updatedVisitor = await assignVisitorFollowUp(visitor, assignedUser._id);
  await logAudit({
    action: "update",
    module: "Visitor Management",
    recordType: "Visitor",
    recordId: updatedVisitor.visitorId,
    previousValue,
    newValue: updatedVisitor.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json(updatedVisitor);
});

router.post("/:visitorId/home-visits", authorizePermissions(PERMISSIONS.MANAGE_VISITORS), async (req, res) => {
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
  if (!visitor) {
    return res.status(404).json({ message: "Visitor not found." });
  }

  const previousValue = visitor.toObject();
  const updatedVisitor = await addHomeVisit(visitor, {
    date: req.body.date,
    visitedBy: req.user._id,
    notes: req.body.notes,
  });
  await logAudit({
    action: "update",
    module: "Visitor Management",
    recordType: "Visitor",
    recordId: updatedVisitor.visitorId,
    previousValue,
    newValue: updatedVisitor.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json(updatedVisitor);
});

router.post("/:visitorId/convert-to-prospect", authorizePermissions(PERMISSIONS.CONVERT_VISITOR), async (req, res) => {
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
  if (!visitor) {
    return res.status(404).json({ message: "Visitor not found." });
  }

  const previousValue = visitor.toObject();
  const prospect = await convertVisitorToProspect(visitor, req.user);
  const refreshedVisitor = await Visitor.findOne({ visitorId: visitor.visitorId });
  await logAudit({
    action: "status-change",
    module: "Visitor Management",
    recordType: "Visitor",
    recordId: refreshedVisitor.visitorId,
    previousValue,
    newValue: refreshedVisitor.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json({ visitor: refreshedVisitor, prospect });
});

router.post("/:visitorId/convert-to-member", authorizePermissions(PERMISSIONS.CONVERT_VISITOR), async (req, res) => {
  const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
  if (!visitor) {
    return res.status(404).json({ message: "Visitor not found." });
  }

  const previousValue = visitor.toObject();
  const member = await convertVisitorToMember(visitor, req.body);
  const refreshedVisitor = await Visitor.findOne({ visitorId: visitor.visitorId });
  await logAudit({
    action: "status-change",
    module: "Visitor Management",
    recordType: "Visitor",
    recordId: refreshedVisitor.visitorId,
    previousValue,
    newValue: refreshedVisitor.toObject(),
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json({ visitor: refreshedVisitor, member });
});

module.exports = router;
