const BibleStudy = require("../models/BibleStudy");
const Campaign = require("../models/Campaign");
const EvangelismContact = require("../models/EvangelismContact");
const EvangelismProspect = require("../models/EvangelismProspect");
const Member = require("../models/Member");
const User = require("../models/User");
const Visitor = require("../models/Visitor");
const { createEnrollmentFromConversion } = require("./discipleshipService");
const { createMemberFromProfile } = require("./memberConversionService");
const { createPendingAction } = require("./pendingActionService");
const { getLookupValueByTypeAndKey } = require("./lookupService");

async function generateNextProspectId() {
  const prospects = await EvangelismProspect.find({}, { prospectId: 1 }).lean();
  const nextNumber =
    prospects.reduce((maxValue, item) => {
      const numericPart = Number(String(item.prospectId || "").replace("EP", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `EP${String(nextNumber).padStart(4, "0")}`;
}

async function createProspect(payload, user = null) {
  if (!payload.firstName || !payload.surname) {
    throw new Error("First name and surname are required.");
  }

  const contactStage = await getLookupValueByTypeAndKey("evangelism_pipeline_stage", "contact");
  const stageId = payload.currentStage || contactStage?._id || null;
  const prospect = await EvangelismProspect.create({
    prospectId: payload.prospectId || (await generateNextProspectId()),
    firstName: payload.firstName,
    surname: payload.surname,
    phone: payload.phone || "",
    email: payload.email || "",
    residentialArea: payload.residentialArea || "",
    source: payload.source || null,
    assignedEvangelistId: payload.assignedEvangelistId || null,
    currentStage: stageId,
    campaignId: payload.campaignId || null,
    sourceVisitorId: payload.sourceVisitorId || "",
    stageHistory: stageId
      ? [{ stage: stageId, date: new Date(), changedBy: user?._id || null }]
      : [],
  });

  return populateProspectById(prospect._id);
}

async function createProspectFromVisitor(visitor, user = null) {
  if (visitor.convertedToProspectId) {
    return EvangelismProspect.findOne({ prospectId: visitor.convertedToProspectId })
      .populate("source", "label key")
      .populate("assignedEvangelistId", "displayName username")
      .populate("currentStage", "label key")
      .populate("campaignId", "name startDate endDate");
  }

  const prospect = await createProspect(
    {
      firstName: visitor.firstName,
      surname: visitor.surname,
      phone: visitor.phone || "",
      email: visitor.email || "",
      residentialArea: visitor.residentialArea || "",
      source: visitor.howHeard || null,
      assignedEvangelistId: visitor.assignedFollowUpUserId || null,
      sourceVisitorId: visitor.visitorId,
    },
    user
  );

  return prospect;
}

async function updateProspect(prospect, payload) {
  prospect.firstName = payload.firstName ?? prospect.firstName;
  prospect.surname = payload.surname ?? prospect.surname;
  prospect.phone = payload.phone ?? prospect.phone;
  prospect.email = payload.email ?? prospect.email;
  prospect.residentialArea = payload.residentialArea ?? prospect.residentialArea;
  prospect.source = payload.source ?? prospect.source;
  prospect.assignedEvangelistId = payload.assignedEvangelistId ?? prospect.assignedEvangelistId;
  prospect.campaignId = payload.campaignId ?? prospect.campaignId;
  await prospect.save();

  return populateProspectById(prospect._id);
}

async function assignProspect(prospect, assignedUserId) {
  if (!assignedUserId) {
    throw new Error("Assigned user is required.");
  }

  await validateAssignmentUser(assignedUserId);
  prospect.assignedEvangelistId = assignedUserId;
  await prospect.save();

  await createPendingAction({
    subjectType: "Prospect",
    subjectId: prospect.prospectId,
    reason: "Prospect follow-up assigned",
    assignedUser: assignedUserId,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "Open",
    sourceModule: "Evangelism",
    sourceRecordType: "EvangelismProspect",
    sourceRecordId: prospect.prospectId,
    priority: "Normal",
    metadata: {
      prospectName: `${prospect.firstName} ${prospect.surname}`,
    },
  });

  return populateProspectById(prospect._id);
}

async function moveProspectStage(prospect, stageId, changedBy) {
  if (!stageId) {
    throw new Error("Stage is required.");
  }

  prospect.currentStage = stageId;
  prospect.stageHistory = [
    ...(prospect.stageHistory || []),
    {
      stage: stageId,
      date: new Date(),
      changedBy: changedBy?._id || null,
    },
  ];
  await prospect.save();

  return populateProspectById(prospect._id);
}

async function logProspectContact(prospect, payload, user) {
  const contact = await EvangelismContact.create({
    prospect: prospect._id,
    date: payload.date ? new Date(payload.date) : new Date(),
    contactedBy: payload.contactedBy || user?._id || null,
    notes: payload.notes || "",
    nextFollowUpDate: payload.nextFollowUpDate ? new Date(payload.nextFollowUpDate) : null,
  });

  if (contact.nextFollowUpDate) {
    await createPendingAction({
      subjectType: "Prospect",
      subjectId: prospect.prospectId,
      reason: "Prospect follow-up due",
      assignedUser: prospect.assignedEvangelistId || payload.contactedBy || user?._id || null,
      dueDate: contact.nextFollowUpDate,
      status: "Open",
      sourceModule: "Evangelism",
      sourceRecordType: "EvangelismContact",
      sourceRecordId: contact._id.toString(),
      priority: "Normal",
      metadata: {
        prospectName: `${prospect.firstName} ${prospect.surname}`,
      },
    });
  }

  return EvangelismContact.findById(contact._id)
    .populate("prospect", "prospectId firstName surname")
    .populate("contactedBy", "displayName username");
}

async function createBibleStudy(payload) {
  if (!payload.teacherId) {
    throw new Error("Teacher is required.");
  }

  if (!payload.prospect && !payload.member) {
    throw new Error("Select either a prospect or a member for Bible study.");
  }

  if (payload.prospect && !(await EvangelismProspect.findById(payload.prospect))) {
    throw new Error("Selected prospect was not found.");
  }

  if (payload.member && !(await Member.findById(payload.member))) {
    throw new Error("Selected member was not found.");
  }

  await validateAssignmentUser(payload.teacherId);
  const inProgressStatus = await getLookupValueByTypeAndKey("bible_study_status", "in_progress");
  const study = await BibleStudy.create({
    prospect: payload.prospect || null,
    member: payload.member || null,
    teacherId: payload.teacherId,
    startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
    status: payload.status || inProgressStatus?._id || null,
    lessonsCompleted: [],
  });

  return populateBibleStudyById(study._id);
}

async function addBibleStudyLesson(study, payload) {
  if (!payload.lessonName) {
    throw new Error("Lesson name is required.");
  }

  study.lessonsCompleted = [
    ...(study.lessonsCompleted || []),
    {
      lessonName: payload.lessonName,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : new Date(),
      notes: payload.notes || "",
    },
  ];

  if (payload.status) {
    study.status = payload.status;
  }

  await study.save();
  return populateBibleStudyById(study._id);
}

async function updateBibleStudy(study, payload) {
  if (payload.prospect) {
    study.prospect = payload.prospect;
  }

  if (payload.member) {
    study.member = payload.member;
  }

  if (payload.teacherId) {
    await validateAssignmentUser(payload.teacherId);
    study.teacherId = payload.teacherId;
  }

  if (payload.startDate) {
    study.startDate = new Date(payload.startDate);
  }

  if (payload.status) {
    study.status = payload.status;
  }

  await study.save();
  return populateBibleStudyById(study._id);
}

async function createCampaign(payload) {
  if (!payload.name) {
    throw new Error("Campaign name is required.");
  }

  return Campaign.create({
    name: payload.name,
    startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
    endDate: payload.endDate ? new Date(payload.endDate) : null,
    summaryNotes: payload.summaryNotes || "",
  });
}

async function updateCampaign(campaign, payload) {
  campaign.name = payload.name ?? campaign.name;
  campaign.startDate = payload.startDate ? new Date(payload.startDate) : campaign.startDate;
  campaign.endDate = payload.endDate ? new Date(payload.endDate) : null;
  campaign.summaryNotes = payload.summaryNotes ?? campaign.summaryNotes;
  await campaign.save();
  return campaign;
}

async function convertProspectToMember(prospect, payload = {}, user = null) {
  const sourceVisitor = prospect.sourceVisitorId
    ? await Visitor.findOne({ visitorId: prospect.sourceVisitorId })
    : null;

  if (sourceVisitor?.convertedToMemberId) {
    return Member.findOne({ memberId: sourceVisitor.convertedToMemberId });
  }

  const member = await createMemberFromProfile(prospect, {
    ...payload,
    notes: payload.notes || "Created from evangelism prospect conversion",
  });

  if (sourceVisitor) {
    const memberStatus = await getLookupValueByTypeAndKey("visitor_status", "converted_to_member");
    sourceVisitor.convertedToMemberId = member.memberId;
    sourceVisitor.status = memberStatus?._id || sourceVisitor.status;
    await sourceVisitor.save();
  }

  await createEnrollmentFromConversion({
    memberId: member._id,
    sourceProspectId: prospect.prospectId,
    mentorId: prospect.assignedEvangelistId || null,
  });

  const discipleshipStage = await getLookupValueByTypeAndKey("evangelism_pipeline_stage", "discipleship");
  if (discipleshipStage) {
    await moveProspectStage(prospect, discipleshipStage._id, user);
  }

  return member;
}

async function getDashboardMetrics() {
  const [prospects, contacts, studies, campaigns] = await Promise.all([
    EvangelismProspect.find()
      .populate("currentStage", "label key")
      .populate("assignedEvangelistId", "displayName username"),
    EvangelismContact.find().populate("prospect", "prospectId"),
    BibleStudy.find().populate("teacherId", "displayName username").populate("status", "label key"),
    Campaign.find(),
  ]);

  const stageSummary = prospects.reduce((accumulator, prospect) => {
    const label = prospect.currentStage?.label || "Unassigned";
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  const evangelistSummary = prospects.reduce((accumulator, prospect) => {
    const label = prospect.assignedEvangelistId?.displayName || "Unassigned";
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalProspects: prospects.length,
    totalContacts: contacts.length,
    activeBibleStudies: studies.filter((study) => study.status?.key !== "completed").length,
    totalCampaigns: campaigns.length,
    stageSummary: Object.entries(stageSummary).map(([name, value]) => ({ name, value })),
    evangelistSummary: Object.entries(evangelistSummary).map(([name, value]) => ({ name, value })),
  };
}

async function populateProspectById(id) {
  return EvangelismProspect.findById(id)
    .populate("source", "label key")
    .populate("assignedEvangelistId", "displayName username")
    .populate("currentStage", "label key")
    .populate("campaignId", "name startDate endDate");
}

async function populateProspectQuery(query = {}) {
  return EvangelismProspect.find(query)
    .populate("source", "label key")
    .populate("assignedEvangelistId", "displayName username")
    .populate("currentStage", "label key")
    .populate("campaignId", "name startDate endDate")
    .sort({ createdAt: -1 });
}

async function populateContactsQuery(query = {}) {
  return EvangelismContact.find(query)
    .populate("prospect", "prospectId firstName surname currentStage")
    .populate("contactedBy", "displayName username")
    .sort({ date: -1, createdAt: -1 });
}

async function populateBibleStudyById(id) {
  return BibleStudy.findById(id)
    .populate("prospect", "prospectId firstName surname")
    .populate("member", "memberId firstName lastName")
    .populate("teacherId", "displayName username")
    .populate("status", "label key");
}

async function populateBibleStudiesQuery(query = {}) {
  return BibleStudy.find(query)
    .populate("prospect", "prospectId firstName surname")
    .populate("member", "memberId firstName lastName")
    .populate("teacherId", "displayName username")
    .populate("status", "label key")
    .sort({ startDate: -1, createdAt: -1 });
}

async function populateCampaignQuery(query = {}) {
  const campaigns = await Campaign.find(query).sort({ startDate: -1, createdAt: -1 }).lean();
  const prospects = await EvangelismProspect.find({}, { campaignId: 1, currentStage: 1 }).lean();

  return campaigns.map((campaign) => {
    const linkedProspects = prospects.filter(
      (prospect) => String(prospect.campaignId || "") === String(campaign._id)
    );

    return {
      ...campaign,
      linkedProspects: linkedProspects.length,
    };
  });
}

async function validateAssignmentUser(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Assigned evangelist not found.");
  }

  return user;
}

module.exports = {
  addBibleStudyLesson,
  assignProspect,
  createBibleStudy,
  createCampaign,
  createProspect,
  createProspectFromVisitor,
  convertProspectToMember,
  generateNextProspectId,
  getDashboardMetrics,
  logProspectContact,
  moveProspectStage,
  populateBibleStudiesQuery,
  populateCampaignQuery,
  populateContactsQuery,
  populateProspectQuery,
  updateBibleStudy,
  updateCampaign,
  updateProspect,
  validateAssignmentUser,
};
