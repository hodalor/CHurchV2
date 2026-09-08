jest.mock("../../src/services/financePolicyService", () => ({
  canViewIndividualGiving: jest.fn(),
}));

const { sanitizeTransactionForUser } = require("../../src/services/financeAccessService");
const { canViewIndividualGiving } = require("../../src/services/financePolicyService");

describe("financeAccessService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the full transaction when the user can view giving details", () => {
    canViewIndividualGiving.mockReturnValue(true);

    const transaction = {
      toObject: () => ({
        memberId: "member-1",
        householdId: "household-1",
        notes: "Private note",
      }),
    };

    expect(sanitizeTransactionForUser(transaction, { roles: ["Finance"] })).toEqual({
      memberId: "member-1",
      householdId: "household-1",
      notes: "Private note",
    });
  });

  it("redacts giver identity and notes for restricted viewers", () => {
    canViewIndividualGiving.mockReturnValue(false);

    expect(
      sanitizeTransactionForUser(
        {
          memberId: "member-1",
          householdId: "household-1",
          linkedPledgeId: null,
          notes: "Private note",
        },
        { roles: ["Usher"] }
      )
    ).toEqual({
      memberId: null,
      householdId: null,
      linkedPledgeId: null,
      notes: "",
    });
  });

  it("keeps pledge notes when redacting a linked pledge transaction", () => {
    canViewIndividualGiving.mockReturnValue(false);

    expect(
      sanitizeTransactionForUser(
        {
          memberId: "member-2",
          householdId: "household-2",
          linkedPledgeId: "pledge-1",
          notes: "Installment one",
        },
        { roles: ["Ministry Leader"] }
      )
    ).toEqual({
      memberId: null,
      householdId: null,
      linkedPledgeId: "pledge-1",
      notes: "Installment one",
    });
  });
});
