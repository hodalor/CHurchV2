const reciprocalMap = {
  Spouse: "Spouse",
  Son: "Parent",
  Daughter: "Parent",
  Parent: "Dependent",
  Sibling: "Sibling",
  Dependent: "Parent",
  Other: "Other",
  Head: "Other",
};

export function generateNextMemberId(members) {
  const nextNumber =
    members.reduce((maxValue, member) => {
      const numericPart = Number(String(member.memberId || "").replace("M", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `M${String(nextNumber).padStart(6, "0")}`;
}

export function generateNextFamilyId(families) {
  const nextNumber =
    families.reduce((maxValue, family) => {
      const numericPart = Number(String(family.familyId || "").replace("HH", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `HH${String(nextNumber).padStart(6, "0")}`;
}

export function getReciprocalRelationship(relationship, member = null) {
  if (relationship === "Parent") {
    if (member?.gender === "Male") {
      return "Son";
    }

    if (member?.gender === "Female") {
      return "Daughter";
    }
  }

  return reciprocalMap[relationship] || relationship;
}

export function buildGroupSelections(groups, groupChain) {
  return groupChain
    .map((groupId) => groups.find((group) => (group._id || group.id) === groupId))
    .filter(Boolean)
    .map((group) => ({
      groupId: group._id || group.id,
      levelName: group.levelName || "",
      groupName: group.name,
      groupCode: group.code || "",
    }));
}

export function enrichFamilyLinks(familyLinks, members) {
  return familyLinks
    .map((link) => {
      const match = members.find((member) => member.memberId === link.memberId);
      if (!match) {
        return null;
      }

      return {
        memberId: match.memberId,
        memberName: `${match.firstName} ${match.lastName}`,
        relationship: link.relationship,
      };
    })
    .filter(Boolean);
}
