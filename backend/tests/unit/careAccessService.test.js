jest.mock("../../src/services/auditService", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

const {
  canAccessCareNote,
  getHighestCareTier,
  logRestrictedCareView,
} = require("../../src/services/careAccessService");
const { logAudit } = require("../../src/services/auditService");
const { ROLES } = require("../../src/utils/permissions");

describe("careAccessService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows override viewers even without a pastoral role", () => {
    expect(
      canAccessCareNote(
        {
          confidentialityTier: "Elders-Only",
          visibleToOverride: ["user-1"],
        },
        {
          _id: "user-1",
          roles: [],
        }
      )
    ).toBe(true);
  });

  it("returns the highest tier from a note set", () => {
    expect(
      getHighestCareTier([
        { confidentialityTier: "Standard" },
        { confidentialityTier: "Restricted" },
        { confidentialityTier: "Elders-Only" },
      ])
    ).toBe("Elders-Only");
  });

  it("audit logs restricted note views", async () => {
    await logRestrictedCareView(
      {
        _id: "note-1",
        confidentialityTier: "Restricted",
      },
      {
        _id: "user-2",
        roles: [ROLES.ELDERS],
      },
      "127.0.0.1"
    );

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "view",
        module: "Pastoral Care",
        recordType: "CareNote",
        recordId: "note-1",
      })
    );
  });
});
