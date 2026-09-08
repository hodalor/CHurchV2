jest.mock("../../src/services/auditService", () => ({
  logAudit: jest.fn(),
}));

const { voidWithReversal } = require("../../src/services/financialCorrectionService");
const { logAudit } = require("../../src/services/auditService");

function createEntity(overrides = {}) {
  const entity = {
    _id: "txn-1",
    status: "posted",
    toObject: jest.fn(() => ({
      _id: "txn-1",
      status: entity.status,
      reversalEntryId: entity.reversalEntryId || null,
      voidReason: entity.voidReason || "",
    })),
    save: jest.fn(async () => entity),
    ...overrides,
  };

  return entity;
}

describe("financialCorrectionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("voids the original record, creates a reversal, and writes audit entries", async () => {
    const original = createEntity();
    const reversal = createEntity({
      _id: "txn-2",
      status: "posted",
    });
    const entityModel = {
      findById: jest.fn(async () => original),
      create: jest.fn(async () => reversal),
    };
    const buildReversalPayload = jest.fn(async () => ({
      amount: -50,
      sourceId: original._id,
    }));

    const result = await voidWithReversal({
      entityModel,
      entityName: "Transaction",
      entityId: "txn-1",
      user: { _id: "user-1" },
      ipAddress: "127.0.0.1",
      voidReason: "Recorded twice",
      buildReversalPayload,
    });

    expect(buildReversalPayload).toHaveBeenCalledWith(original);
    expect(entityModel.create).toHaveBeenCalledWith({
      amount: -50,
      sourceId: "txn-1",
    });
    expect(original.status).toBe("voided");
    expect(original.voidedBy).toBe("user-1");
    expect(original.voidReason).toBe("Recorded twice");
    expect(original.reversalEntryId).toBe("txn-2");
    expect(reversal.reversalEntryId).toBe("txn-1");
    expect(original.save).toHaveBeenCalledTimes(1);
    expect(reversal.save).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      original,
      reversal,
    });
  });

  it("rejects requests for missing entities", async () => {
    await expect(
      voidWithReversal({
        entityModel: {
          findById: jest.fn(async () => null),
        },
        entityName: "Expense",
        entityId: "expense-1",
        user: { _id: "user-1" },
        buildReversalPayload: jest.fn(),
      })
    ).rejects.toThrow("Expense not found.");
  });

  it("rejects records that are already voided", async () => {
    await expect(
      voidWithReversal({
        entityModel: {
          findById: jest.fn(async () => createEntity({ status: "voided" })),
        },
        entityName: "Expense",
        entityId: "expense-2",
        user: { _id: "user-1" },
        buildReversalPayload: jest.fn(),
      })
    ).rejects.toThrow("Expense is already voided.");
  });
});
