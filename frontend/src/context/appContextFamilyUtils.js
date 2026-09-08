import { generateNextFamilyId } from "../utils/memberUtils";
import { formatDateInputValue } from "./appContextFormUtils";

export function hydrateFamilyRecord(family) {
  if (!family) {
    return family;
  }

  return {
    ...family,
    primaryContactMemberId: family.primaryContactMemberId || "",
    primaryContactNumber: family.primaryContactNumber || "",
    dateLastVisited: formatDateInputValue(family.dateLastVisited),
    sourceRecordRef: family.sourceRecordRef || "",
    dataEntryClerk: family.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(family.dateCaptured || family.createdAt),
    headOfHousehold: normalizeLegacyLookup(family.headOfHousehold),
    spouse: normalizeLegacyLookup(family.spouse),
    children: normalizeLegacyLookupArray(family.children),
    dependants: normalizeLegacyLookupArray(family.dependants),
  };
}

export function getInheritedFamilyAssignment(memberForm, members) {
  const linkedHousehold = (memberForm.familyLinks || [])
    .map((link) => {
      const relatedMember = members.find((member) => member.memberId === link.memberId);
      if (!relatedMember?.familyId) {
        return null;
      }

      return {
        familyId: relatedMember.familyId,
        familyName: relatedMember.familyName,
        householdRole: link.relationship,
      };
    })
    .find(Boolean);

  return linkedHousehold || {};
}

export function normalizeFamilyDraft(draft, members, groups, families, authUser = null) {
  const normalized = {
    ...draft,
    familyId: draft.familyId || generateNextFamilyId(families),
    primaryContactMemberId: draft.primaryContactMemberId || "",
    primaryContactNumber: draft.primaryContactNumber || "",
    headOfHousehold: ensureMemberSelection(draft.headOfHousehold),
    spouse: ensureMemberSelection(draft.spouse),
    children: ensureMemberSelectionArray(draft.children),
    dependants: ensureMemberSelectionArray(draft.dependants),
    dateLastVisited: draft.dateLastVisited || null,
    sourceRecordRef: draft.sourceRecordRef || "",
    dataEntryClerk: draft.dataEntryClerk || authUser?.displayName || authUser?.username || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
  };

  const zoneMatch = groups.find(
    (group) => group.id === normalized.fellowshipZone || group.name === normalized.fellowshipZone
  );
  normalized.fellowshipZone = zoneMatch ? zoneMatch.id : normalized.fellowshipZone;
  normalized.householdMembers = buildHouseholdMembers(normalized, members);
  normalized.familyContact =
    normalized.familyContact ||
    members.find((member) => member.memberId === normalized.headOfHousehold?.memberId)?.phone ||
    members.find((member) => member.memberId === normalized.spouse?.memberId)?.phone ||
    "";
  normalized.primaryContactMemberId =
    normalized.primaryContactMemberId ||
    normalized.headOfHousehold?.memberId ||
    normalized.spouse?.memberId ||
    "";
  normalized.primaryContactNumber =
    normalized.primaryContactNumber ||
    members.find((member) => member.memberId === normalized.primaryContactMemberId)?.phone ||
    normalized.familyContact ||
    "";

  return normalized;
}

export function normalizeLegacyLookup(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return {
      memberId: "",
      memberName: value,
    };
  }

  return value;
}

export function normalizeLegacyLookupArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeLegacyLookup(item)).filter(Boolean);
}

export function ensureMemberSelection(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && value.memberId) {
    return value;
  }

  return null;
}

export function ensureMemberSelectionArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item?.memberId);
  }

  return [];
}

export function buildHouseholdMembers(family, members) {
  const roleBuckets = [
    { item: family.headOfHousehold, role: "Head" },
    { item: family.spouse, role: "Spouse" },
    ...(family.children || []).map((item) => ({ item, role: "Child" })),
    ...(family.dependants || []).map((item) => ({ item, role: "Dependent" })),
  ];

  return roleBuckets
    .filter(({ item }) => item?.memberId)
    .reduce((accumulator, { item, role }) => {
      if (accumulator.some((entry) => entry.memberId === item.memberId)) {
        return accumulator;
      }

      const linkedMember = members.find((member) => member.memberId === item.memberId);

      return [
        ...accumulator,
        {
          memberId: item.memberId,
          memberName: item.memberName,
          relationshipToHead: getHouseholdRoleLabel(role, linkedMember),
          status: linkedMember?.membershipStatus || "Active",
        },
      ];
    }, []);
}

export function syncMembersToFamily(members, family) {
  const memberRoleMap = new Map(
    (family.householdMembers || []).map((item) => [item.memberId, item.relationshipToHead])
  );

  return members.map((member) => {
    if (!memberRoleMap.has(member.memberId)) {
      return member;
    }

    return {
      ...member,
      familyId: family.familyId,
      familyName: family.familyName,
      householdRole: memberRoleMap.get(member.memberId),
    };
  });
}

export function getHouseholdRoleLabel(baseRole, linkedMember) {
  if (baseRole === "Spouse") {
    return "Spouse";
  }

  if (baseRole === "Child") {
    return linkedMember?.gender === "Female" ? "Daughter" : "Son";
  }

  return baseRole;
}
