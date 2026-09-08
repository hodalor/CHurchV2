export function normalizeMemberDraft(draft, authUser = null) {
  return {
    memberId: draft.memberId || "",
    firstName: draft.firstName || "",
    otherName: draft.otherName || "",
    lastName: draft.lastName || "",
    memberType: draft.memberType || "Adult",
    gender: draft.gender || "",
    maritalStatus: draft.maritalStatus || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    dateOfBirth: draft.dateOfBirth || null,
    preferredName: draft.preferredName || "",
    occupation: draft.occupation || "",
    employerOrBusiness: draft.employerOrBusiness || "",
    educationOrSkills: draft.educationOrSkills || "",
    membershipStatus: draft.membershipStatus || "Active",
    membershipDate: draft.membershipDate || draft.dateJoined || null,
    dateJoined: draft.dateJoined || draft.membershipDate || null,
    baptismStatus: draft.baptismStatus || "Not Baptized",
    baptismDate: draft.baptismDate || null,
    placeBaptized: draft.placeBaptized || "",
    baptizedBy: draft.baptizedBy || "",
    previousCongregation: draft.previousCongregation || "",
    transferDetails: draft.transferDetails || "",
    ministryId: draft.ministryId?._id || draft.ministryId || null,
    address: draft.address || "",
    city: draft.city || "",
    country: draft.country || "",
    gpsLatitude: draft.gpsLatitude || "",
    gpsLongitude: draft.gpsLongitude || "",
    notes: draft.notes || "",
    familyId: draft.familyId || "",
    familyName: draft.familyName || "",
    householdRole: draft.householdRole || "",
    photoFileName: draft.photoFileName || normalizeMediaField(draft.personalPhoto)?.label || "",
    sourceRecordRef: draft.sourceRecordRef || "",
    dataEntryClerk: draft.dataEntryClerk || authUser?.displayName || authUser?.username || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
    qrToken: draft.qrToken || "",
    qrCodeImageUrl: draft.qrCodeImageUrl || "",
    qrGeneratedAt: draft.qrGeneratedAt || null,
    qrRegeneratedAt: draft.qrRegeneratedAt || null,
    qrRegeneratedBy: draft.qrRegeneratedBy || null,
    qrActive: draft.qrActive !== false,
    groups: Array.isArray(draft.groups) ? draft.groups : [],
    familyLinks: Array.isArray(draft.familyLinks) ? draft.familyLinks : [],
    personalPhoto: normalizeMediaField(draft.personalPhoto),
    idFrontPhoto: normalizeMediaField(draft.idFrontPhoto),
    idBackPhoto: normalizeMediaField(draft.idBackPhoto),
  };
}

export function normalizeMediaField(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.startsWith("http")
      ? {
          url: value,
          label: extractMediaLabel(value),
        }
      : "";
  }

  if (typeof value === "object" && value.url) {
    return {
      url: value.url,
      label: value.label || extractMediaLabel(value.url),
      contentType: value.contentType || "",
      objectName: value.objectName || "",
    };
  }

  return "";
}

export function extractMediaLabel(value = "") {
  const cleanValue = String(value).split("?")[0];
  const parts = cleanValue.split("/");
  return parts[parts.length - 1] || "upload";
}

export function formatDateInputValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

export function findUserIdByMemberId(users = [], memberId = "") {
  if (!memberId) {
    return "";
  }

  return users.find((user) => user.memberId === memberId)?._id || "";
}

export function getRequiredMemberError(member = {}) {
  const requiredPairs = [
    ["firstName", "First name"],
    ["lastName", "Surname"],
    ["gender", "Gender"],
    ["phone", "Primary mobile"],
    ["residentialArea", "Residential area"],
    ["membershipStatus", "Membership status"],
  ];

  const missing = requiredPairs.find(([fieldName]) => !String(member[fieldName] || "").trim());
  return missing ? `${missing[1]} is required.` : "";
}
