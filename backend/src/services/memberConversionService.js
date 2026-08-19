const Member = require("../models/Member");

async function generateNextMemberId() {
  const members = await Member.find({}, { memberId: 1 }).lean();
  const nextNumber =
    members.reduce((maxValue, item) => {
      const numericPart = Number(String(item.memberId || "").replace("MB", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `MB${String(nextNumber).padStart(4, "0")}`;
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
    city: payload.city || profile.city || "",
    address: payload.address || profile.address || "",
    residentialArea: payload.residentialArea || profile.residentialArea || "",
    membershipStatus: payload.membershipStatus || "Active",
    membershipDate: payload.membershipDate ? new Date(payload.membershipDate) : new Date(),
    baptismStatus: payload.baptismStatus || "Not Baptized",
    baptismDate: payload.baptismDate ? new Date(payload.baptismDate) : null,
    notes: payload.notes || "",
  });
}

module.exports = {
  createMemberFromProfile,
  generateNextMemberId,
};
