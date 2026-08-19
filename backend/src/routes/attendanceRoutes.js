const express = require("express");
const AttendanceEvent = require("../models/AttendanceEvent");
const AttendanceRecord = require("../models/AttendanceRecord");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const {
  captureAttendanceRecord,
  captureBulkAttendance,
  correctAttendanceRecord,
  createAttendanceEvent,
  getAbsentees,
  getAttendanceRecordsForEvent,
  getAttendanceReport,
  getAttendanceSummary,
  updateAttendanceEvent,
} = require("../services/attendanceService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/events", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  const events = await getAttendanceSummary();
  res.json(events);
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

router.get("/events/:eventId/records", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  const event = await AttendanceEvent.findById(req.params.eventId);
  if (!event) {
    return res.status(404).json({ message: "Attendance event not found." });
  }

  const records = await getAttendanceRecordsForEvent(event._id);
  return res.json(records);
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
  const record = await AttendanceRecord.findById(req.params.recordId);
  if (!record) {
    return res.status(404).json({ message: "Attendance record not found." });
  }

  const previousValue = record.toObject();

  try {
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
  const report = await getAttendanceReport({
    eventTypeId: req.query.eventTypeId || "",
    ministryId: req.query.ministryId || "",
    days: Number(req.query.days) || 90,
  });
  res.json(report);
});

router.get("/reports/absentees", authorizePermissions(PERMISSIONS.VIEW_ATTENDANCE), async (req, res) => {
  const absentees = await getAbsentees({
    windowDays: Number(req.query.windowDays) || 28,
    eventTypeKey: req.query.eventTypeKey || "sunday_worship",
  });
  res.json(absentees);
});

module.exports = router;
