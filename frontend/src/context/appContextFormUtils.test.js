import {
  extractMediaLabel,
  findUserIdByMemberId,
  formatDateInputValue,
  getRequiredMemberError,
  normalizeMediaField,
  normalizeMemberDraft,
} from "./appContextFormUtils";

describe("appContextFormUtils", () => {
  it("formats media URLs into upload descriptors", () => {
    expect(normalizeMediaField("https://cdn.example.com/files/member-photo.png?token=abc")).toEqual({
      url: "https://cdn.example.com/files/member-photo.png?token=abc",
      label: "member-photo.png",
    });
  });

  it("keeps object uploads normalized with defaults", () => {
    expect(
      normalizeMediaField({
        url: "https://cdn.example.com/front-id.jpg",
      })
    ).toEqual({
      url: "https://cdn.example.com/front-id.jpg",
      label: "front-id.jpg",
      contentType: "",
      objectName: "",
    });
  });

  it("normalizes member drafts and derives metadata from auth user and media", () => {
    const draft = normalizeMemberDraft(
      {
        firstName: "Prince",
        lastName: "Zulu",
        gender: "Male",
        phone: "0200000000",
        residentialArea: "Chilenje",
        personalPhoto: "https://cdn.example.com/uploads/prince.jpg",
      },
      {
        displayName: "Clerk User",
      }
    );

    expect(draft.photoFileName).toBe("prince.jpg");
    expect(draft.dataEntryClerk).toBe("Clerk User");
    expect(draft.membershipStatus).toBe("Active");
    expect(draft.personalPhoto).toEqual({
      url: "https://cdn.example.com/uploads/prince.jpg",
      label: "prince.jpg",
    });
  });

  it("formats dates and resolves users by linked member id", () => {
    expect(formatDateInputValue("2026-09-08T18:14:00.000Z")).toBe("2026-09-08");
    expect(findUserIdByMemberId([{ _id: "user-1", memberId: "M000001" }], "M000001")).toBe(
      "user-1"
    );
  });

  it("returns the first missing required member field message", () => {
    expect(getRequiredMemberError({ firstName: "Prince", lastName: "Zulu" })).toBe(
      "Gender is required."
    );
  });

  it("extracts the last path segment from media urls", () => {
    expect(extractMediaLabel("https://cdn.example.com/path/to/file.pdf?download=true")).toBe(
      "file.pdf"
    );
  });
});
