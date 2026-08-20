const AttendanceEvent = require("../models/AttendanceEvent");
const AttendanceRecord = require("../models/AttendanceRecord");
const DiscipleshipEnrollment = require("../models/DiscipleshipEnrollment");
const EvangelismProspect = require("../models/EvangelismProspect");
const Member = require("../models/Member");
const SpiritualHealthAlert = require("../models/SpiritualHealthAlert");
const TriggerRule = require("../models/TriggerRule");
const Visitor = require("../models/Visitor");
const { createPendingAction } = require("./pendingActionService");

async function evaluateTriggerRules(user = null) {
  const rules = await TriggerRule.find({ active: true }).lean();
  const activeAlertIds = [];

  for (const rule of rules) {
    const results = await evaluateRule(rule);

    for (const item of results) {
      const alert = await SpiritualHealthAlert.findOneAndUpdate(
        {
          triggerRuleId: rule._id,
          memberId: item.memberId || null,
          prospectId: item.prospectId || null,
          householdId: item.householdId || "",
          sourceRecordRef: item.sourceRecordRef,
        },
        {
          $set: {
            status: item.status,
            reason: item.reason,
            resolvedAt: null,
            resolvedBy: null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      activeAlertIds.push(String(alert._id));
    }

    await SpiritualHealthAlert.updateMany(
      {
        triggerRuleId: rule._id,
        resolvedAt: null,
        _id: { $nin: activeAlertIds.map((id) => id) },
      },
      {
        $set: {
          resolvedAt: new Date(),
          resolvedBy: user?._id || null,
        },
      }
    );
  }

  return SpiritualHealthAlert.find()
    .populate("memberId", "memberId firstName lastName ministry")
    .populate("prospectId", "prospectId firstName surname")
    .populate("triggerRuleId")
    .populate("assignedToUserId", "displayName username")
    .populate("assignedActionId")
    .sort({ resolvedAt: 1, createdAt: -1 });
}

async function assignAlertFollowUp(alert, assignedToUserId, dueDate) {
  const pendingAction = await createPendingAction({
    subjectType: alert.memberId ? "Member" : alert.prospectId ? "Prospect" : "Household",
    subjectId:
      alert.memberId?.memberId ||
      alert.prospectId?.prospectId ||
      alert.householdId ||
      alert.sourceRecordRef,
    reason: alert.reason,
    assignedUser: assignedToUserId,
    dueDate: dueDate ? new Date(dueDate) : new Date(),
    status: "Open",
    sourceModule: "Spiritual Health",
    sourceRecordType: "SpiritualHealthAlert",
    sourceRecordId: String(alert._id),
    priority: alert.status === "Red" ? "High" : "Normal",
    metadata: {
      triggerRuleId: String(alert.triggerRuleId?._id || alert.triggerRuleId),
    },
  });

  alert.assignedToUserId = assignedToUserId || null;
  alert.assignedActionId = pendingAction._id;
  await alert.save();
  return alert;
}

async function evaluateRule(rule) {
  const thresholdDays = Number(rule.condition?.thresholdDays) || 30;
  const amberDays = Number(rule.severityMapping?.amberDays) || thresholdDays;
  const redDays = Number(rule.severityMapping?.redDays) || Math.max(thresholdDays + 14, amberDays);

  if (rule.sourceModule === "Attendance") {
    return evaluateAttendanceRule(rule, amberDays, redDays);
  }

  if (rule.sourceModule === "Visitor") {
    return evaluateVisitorRule(rule, amberDays, redDays);
  }

  if (rule.sourceModule === "Discipleship") {
    return evaluateDiscipleshipRule(rule, amberDays, redDays);
  }

  if (rule.sourceModule === "Evangelism") {
    return evaluateProspectRule(rule, amberDays, redDays);
  }

  return [];
}

async function evaluateAttendanceRule(rule, amberDays, redDays) {
  const members = await Member.find().lean();
  const lastAttendanceByMember = await AttendanceRecord.aggregate([
    { $match: { memberId: { $ne: null }, present: true } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$memberId", lastAttendanceAt: { $first: "$createdAt" }, eventId: { $first: "$eventId" } } },
  ]);
  const attendanceMap = new Map(lastAttendanceByMember.map((item) => [String(item._id), item]));

  return members
    .map((member) => {
      const activity = attendanceMap.get(String(member._id));
      const lastAttendanceAt = activity?.lastAttendanceAt || null;
      const daysSince = lastAttendanceAt ? diffDays(lastAttendanceAt, new Date()) : redDays + 1;
      if (daysSince < amberDays) {
        return null;
      }

      return {
        memberId: member._id,
        status: daysSince >= redDays ? "Red" : "Amber",
        reason: `${member.firstName} ${member.lastName} has no recorded attendance in the last ${daysSince} days.`,
        sourceRecordRef: activity?.eventId ? `AttendanceEvent:${activity.eventId}` : `Member:${member.memberId}`,
      };
    })
    .filter(Boolean);
}

async function evaluateVisitorRule(rule, amberDays, redDays) {
  const visitors = await Visitor.find().lean();
  return visitors
    .map((visitor) => {
      const lastContact = visitor.visitationHistory?.length
        ? visitor.visitationHistory[visitor.visitationHistory.length - 1]?.date
        : visitor.firstVisitDate;
      const daysSince = diffDays(lastContact, new Date());
      if (daysSince < amberDays) {
        return null;
      }

      return {
        prospectId: null,
        memberId: null,
        householdId: "",
        status: daysSince >= redDays ? "Red" : "Amber",
        reason: `${visitor.firstName} ${visitor.surname} has not been contacted in ${daysSince} days.`,
        sourceRecordRef: `Visitor:${visitor.visitorId}`,
      };
    })
    .filter(Boolean);
}

async function evaluateDiscipleshipRule(rule, amberDays, redDays) {
  const enrollments = await DiscipleshipEnrollment.find().populate("memberId", "memberId firstName lastName").lean();
  return enrollments
    .map((enrollment) => {
      const lastSessionDate = enrollment.sessionsCompleted?.length
        ? enrollment.sessionsCompleted[enrollment.sessionsCompleted.length - 1]?.completedAt
        : enrollment.enrollmentDate;
      const daysSince = diffDays(lastSessionDate, new Date());
      const noMentor = !enrollment.mentorId;
      const shouldFlag = noMentor || daysSince >= amberDays;
      if (!shouldFlag) {
        return null;
      }

      const status = noMentor && daysSince >= redDays ? "Red" : daysSince >= redDays ? "Red" : "Amber";
      const reason = noMentor
        ? `${enrollment.memberId?.firstName || "Member"} has no discipleship mentor assigned after ${daysSince} days.`
        : `${enrollment.memberId?.firstName || "Member"} has no recent discipleship session in ${daysSince} days.`;

      return {
        memberId: enrollment.memberId?._id || null,
        status,
        reason,
        sourceRecordRef: `DiscipleshipEnrollment:${enrollment._id}`,
      };
    })
    .filter(Boolean);
}

async function evaluateProspectRule(rule, amberDays, redDays) {
  const prospects = await EvangelismProspect.find().lean();
  return prospects
    .map((prospect) => {
      const anchorDate = prospect.nextFollowUpDate || prospect.dateFirstContact || prospect.createdAt;
      const daysSince = diffDays(anchorDate, new Date());
      if (daysSince < amberDays) {
        return null;
      }

      return {
        prospectId: prospect._id,
        status: daysSince >= redDays ? "Red" : "Amber",
        reason: `${prospect.firstName} ${prospect.surname} is overdue for evangelism follow-up by ${daysSince} days.`,
        sourceRecordRef: `Prospect:${prospect.prospectId}`,
      };
    })
    .filter(Boolean);
}

function diffDays(fromDate, toDate) {
  const start = new Date(fromDate || toDate);
  return Math.max(0, Math.floor((new Date(toDate).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

module.exports = {
  assignAlertFollowUp,
  evaluateTriggerRules,
};
