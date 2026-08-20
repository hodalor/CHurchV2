const express = require("express");
const AttendanceEvent = require("../models/AttendanceEvent");
const AttendanceRecord = require("../models/AttendanceRecord");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const {
  checkInMemberByQrToken,
  checkInVisitorForEvent,
  captureAttendanceRecord,
  captureBulkAttendance,
  correctAttendanceRecord,
  createAttendanceEvent,
  getAbsentees,
  getAttendanceCheckInDashboard,
  getAttendanceRecordsForEvent,
  getAttendanceReport,
  getAttendanceSummary,
  toggleAttendanceCheckIn,
  updateAttendanceEvent,
} = require("../services/attendanceService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/events", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  try {
    const events = await getAttendanceSummary();
    return res.json(events);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/events", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  try {
    const event = await createAttendanceEvent(req.body, req.user);
    await logAudit({
      action: "create",
      module: "Attendance",
      recordType: "AttendanceEvent",
      recordId: event._id.toString(),
      newValue: event.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/events/:eventId", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  const previousValue = event.toObject();

  try {
    const updatedEvent = await updateAttendanceEvent(event, req.body);
    await logAudit({
      action: "update",
      module: "Attendance",
      recordType: "AttendanceEvent",
      recordId: updatedEvent._id.toString(),
      previousValue,
      newValue: updatedEvent.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedEvent);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/events/:eventId", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  const previousValue = event.toObject();
  await AttendanceRecord.deleteMany({ eventId: event._id });
  await AttendanceEvent.deleteOne({ _id: event._id });
  await logAudit({
    action: "delete",
    module: "Attendance",
    recordType: "AttendanceEvent",
    recordId: event._id.toString(),
    previousValue,
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json({ success: true });
});

router.get("/events/:eventId/records", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  try {
    const event = await AttendanceEvent.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: "Attendance event not found." });
    }

    const records = await getAttendanceRecordsForEvent(event._id);
    return res.json(records);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/events/:eventId/check-in/dashboard", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  try {
    const dashboard = await getAttendanceCheckInDashboard(req.params.eventId);
    return res.json(dashboard);
  } catch (error) {
    return res.status(error.message === "Attendance event not found." ? 404 : 400).json({ message: error.message });
  }
});

router.post("/events/:eventId/check-in/status", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  try {
    const previousValue = event.toObject();
    const updatedEvent = await toggleAttendanceCheckIn(event, req.body.isCheckInOpen);
    await logAudit({
      action: "update",
      module: "Attendance",
      recordType: "AttendanceEvent",
      recordId: updatedEvent._id.toString(),
      previousValue,
      newValue: updatedEvent.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedEvent);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/events/:eventId/check-in/qr", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  try {
    const result = await checkInMemberByQrToken(event, req.body.qrToken, req.user, req.body.capturedVia || "qr");
    await logAudit({
      action: "create",
      module: "Attendance",
      recordType: "AttendanceRecord",
      recordId: result.record._id.toString(),
      newValue: result.record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/events/:eventId/check-in/visitor", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  try {
    const result = await checkInVisitorForEvent(event, req.body, req.user);
    await logAudit({
      action: "create",
      module: "Attendance",
      recordType: "AttendanceRecord",
      recordId: result.record._id.toString(),
      newValue: result.record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/events/:eventId/check-in/biometric", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  return res.status(501).json({
    message: "Biometric check-in is not connected yet. Confirm the device or SDK before implementation.",
    eventId: event._id,
    biometricMatchToken: req.body.biometricMatchToken || "",
  });
});

router.post("/events/:eventId/check-in/children", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  return res.status(501).json({
    message: "Child check-in needs the pickup matching flow confirmed before full implementation.",
    eventId: event._id,
  });
});

router.post("/events/:eventId/records", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  try {
    const record = await captureAttendanceRecord(event, req.body, req.user);
    await logAudit({
      action: "create",
      module: "Attendance",
      recordType: "AttendanceRecord",
      recordId: record._id.toString(),
      newValue: record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.status(201).json(record);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/events/:eventId/records/bulk", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  try {
    const records = await captureBulkAttendance(event, req.body, req.user);
    await logAudit({
      action: "create",
      module: "Attendance",
      recordType: "AttendanceRecord",
      recordId: event._id.toString(),
      newValue: { count: records.length, eventId: event._id.toString() },
      user: req.user,
      ipAddress: req.ip,
    });
    return res.status(201).json(records);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/records/:recordId", authorizePermissions(PERMISSIONS.MANAGE_ATTENDANCE), async (req, res) => {
  try {
    const record = await AttendanceRecord.findById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    const previousValue = record.toObject();
    const updatedRecord = await correctAttendanceRecord(record, req.body, req.user);
    await logAudit({
      action: "update",
      module: "Attendance",
      recordType: "AttendanceRecord",
      recordId: updatedRecord._id.toString(),
      previousValue,
      newValue: updatedRecord.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(updatedRecord);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/reports/summary", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  try {
    const report = await getAttendanceReport({
      eventTypeId: req.query.eventTypeId || "",
      ministryId: req.query.ministryId || "",
      days: Number(req.query.days) || 90,
    });
    return res.json(report);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/reports/absentees", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  try {
    const absentees = await getAbsentees({
      windowDays: Number(req.query.windowDays) || 28,
      eventTypeKey: req.query.eventTypeKey || "sunday_worship",
    });
    return res.json(absentees);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
