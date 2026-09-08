import {
  buildHouseholdMembers,
  getHouseholdRoleLabel,
  getInheritedFamilyAssignment,
  hydrateFamilyRecord,
  normalizeFamilyDraft,
  normalizeLegacyLookup,
  normalizeLegacyLookupArray,
  syncMembersToFamily,
} from "./appContextFamilyUtils";

describe("appContextFamilyUtils", () => {
  const members = [
    {
      memberId: "M000001",
      familyId: "FAM-1",
      familyName: "Mensah Family",
      gender: "Male",
      phone: "0550000001",
      membershipStatus: "Active",
    },
    {
      memberId: "M000002",
      gender: "Female",
      phone: "0550000002",
      membershipStatus: "Active",
    },
    {
      memberId: "M000003",
      gender: "Female",
      membershipStatus: "Inactive",
    },
  ];

  it("hydrates family records with formatted dates and legacy member lookups", () => {
    expect(
      hydrateFamilyRecord({
        headOfHousehold: "Prince Mensah",
        children: ["Joy Mensah"],
        createdAt: "2026-09-08T11:22:33.000Z",
      })
    ).toEqual(
      expect.objectContaining({
        dateCaptured: "2026-09-08",
        headOfHousehold: { memberId: "", memberName: "Prince Mensah" },
        children: [{ memberId: "", memberName: "Joy Mensah" }],
      })
    );
  });

  it("inherits household information from linked family members", () => {
    expect(
      getInheritedFamilyAssignment(
        {
          familyLinks: [{ memberId: "M000001", relationship: "Brother" }],
        },
        members
      )
    ).toEqual({
      familyId: "FAM-1",
      familyName: "Mensah Family",
      householdRole: "Brother",
    });
  });

  it("normalizes family drafts and derives contact details", () => {
    const result = normalizeFamilyDraft(
      {
        familyId: "FAM-2",
        familyName: "Owusu Family",
        fellowshipZone: "Zone 1",
        headOfHousehold: { memberId: "M000001", memberName: "Prince" },
        spouse: { memberId: "M000002", memberName: "Akosua" },
        children: [{ memberId: "M000003", memberName: "Joy" }],
      },
      members,
      [{ id: "group-1", name: "Zone 1" }],
      [],
      { displayName: "Admin User" }
    );

    expect(result).toEqual(
      expect.objectContaining({
        familyId: "FAM-2",
        fellowshipZone: "group-1",
        familyContact: "0550000001",
        primaryContactMemberId: "M000001",
        primaryContactNumber: "0550000001",
        dataEntryClerk: "Admin User",
      })
    );
    expect(result.householdMembers).toEqual([
      {
        memberId: "M000001",
        memberName: "Prince",
        relationshipToHead: "Head",
        status: "Active",
      },
      {
        memberId: "M000002",
        memberName: "Akosua",
        relationshipToHead: "Spouse",
        status: "Active",
      },
      {
        memberId: "M000003",
        memberName: "Joy",
        relationshipToHead: "Daughter",
        status: "Inactive",
      },
    ]);
  });

  it("normalizes legacy lookups", () => {
    expect(normalizeLegacyLookup("Legacy Name")).toEqual({
      memberId: "",
      memberName: "Legacy Name",
    });
    expect(normalizeLegacyLookupArray(["One", null])).toEqual([
      { memberId: "", memberName: "One" },
    ]);
  });

  it("builds household members without duplicates", () => {
    expect(
      buildHouseholdMembers(
        {
          headOfHousehold: { memberId: "M000001", memberName: "Prince" },
          children: [
            { memberId: "M000003", memberName: "Joy" },
            { memberId: "M000003", memberName: "Joy" },
          ],
        },
        members
      )
    ).toEqual([
      {
        memberId: "M000001",
        memberName: "Prince",
        relationshipToHead: "Head",
        status: "Active",
      },
      {
        memberId: "M000003",
        memberName: "Joy",
        relationshipToHead: "Daughter",
        status: "Inactive",
      },
    ]);
  });

  it("syncs member household roles back onto the member list", () => {
    expect(
      syncMembersToFamily(members, {
        familyId: "FAM-2",
        familyName: "Owusu Family",
        householdMembers: [{ memberId: "M000003", relationshipToHead: "Daughter" }],
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: "M000003",
          familyId: "FAM-2",
          familyName: "Owusu Family",
          householdRole: "Daughter",
        }),
      ])
    );
  });

  it("derives household role labels from member gender", () => {
    expect(getHouseholdRoleLabel("Child", { gender: "Female" })).toBe("Daughter");
    expect(getHouseholdRoleLabel("Child", { gender: "Male" })).toBe("Son");
    expect(getHouseholdRoleLabel("Spouse", { gender: "Female" })).toBe("Spouse");
  });
});
