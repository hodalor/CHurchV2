const CommunicationGroup = require("../models/CommunicationGroup");
const CommunicationLog = require("../models/CommunicationLog");
const CommunicationPreference = require("../models/CommunicationPreference");
const Member = require("../models/Member");
const Visitor = require("../models/Visitor");
const { getLookupValueByTypeAndKey } = require("./lookupService");

async function resolveCommunicationAudience(filterCriteria = {}, group = null) {
  const [members, visitors] = await Promise.all([
    resolveMembers(filterCriteria, group),
    resolveVisitors(filterCriteria, group),
  ]);

  return {
    members,
    visitors,
    total: members.length + visitors.length,
  };
}

async function createCommunicationLogs({ groupId = null, channelId, content, audience, user }) {
  const pendingStatus = await getLookupValueByTypeAndKey("communication_log_status", "pending");
  const entries = [
    ...audience.members.map((member) => ({
      groupId,
      memberId: member._id,
      channel: channelId,
      content,
      sentBy: user?._id || null,
      sentAt: new Date(),
      status: pendingStatus?._id || null,
      deliveryMeta: {
        provider: "stub",
        message: "Provider integration pending confirmation.",
      },
    })),
    ...audience.visitors.map((visitor) => ({
      groupId,
      visitorId: visitor._id,
      channel: channelId,
      content,
      sentBy: user?._id || null,
      sentAt: new Date(),
      status: pendingStatus?._id || null,
      deliveryMeta: {
        provider: "stub",
        message: "Provider integration pending confirmation.",
      },
    })),
  ];

  if (!entries.length) {
    return [];
  }

  return CommunicationLog.insertMany(entries);
}

async function enforceCommunicationPreferences(audience, channelId) {
  const preferences = await CommunicationPreference.find({
    channel: channelId,
    $or: [
      { memberId: { $in: audience.members.map((member) => member._id) } },
      { visitorId: { $in: audience.visitors.map((visitor) => visitor._id) } },
    ],
  }).lean();

  const optedOutMembers = new Set(
    preferences.filter((item) => item.memberId && item.optedIn === false).map((item) => String(item.memberId))
  );
  const optedOutVisitors = new Set(
    preferences.filter((item) => item.visitorId && item.optedIn === false).map((item) => String(item.visitorId))
  );

  return {
    members: audience.members.filter(
      (member) =>
        !optedOutMembers.has(String(member._id)) && String(member.membershipStatus || "").toLowerCase() !== "inactive"
    ),
    visitors: audience.visitors.filter(
      (visitor) => !optedOutVisitors.has(String(visitor._id)) && String(visitor.status?.label || "").toLowerCase() !== "lapsed"
    ),
  };
}

async function resolveMembers(filterCriteria = {}, group = null) {
  if (group?.frozen && Array.isArray(group.frozenMembers) && group.frozenMembers.length) {
    return Member.find({ _id: { $in: group.frozenMembers } }).populate("ministry", "name color").lean();
  }

  const query = {};
  if (filterCriteria.membershipStatus) {
    query.membershipStatus = filterCriteria.membershipStatus;
  }
  if (filterCriteria.residentialArea) {
    query.residentialArea = filterCriteria.residentialArea;
  }
  if (filterCriteria.ministryId) {
    query.ministry = filterCriteria.ministryId;
  }
  if (filterCriteria.memberIds?.length) {
    query._id = { $in: filterCriteria.memberIds };
  }

  return Member.find(query).populate("ministry", "name color").lean();
}

async function resolveVisitors(filterCriteria = {}, group = null) {
  if (group?.frozen && Array.isArray(group.frozenVisitors) && group.frozenVisitors.length) {
    return Visitor.find({ _id: { $in: group.frozenVisitors } }).populate("status", "label key").lean();
  }

  const query = {};
  if (filterCriteria.visitorStatusId) {
    query.status = filterCriteria.visitorStatusId;
  }
  if (filterCriteria.residentialArea) {
    query.residentialArea = filterCriteria.residentialArea;
  }
  if (filterCriteria.visitorIds?.length) {
    query._id = { $in: filterCriteria.visitorIds };
  }

  return Visitor.find(query).populate("status", "label key").lean();
}

async function freezeCommunicationGroup(groupId) {
  const group = await CommunicationGroup.findById(groupId);
  if (!group) {
    throw new Error("Communication group not found.");
  }

  const audience = await resolveCommunicationAudience(group.filterCriteria || {}, group);
  group.frozen = true;
  group.frozenMembers = audience.members.map((member) => member._id);
  group.frozenVisitors = audience.visitors.map((visitor) => visitor._id);
  await group.save();
  return group;
}

module.exports = {
  createCommunicationLogs,
  enforceCommunicationPreferences,
  freezeCommunicationGroup,
  resolveCommunicationAudience,
};
