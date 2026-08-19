const Member = require("../models/Member");
const Visitor = require("../models/Visitor");
const { createProspectFromVisitor } = require("./evangelismService");
const { createMemberFromProfile } = require("./memberConversionService");
const { createPendingAction } = require("./pendingActionService");
const { getLookupValueByTypeAndKey } = require("./lookupService");

async function generateNextVisitorId() {
  const visitors = await Visitor.find({}, { visitorId: 1 }).lean();
  const nextNumber =
    visitors.reduce((maxValue, item) => {
      const numericPart = Number(String(item.visitorId || "").replace("VS", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `VS${String(nextNumber).padStart(4, "0")}`;
}

async function resolveVisitorStatus({ visitDates, convertedToProspectId, convertedToMemberId }) {
  if (convertedToMemberId) {
    return getLookupValueByTypeAndKey("visitor_status", "converted_to_member");
  }

  if (convertedToProspectId) {
    return getLookupValueByTypeAndKey("visitor_status", "converted_to_prospect");
  }

  if ((visitDates || []).length <= 1) {
    return getLookupValueByTypeAndKey("visitor_status", "first_time");
  }

  const sortedDates = [...(visitDates || [])]
    .map((item) => new Date(item.date))
    .sort((left, right) => right.getTime() - left.getTime());
  const latestVisit = sortedDates[0];
  const diffDays = (Date.now() - latestVisit.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > 90) {
    return getLookupValueByTypeAndKey("visitor_status", "lapsed");
  }

  return getLookupValueByTypeAndKey("visitor_status", "repeat_staying");
}

async function createVisitor(payload) {
  const visitorId = payload.visitorId || (await generateNextVisitorId());
  const firstVisitDate = payload.firstVisitDate ? new Date(payload.firstVisitDate) : new Date();
  const visitDates = payload.visitDates?.length
    ? payload.visitDates.map((item) => ({ date: new Date(item.date), notes: item.notes || "" }))
    : [{ date: firstVisitDate, notes: "Initial visitor registration" }];
  const status = await resolveVisitorStatus({ visitDates });

  return Visitor.create({
    visitorId,
    firstName: payload.firstName,
    surname: payload.surname,
    phone: payload.phone || "",
    email: payload.email || "",
    residentialArea: payload.residentialArea || "",
    firstVisitDate,
    howHeard: payload.howHeard || null,
    visitCount: visitDates.length,
    visitDates,
    status: status?._id || null,
    assignedFollowUpUserId: payload.assignedFollowUpUserId || null,
    visitationHistory: [],
    convertedToProspectId: "",
    convertedToMemberId: "",
  });
}

async function addChurchVisit(visitor, payload) {
  const nextVisitDates = [
    ...(visitor.visitDates || []),
    {
      date: payload.date ? new Date(payload.date) : new Date(),
      notes: payload.notes || "",
    },
  ];

  const status = await resolveVisitorStatus({
    visitDates: nextVisitDates,
    convertedToProspectId: visitor.convertedToProspectId,
    convertedToMemberId: visitor.convertedToMemberId,
  });

  visitor.visitDates = nextVisitDates;
  visitor.visitCount = nextVisitDates.length;
  visitor.status = status?._id || visitor.status;
  await visitor.save();

  return visitor;
}

async function assignVisitorFollowUp(visitor, assignedUserId) {
  visitor.assignedFollowUpUserId = assignedUserId;
  await visitor.save();

  await createPendingAction({
    subjectType: "Visitor",
    subjectId: visitor.visitorId,
    reason: "Visitor follow-up assigned",
    assignedUser: assignedUserId,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: "Open",
    sourceModule: "Visitor Management",
    sourceRecordType: "Visitor",
    sourceRecordId: visitor.visitorId,
    priority: "Normal",
    metadata: {
      visitorName: `${visitor.firstName} ${visitor.surname}`,
    },
  });

  return visitor;
}

async function addHomeVisit(visitor, payload) {
  visitor.visitationHistory = [
    ...(visitor.visitationHistory || []),
    {
      date: payload.date ? new Date(payload.date) : new Date(),
      visitedBy: payload.visitedBy || null,
      notes: payload.notes || "",
    },
  ];

  await visitor.save();
  return visitor;
}

async function convertVisitorToProspect(visitor, user) {
  if (visitor.convertedToProspectId) {
    return createProspectFromVisitor(visitor, user);
  }

  const prospect = await createProspectFromVisitor(visitor, user);

  visitor.convertedToProspectId = prospect.prospectId;
  visitor.status = (await getLookupValueByTypeAndKey("visitor_status", "converted_to_prospect"))?._id || visitor.status;
  await visitor.save();

  return prospect;
}

async function convertVisitorToMember(visitor, payload = {}) {
  if (visitor.convertedToMemberId) {
    return Member.findOne({ memberId: visitor.convertedToMemberId });
  }

  const member = await createMemberFromProfile(visitor, {
    ...payload,
    notes: payload.notes || "Created from visitor conversion",
  });

  visitor.convertedToMemberId = member.memberId;
  visitor.status = (await getLookupValueByTypeAndKey("visitor_status", "converted_to_member"))?._id || visitor.status;
  await visitor.save();

  return member;
}

async function getRetentionMetrics({ windowDays = 30 }) {
  const firstTimeStatus = await getLookupValueByTypeAndKey("visitor_status", "first_time");
  const visitors = await Visitor.find(firstTimeStatus ? { status: firstTimeStatus._id } : {});
  const returningVisitors = visitors.filter((visitor) => {
    const visitDates = [...(visitor.visitDates || [])].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    );

    if (visitDates.length < 2) {
      return false;
    }

    const firstVisit = new Date(visitDates[0].date);
    const secondVisit = new Date(visitDates[1].date);
    const diffDays = (secondVisit.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= windowDays;
  });

  const retentionRate = visitors.length ? Math.round((returningVisitors.length / visitors.length) * 100) : 0;

  return {
    windowDays,
    firstTimeVisitors: visitors.length,
    returningVisitors: returningVisitors.length,
    retentionRate,
  };
}

async function populateVisitorQuery(query = {}) {
  return Visitor.find(query)
    .populate("howHeard", "label key")
    .populate("status", "label key")
    .populate("assignedFollowUpUserId", "displayName username")
    .populate("visitationHistory.visitedBy", "displayName username")
    .sort({ createdAt: -1 });
}

module.exports = {
  addChurchVisit,
  addHomeVisit,
  assignVisitorFollowUp,
  convertVisitorToMember,
  convertVisitorToProspect,
  createVisitor,
  generateNextVisitorId,
  getRetentionMetrics,
  populateVisitorQuery,
};
