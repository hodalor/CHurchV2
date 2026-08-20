const AttendanceEvent = require("../models/AttendanceEvent");
const AttendanceRecord = require("../models/AttendanceRecord");
const Campaign = require("../models/Campaign");
const CommunicationGroup = require("../models/CommunicationGroup");
const DiscipleshipEnrollment = require("../models/DiscipleshipEnrollment");
const EvangelismContact = require("../models/EvangelismContact");
const EvangelismProspect = require("../models/EvangelismProspect");
const KPI = require("../models/KPI");
const KPIActual = require("../models/KPIActual");
const KPITarget = require("../models/KPITarget");
const Member = require("../models/Member");
const Ministry = require("../models/Ministry");
const SkillTalent = require("../models/SkillTalent");
const SuccessionReadiness = require("../models/SuccessionReadiness");
const SuccessionRequirement = require("../models/SuccessionRequirement");
const User = require("../models/User");
const Visitor = require("../models/Visitor");
const { enforceCommunicationPreferences, resolveCommunicationAudience } = require("./communicationService");
const { generateClaudeText, hasClaudeConfig } = require("./claudeService");
const { getLookupValueByTypeAndKey } = require("./lookupService");
const { getStrategicScorecard } = require("./strategicService");
const { upsertAiSuggestion } = require("./aiService");

