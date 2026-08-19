const reciprocalMap = {
  Father: "Son",
  Mother: "Son",
  Son: "Father",
  Daughter: "Father",
  Husband: "Wife",
  Wife: "Husband",
  Brother: "Brother",
  Sister: "Sister",
  Guardian: "Dependent",
  Dependent: "Guardian",
};

export function generateNextMemberId(members) {
  const nextNumber =
    members.reduce((maxValue, member) => {
      const numericPart = Number(String(member.memberId || "").replace("MB", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `MB${String(nextNumber).padStart(4, "0")}`;
}

export function generateNextFamilyId(families) {
  const nextNumber =
    families.reduce((maxValue, family) => {
      const numericPart = Number(String(family.familyId || "").replace("FH", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `FH${String(nextNumber).padStart(4, "0")}`;
}

export function getReciprocalRelationship(relationship) {
  return reciprocalMap[relationship] || relationship;
}

export function buildGroupSelections(groups, groupChain) {
  return groupChain
    .map((groupId) => groups.find((group) => group.id === groupId))
    .filter(Boolean)
    .map((group) => ({
      groupId: group.id,
      levelName: group.levelName,
      groupName: group.name,
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
