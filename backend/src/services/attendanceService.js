const crypto = require("crypto");
const AttendanceEvent = require("../models/AttendanceEvent");
const AttendanceRecord = require("../models/AttendanceRecord");
const Member = require("../models/Member");
const Ministry = require("../models/Ministry");
const PendingAction = require("../models/PendingAction");
const User = require("../models/User");
const Visitor = require("../models/Visitor");
const { findMemberByQrToken } = require("./memberQrService");
const { createPendingAction } = require("./pendingActionService");
const { getLookupValueByTypeAndKey, listLookupValuesByType } = require("./lookupService");
const { createVisitor } = require("./visitorService");

async function createAttendanceEvent(payload, user = null) {
  if (!payload.eventTypeId) {
    throw new Error("Event type is required.");
  }

  if (!payload.title) {
    throw new Error("Event title is required.");
  }

  await validateEventDependencies(payload);

  const event = await AttendanceEvent.create({
    eventTypeId: payload.eventTypeId,
    date: payload.date ? new Date(payload.date) : new Date(),
    title: payload.title,
    ministryId: payload.ministryId || null,
    location: payload.location || "",
    isCheckInOpen: payload.isCheckInOpen !== undefined ? Boolean(payload.isCheckInOpen) : true,
    qrToken: createQrToken(),
    createdBy: user?._id || null,
  });

  return populateAttendanceEventById(event._id);
}

async function updateAttendanceEvent(event, payload) {
  await validateEventDependencies(payload, false);
  event.eventTypeId = payload.eventTypeId ?? event.eventTypeId;
  event.title = payload.title ?? event.title;
  event.location = payload.location ?? event.location;
  event.ministryId = payload.ministryId ?? event.ministryId;
  if (payload.isCheckInOpen !== undefined) {
    event.isCheckInOpen = Boolean(payload.isCheckInOpen);
  }
  if (payload.date) {
    event.date = new Date(payload.date);
  }
  await event.save();
  return populateAttendanceEventById(event._id);
}

