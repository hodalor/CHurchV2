const DiscipleshipEnrollment = require("../models/DiscipleshipEnrollment");
const DiscipleshipProgramme = require("../models/DiscipleshipProgramme");
const Member = require("../models/Member");
const PendingAction = require("../models/PendingAction");
const User = require("../models/User");
const { createPendingAction } = require("./pendingActionService");
const { getLookupValueByTypeAndKey } = require("./lookupService");

async function ensureDefaultProgramme() {
  const existingProgramme = await DiscipleshipProgramme.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (existingProgramme) {
    return existingProgramme;
  }

  return DiscipleshipProgramme.create({
    name: "New Converts Foundation",
    expectedDurationDays: 90,
    modules: [
      { title: "Salvation Assurance", order: 1 },
      { title: "Prayer And Devotion", order: 2 },
      { title: "Bible Foundations", order: 3 },
      { title: "Church Fellowship", order: 4 },
      { title: "Ministry Integration", order: 5 },
    ],
    isActive: true,
  });
}

async function createProgramme(payload) {
  if (!payload.name) {
    throw new Error("Programme name is required.");
  }

  const modules = normalizeProgrammeModules(payload.modules);
  return DiscipleshipProgramme.create({
    name: payload.name,
    expectedDurationDays: Number(payload.expectedDurationDays) || 90,
    modules,
    isActive: payload.isActive !== false,
  });
}

async function updateProgramme(programme, payload) {
  programme.name = payload.name ?? programme.name;
  programme.expectedDurationDays =
    payload.expectedDurationDays !== undefined
      ? Number(payload.expectedDurationDays) || programme.expectedDurationDays
      : programme.expectedDurationDays;
  programme.isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : programme.isActive;
  if (payload.modules) {
    programme.modules = normalizeProgrammeModules(payload.modules);
  }
  await programme.save();
  return programme;
}

async function resolveProgramme(programmeId) {
  if (programmeId) {
    const programme = await DiscipleshipProgramme.findById(programmeId);
    if (!programme) {
      throw new Error("Selected discipleship programme was not found.");
    }
    return programme;
  }

  return ensureDefaultProgramme();
}

async function validateMember(memberId) {
  const member = await Member.findById(memberId);
  if (!member) {
    throw new Error("Selected member was not found.");
  }
  return member;
}

async function validateMentor(mentorId) {
  if (!mentorId) {
    return null;
  }

  const mentor = await User.findById(mentorId);
  if (!mentor) {
    throw new Error("Selected mentor was not found.");
  }
  return mentor;
}

async function createEnrollment(payload = {}) {
  if (!payload.memberId) {
    throw new Error("Member is required for discipleship enrollment.");
  }

  const [member, programme, mentor, activeStatus] = await Promise.all([
    validateMember(payload.memberId),
    resolveProgramme(payload.programmeId),
    validateMentor(payload.mentorId),
    getLookupValueByTypeAndKey("discipleship_enrollment_status", "active"),
  ]);

  const existingEnrollment = await DiscipleshipEnrollment.findOne({
    memberId: member._id,
    status: activeStatus?._id || null,
  });
  if (existingEnrollment && !payload.allowMultipleActive) {
    return populateEnrollmentById(existingEnrollment._id);
  }

  const enrollment = await DiscipleshipEnrollment.create({
    memberId: member._id,
    programmeId: programme._id,
    mentorId: mentor?._id || null,
    mentorAssignedAt: mentor ? new Date() : null,
    enrollmentDate: payload.enrollmentDate ? new Date(payload.enrollmentDate) : new Date(),
    sessionsCompleted: [],
    status: payload.status || activeStatus?._id || null,
    completionDate: payload.completionDate ? new Date(payload.completionDate) : null,
    sourceProspectId: payload.sourceProspectId || "",
  });

  return populateEnrollmentById(enrollment._id);
}

async function updateEnrollment(enrollment, payload = {}) {
  if (payload.programmeId) {
    const programme = await resolveProgramme(payload.programmeId);
    enrollment.programmeId = programme._id;
  }

  if (payload.memberId) {
    const member = await validateMember(payload.memberId);
    enrollment.memberId = member._id;
  }

  if (payload.status) {
    enrollment.status = payload.status;
  }

  if (payload.enrollmentDate) {
    enrollment.enrollmentDate = new Date(payload.enrollmentDate);
  }

  if (payload.completionDate !== undefined) {
    enrollment.completionDate = payload.completionDate ? new Date(payload.completionDate) : null;
  }

  await enrollment.save();
  return populateEnrollmentById(enrollment._id);
}

async function assignMentor(enrollment, mentorId) {
  const mentor = await validateMentor(mentorId);
  if (!mentor) {
    throw new Error("Mentor is required.");
  }

  enrollment.mentorId = mentor._id;
  enrollment.mentorAssignedAt = new Date();
  await enrollment.save();
  return populateEnrollmentById(enrollment._id);
}

async function addEnrollmentSession(enrollment, payload = {}) {
  if (!payload.sessionName) {
    throw new Error("Session name is required.");
  }

  enrollment.sessionsCompleted = [
    ...(enrollment.sessionsCompleted || []),
    {
      sessionName: payload.sessionName,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : new Date(),
      notes: payload.notes || "",
    },
  ];

  if (payload.status) {
    enrollment.status = payload.status;
  }

  await enrollment.save();
  return populateEnrollmentById(enrollment._id);
}

async function completeEnrollment(enrollment, payload = {}) {
  const completedStatus = payload.status || (await getLookupValueByTypeAndKey("discipleship_enrollment_status", "completed"))?._id;
  enrollment.status = completedStatus || enrollment.status;
  enrollment.completionDate = payload.completionDate ? new Date(payload.completionDate) : new Date();
  await enrollment.save();
  return populateEnrollmentById(enrollment._id);
}

