import { findUserIdByMemberId, formatDateInputValue } from "./appContextFormUtils";

export function hydrateVisitorRecord(visitor) {
  if (!visitor) {
    return visitor;
  }

  return {
    ...visitor,
    gender: visitor.gender || "",
    howHeard: visitor.howHeard || "",
    status: visitor.status || "",
    assignedFollowUpUserId: visitor.assignedFollowUpUserId || "",
    assignedFollowUpMemberId: visitor.assignedFollowUpMemberId || "",
  };
}

export function normalizeVisitorDraft(draft, users = []) {
  const assignedMemberId =
    draft.assignedFollowUpMemberId?.memberId ||
    draft.assignedFollowUpMemberId ||
    draft.assignedFollowUpUserId?.memberId ||
    "";
  const assignedUserId =
    draft.assignedFollowUpUserId?._id ||
    draft.assignedFollowUpUserId ||
    findUserIdByMemberId(users, assignedMemberId) ||
    null;

  return {
    visitorId: draft.visitorId,
    firstName: draft.firstName || "",
    surname: draft.surname || "",
    gender: draft.gender || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    firstVisitDate: draft.firstVisitDate || new Date().toISOString().slice(0, 10),
    howHeard: draft.howHeard?._id || draft.howHeard || null,
    assignedFollowUpUserId: assignedUserId,
    assignedFollowUpMemberId: assignedMemberId || "",
  };
}

export function hydrateProspectRecord(prospect) {
  if (!prospect) {
    return prospect;
  }

  return {
    ...prospect,
    gender: prospect.gender || "",
    source: prospect.source || "",
    assignedEvangelistId: prospect.assignedEvangelistId || "",
    assignedEvangelistMemberId: prospect.assignedEvangelistMemberId || "",
    currentStage: prospect.currentStage || "",
    campaignId: prospect.campaignId || "",
    sourceVisitorId: prospect.sourceVisitorId || "",
    dateFirstContact: formatDateInputValue(prospect.dateFirstContact),
    nextFollowUpDate: formatDateInputValue(prospect.nextFollowUpDate),
    baptismDate: formatDateInputValue(prospect.baptismDate),
    convertedMemberId: prospect.convertedMemberId || "",
    notesSummary: prospect.notesSummary || "",
    dataEntryClerk: prospect.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(prospect.dateCaptured || prospect.createdAt),
    stageHistory: Array.isArray(prospect.stageHistory) ? prospect.stageHistory : [],
  };
}

export function normalizeProspectDraft(draft, users = []) {
  const assignedMemberId =
    draft.assignedEvangelistMemberId?.memberId ||
    draft.assignedEvangelistMemberId ||
    draft.assignedEvangelistId?.memberId ||
    "";
  const assignedUserId =
    draft.assignedEvangelistId?._id ||
    draft.assignedEvangelistId ||
    findUserIdByMemberId(users, assignedMemberId) ||
    null;

  return {
    prospectId: draft.prospectId,
    firstName: draft.firstName || "",
    surname: draft.surname || "",
    gender: draft.gender || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    source: draft.source?._id || draft.source || null,
    assignedEvangelistId: assignedUserId,
    assignedEvangelistMemberId: assignedMemberId || "",
    currentStage: draft.currentStage?._id || draft.currentStage || null,
    campaignId: draft.campaignId?._id || draft.campaignId || null,
    sourceVisitorId: draft.sourceVisitorId || "",
    dateFirstContact: draft.dateFirstContact || null,
    nextFollowUpDate: draft.nextFollowUpDate || null,
    baptismDate: draft.baptismDate || null,
    convertedMemberId: draft.convertedMemberId || "",
    notesSummary: draft.notesSummary || "",
    dataEntryClerk: draft.dataEntryClerk || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
  };
}

export function hydrateBibleStudyRecord(study) {
  if (!study) {
    return study;
  }

  return {
    ...study,
    bibleStudyId: study.bibleStudyId || "",
    prospect: study.prospect || null,
    member: study.member || null,
    teacherId: study.teacherId || null,
    teacherMemberId: study.teacherMemberId || "",
    studyType: study.studyType || "",
    startDate: formatDateInputValue(study.startDate),
    lastSessionDate: formatDateInputValue(study.lastSessionDate),
    status: study.status || "",
    nextSessionDate: formatDateInputValue(study.nextSessionDate),
    outcome: study.outcome || "",
    dataEntryClerk: study.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(study.dateCaptured || study.createdAt),
    lessonsCompleted: Array.isArray(study.lessonsCompleted) ? study.lessonsCompleted : [],
  };
}

export function normalizeBibleStudyDraft(draft, users = []) {
  const teacherMemberId =
    draft.teacherMemberId?.memberId ||
    draft.teacherMemberId ||
    draft.teacherId?.memberId ||
    "";
  const teacherUserId =
    draft.teacherId?._id ||
    draft.teacherId ||
    findUserIdByMemberId(users, teacherMemberId) ||
    null;

  return {
    bibleStudyId: draft.bibleStudyId || "",
    prospect: draft.prospect?._id || draft.prospect || null,
    member: draft.member?._id || draft.member || null,
    teacherId: teacherUserId,
    teacherMemberId: teacherMemberId || "",
    studyType: draft.studyType || "",
    startDate: draft.startDate || new Date().toISOString().slice(0, 10),
    lastSessionDate: draft.lastSessionDate || null,
    status: draft.status?._id || draft.status || null,
    nextSessionDate: draft.nextSessionDate || null,
    outcome: draft.outcome || "",
    dataEntryClerk: draft.dataEntryClerk || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
  };
}

export function hydrateDiscipleshipProgrammeRecord(programme) {
  if (!programme) {
    return programme;
  }

  return {
    ...programme,
    modules: Array.isArray(programme.modules)
      ? programme.modules.map((item) => item.title).join(", ")
      : programme.modules || "",
  };
}

export function hydrateDiscipleshipEnrollmentRecord(enrollment) {
  if (!enrollment) {
    return enrollment;
  }

  return {
    ...enrollment,
    memberId: enrollment.memberId || null,
    programmeId: enrollment.programmeId || null,
    mentorId: enrollment.mentorId || null,
    status: enrollment.status || "",
    sessionsCompleted: Array.isArray(enrollment.sessionsCompleted) ? enrollment.sessionsCompleted : [],
  };
}

export function normalizeDiscipleshipProgrammeDraft(draft) {
  return {
    name: draft.name || "",
    expectedDurationDays: Number(draft.expectedDurationDays || 90),
    modules: String(draft.modules || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((title, index) => ({ title, order: index + 1 })),
    isActive: draft.isActive !== false && draft.isActive !== "false",
  };
}

export function normalizeDiscipleshipEnrollmentDraft(draft) {
  return {
    memberId: draft.memberId?._id || draft.memberId || null,
    programmeId: draft.programmeId?._id || draft.programmeId || null,
    mentorId: draft.mentorId?._id || draft.mentorId || null,
    enrollmentDate: draft.enrollmentDate || new Date().toISOString().slice(0, 10),
    status: draft.status?._id || draft.status || null,
    completionDate: draft.completionDate || null,
    sourceProspectId: draft.sourceProspectId || "",
  };
}
