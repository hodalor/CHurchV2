const DuplicateCandidate = require("../models/DuplicateCandidate");
const Family = require("../models/Family");
const Member = require("../models/Member");
const Visitor = require("../models/Visitor");
const { logAudit } = require("./auditService");

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function normalizePhone(value = "") {
  return String(value || "").replace(/[^\d]/g, "");
}

function levenshtein(a = "", b = "") {
  const left = normalizeText(a);
  const right = normalizeText(b);

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const matrix = Array.from({ length: right.length + 1 }, () => []);
  for (let row = 0; row <= right.length; row += 1) {
    matrix[row][0] = row;
  }
  for (let column = 0; column <= left.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= right.length; row += 1) {
    for (let column = 1; column <= left.length; column += 1) {
      const cost = left[column - 1] === right[row - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[right.length][left.length];
}

function similarityScore(a = "", b = "") {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const distance = levenshtein(left, right);
  const longest = Math.max(left.length, right.length);
  return longest ? 1 - distance / longest : 0;
}

async function evaluateDuplicateCandidatesForRecord(recordType, payload, options = {}) {
  const normalizedType = String(recordType || "").toLowerCase();

  if (normalizedType === "member") {
    return evaluateMemberCandidates(payload, options);
  }

  if (normalizedType === "household") {
    return evaluateHouseholdCandidates(payload, options);
  }

  if (normalizedType === "visitor") {
    return evaluateVisitorCandidates(payload, options);
  }

  return [];
}

async function evaluateMemberCandidates(payload = {}, options = {}) {
  const records = await Member.find({}, {
    memberId: 1,
    firstName: 1,
    lastName: 1,
    otherName: 1,
    preferredName: 1,
    phone: 1,
    email: 1,
    dateOfBirth: 1,
    residentialArea: 1,
    address: 1,
    familyId: 1,
    familyName: 1,
  }).lean();

  const incoming = buildComparableMember(payload);
  return buildDuplicateResults({
    recordType: "member",
    incoming,
    records,
    getComparable: buildComparableMember,
    getRecordId: (record) => record.memberId,
    getRecordLabel: (record) => `${record.firstName || ""} ${record.lastName || ""}`.trim(),
    minimumScore: options.minimumScore || 55,
  });
}

async function evaluateHouseholdCandidates(payload = {}, options = {}) {
  const records = await Family.find({}, {
    familyId: 1,
    familyName: 1,
    physicalAddress: 1,
    residentialArea: 1,
    householdMembers: 1,
  }).lean();

  const incoming = buildComparableHousehold(payload);
  return buildDuplicateResults({
    recordType: "household",
    incoming,
    records,
    getComparable: buildComparableHousehold,
    getRecordId: (record) => record.familyId,
    getRecordLabel: (record) => record.familyName || record.familyId,
    minimumScore: options.minimumScore || 55,
  });
}

async function evaluateVisitorCandidates(payload = {}, options = {}) {
  const records = await Visitor.find({}, {
    visitorId: 1,
    firstName: 1,
    surname: 1,
    phone: 1,
    email: 1,
    residentialArea: 1,
    firstVisitDate: 1,
  }).lean();

  const incoming = buildComparableVisitor(payload);
  return buildDuplicateResults({
    recordType: "visitor",
    incoming,
    records,
    getComparable: buildComparableVisitor,
    getRecordId: (record) => record.visitorId,
    getRecordLabel: (record) => `${record.firstName || ""} ${record.surname || ""}`.trim(),
    minimumScore: options.minimumScore || 55,
  });
}

function buildDuplicateResults({
  recordType,
  incoming,
  records,
  getComparable,
  getRecordId,
  getRecordLabel,
  minimumScore,
}) {
  const results = records
    .map((record) => {
      const comparable = getComparable(record);
      const analysis = compareComparableRecords(recordType, incoming, comparable);
      return {
        recordType,
        recordId: getRecordId(record),
        recordLabel: getRecordLabel(record),
        matchScore: analysis.matchScore,
        matchReasons: analysis.matchReasons,
        confidence: analysis.confidence,
      };
    })
    .filter((item) => item.matchScore >= minimumScore && item.matchReasons.length)
    .sort((left, right) => right.matchScore - left.matchScore);

  return results;
}

function compareComparableRecords(recordType, incoming, existing) {
  const reasons = [];
  let score = 0;

  if (incoming.phone && existing.phone && incoming.phone === existing.phone) {
    reasons.push("Same phone number");
    score += 40;
  }

  if (incoming.email && existing.email && incoming.email === existing.email) {
    reasons.push("Same email address");
    score += 35;
  }

  const fullNameSimilarity = similarityScore(incoming.fullName, existing.fullName);
  if (fullNameSimilarity >= 0.96) {
    reasons.push("Nearly identical name");
    score += 30;
  } else if (fullNameSimilarity >= 0.82) {
    reasons.push("Similar name spelling");
    score += 18;
  }

  if (incoming.dateOfBirth && existing.dateOfBirth && incoming.dateOfBirth === existing.dateOfBirth) {
    reasons.push("Same date of birth");
    score += 18;
  }

  if (incoming.residentialArea && existing.residentialArea && incoming.residentialArea === existing.residentialArea) {
    reasons.push("Same residential area");
    score += 8;
  }

  if (incoming.address && existing.address && incoming.address === existing.address) {
    reasons.push("Same address");
    score += 12;
  }

  if (recordType === "member" && incoming.familyId && existing.familyId && incoming.familyId === existing.familyId) {
    reasons.push("Same household reference");
    score += 12;
  }

  if (recordType === "household") {
    const overlappingMembers = incoming.memberIds.filter((memberId) => existing.memberIds.includes(memberId));
    if (overlappingMembers.length) {
      reasons.push(`Overlapping household members (${overlappingMembers.join(", ")})`);
      score += Math.min(30, overlappingMembers.length * 12);
    }
  }

  const confidence = score >= 85 ? "high" : score >= 70 ? "medium" : "review";
  return {
    matchScore: Math.min(100, score),
    matchReasons: reasons,
    confidence,
  };
}

function buildComparableMember(payload = {}) {
  return {
    fullName: `${payload.firstName || ""} ${payload.otherName || payload.preferredName || ""} ${payload.lastName || payload.surname || ""}`.replace(/\s+/g, " ").trim(),
    phone: normalizePhone(payload.phone || payload.primaryMobile),
    email: normalizeText(payload.email),
    dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth).toISOString().slice(0, 10) : "",
    residentialArea: normalizeText(payload.residentialArea),
    address: normalizeText(payload.address || payload.physicalAddress),
    familyId: payload.familyId || "",
  };
}

function buildComparableHousehold(payload = {}) {
  const memberIds = Array.isArray(payload.householdMembers)
    ? payload.householdMembers.map((item) => item.memberId).filter(Boolean)
    : [
        payload.headOfHousehold?.memberId,
        payload.spouse?.memberId,
        ...(Array.isArray(payload.children) ? payload.children.map((item) => item.memberId) : []),
        ...(Array.isArray(payload.dependants) ? payload.dependants.map((item) => item.memberId) : []),
      ].filter(Boolean);

  return {
    fullName: normalizeText(payload.familyName),
    phone: normalizePhone(payload.primaryContactNumber || payload.familyContact),
    email: "",
    dateOfBirth: "",
    residentialArea: normalizeText(payload.residentialArea),
    address: normalizeText(payload.physicalAddress),
    familyId: payload.familyId || "",
    memberIds,
  };
}

function buildComparableVisitor(payload = {}) {
  return {
    fullName: `${payload.firstName || ""} ${payload.surname || payload.lastName || ""}`.replace(/\s+/g, " ").trim(),
    phone: normalizePhone(payload.phone || payload.primaryMobile),
    email: normalizeText(payload.email),
    dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth).toISOString().slice(0, 10) : "",
    residentialArea: normalizeText(payload.residentialArea),
    address: "",
    familyId: payload.familyId || "",
  };
}

async function upsertDuplicateCandidates({
  recordType,
  baseRecordId,
  baseRecordLabel,
  candidates = [],
  sourceModule = "",
  metadata = {},
  user = null,
  ipAddress = "",
}) {
  const writes = candidates.map(async (candidate) => {
    const pairKey = buildPairKey(recordType, baseRecordId, candidate.recordId);
    const existing = await DuplicateCandidate.findOne({ pairKey });
    const nextValue = {
      recordType,
      recordIdA: [baseRecordId, candidate.recordId].sort()[0],
      recordIdB: [baseRecordId, candidate.recordId].sort()[1],
      recordLabelA: baseRecordLabel,
      recordLabelB: candidate.recordLabel,
      pairKey,
      matchScore: candidate.matchScore,
      matchReasons: candidate.matchReasons,
      aiExplanation: candidate.aiExplanation || "",
      sourceModule,
      metadata: {
        ...metadata,
        confidence: candidate.confidence,
      },
    };

    if (!existing) {
      const created = await DuplicateCandidate.create({
        ...nextValue,
        status: "pending",
      });
      await logAudit({
        action: "create",
        module: sourceModule || "AI Assist",
        recordType: "DuplicateCandidate",
        recordId: created._id.toString(),
        newValue: created.toObject(),
        user,
        ipAddress,
      });
      return created;
    }

    const previousValue = existing.toObject();
    existing.recordType = nextValue.recordType;
    existing.recordIdA = nextValue.recordIdA;
    existing.recordIdB = nextValue.recordIdB;
    existing.recordLabelA = nextValue.recordLabelA;
    existing.recordLabelB = nextValue.recordLabelB;
    existing.matchScore = nextValue.matchScore;
    existing.matchReasons = nextValue.matchReasons;
    existing.aiExplanation = nextValue.aiExplanation;
    existing.sourceModule = nextValue.sourceModule;
    existing.metadata = nextValue.metadata;
    await existing.save();

    await logAudit({
      action: "update",
      module: sourceModule || "AI Assist",
      recordType: "DuplicateCandidate",
      recordId: existing._id.toString(),
      previousValue,
      newValue: existing.toObject(),
      user,
      ipAddress,
    });

    return existing;
  });

  return Promise.all(writes);
}

function buildPairKey(recordType, leftId, rightId) {
  const [a, b] = [String(leftId || ""), String(rightId || "")].sort();
  return `${recordType}:${a}:${b}`;
}

module.exports = {
  buildComparableHousehold,
  buildComparableMember,
  buildComparableVisitor,
  buildPairKey,
  compareComparableRecords,
  evaluateDuplicateCandidatesForRecord,
  similarityScore,
  upsertDuplicateCandidates,
};
