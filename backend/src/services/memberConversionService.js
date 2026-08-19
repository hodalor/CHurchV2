const Member = require("../models/Member");

async function generateNextMemberId() {
  const members = await Member.find({}, { memberId: 1 }).lean();
  const nextNumber =
    members.reduce((maxValue, item) => {
      const numericPart = Number(String(item.memberId || "").replace("M", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `M${String(nextNumber).padStart(6, "0")}`;
}

async function createMemberFromProfile(profile, payload = {}) {
  const nextMemberId = payload.memberId || (await generateNextMemberId());

  return Member.create({
    memberId: nextMemberId,
    firstName: payload.firstName || profile.firstName || "",
    lastName: payload.lastName || profile.lastName || profile.surname || "",
    otherName: payload.otherName || profile.otherName || "",
    phone: payload.phone || profile.phone || "",
    email: payload.email || profile.email || "",
    gender: payload.gender || profile.gender || "",
    residentialArea: payload.residentialArea || profile.residentialArea || "",
    preferredName: payload.preferredName || profile.preferredName || "",
    city: payload.city || profile.city || "",
    address: payload.address || profile.address || "",
    membershipStatus: payload.membershipStatus || "Active",
    membershipDate: payload.membershipDate ? new Date(payload.membershipDate) : new Date(),
    dateJoined: payload.dateJoined ? new Date(payload.dateJoined) : payload.membershipDate ? new Date(payload.membershipDate) : new Date(),
    baptismStatus: payload.baptismStatus || "Not Baptized",
    baptismDate: payload.baptismDate ? new Date(payload.baptismDate) : null,
    placeBaptized: payload.placeBaptized || "",
    baptizedBy: payload.baptizedBy || "",
    previousCongregation: payload.previousCongregation || "",
    transferDetails: payload.transferDetails || "",
    occupation: payload.occupation || "",
    employerOrBusiness: payload.employerOrBusiness || "",
    educationOrSkills: payload.educationOrSkills || "",
    sourceRecordRef: payload.sourceRecordRef || profile.sourceRecordRef || profile.visitorId || profile.prospectId || "",
    dataEntryClerk: payload.dataEntryClerk || "",
    dateCaptured: payload.dateCaptured ? new Date(payload.dateCaptured) : new Date(),
    notes: payload.notes || "",
  });
}

module.exports = {
  createMemberFromProfile,
  generateNextMemberId,
};
