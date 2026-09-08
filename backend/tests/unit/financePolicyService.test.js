const {
  canApproveExpense,
  canViewIndividualGiving,
  canVoidFinancialRecords,
  requiresHigherExpenseApproval,
} = require("../../src/services/financePolicyService");
const { PERMISSIONS, ROLES } = require("../../src/utils/permissions");

describe("financePolicyService", () => {
  it("allows confidential giving access for finance roles", () => {
    expect(
      canViewIndividualGiving({
        roles: [ROLES.FINANCE_MANAGER],
        permissions: [],
      })
    ).toBe(true);
  });

  it("respects explicit finance permissions", () => {
    expect(
      canVoidFinancialRecords({
        roles: [],
        permissions: [PERMISSIONS.VOID_FINANCE],
      })
    ).toBe(true);
  });

  it("requires higher approval above the configured threshold", () => {
    process.env.FINANCE_EXPENSE_APPROVAL_THRESHOLD = "500";

    expect(requiresHigherExpenseApproval(600)).toBe(true);
    expect(
      canApproveExpense(
        {
          roles: [ROLES.ELDERS],
          permissions: [],
        },
        600
      )
    ).toBe(true);
  });
});
