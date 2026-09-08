import {
  hydrateBibleStudyRecord,
  hydrateDiscipleshipProgrammeRecord,
  hydrateProspectRecord,
  hydrateVisitorRecord,
  normalizeBibleStudyDraft,
  normalizeDiscipleshipEnrollmentDraft,
  normalizeDiscipleshipProgrammeDraft,
  normalizeProspectDraft,
  normalizeVisitorDraft,
} from "./appContextOutreachUtils";

describe("appContextOutreachUtils", () => {
  it("hydrates visitor records with safe defaults", () => {
    expect(hydrateVisitorRecord({ firstName: "Ama" })).toEqual(
      expect.objectContaining({
        firstName: "Ama",
        gender: "",
        status: "",
        assignedFollowUpMemberId: "",
      })
    );
  });

  it("normalizes visitor drafts and resolves the follow-up user by member id", () => {
    const users = [{ _id: "user-1", memberId: "M000010" }];
    const draft = {
      visitorId: "VIS-1",
      firstName: "Kojo",
      assignedFollowUpMemberId: "M000010",
      howHeard: { _id: "invite" },
    };

    expect(normalizeVisitorDraft(draft, users)).toEqual(
      expect.objectContaining({
        visitorId: "VIS-1",
        assignedFollowUpUserId: "user-1",
        assignedFollowUpMemberId: "M000010",
        howHeard: "invite",
      })
    );
  });

  it("hydrates prospect records with formatted dates and history defaults", () => {
    expect(
      hydrateProspectRecord({
        createdAt: "2026-09-08T11:22:33.000Z",
        dateFirstContact: "2026-09-02T08:00:00.000Z",
      })
    ).toEqual(
      expect.objectContaining({
        dateFirstContact: "2026-09-02",
        dateCaptured: "2026-09-08",
        stageHistory: [],
      })
    );
  });

  it("normalizes prospect drafts and resolves evangelist assignments", () => {
    const users = [{ _id: "user-2", memberId: "M000011" }];
    const draft = {
      assignedEvangelistMemberId: "M000011",
      source: { _id: "referral" },
      currentStage: { _id: "contacted" },
      campaignId: { _id: "campaign-1" },
    };

    expect(normalizeProspectDraft(draft, users)).toEqual(
      expect.objectContaining({
        assignedEvangelistId: "user-2",
        assignedEvangelistMemberId: "M000011",
        source: "referral",
        currentStage: "contacted",
        campaignId: "campaign-1",
      })
    );
  });

  it("hydrates bible study records with formatted dates and lesson defaults", () => {
    expect(
      hydrateBibleStudyRecord({
        startDate: "2026-09-01T00:00:00.000Z",
        createdAt: "2026-09-08T11:22:33.000Z",
      })
    ).toEqual(
      expect.objectContaining({
        startDate: "2026-09-01",
        dateCaptured: "2026-09-08",
        lessonsCompleted: [],
      })
    );
  });

  it("normalizes bible study drafts and resolves the teacher user", () => {
    const users = [{ _id: "user-3", memberId: "M000012" }];
    const draft = {
      teacherMemberId: "M000012",
      prospect: { _id: "prospect-1" },
      status: { _id: "active" },
    };

    expect(normalizeBibleStudyDraft(draft, users)).toEqual(
      expect.objectContaining({
        teacherId: "user-3",
        teacherMemberId: "M000012",
        prospect: "prospect-1",
        status: "active",
      })
    );
  });

  it("flattens discipleship programme modules into a display string", () => {
    expect(
      hydrateDiscipleshipProgrammeRecord({
        name: "Foundations",
        modules: [{ title: "Prayer" }, { title: "Worship" }],
      })
    ).toEqual(
      expect.objectContaining({
        modules: "Prayer, Worship",
      })
    );
  });

  it("normalizes discipleship programme drafts into ordered modules", () => {
    expect(normalizeDiscipleshipProgrammeDraft({ modules: "Prayer, Worship" })).toEqual(
      expect.objectContaining({
        expectedDurationDays: 90,
        modules: [
          { title: "Prayer", order: 1 },
          { title: "Worship", order: 2 },
        ],
      })
    );
  });

  it("normalizes discipleship enrollment drafts", () => {
    expect(
      normalizeDiscipleshipEnrollmentDraft({
        memberId: { _id: "member-1" },
        programmeId: { _id: "programme-1" },
        mentorId: { _id: "mentor-1" },
        status: { _id: "active" },
        sourceProspectId: "prospect-1",
      })
    ).toEqual(
      expect.objectContaining({
        memberId: "member-1",
        programmeId: "programme-1",
        mentorId: "mentor-1",
        status: "active",
        sourceProspectId: "prospect-1",
      })
    );
  });
});