async function createEnrollmentFromConversion({ memberId, sourceProspectId = "", mentorId = null }) {
  const defaultProgramme = await ensureDefaultProgramme();
  return createEnrollment({
    memberId,
    programmeId: defaultProgramme._id,
    mentorId,
    sourceProspectId,
    allowMultipleActive: false,
  });
}

async function getOverdueEnrollments({ windowDays = 14 } = {}) {
  const [enrollments, overdueStatus] = await Promise.all([
    populateEnrollmentQuery(),
    getLookupValueByTypeAndKey("discipleship_enrollment_status", "overdue"),
  ]);

  const now = Date.now();
  const overdueCutoff = now - Number(windowDays) * 24 * 60 * 60 * 1000;
  const overdueItems = [];

  for (const enrollment of enrollments) {
    const latestSession = [...(enrollment.sessionsCompleted || [])]
      .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())[0];
    const lastTouch = latestSession?.completedAt || enrollment.enrollmentDate;

    if (!lastTouch || new Date(lastTouch).getTime() > overdueCutoff) {
      continue;
    }

    overdueItems.push(enrollment);

    const existingPendingAction = await PendingAction.findOne({
      sourceModule: "Discipleship",
      sourceRecordType: "DiscipleshipEnrollment",
      sourceRecordId: enrollment._id.toString(),
      reason: "Discipleship follow-up overdue",
      status: "Open",
    });

    if (!existingPendingAction) {
      await createPendingAction({
        subjectType: "Member",
        subjectId: enrollment.memberId?.memberId || enrollment.memberId?._id?.toString() || "",
        reason: "Discipleship follow-up overdue",
        assignedUser: enrollment.mentorId?._id || null,
        dueDate: new Date(),
        status: "Open",
        sourceModule: "Discipleship",
        sourceRecordType: "DiscipleshipEnrollment",
        sourceRecordId: enrollment._id.toString(),
        priority: "High",
        metadata: {
          memberName: `${enrollment.memberId?.firstName || ""} ${enrollment.memberId?.lastName || ""}`.trim(),
          programmeName: enrollment.programmeId?.name || "",
          windowDays: Number(windowDays),
        },
      });
    }

    if (overdueStatus && enrollment.status?.key !== "completed") {
      const enrollmentDocument = await DiscipleshipEnrollment.findById(enrollment._id);
      if (enrollmentDocument) {
        enrollmentDocument.status = overdueStatus._id;
        await enrollmentDocument.save();
      }
    }
  }

  return overdueItems;
}

async function getDashboardMetrics({ mentorWindowDays = 7, overdueWindowDays = 14 } = {}) {
  const enrollments = await populateEnrollmentQuery();
  const overdue = await getOverdueEnrollments({ windowDays: overdueWindowDays });

  const statusSummaryMap = enrollments.reduce((accumulator, enrollment) => {
    const label = enrollment.status?.label || "Unknown";
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  const programmeSummaryMap = enrollments.reduce((accumulator, enrollment) => {
    const label = enrollment.programmeId?.name || "Unassigned";
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  const mentorWindowMs = Number(mentorWindowDays) * 24 * 60 * 60 * 1000;
  const coveredWithinWindow = enrollments.filter((enrollment) => {
    if (!enrollment.mentorAssignedAt) {
      return false;
    }

    return (
      new Date(enrollment.mentorAssignedAt).getTime() - new Date(enrollment.enrollmentDate).getTime()
    ) <= mentorWindowMs;
  }).length;

  const coverageRate = enrollments.length
    ? Math.round((coveredWithinWindow / enrollments.length) * 100)
    : 0;

  return {
    totalProgrammes: await DiscipleshipProgramme.countDocuments(),
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter((item) => item.status?.key === "active").length,
    overdueEnrollments: overdue.length,
    mentorCoverageRate: coverageRate,
    statusSummary: Object.entries(statusSummaryMap).map(([name, value]) => ({ name, value })),
    programmeSummary: Object.entries(programmeSummaryMap).map(([name, value]) => ({ name, value })),
  };
}

async function populateProgrammeQuery(query = {}) {
  return DiscipleshipProgramme.find(query).sort({ createdAt: -1, name: 1 });
}

async function populateEnrollmentById(id) {
  return DiscipleshipEnrollment.findById(id)
    .populate("memberId", "memberId firstName lastName familyId familyName")
    .populate("programmeId", "name expectedDurationDays modules isActive")
    .populate("mentorId", "displayName username")
    .populate("status", "label key");
}

async function populateEnrollmentQuery(query = {}) {
  return DiscipleshipEnrollment.find(query)
    .populate("memberId", "memberId firstName lastName familyId familyName")
    .populate("programmeId", "name expectedDurationDays modules isActive")
    .populate("mentorId", "displayName username")
    .populate("status", "label key")
    .sort({ enrollmentDate: -1, createdAt: -1 });
}

function normalizeProgrammeModules(modules) {
  const rawModules = Array.isArray(modules)
    ? modules
    : String(modules || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((title) => ({ title }));

  return rawModules
    .map((item, index) => ({
      title: String(item.title || item.sessionName || "").trim(),
      description: String(item.description || "").trim(),
      order: Number(item.order) || index + 1,
    }))
    .filter((item) => item.title);
}

module.exports = {
  addEnrollmentSession,
  assignMentor,
  completeEnrollment,
  createEnrollment,
  createEnrollmentFromConversion,
  createProgramme,
  ensureDefaultProgramme,
  getDashboardMetrics,
  getOverdueEnrollments,
  populateEnrollmentQuery,
  populateProgrammeQuery,
  updateEnrollment,
  updateProgramme,
};
