const Member = require("../models/Member");
const Visitor = require("../models/Visitor");

function normalizeBiometricPayload(payload = {}) {
  const templateRef = String(payload.templateRef || payload.referenceId || "").trim();
  if (!templateRef) {
    throw new Error("Fingerprint template reference is required.");
  }

  const qualityScore =
    payload.qualityScore === "" ||
    payload.qualityScore === undefined ||
    payload.qualityScore === null
      ? null
      : Number(payload.qualityScore);

  return {
    enabled: true,
    provider: String(payload.provider || "zkteco")
      .trim()
      .toLowerCase(),
    templateRef,
    deviceName: String(payload.deviceName || "").trim(),
    qualityScore: Number.isFinite(qualityScore) ? qualityScore : null,
    enrolledAt: new Date(),
  };
}

async function assertTemplateRefAvailable(templateRef, exclude = {}) {
  const [member, visitor] = await Promise.all([
    Member.findOne({ "biometric.templateRef": templateRef }),
    Visitor.findOne({ "biometric.templateRef": templateRef }),
  ]);

  if (
    member &&
    !(exclude.subjectType === "member" && String(member._id) === String(exclude.subjectId))
  ) {
    throw new Error(`Fingerprint template is already linked to member ${member.memberId}.`);
  }

  if (
    visitor &&
    !(exclude.subjectType === "visitor" && String(visitor._id) === String(exclude.subjectId))
  ) {
    throw new Error(`Fingerprint template is already linked to visitor ${visitor.visitorId}.`);
  }
}

async function enrollSubjectBiometric({ subjectType, subject, payload, user = null }) {
  const normalized = normalizeBiometricPayload(payload);
  await assertTemplateRefAvailable(normalized.templateRef, {
    subjectType,
    subjectId: subject?._id,
  });

  subject.biometric = {
    ...(subject.biometric?.toObject ? subject.biometric.toObject() : subject.biometric || {}),
    ...normalized,
    enrolledBy: user?._id || null,
  };
  await subject.save();
  return subject;
}

async function clearSubjectBiometric(subject) {
  subject.biometric = {
    enabled: false,
    provider: subject.biometric?.provider || "zkteco",
    templateRef: "",
    deviceName: "",
    qualityScore: null,
    enrolledAt: null,
    enrolledBy: null,
    lastMatchedAt: null,
  };
  await subject.save();
  return subject;
}

async function resolveBiometricSubject(templateRef) {
  const normalizedRef = String(templateRef || "").trim();
  if (!normalizedRef) {
    throw new Error("Fingerprint template reference is required.");
  }

  const member = await Member.findOne({
    "biometric.templateRef": normalizedRef,
    "biometric.enabled": true,
  });
  if (member) {
    return {
      subjectType: "member",
      subject: member,
    };
  }

  const visitor = await Visitor.findOne({
    "biometric.templateRef": normalizedRef,
    "biometric.enabled": true,
  });
  if (visitor) {
    return {
      subjectType: "visitor",
      subject: visitor,
    };
  }

  throw new Error("No member or visitor is linked to this fingerprint.");
}

async function markBiometricMatch(subject) {
  subject.biometric = {
    ...(subject.biometric?.toObject ? subject.biometric.toObject() : subject.biometric || {}),
    lastMatchedAt: new Date(),
  };
  await subject.save();
  return subject;
}

module.exports = {
  clearSubjectBiometric,
  enrollSubjectBiometric,
  markBiometricMatch,
  resolveBiometricSubject,
};
