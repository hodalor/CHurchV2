const CareCase = require("../models/CareCase");
const CareNote = require("../models/CareNote");
const CounselingSession = require("../models/CounselingSession");
const VisitationRecord = require("../models/VisitationRecord");
const { logAudit } = require("./auditService");
const { createPendingAction } = require("./pendingActionService");
const { canAccessCareNote, getHighestCareTier, logRestrictedCareView } = require("./careAccessService");

async function listCareCases() {
  return CareCase.find()
    .populate("memberId", "memberId firstName lastName")
    .populate("householdId", "familyId familyName")
    .populate("responsibleLeaderId", "displayName username")
    .populate("createdBy", "displayName username")
    .sort({ updatedAt: -1, createdAt: -1 });
}

async function createCareCase({ payload, user, ipAddress = "" }) {
  const careCase = await CareCase.create({
    memberId: payload.memberId || null,
    householdId: payload.householdId || null,
    category: String(payload.category || "").trim(),
    title: String(payload.title || "").trim(),
    responsibleLeaderId: payload.responsibleLeaderId || null,
    status: String(payload.status || "open").trim(),
    nextActionDate: payload.nextActionDate ? new Date(payload.nextActionDate) : null,
    confidentialityTier: payload.confidentialityTier || "Standard",
    summary: String(payload.summary || "").trim(),
    createdBy: user?._id,
  });

  await logAudit({
    action: "create",
    module: "Pastoral Care",
    recordType: "CareCase",
    recordId: String(careCase._id),
    newValue: careCase.toObject(),
    user,
    ipAddress,
  });

  return careCase;
}

async function listCareNotes({ user, ipAddress = "", careCaseId = "" } = {}) {
  const query = careCaseId ? { careCaseId } : {};
  const notes = await CareNote.find(query)
    .populate("careCaseId", "title status confidentialityTier")
    .populate("memberId", "memberId firstName lastName")
    .populate("householdId", "familyId familyName")
    .populate("authorId", "displayName username")
    .populate("noteType", "label key")
    .populate("visibleToOverride", "displayName username")
    .sort({ dateTime: -1, createdAt: -1 });

  const visibleNotes = [];
  for (const note of notes) {
    if (!canAccessCareNote(note, user)) {
      continue;
    }

    await logRestrictedCareView(note, user, ipAddress);
    visibleNotes.push(note);
  }

  return visibleNotes;
}

async function createCareNote({ payload, user, ipAddress = "" }) {
  if (!payload.memberId && !payload.householdId) {
    throw new Error("Select a member or household.");
  }
  if (!payload.noteType) {
    throw new Error("Note type is required.");
  }
  if (!String(payload.content || "").trim()) {
    throw new Error("Note content is required.");
  }

  const note = await CareNote.create({
    careCaseId: payload.careCaseId || null,
    memberId: payload.memberId || null,
    householdId: payload.householdId || null,
    authorId: user?._id,
    dateTime: payload.dateTime ? new Date(payload.dateTime) : new Date(),
    noteType: payload.noteType,
    content: String(payload.content || "").trim(),
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    confidentialityTier: payload.confidentialityTier || "Standard",
    visibleToOverride: Array.isArray(payload.visibleToOverride) ? payload.visibleToOverride : [],
    metadata: payload.metadata || {},
  });

  await syncCareCaseTier(note.careCaseId);

  await logAudit({
    action: "create",
    module: "Pastoral Care",
    recordType: "CareNote",
    recordId: String(note._id),
    newValue: note.toObject(),
    user,
    ipAddress,
  });

  return note;
}