function diffDays(fromDate, toDate = new Date()) {
  if (!fromDate) {
    return 0;
  }

  const start = new Date(fromDate);
  const end = new Date(toDate);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function sanitizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value = "") {
  return sanitizeText(value).toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

async function draftNarrative({ systemPrompt, userPrompt, fallbackText, maxTokens = 220 }) {
  if (!hasClaudeConfig()) {
    return {
      text: fallbackText,
      enabled: false,
    };
  }

  const response = await generateClaudeText({
    systemPrompt,
    userPrompt,
    maxTokens,
  });

  return {
    text: sanitizeText(response.text) || fallbackText,
    enabled: response.enabled,
  };
}

async function generateVisitorFollowUpSuggestions({
  user,
  windowDays = 30,
  limit = 20,
  ipAddress = "",
} = {}) {
  const visitors = await Visitor.find({
    $or: [{ convertedToProspectId: { $in: ["", null] } }, { convertedToProspectId: { $exists: false } }],
    $or: [{ convertedToMemberId: { $in: ["", null] } }, { convertedToMemberId: { $exists: false } }],
  })
    .populate("howHeard", "label key")
    .populate("assignedFollowUpUserId", "displayName username")
    .sort({ firstVisitDate: 1 });

  const candidates = visitors
    .filter((visitor) => Number(visitor.visitCount || 0) <= 1 && diffDays(visitor.firstVisitDate) >= Number(windowDays))
    .slice(0, Number(limit));

  const suggestions = [];
  for (const visitor of candidates) {
    const hearingSource = visitor.howHeard?.label || "the church";
    const visitNote = sanitizeText(visitor.visitDates?.[0]?.notes || "");
    const draft = await draftNarrative({
      systemPrompt:
        "You draft warm, concise church visitor follow-up messages. Do not promise anything unverified. Keep the tone caring, human, and practical.",
      userPrompt: [
        `Visitor: ${visitor.firstName} ${visitor.surname}`.trim(),
        `How they heard about the church: ${hearingSource}`,
        `Residential area: ${visitor.residentialArea || "Not recorded"}`,
        `Days since first visit: ${diffDays(visitor.firstVisitDate)}`,
        `Recorded visit note: ${visitNote || "None"}`,
        "Write a short follow-up draft for a human reviewer to edit before sending.",
      ].join("\n"),
      fallbackText: `Hello ${visitor.firstName || ""}, thank you again for visiting us. We are glad you came through ${hearingSource}. We wanted to check in, hear how you are doing, and let you know you are welcome back any time.`
        .replace(/\s+/g, " ")
        .trim(),
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "visitor_follow_up_draft",
      subjectType: "Visitor",
      subjectId: visitor.visitorId,
      subjectLabel: `${visitor.firstName || ""} ${visitor.surname || ""}`.trim(),
      sourceModule: "Visitor Management",
      generatedForUser: user?._id || null,
      title: `Follow-up draft for ${visitor.firstName || visitor.visitorId}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "Visitor",
          recordId: visitor.visitorId,
          label: `${visitor.firstName || ""} ${visitor.surname || ""}`.trim(),
        },
      ],
      promptContextSummary: `Single-visit visitor has not returned within ${windowDays} days.`,
      metadata: {
        fingerprint: `visitor-follow-up:${visitor.visitorId}:${windowDays}`,
        windowDays: Number(windowDays),
        daysSinceFirstVisit: diffDays(visitor.firstVisitDate),
        howHeard: hearingSource,
        assignedFollowUpUserId: visitor.assignedFollowUpUserId?._id || null,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    suggestions.push(suggestion);
  }

  return suggestions;
}

async function generateEvangelismSuggestions({
  user,
  contactWindowDays = 14,
  stageWindowDays = 21,
  limit = 20,
  ipAddress = "",
} = {}) {
  const prospects = await EvangelismProspect.find({
    $or: [{ convertedMemberId: { $in: ["", null] } }, { convertedMemberId: { $exists: false } }],
  })
    .populate("source", "label key")
    .populate("currentStage", "label key")
    .populate("campaignId", "name")
    .populate("assignedEvangelistId", "displayName username")
    .sort({ createdAt: -1 });

  const contacts = await EvangelismContact.find({
    prospect: { $in: prospects.map((item) => item._id) },
  })
    .populate("contactedBy", "displayName username")
    .sort({ date: -1 });

  const latestContactByProspect = contacts.reduce((accumulator, item) => {
    const key = String(item.prospect);
    if (!accumulator.has(key)) {
      accumulator.set(key, item);
    }
    return accumulator;
  }, new Map());

  const stalledSuggestions = [];
  for (const prospect of prospects) {
    const latestContact = latestContactByProspect.get(String(prospect._id));
    const lastStageChange = [...(prospect.stageHistory || [])]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0];
    const daysSinceContact = diffDays(latestContact?.date || prospect.dateFirstContact || prospect.createdAt);
    const daysInStage = diffDays(lastStageChange?.date || prospect.createdAt);
    if (daysSinceContact < Number(contactWindowDays) && daysInStage < Number(stageWindowDays)) {
      continue;
    }

    const reasons = [];
    if (daysSinceContact >= Number(contactWindowDays)) {
      reasons.push(`no contact logged in ${daysSinceContact} days`);
    }
    if (daysInStage >= Number(stageWindowDays)) {
      reasons.push(`in ${prospect.currentStage?.label || "the current stage"} for ${daysInStage} days`);
    }

    const draft = await draftNarrative({
      systemPrompt:
        "You draft brief, practical evangelism follow-up suggestions. Stay grounded in the provided facts and do not overpromise.",
      userPrompt: [
        `Prospect: ${prospect.firstName} ${prospect.surname}`.trim(),
        `Source: ${prospect.source?.label || "Not recorded"}`,
        `Current stage: ${prospect.currentStage?.label || "Unassigned"}`,
        `Campaign: ${prospect.campaignId?.name || "None"}`,
        `Signals: ${reasons.join("; ")}`,
        `Latest notes summary: ${sanitizeText(prospect.notesSummary || latestContact?.notes || "None")}`,
        "Write one short next-contact suggestion for a human evangelism worker to review before using.",
      ].join("\n"),
      fallbackText: `${prospect.firstName || "This prospect"} has been ${reasons.join(" and ")}. A gentle follow-up that acknowledges their current stage and invites the next step would be timely.`,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "prospect_follow_up_draft",
      subjectType: "Prospect",
      subjectId: prospect.prospectId,
      subjectLabel: `${prospect.firstName || ""} ${prospect.surname || ""}`.trim(),
      sourceModule: "Evangelism",
      generatedForUser: user?._id || null,
      title: `Next-step draft for ${prospect.firstName || prospect.prospectId}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "EvangelismProspect",
          recordId: prospect.prospectId,
          label: `${prospect.firstName || ""} ${prospect.surname || ""}`.trim(),
        },
        ...(latestContact
          ? [
              {
                recordType: "EvangelismContact",
                recordId: latestContact._id.toString(),
                label: latestContact.contactedBy?.displayName || "Latest contact",
              },
            ]
          : []),
      ],
      promptContextSummary: `Prospect follow-up draft based on stalled pipeline signals: ${reasons.join(", ")}.`,
      metadata: {
        fingerprint: `prospect-follow-up:${prospect.prospectId}:${contactWindowDays}:${stageWindowDays}`,
        reasons,
        daysSinceContact,
        daysInStage,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    stalledSuggestions.push(suggestion);
    if (stalledSuggestions.length >= Number(limit)) {
      break;
    }
  }

  const campaigns = await Campaign.find().sort({ startDate: -1 }).limit(10).lean();
  const campaignSuggestions = [];
  for (const campaign of campaigns) {
    const linkedProspects = prospects.filter((item) => String(item.campaignId?._id || item.campaignId) === String(campaign._id));
    if (!linkedProspects.length) {
      continue;
    }

    const bibleStudyCount = linkedProspects.filter((item) => item.currentStage?.key === "bible_study").length;
    const baptizedCount = linkedProspects.filter((item) => item.baptismDate || item.convertedMemberId).length;
    const fallbackText = `${campaign.name}: ${linkedProspects.length} linked prospects, ${bibleStudyCount} in Bible study, ${baptizedCount} baptized or converted so far.`;
    const draft = await draftNarrative({
      systemPrompt:
        "You write short factual ministry summaries from supplied numbers only. Do not invent causes or add unsupported conclusions.",
      userPrompt: [
        `Campaign: ${campaign.name}`,
        `Linked prospects: ${linkedProspects.length}`,
        `Bible study stage count: ${bibleStudyCount}`,
        `Baptized or converted count: ${baptizedCount}`,
        "Write a concise campaign digest for a leadership review queue.",
      ].join("\n"),
      fallbackText,
      maxTokens: 120,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "campaign_digest",
      subjectType: "Campaign",
      subjectId: campaign._id.toString(),
      subjectLabel: campaign.name,
      sourceModule: "Evangelism",
      generatedForUser: user?._id || null,
      title: `Campaign digest for ${campaign.name}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "Campaign",
          recordId: campaign._id.toString(),
          label: campaign.name,
        },
      ],
      promptContextSummary: "Campaign summary generated from current prospect pipeline counts.",
      metadata: {
        fingerprint: `campaign-digest:${campaign._id}`,
        linkedProspects: linkedProspects.length,
        bibleStudyCount,
        baptizedCount,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    campaignSuggestions.push(suggestion);
  }

  return [...stalledSuggestions, ...campaignSuggestions];
}

async function generateMentorMatchSuggestions({
  user,
  limit = 15,
  ipAddress = "",
} = {}) {
  const enrollments = await DiscipleshipEnrollment.find({
    mentorId: null,
  })
    .populate("memberId", "memberId firstName lastName ministry residentialArea")
    .populate("programmeId", "name modules")
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  if (!enrollments.length) {
    return [];
  }

  const memberIds = enrollments.map((item) => item.memberId?._id).filter(Boolean);
  const [users, members, skillTalents, activeEnrollments] = await Promise.all([
    User.find({ status: { $ne: "Inactive" }, memberId: { $nin: ["", null] } }).lean(),
    Member.find({}).lean(),
    SkillTalent.find({ memberId: { $in: memberIds } }).populate("memberId", "memberId").lean(),
    DiscipleshipEnrollment.find({ mentorId: { $ne: null } }).populate("mentorId", "displayName username").lean(),
  ]);

  const memberByMemberId = new Map(members.map((member) => [member.memberId, member]));
  const candidateUsers = users
    .map((account) => ({
      account,
      member: memberByMemberId.get(account.memberId),
    }))
    .filter((item) => item.member);

  const skillMap = skillTalents.reduce((accumulator, item) => {
    const key = String(item.memberId?._id || item.memberId);
    accumulator.set(key, [...(accumulator.get(key) || []), item.skillOrTalent]);
    return accumulator;
  }, new Map());

  const mentorLoadMap = activeEnrollments.reduce((accumulator, item) => {
    const key = String(item.mentorId || "");
    if (!key) {
      return accumulator;
    }
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

  const suggestions = [];
  for (const enrollment of enrollments) {
    const enrollee = enrollment.memberId;
    if (!enrollee) {
      continue;
    }

    const enrolleeSkills = new Set(
      String(enrollee.educationOrSkills || "")
        .split(/[;,]/)
        .map((item) => normalizeKey(item))
        .filter(Boolean)
    );

    const candidates = candidateUsers
      .filter((item) => String(item.member?._id) !== String(enrollee._id))
      .map((item) => {
        const reasons = [];
        let score = 0;

        if (String(item.member.ministry || "") === String(enrollee.ministry || "")) {
          score += 35;
          reasons.push("same ministry involvement");
        }

        if (normalizeKey(item.member.residentialArea) && normalizeKey(item.member.residentialArea) === normalizeKey(enrollee.residentialArea)) {
          score += 10;
          reasons.push("same residential area");
        }

        const mentorSkills = new Set(
          [
            ...String(item.member.educationOrSkills || "")
              .split(/[;,]/)
              .map((entry) => normalizeKey(entry))
              .filter(Boolean),
            ...(skillMap.get(String(item.member._id)) || []).map((entry) => normalizeKey(entry)),
          ].filter(Boolean)
        );
        const sharedSkills = [...mentorSkills].filter((entry) => enrolleeSkills.has(entry));
        if (sharedSkills.length) {
          score += Math.min(20, sharedSkills.length * 8);
          reasons.push(`shared strengths in ${sharedSkills.slice(0, 2).join(", ")}`);
        }

        const currentLoad = mentorLoadMap.get(String(item.account._id)) || 0;
        score += Math.max(0, 20 - currentLoad * 5);
        reasons.push(currentLoad ? `${currentLoad} current mentoring assignment(s)` : "no current mentoring load");

        return {
          userId: item.account._id.toString(),
          displayName: item.account.displayName,
          memberId: item.member.memberId,
          score,
          currentLoad,
          reasons,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    if (!candidates.length) {
      continue;
    }

    const fallbackText = `Suggested mentors for ${enrollee.firstName || "this member"}: ${candidates
      .map((candidate) => `${candidate.displayName} (${candidate.reasons.slice(0, 2).join(", ")})`)
      .join("; ")}.`;

    const draft = await draftNarrative({
      systemPrompt:
        "You explain mentor-match suggestions for church discipleship workflows. Keep the wording administrative and factual. Do not imply an automatic assignment.",
      userPrompt: [
        `Enrollment member: ${enrollee.firstName} ${enrollee.lastName}`.trim(),
        `Programme: ${enrollment.programmeId?.name || "Unassigned"}`,
        `Top mentor candidates: ${candidates
          .map((candidate) => `${candidate.displayName} [score ${candidate.score}] because ${candidate.reasons.join(", ")}`)
          .join(" ; ")}`,
        "Write a short suggestion for a human reviewer.",
      ].join("\n"),
      fallbackText,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "mentor_match_suggestion",
      subjectType: "DiscipleshipEnrollment",
      subjectId: enrollment._id.toString(),
      subjectLabel: `${enrollee.memberId || ""} - ${enrollee.firstName || ""} ${enrollee.lastName || ""}`.trim(),
      sourceModule: "Discipleship",
      generatedForUser: user?._id || null,
      title: `Mentor options for ${enrollee.firstName || enrollee.memberId}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "DiscipleshipEnrollment",
          recordId: enrollment._id.toString(),
          label: enrollment.programmeId?.name || "Discipleship enrollment",
        },
      ],
      promptContextSummary: "Mentor options ranked deterministically by ministry fit, skill overlap, and current mentor load.",
      metadata: {
        fingerprint: `mentor-match:${enrollment._id}`,
        candidates,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    suggestions.push(suggestion);
  }

  return suggestions;
}

async function generateAttendanceAnomalySuggestions({
  user,
  eventCount = 8,
  recentMinistryWindowDays = 30,
  ipAddress = "",
} = {}) {
  const events = await AttendanceEvent.find({})
    .populate("ministryId", "name")
    .populate("eventTypeId", "label key")
    .sort({ date: -1 })
    .limit(Math.max(8, Number(eventCount)));

  if (!events.length) {
    return [];
  }

  const records = await AttendanceRecord.find({
    eventId: { $in: events.map((item) => item._id) },
    memberId: { $ne: null },
    present: true,
  })
    .populate("memberId", "memberId firstName lastName ministry membershipStatus")
    .lean();

  const latestEvents = events.slice(0, 3);
  const previousEvents = events.slice(3);
  const attendanceByMember = records.reduce((accumulator, record) => {
    const key = String(record.memberId?._id || record.memberId);
    if (!accumulator.has(key)) {
      accumulator.set(key, new Set());
    }
    accumulator.get(key).add(String(record.eventId));
    return accumulator;
  }, new Map());

  const members = await Member.find({ membershipStatus: { $nin: ["Inactive", "Passed On"] } }, {
    memberId: 1,
    firstName: 1,
    lastName: 1,
  }).lean();

  const suggestions = [];
  for (const member of members) {
    const seenEvents = attendanceByMember.get(String(member._id)) || new Set();
    const recentHits = latestEvents.filter((event) => seenEvents.has(String(event._id))).length;
    const previousHits = previousEvents.filter((event) => seenEvents.has(String(event._id))).length;
    if (recentHits === 0 && previousHits >= 3) {
      const fallbackText = `${member.firstName} ${member.lastName} attended ${previousHits} of the earlier recent events but none of the latest ${latestEvents.length}. This looks like a change worth reviewing.`;
      const draft = await draftNarrative({
        systemPrompt:
          "You summarize attendance anomalies for church leaders. Stay factual and never assign motive.",
        userPrompt: [
          `Member: ${member.firstName} ${member.lastName}`.trim(),
          `Attendance in earlier recent events: ${previousHits}`,
          `Attendance in latest events: ${recentHits}`,
          `Latest events checked: ${latestEvents.map((event) => event.title).join(", ")}`,
          "Write a brief anomaly note for follow-up review.",
        ].join("\n"),
        fallbackText,
        maxTokens: 120,
      });

      const suggestion = await upsertAiSuggestion({
        suggestionType: "attendance_anomaly",
        subjectType: "Member",
        subjectId: member.memberId,
        subjectLabel: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
        sourceModule: "Attendance",
        generatedForUser: user?._id || null,
        title: `Attendance change for ${member.firstName || member.memberId}`,
        generatedText: draft.text,
        basedOnRefs: [
          {
            recordType: "Member",
            recordId: member.memberId,
            label: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          },
        ],
        promptContextSummary: "Normally present member absent across the latest recent events.",
        metadata: {
          fingerprint: `attendance-member-anomaly:${member.memberId}:${events[0]?._id || "none"}`,
          previousHits,
          recentHits,
          eventTitles: latestEvents.map((event) => event.title),
          claudeEnabled: draft.enabled,
        },
        requestedBy: user,
        ipAddress,
      });

      suggestions.push(suggestion);
    }
  }

  const recentCutoff = new Date(Date.now() - Number(recentMinistryWindowDays) * 24 * 60 * 60 * 1000);
  const previousCutoff = new Date(Date.now() - Number(recentMinistryWindowDays) * 2 * 24 * 60 * 60 * 1000);
  const ministryRecords = await AttendanceRecord.aggregate([
    {
      $lookup: {
        from: "attendanceevents",
        localField: "eventId",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },
    {
      $match: {
        present: true,
        "event.ministryId": { $ne: null },
        "event.date": { $gte: previousCutoff },
      },
    },
    {
      $group: {
        _id: "$event.ministryId",
        recentCount: {
          $sum: {
            $cond: [{ $gte: ["$event.date", recentCutoff] }, 1, 0],
          },
        },
        previousCount: {
          $sum: {
            $cond: [
              {
                $and: [{ $lt: ["$event.date", recentCutoff] }, { $gte: ["$event.date", previousCutoff] }],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const ministryMap = new Map((await Ministry.find().lean()).map((item) => [String(item._id), item]));
  for (const item of ministryRecords) {
    if (Number(item.previousCount || 0) < 5) {
      continue;
    }

    const changeRatio = item.previousCount ? item.recentCount / item.previousCount : 1;
    if (changeRatio > 0.8) {
      continue;
    }

    const ministry = ministryMap.get(String(item._id));
    if (!ministry) {
      continue;
    }

    const percentDrop = Math.round((1 - changeRatio) * 100);
    const fallbackText = `${ministry.name} attendance is down ${percentDrop}% versus the prior ${recentMinistryWindowDays}-day period (${item.previousCount} to ${item.recentCount}).`;
    const draft = await draftNarrative({
      systemPrompt:
        "You summarize attendance trend changes for ministry leaders. Use only the supplied numbers and do not infer causes.",
      userPrompt: [
        `Ministry: ${ministry.name}`,
        `Previous period attendance count: ${item.previousCount}`,
        `Recent period attendance count: ${item.recentCount}`,
        `Percent drop: ${percentDrop}%`,
        "Write a short trend note for review.",
      ].join("\n"),
      fallbackText,
      maxTokens: 120,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "ministry_attendance_drop",
      subjectType: "Ministry",
      subjectId: String(ministry._id),
      subjectLabel: ministry.name,
      sourceModule: "Attendance",
      generatedForUser: user?._id || null,
      title: `Attendance trend for ${ministry.name}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "Ministry",
          recordId: String(ministry._id),
          label: ministry.name,
        },
      ],
      promptContextSummary: "Recent ministry attendance is materially lower than the previous comparison window.",
      metadata: {
        fingerprint: `attendance-ministry-drop:${ministry._id}:${recentMinistryWindowDays}`,
        recentCount: item.recentCount,
        previousCount: item.previousCount,
        percentDrop,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    suggestions.push(suggestion);
  }

  return suggestions;
}

async function generateMinistryEngagementSuggestions({
  user,
  windowDays = 60,
  ipAddress = "",
} = {}) {
  const ministries = await Ministry.find().sort({ name: 1 }).lean();
  const cutoff = new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
  const recentEvents = await AttendanceEvent.find({
    ministryId: { $ne: null },
    date: { $gte: cutoff },
  }).lean();

  const recentEventCountByMinistry = recentEvents.reduce((accumulator, event) => {
    const key = String(event.ministryId);
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

  const suggestions = [];
  for (const ministry of ministries) {
    const leadership = ministry.leadership || {};
    const hasLeader = Boolean(
      leadership.elderInCharge?.memberId ||
        leadership.deaconInCharge?.memberId ||
        leadership.chairman?.memberId
    );
    const memberCount = (ministry.members || []).length;
    const recentEventsCount = recentEventCountByMinistry.get(String(ministry._id)) || 0;
    const shouldFlag = !hasLeader || recentEventsCount === 0;
    if (!shouldFlag) {
      continue;
    }

    const issues = [];
    if (!hasLeader) {
      issues.push("leader vacancy");
    }
    if (recentEventsCount === 0) {
      issues.push(`no ministry attendance events in the last ${windowDays} days`);
    }

    const fallbackText = `${ministry.name}: ${memberCount} recorded member(s), ${recentEventsCount} recent event(s), ${hasLeader ? "leadership assigned" : "leadership gap noted"}.`;
    const draft = await draftNarrative({
      systemPrompt:
        "You write concise ministry summary notes for leadership review. Use only the supplied operational facts.",
      userPrompt: [
        `Ministry: ${ministry.name}`,
        `Recorded members: ${memberCount}`,
        `Recent events in window: ${recentEventsCount}`,
        `Signals: ${issues.join(", ")}`,
        "Write a short administrative summary for review.",
      ].join("\n"),
      fallbackText,
      maxTokens: 120,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "ministry_engagement_summary",
      subjectType: "Ministry",
      subjectId: String(ministry._id),
      subjectLabel: ministry.name,
      sourceModule: "Ministry",
      generatedForUser: user?._id || null,
      title: `Engagement summary for ${ministry.name}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "Ministry",
          recordId: String(ministry._id),
          label: ministry.name,
        },
      ],
      promptContextSummary: `Ministry review based on leader assignment and recent activity window of ${windowDays} days.`,
      metadata: {
        fingerprint: `ministry-engagement:${ministry._id}:${windowDays}`,
        issues,
        memberCount,
        recentEventsCount,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    suggestions.push(suggestion);
  }

  return suggestions;
}

async function generateCommunicationDraftSuggestion({
  user,
  promptText,
  groupId = "",
  channelId = "",
  filterCriteria = {},
  ipAddress = "",
} = {}) {
  if (!sanitizeText(promptText)) {
    throw new Error("A short communication prompt is required.");
  }

  const group = groupId ? await CommunicationGroup.findById(groupId) : null;
  const audience = await resolveCommunicationAudience(filterCriteria || group?.filterCriteria || {}, group);
  const filteredAudience = channelId
    ? await enforceCommunicationPreferences(audience, channelId)
    : audience;

  const fallbackText = `${sanitizeText(promptText)}\n\nAudience preview: ${filteredAudience.members.length} member(s) and ${filteredAudience.visitors.length} visitor(s).`;
  const draft = await draftNarrative({
    systemPrompt:
      "You draft church communication messages for human review. Keep the tone clear, warm, and suitable for SMS, WhatsApp, or email without being overly long.",
    userPrompt: [
      `Prompt from sender: ${sanitizeText(promptText)}`,
      `Saved group: ${group?.name || "Ad hoc audience"}`,
      `Audience counts: ${filteredAudience.members.length} members, ${filteredAudience.visitors.length} visitors`,
      "Write a concise draft message that a sender can edit before using.",
    ].join("\n"),
    fallbackText,
  });

  return upsertAiSuggestion({
    suggestionType: "communication_draft",
    subjectType: "CommunicationGroup",
    subjectId: group?._id?.toString() || "ad_hoc",
    subjectLabel: group?.name || "Ad hoc communication",
    sourceModule: "Communication",
    generatedForUser: user?._id || null,
    title: group?.name ? `Draft for ${group.name}` : "Draft communication message",
    generatedText: draft.text,
    basedOnRefs: group
      ? [
          {
            recordType: "CommunicationGroup",
            recordId: group._id.toString(),
            label: group.name,
          },
        ]
      : [],
    promptContextSummary: "Drafted communication message based on a sender prompt and permission-filtered audience preview.",
    metadata: {
      fingerprint: `communication-draft:${group?._id?.toString() || "ad_hoc"}:${normalizeKey(promptText)}`,
      promptText: sanitizeText(promptText),
      audienceSummary: {
        members: filteredAudience.members.length,
        visitors: filteredAudience.visitors.length,
      },
      filterCriteria: filterCriteria || group?.filterCriteria || {},
      claudeEnabled: draft.enabled,
    },
    requestedBy: user,
    ipAddress,
  });
}

async function generateCommunicationAudienceSuggestion({
  user,
  requestText,
  ipAddress = "",
} = {}) {
  if (!sanitizeText(requestText)) {
    throw new Error("A plain-language audience request is required.");
  }

  const ministries = await Ministry.find({}, { _id: 1, name: 1 }).lean();
  const requestKey = normalizeKey(requestText);
  const suggestedFilterCriteria = {};
  const matchedMinistry = ministries.find((ministry) => requestKey.includes(normalizeKey(ministry.name)));
  if (matchedMinistry) {
    suggestedFilterCriteria.ministryId = String(matchedMinistry._id);
  }

  if (requestKey.includes("inactive")) {
    suggestedFilterCriteria.membershipStatus = "Inactive";
  } else if (requestKey.includes("active")) {
    suggestedFilterCriteria.membershipStatus = "Active";
  }

  const audience = await resolveCommunicationAudience(suggestedFilterCriteria, null);
  const fallbackText = `Suggested audience filter: ${matchedMinistry ? `ministry = ${matchedMinistry.name}` : "no ministry detected"}${suggestedFilterCriteria.membershipStatus ? `, membership status = ${suggestedFilterCriteria.membershipStatus}` : ""}. Preview count: ${audience.total}.`;
  const draft = await draftNarrative({
    systemPrompt:
      "You translate plain-language church communication audience requests into concise, reviewable filter summaries. Do not claim the filter is final.",
    userPrompt: [
      `Audience request: ${sanitizeText(requestText)}`,
      `Matched ministry: ${matchedMinistry?.name || "None"}`,
      `Detected membership status: ${suggestedFilterCriteria.membershipStatus || "None"}`,
      `Preview total: ${audience.total}`,
      "Write a short explanation of the proposed filter for a human reviewer.",
    ].join("\n"),
    fallbackText,
    maxTokens: 120,
  });

  return upsertAiSuggestion({
    suggestionType: "communication_audience_filter",
    subjectType: "CommunicationAudience",
    subjectId: normalizeKey(requestText).slice(0, 120) || "audience-request",
    subjectLabel: sanitizeText(requestText),
    sourceModule: "Communication",
    generatedForUser: user?._id || null,
    title: "Suggested audience filter",
    generatedText: draft.text,
    basedOnRefs: matchedMinistry
      ? [
          {
            recordType: "Ministry",
            recordId: String(matchedMinistry._id),
            label: matchedMinistry.name,
          },
        ]
      : [],
    promptContextSummary: "Plain-language audience request translated into proposed structured filter criteria.",
    metadata: {
      fingerprint: `communication-audience:${normalizeKey(requestText)}`,
      requestText: sanitizeText(requestText),
      suggestedFilterCriteria,
      previewTotal: audience.total,
      claudeEnabled: draft.enabled,
    },
    requestedBy: user,
    ipAddress,
  });
}

async function generateStrategicCommentarySuggestions({
  user,
  actualId = "",
  limit = 20,
  ipAddress = "",
} = {}) {
  const actualQuery = actualId ? { _id: actualId } : {};
  const actuals = await KPIActual.find(actualQuery)
    .populate("kpiId", "name unit initiativeId")
    .populate("ragStatus", "label key")
    .sort({ capturedDate: -1, createdAt: -1 })
    .limit(Number(limit));

  const targetMap = new Map(
    (await KPITarget.find({
      $or: actuals.map((item) => ({ kpiId: item.kpiId?._id || item.kpiId, period: item.period })),
    }).lean()).map((item) => [`${item.kpiId}:${item.period}`, item])
  );

  const kpiIds = actuals.map((item) => item.kpiId?._id || item.kpiId).filter(Boolean);
  const kpis = await KPI.find({ _id: { $in: kpiIds } })
    .populate({
      path: "initiativeId",
      populate: {
        path: "objectiveId",
        populate: {
          path: "pillarId",
          select: "name",
        },
      },
    })
    .lean();
  const kpiMap = new Map(kpis.map((item) => [String(item._id), item]));

  const suggestions = [];
  for (const actual of actuals) {
    const kpi = kpiMap.get(String(actual.kpiId?._id || actual.kpiId));
    const target = targetMap.get(`${actual.kpiId?._id || actual.kpiId}:${actual.period}`);
    const unit = actual.kpiId?.unit || kpi?.unit || "";
    const fallbackText = `${actual.kpiId?.name || "KPI"} for ${actual.period}: actual ${formatNumber(actual.actualValue)}${unit ? ` ${unit}` : ""} versus target ${formatNumber(target?.targetValue || 0)}${unit ? ` ${unit}` : ""}, variance ${formatNumber(actual.variance)}${unit ? ` ${unit}` : ""}, status ${actual.ragStatus?.label || "Unrated"}.`;
    const draft = await draftNarrative({
      systemPrompt:
        "You draft KPI commentary using only the provided performance facts. Describe the gap clearly and avoid inventing root causes.",
      userPrompt: [
        `KPI: ${actual.kpiId?.name || "Unknown KPI"}`,
        `Period: ${actual.period}`,
        `Target: ${target?.targetValue ?? 0} ${unit}`.trim(),
        `Actual: ${actual.actualValue} ${unit}`.trim(),
        `Variance: ${actual.variance} ${unit}`.trim(),
        `RAG: ${actual.ragStatus?.label || "Unrated"}`,
        `Pillar: ${kpi?.initiativeId?.objectiveId?.pillarId?.name || "Unassigned"}`,
        "Write a short first-pass commentary for a human reviewer.",
      ].join("\n"),
      fallbackText,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "strategic_commentary_draft",
      subjectType: "KPIActual",
      subjectId: actual._id.toString(),
      subjectLabel: `${actual.kpiId?.name || "KPI"} - ${actual.period}`,
      sourceModule: "Strategic",
      generatedForUser: user?._id || null,
      title: `Commentary draft for ${actual.kpiId?.name || "KPI"}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "KPIActual",
          recordId: actual._id.toString(),
          label: actual.period,
        },
      ],
      promptContextSummary: "First-pass KPI commentary grounded in captured actual, target, variance, and RAG.",
      metadata: {
        fingerprint: `strategic-commentary:${actual._id}`,
        period: actual.period,
        variance: actual.variance,
        ragStatus: actual.ragStatus?.label || "",
        targetValue: target?.targetValue ?? 0,
        actualValue: actual.actualValue,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    suggestions.push(suggestion);
  }

  const scorecard = await getStrategicScorecard({});
  const fallbackInsight = `Church-wide scorecard snapshot: ${scorecard.ragCounts.Red} red, ${scorecard.ragCounts.Amber} amber, and ${scorecard.ragCounts.Green} green KPI actuals are currently recorded.`;
  const insightDraft = await draftNarrative({
    systemPrompt:
      "You write cross-pillar strategic review notes from supplied scorecard counts only. Do not invent reasons or unsupported relationships.",
    userPrompt: [
      `Red KPI actuals: ${scorecard.ragCounts.Red}`,
      `Amber KPI actuals: ${scorecard.ragCounts.Amber}`,
      `Green KPI actuals: ${scorecard.ragCounts.Green}`,
      `Objective count: ${scorecard.totals.objectives}`,
      "Write a short church-wide strategic insight note for human leadership review.",
    ].join("\n"),
    fallbackText: fallbackInsight,
    maxTokens: 120,
  });

  const insightSuggestion = await upsertAiSuggestion({
    suggestionType: "strategic_cross_pillar_insight",
    subjectType: "StrategicPlan",
    subjectId: "church_scorecard",
    subjectLabel: "Church-wide scorecard",
    sourceModule: "Strategic",
    generatedForUser: user?._id || null,
    title: "Church-wide strategic insight",
    generatedText: insightDraft.text,
    basedOnRefs: [],
    promptContextSummary: "Cross-pillar strategic summary from scorecard RAG counts.",
    metadata: {
      fingerprint: "strategic-cross-pillar:church_scorecard",
      ragCounts: scorecard.ragCounts,
      totals: scorecard.totals,
      claudeEnabled: insightDraft.enabled,
    },
    requestedBy: user,
    ipAddress,
  });

  suggestions.push(insightSuggestion);
  return suggestions;
}

async function generateLeadershipGapSuggestions({
  user,
  ipAddress = "",
} = {}) {
  const [requirements, readiness] = await Promise.all([
    SuccessionRequirement.find({ keyRole: true }).populate("roleName", "label key").lean(),
    SuccessionReadiness.find()
      .populate("targetRoleName", "label key")
      .populate("readinessCategory", "label key")
      .populate("memberId", "memberId firstName lastName")
      .lean(),
  ]);

  const developmentKeys = new Set(["ready", "developing", "ready with development needs"]);
  const suggestions = [];

  for (const requirement of requirements) {
    const matches = readiness.filter(
      (item) => String(item.targetRoleName?._id || item.targetRoleName) === String(requirement.roleName?._id || requirement.roleName)
    );
    const viableMatches = matches.filter((item) =>
      developmentKeys.has(normalizeKey(item.readinessCategory?.label || item.readinessCategory?.key || ""))
    );

    if (viableMatches.length) {
      continue;
    }

    const fallbackText = `${requirement.roleName?.label || "Key role"} currently has no readiness record in a Ready or Developing category.`;
    const draft = await draftNarrative({
      systemPrompt:
        "You write administrative leadership-gap summaries. Do not present them as appointment recommendations or spiritual judgments.",
      userPrompt: [
        `Key role: ${requirement.roleName?.label || "Unknown role"}`,
        `Current readiness records: ${matches.length}`,
        `Ready or developing candidates: ${viableMatches.length}`,
        "Write a short leadership review note.",
      ].join("\n"),
      fallbackText,
      maxTokens: 120,
    });

    const suggestion = await upsertAiSuggestion({
      suggestionType: "leadership_gap_summary",
      subjectType: "SuccessionRequirement",
      subjectId: requirement._id.toString(),
      subjectLabel: requirement.roleName?.label || "Key role",
      sourceModule: "Leadership",
      generatedForUser: user?._id || null,
      title: `Succession gap for ${requirement.roleName?.label || "key role"}`,
      generatedText: draft.text,
      basedOnRefs: [
        {
          recordType: "SuccessionRequirement",
          recordId: requirement._id.toString(),
          label: requirement.roleName?.label || "Key role",
        },
      ],
      promptContextSummary: "Key succession requirement has no ready or developing candidate recorded.",
      metadata: {
        fingerprint: `leadership-gap:${requirement._id}`,
        readinessCount: matches.length,
        viableCount: viableMatches.length,
        claudeEnabled: draft.enabled,
      },
      requestedBy: user,
      ipAddress,
    });

    suggestions.push(suggestion);
  }

  return suggestions;
}

async function generateImportFieldMappingSuggestion({
  user,
  entity,
  headers = [],
  ipAddress = "",
} = {}) {
  const fieldCatalog = {
    member: ["firstName", "lastName", "gender", "primaryMobile", "residentialArea", "membershipStatus"],
    household: ["familyName", "physicalAddress", "residentialArea", "primaryContactNumber"],
    ministrymembers: ["memberId", "ministryName", "role", "joinedDate"],
  };

  const targetFields = fieldCatalog[String(entity || "").toLowerCase()];
  if (!targetFields) {
    throw new Error("Unsupported import entity for AI mapping suggestions.");
  }

  const synonyms = {
    surname: "lastName",
    lastname: "lastName",
    firstname: "firstName",
    mobile: "primaryMobile",
    phone: "primaryMobile",
    area: "residentialArea",
    householdname: "familyName",
    address: "physicalAddress",
    contactnumber: "primaryContactNumber",
  };

  const mapping = {};
  const unmatchedHeaders = [];
  headers.forEach((header) => {
    const normalized = normalizeKey(header).replace(/[^a-z0-9]/g, "");
    const directField = targetFields.find((field) => normalizeKey(field).replace(/[^a-z0-9]/g, "") === normalized);
    const synonymField = synonyms[normalized];
    if (directField) {
      mapping[header] = directField;
    } else if (synonymField && targetFields.includes(synonymField)) {
      mapping[header] = synonymField;
    } else {
      unmatchedHeaders.push(header);
    }
  });

  const fallbackText = unmatchedHeaders.length
    ? `Mapped ${Object.keys(mapping).length} header(s) deterministically. ${unmatchedHeaders.length} header(s) still need human review: ${unmatchedHeaders.join(", ")}.`
    : `All ${headers.length} header(s) were matched deterministically.`;

  const draft = await draftNarrative({
    systemPrompt:
      "You explain spreadsheet field-mapping suggestions for data migration review. Keep the explanation factual and remind the reviewer to confirm mappings.",
    userPrompt: [
      `Entity: ${entity}`,
      `Headers: ${headers.join(", ")}`,
      `Deterministic matches: ${Object.entries(mapping)
        .map(([header, field]) => `${header} -> ${field}`)
        .join("; ") || "None"}`,
      `Unmatched headers: ${unmatchedHeaders.join(", ") || "None"}`,
      "Write a short mapping note for a human reviewer.",
    ].join("\n"),
    fallbackText,
    maxTokens: 140,
  });

  return upsertAiSuggestion({
    suggestionType: "import_field_mapping",
    subjectType: "ImportMapping",
    subjectId: `${String(entity || "").toLowerCase()}:${headers.map((item) => normalizeKey(item)).join("|")}`,
    subjectLabel: `${entity || "import"} field mapping`,
    sourceModule: "Data Migration",
    generatedForUser: user?._id || null,
    title: `Import mapping for ${entity}`,
    generatedText: draft.text,
    basedOnRefs: [],
    promptContextSummary: "Deterministic header mapping completed before any optional AI explanation or reviewer confirmation.",
    metadata: {
      fingerprint: `import-mapping:${String(entity || "").toLowerCase()}:${headers.length}:${Object.keys(mapping).length}`,
      entity: String(entity || "").toLowerCase(),
      mapping,
      unmatchedHeaders,
      claudeEnabled: draft.enabled,
    },
    requestedBy: user,
    ipAddress,
  });
}

module.exports = {
  generateAttendanceAnomalySuggestions,
  generateCommunicationAudienceSuggestion,
  generateCommunicationDraftSuggestion,
  generateEvangelismSuggestions,
  generateImportFieldMappingSuggestion,
  generateLeadershipGapSuggestions,
  generateMentorMatchSuggestions,
  generateMinistryEngagementSuggestions,
  generateStrategicCommentarySuggestions,
  generateVisitorFollowUpSuggestions,
};
