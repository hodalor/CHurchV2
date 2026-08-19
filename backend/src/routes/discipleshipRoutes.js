const express = require("express");
const DiscipleshipEnrollment = require("../models/DiscipleshipEnrollment");
const DiscipleshipProgramme = require("../models/DiscipleshipProgramme");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const {
  addEnrollmentSession,
  assignMentor,
  completeEnrollment,
  createEnrollment,
  createProgramme,
  getDashboardMetrics,
  getOverdueEnrollments,
  populateEnrollmentQuery,
  populateProgrammeQuery,
  updateEnrollment,
  updateProgramme,
} = require("../services/discipleshipService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/programmes", authorizePermissions(PERMISSIONS.VIEW_DISCIPLESHIP), async (req, res) => {
  const programmes = await populateProgrammeQuery();
  res.json(programmes);
});

router.post("/programmes", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  try {
    const programme = await createProgramme(req.body);
    await logAudit({
      action: "create",
      module: "Discipleship",
      recordType: "DiscipleshipProgramme",
      recordId: programme._id.toString(),
      newValue: programme.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(programme);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/programmes/:programmeId", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  const programme = await DiscipleshipProgramme.findById(req.params.programmeId);
  if (!programme) {
    return res.status(404).json({ message: "Programme not found." });
  }

  const previousValue = programme.toObject();

  try {
    const updatedProgramme = await updateProgramme(programme, req.body);
    await logAudit({
      action: "update",
      module: "Discipleship",
      recordType: "DiscipleshipProgramme",
      recordId: updatedProgramme._id.toString(),
      previousValue,
      newValue: updatedProgramme.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedProgramme);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/enrollments", authorizePermissions(PERMISSIONS.VIEW_DISCIPLESHIP), async (req, res) => {
  const enrollments = await populateEnrollmentQuery();
  res.json(enrollments);
});

router.post("/enrollments", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  try {
    const enrollment = await createEnrollment(req.body);
    await logAudit({
      action: "create",
      module: "Discipleship",
      recordType: "DiscipleshipEnrollment",
      recordId: enrollment._id.toString(),
      newValue: enrollment.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/enrollments/:enrollmentId", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  const enrollment = await DiscipleshipEnrollment.findById(req.params.enrollmentId);
  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found." });
  }

  const previousValue = enrollment.toObject();

  try {
    const updatedEnrollment = await updateEnrollment(enrollment, req.body);
    await logAudit({
      action: "update",
      module: "Discipleship",
      recordType: "DiscipleshipEnrollment",
      recordId: updatedEnrollment._id.toString(),
      previousValue,
      newValue: updatedEnrollment.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedEnrollment);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/enrollments/:enrollmentId/mentor", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  const enrollment = await DiscipleshipEnrollment.findById(req.params.enrollmentId);
  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found." });
  }

  const previousValue = enrollment.toObject();

  try {
    const updatedEnrollment = await assignMentor(enrollment, req.body.mentorId);
    await logAudit({
      action: "update",
      module: "Discipleship",
      recordType: "DiscipleshipEnrollment",
      recordId: updatedEnrollment._id.toString(),
      previousValue,
      newValue: updatedEnrollment.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedEnrollment);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/enrollments/:enrollmentId/sessions", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  const enrollment = await DiscipleshipEnrollment.findById(req.params.enrollmentId);
  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found." });
  }

  const previousValue = enrollment.toObject();

  try {
    const updatedEnrollment = await addEnrollmentSession(enrollment, req.body);
    await logAudit({
      action: "update",
      module: "Discipleship",
      recordType: "DiscipleshipEnrollment",
      recordId: updatedEnrollment._id.toString(),
      previousValue,
      newValue: updatedEnrollment.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedEnrollment);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/enrollments/:enrollmentId/complete", authorizePermissions(PERMISSIONS.MANAGE_DISCIPLESHIP), async (req, res) => {
  const enrollment = await DiscipleshipEnrollment.findById(req.params.enrollmentId);
  if (!enrollment) {
    return res.status(404).json({ message: "Enrollment not found." });
  }

  const previousValue = enrollment.toObject();

  try {
    const updatedEnrollment = await completeEnrollment(enrollment, req.body);
    await logAudit({
      action: "status-change",
      module: "Discipleship",
      recordType: "DiscipleshipEnrollment",
      recordId: updatedEnrollment._id.toString(),
      previousValue,
      newValue: updatedEnrollment.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedEnrollment);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/overdue", authorizePermissions(PERMISSIONS.VIEW_DISCIPLESHIP), async (req, res) => {
  const windowDays = Number(req.query.windowDays) || 14;
  const overdue = await getOverdueEnrollments({ windowDays });
  res.json(overdue);
});

router.get("/dashboard", authorizePermissions(PERMISSIONS.VIEW_DISCIPLESHIP), async (req, res) => {
  const mentorWindowDays = Number(req.query.mentorWindowDays) || 7;
  const overdueWindowDays = Number(req.query.overdueWindowDays) || 14;
  const metrics = await getDashboardMetrics({ mentorWindowDays, overdueWindowDays });
  res.json(metrics);
});

module.exports = router;