async function createCounselingSession({ payload, user, ipAddress = "" }) {
  const note = await createCareNote({
    payload: {
      ...payload,
      metadata: {
        ...(payload.metadata || {}),
        structuredType: "counseling-session",
      },
    },
    user,
    ipAddress,
  });

  const session = await CounselingSession.create({
    careNoteId: note._id,
    sessionNumber: Number(payload.sessionNumber || 1),
    topic: String(payload.topic || "").trim(),
    attendees: Array.isArray(payload.attendees) ? payload.attendees.filter(Boolean) : [],
    followUpPlan: String(payload.followUpPlan || "").trim(),
    nextSessionDate: payload.nextSessionDate ? new Date(payload.nextSessionDate) : null,
  });

  await logAudit({
    action: "create",
    module: "Pastoral Care",
    recordType: "CounselingSession",
    recordId: String(session._id),
    newValue: session.toObject(),
    user,
    ipAddress,
  });

  return { note, session };
}

async function createVisitationRecord({ payload, user, ipAddress = "" }) {
  const note = await createCareNote({
    payload: {
      ...payload,
      metadata: {
        ...(payload.metadata || {}),
        structuredType: "visitation-record",
      },
    },
    user,
    ipAddress,
  });

  const visitation = await VisitationRecord.create({
    careNoteId: note._id,
    location: payload.location || "home",
    purpose: String(payload.purpose || "").trim(),
    outcome: String(payload.outcome || "").trim(),
    followUpNeeded: payload.followUpNeeded === true,
    followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : null,
  });

  if (visitation.followUpNeeded && visitation.followUpDate) {
    await createPendingAction({
      subjectType: note.memberId ? "Member" : "Household",
      subjectId: String(note.memberId || note.householdId || ""),
      reason: `Pastoral follow-up from visitation: ${visitation.purpose || "Visitation record"}`,
      assignedUser: payload.assignedUser || null,
      dueDate: visitation.followUpDate,
      status: "Open",
      sourceModule: "Pastoral Care",
      sourceRecordType: "VisitationRecord",
      sourceRecordId: String(visitation._id),
      priority: note.confidentialityTier === "Elders-Only" ? "High" : "Normal",
      metadata: {
        careNoteId: String(note._id),
        careCaseId: String(note.careCaseId || ""),
      },
    });
  }

  await logAudit({
    action: "create",
    module: "Pastoral Care",
    recordType: "VisitationRecord",
    recordId: String(visitation._id),
    newValue: visitation.toObject(),
    user,
    ipAddress,
  });

  return { note, visitation };
}

async function promoteNoteToCase({ noteId, payload, user, ipAddress = "" }) {
  const note = await CareNote.findById(noteId);
  if (!note) {
    throw new Error("Care note not found.");
  }

  if (note.careCaseId) {
    throw new Error("This note is already attached to a care case.");
  }

  const careCase = await createCareCase({
    payload: {
      memberId: note.memberId,
      householdId: note.householdId,
      category: payload.category || "General",
      title: payload.title || "Promoted pastoral care case",
      responsibleLeaderId: payload.responsibleLeaderId || null,
      status: payload.status || "open",
      nextActionDate: payload.nextActionDate || null,
      confidentialityTier: note.confidentialityTier,
      summary: payload.summary || String(note.content || "").slice(0, 180),
    },
    user,
    ipAddress,
  });

  const previousValue = note.toObject();
  note.careCaseId = careCase._id;
  await note.save();

  await logAudit({
    action: "update",
    module: "Pastoral Care",
    recordType: "CareNote",
    recordId: String(note._id),
    previousValue,
    newValue: note.toObject(),
    user,
    ipAddress,
  });

  return { careCase, note };
}

async function syncCareCaseTier(careCaseId) {
  if (!careCaseId) {
    return null;
  }

  const careCase = await CareCase.findById(careCaseId);
  if (!careCase) {
    return null;
  }

  const notes = await CareNote.find({ careCaseId }).lean();
  careCase.confidentialityTier = getHighestCareTier(notes);
  await careCase.save();
  return careCase;
}

module.exports = {
  createCareCase,
  createCareNote,
  createCounselingSession,
  createVisitationRecord,
  listCareCases,
  listCareNotes,
  promoteNoteToCase,
  syncCareCaseTier,
};
