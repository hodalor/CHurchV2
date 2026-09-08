import {
  hydrateAttendanceEventRecord,
  hydrateGroupRecord,
  hydrateMinistryRecord,
  normalizeAttendanceEventDraft,
  normalizeGroupDraft,
  normalizeMinistryDraft,
  normalizeMinistrySelectionArray,
} from "./appContextOrganizationUtils";

describe("appContextOrganizationUtils", () => {
  it("hydrates ministry records with safe defaults", () => {
    expect(hydrateMinistryRecord({ _id: "min-1", name: "Choir" })).toEqual(
      expect.objectContaining({
        id: "min-1",
        members: [],
        leadership: expect.objectContaining({
          elderInCharge: null,
          treasurer: null,
        }),
      })
    );
  });

  it("normalizes ministry drafts and removes duplicate members", () => {
    expect(
      normalizeMinistryDraft({
        name: "Ushering",
        members: [
          { memberId: "M000001", memberName: "Prince" },
          { memberId: "M000001", memberName: "Prince" },
        ],
        leadership: {
          chairman: { memberId: "M000001", memberName: "Prince" },
        },
      })
    ).toEqual(
      expect.objectContaining({
        name: "Ushering",
        color: "#4f46e5",
        members: [{ memberId: "M000001", memberName: "Prince" }],
        leadership: expect.objectContaining({
          chairman: { memberId: "M000001", memberName: "Prince" },
        }),
      })
    );
  });

  it("filters invalid ministry selections", () => {
    expect(
      normalizeMinistrySelectionArray([
        null,
        { memberId: "M000001", memberName: "Prince" },
        { memberName: "Missing Id" },
      ])
    ).toEqual([{ memberId: "M000001", memberName: "Prince" }]);
  });

  it("hydrates group records with parent metadata", () => {
    expect(
      hydrateGroupRecord({
        _id: "group-1",
        parent: { _id: "group-root", name: "Assemblies" },
      })
    ).toEqual(
      expect.objectContaining({
        id: "group-1",
        parentId: "group-root",
        parentName: "Assemblies",
      })
    );
  });

  it("normalizes group drafts", () => {
    expect(normalizeGroupDraft({ name: "Zone 1" })).toEqual({
      name: "Zone 1",
      parentId: null,
      description: "",
    });
  });

  it("hydrates attendance events with check-in defaults", () => {
    expect(hydrateAttendanceEventRecord({ title: "Sunday Service" })).toEqual(
      expect.objectContaining({
        title: "Sunday Service",
        eventTypeId: "",
        ministryId: "",
        isCheckInOpen: true,
        attendanceRecords: [],
      })
    );
  });

  it("normalizes attendance event drafts", () => {
    expect(
      normalizeAttendanceEventDraft({
        eventTypeId: { _id: "service" },
        ministryId: { _id: "min-1" },
        title: "Midweek Prayer",
        location: "Main Auditorium",
      })
    ).toEqual(
      expect.objectContaining({
        eventTypeId: "service",
        ministryId: "min-1",
        title: "Midweek Prayer",
        location: "Main Auditorium",
        isCheckInOpen: true,
      })
    );
  });
});