async function captureAttendanceRecord(event, payload, user = null) {
  assertCheckInOpen(event);

  if (!payload.memberId && !payload.visitorId) {
    throw new Error("Select a member or visitor for attendance capture.");
  }

  if (payload.memberId && !(await Member.findById(payload.memberId))) {
    throw new Error("Selected member was not found.");
  }

  if (payload.visitorId && !(await Visitor.findById(payload.visitorId))) {
    throw new Error("Selected visitor was not found.");
  }

  const captureMode = payload.capturedVia
    ? await resolveCaptureMode(payload.capturedVia)
    : await getLookupValueByTypeAndKey("attendance_capture_mode", "manual");

  const record = await AttendanceRecord.findOneAndUpdate(
    {
      eventId: event._id,
      ...(payload.memberId ? { memberId: payload.memberId } : { visitorId: payload.visitorId }),
    },
    {
      $set: {
        present: payload.present !== false,
        capturedVia: captureMode?._id || null,
        correctedFlag: Boolean(payload.correctedFlag),
        correctionReason: payload.correctionReason || "",
        capturedBy: user?._id || null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return populateAttendanceRecordById(record._id);
}

async function captureBulkAttendance(event, payload, user = null) {
  assertCheckInOpen(event);
  const entries = Array.isArray(payload.records) ? payload.records : [];
  const results = [];

  for (const entry of entries) {
    const record = await captureAttendanceRecord(
      event,
      {
        ...entry,
        capturedVia: entry.capturedVia || payload.capturedVia || "bulk",
      },
      user
    );
    results.push(record);
  }

  return results;
}

async function correctAttendanceRecord(record, payload, user = null) {
  const captureMode = payload.capturedVia
    ? await resolveCaptureMode(payload.capturedVia)
    : record.capturedVia;

  record.present = payload.present !== undefined ? Boolean(payload.present) : record.present;
  record.capturedVia = captureMode?._id || record.capturedVia;
  record.correctedFlag = true;
  record.correctionReason = payload.correctionReason || record.correctionReason;
  record.capturedBy = user?._id || record.capturedBy;
  await record.save();
  return populateAttendanceRecordById(record._id);
}

async function getAttendanceSummary(query = {}) {
  const events = await populateAttendanceEventQuery(query);
  const eventIds = events.map((event) => event._id);
  const records = eventIds.length
    ? await AttendanceRecord.find({ eventId: { $in: eventIds } }).lean()
    : [];

  return events.map((event) => {
    const relatedRecords = records.filter((record) => String(record.eventId) === String(event._id));
    const presentCount = relatedRecords.filter((record) => record.present).length;
    const expectedCount = relatedRecords.length;
    const attendanceRate = expectedCount ? Math.round((presentCount / expectedCount) * 100) : 0;

    return {
      ...event.toObject(),
      expectedCount,
      presentCount,
      attendanceRate,
    };
  });
}

async function toggleAttendanceCheckIn(event, isOpen) {
  event.isCheckInOpen = Boolean(isOpen);
  await event.save();
  return populateAttendanceEventById(event._id);
}

async function checkInMemberByQrToken(event, qrToken, user = null, captureMode = "qr") {
  assertCheckInOpen(event);
  const member = await findMemberByQrToken(qrToken);
  const record = await captureAttendanceRecord(
    event,
    {
      memberId: member._id,
      present: true,
      capturedVia: captureMode,
    },
    user
  );

  return {
    member,
    record,
  };
}

async function checkInVisitorForEvent(event, payload = {}, user = null) {
  assertCheckInOpen(event);

  let visitor = null;
  if (payload.visitorId) {
    visitor = await Visitor.findById(payload.visitorId);
  }

  if (!visitor && payload.phone) {
    visitor = await Visitor.findOne({
      phone: payload.phone,
      firstName: payload.firstName || undefined,
      surname: payload.surname || undefined,
    });
  }

  if (!visitor) {
    visitor = await createVisitor({
      firstName: payload.firstName || "",
      surname: payload.surname || "",
      gender: payload.gender || "",
      phone: payload.phone || "",
      email: payload.email || "",
      residentialArea: payload.residentialArea || "",
      firstVisitDate: event.date || new Date(),
    });
  }

  const record = await captureAttendanceRecord(
    event,
    {
      visitorId: visitor._id,
      present: true,
      capturedVia: payload.capturedVia || "manual",
    },
    user
  );

  return {
    visitor,
    record,
  };
}

async function getAttendanceCheckInDashboard(eventId) {
  const event = await populateAttendanceEventById(eventId);
  if (!event) {
    throw new Error("Attendance event not found.");
  }

  const records = await getAttendanceRecordsForEvent(eventId);
  const recentCheckIns = records.slice(0, 10);

  return {
    event,
    recentCheckIns,
    counters: {
      members: records.filter((record) => Boolean(record.memberId)).length,
      visitors: records.filter((record) => Boolean(record.visitorId)).length,
      children: records.filter((record) => record.memberId?.memberType === "Child").length,
      online: 0,
      total: records.length,
    },
  };
}

async function getAttendanceRecordsForEvent(eventId) {
  return AttendanceRecord.find({ eventId })
    .populate("memberId", "memberId firstName lastName memberType qrCodeImageUrl")
    .populate("visitorId", "visitorId firstName surname")
    .populate("capturedVia", "label key")
    .populate("capturedBy", "displayName username")
    .sort({ createdAt: -1 });
}

async function getAttendanceReport({ eventTypeId = "", ministryId = "", days = 90 } = {}) {
  const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const summary = await getAttendanceSummary({
    ...(eventTypeId ? { eventTypeId } : {}),
    ...(ministryId ? { ministryId } : {}),
    date: { $gte: cutoff },
  });

  const trendMap = summary.reduce((accumulator, event) => {
    const label = new Date(event.date).toISOString().slice(0, 10);
    if (!accumulator[label]) {
      accumulator[label] = { name: label, expected: 0, present: 0 };
    }
    accumulator[label].expected += event.expectedCount || 0;
    accumulator[label].present += event.presentCount || 0;
    return accumulator;
  }, {});

  const typeMap = summary.reduce((accumulator, event) => {
    const label = event.eventTypeId?.label || "Unknown Type";
    accumulator[label] = (accumulator[label] || 0) + (event.presentCount || 0);
    return accumulator;
  }, {});

  return {
    totalEvents: summary.length,
    totalPresent: summary.reduce((sum, item) => sum + (item.presentCount || 0), 0),
    averageAttendanceRate: summary.length
      ? Math.round(
          summary.reduce((sum, item) => sum + (item.attendanceRate || 0), 0) / summary.length
        )
      : 0,
    trend: Object.values(trendMap).slice(-10),
    byType: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
  };
}

async function getAbsentees({ windowDays = 28, eventTypeKey = "sunday_worship" } = {}) {
  const eventType = await getLookupValueByTypeAndKey("attendance_event_type", eventTypeKey);
  const cutoff = new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);

  const recentEvents = await AttendanceEvent.find({
    ...(eventType ? { eventTypeId: eventType._id } : {}),
    date: { $gte: cutoff },
  }).lean();
  const recentEventIds = recentEvents.map((event) => event._id);

  const recentRecords = recentEventIds.length
    ? await AttendanceRecord.find({
        eventId: { $in: recentEventIds },
        memberId: { $ne: null },
        present: true,
      }).lean()
    : [];

  const presentMemberIds = new Set(recentRecords.map((record) => String(record.memberId)));
  const members = await Member.find().lean();

  const absentees = members.filter((member) => !presentMemberIds.has(String(member._id)));

  for (const member of absentees) {
    const existingPendingAction = await PendingAction.findOne({
      sourceModule: "Attendance",
      sourceRecordType: "Member",
      sourceRecordId: member.memberId,
      reason: "Attendance follow-up required",
      status: "Open",
    });

    if (!existingPendingAction) {
      await createPendingAction({
        subjectType: "Member",
        subjectId: member.memberId,
        reason: "Attendance follow-up required",
        assignedUser: null,
        dueDate: new Date(),
        status: "Open",
        sourceModule: "Attendance",
        sourceRecordType: "Member",
        sourceRecordId: member.memberId,
        priority: "High",
        metadata: {
          memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          windowDays: Number(windowDays),
          eventType: eventType?.label || eventTypeKey,
        },
      });
    }
  }

  return absentees.map((member) => ({
    ...member,
    absenteeWindowDays: Number(windowDays),
    eventType: eventType?.label || eventTypeKey,
  }));
}

async function validateEventDependencies(payload, requireType = true) {
  if (requireType && !payload.eventTypeId) {
    throw new Error("Selected event type was not found.");
  }

  if (
    payload.eventTypeId !== undefined &&
    payload.eventTypeId !== null &&
    !(await resolveEventType(payload.eventTypeId))
  ) {
    throw new Error("Selected event type was not found.");
  }

  if (payload.ministryId && !(await Ministry.findById(payload.ministryId))) {
    throw new Error("Selected ministry was not found.");
  }
}

async function resolveEventType(value) {
  if (!value) {
    return null;
  }

  const eventTypes = await listLookupValuesByType("attendance_event_type");
  return (
    eventTypes.find((item) => String(item._id) === String(value) || item.key === String(value)) || null
  );
}

async function resolveCaptureMode(value) {
  if (!value) {
    return null;
  }

  const captureModes = await listLookupValuesByType("attendance_capture_mode");
  return (
    captureModes.find((item) => String(item._id) === String(value) || item.key === String(value)) || null
  );
}

async function populateAttendanceEventById(id) {
  return AttendanceEvent.findById(id)
    .populate("eventTypeId", "label key")
    .populate("ministryId", "name")
    .populate("createdBy", "displayName username");
}

async function populateAttendanceEventQuery(query = {}) {
  return AttendanceEvent.find(query)
    .populate("eventTypeId", "label key")
    .populate("ministryId", "name")
    .populate("createdBy", "displayName username")
    .sort({ date: -1, createdAt: -1 });
}

async function populateAttendanceRecordById(id) {
  return AttendanceRecord.findById(id)
    .populate("memberId", "memberId firstName lastName memberType qrCodeImageUrl")
    .populate("visitorId", "visitorId firstName surname")
    .populate("capturedVia", "label key")
    .populate("capturedBy", "displayName username");
}

function createQrToken() {
  return crypto.randomBytes(12).toString("hex");
}

function assertCheckInOpen(event) {
  if (event?.isCheckInOpen === false) {
    throw new Error("Check-in is closed for this event.");
  }
}

module.exports = {
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
  populateAttendanceEventById,
  populateAttendanceEventQuery,
  toggleAttendanceCheckIn,
  updateAttendanceEvent,
};
