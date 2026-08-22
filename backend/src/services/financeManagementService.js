const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const Fund = require("../models/Fund");
const Member = require("../models/Member");
const Family = require("../models/Family");
const LookupValue = require("../models/LookupValue");
const Pledge = require("../models/Pledge");
const Transaction = require("../models/Transaction");
const { logAudit } = require("./auditService");
const { sanitizeTransactionForUser } = require("./financeAccessService");
const {
  canApproveExpense,
  canViewIndividualGiving,
  canVoidFinancialRecords,
  getExpenseApprovalThreshold,
  requiresHigherExpenseApproval,
} = require("./financePolicyService");
const { voidWithReversal } = require("./financialCorrectionService");
const { computeVariance } = require("./varianceService");

async function listFunds() {
  return Fund.find().sort({ active: -1, name: 1 });
}

async function saveFund({ payload, user, ipAddress = "", fundId = "" }) {
  if (!String(payload.name || "").trim()) {
    throw new Error("Fund name is required.");
  }

  const existing = fundId ? await Fund.findById(fundId) : null;
  const previousValue = existing?.toObject() || null;
  const fund = existing || new Fund();
  fund.name = String(payload.name || "").trim();
  fund.description = String(payload.description || "").trim();
  fund.active = payload.active !== false;
  await fund.save();

  await logAudit({
    action: existing ? "update" : "create",
    module: "Finance",
    recordType: "Fund",
    recordId: String(fund._id),
    previousValue,
    newValue: fund.toObject(),
    user,
    ipAddress,
  });

  return fund;
}

async function getNextReceiptNumber() {
  const existing = await Transaction.find({}, { receiptNumber: 1 }).lean();
  const nextNumber =
    existing.reduce((maxValue, item) => {
      const numericPart = Number(String(item.receiptNumber || "").replace("RCPT-", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `RCPT-${String(nextNumber).padStart(6, "0")}`;
}

async function listTransactions({ user, filters = {} } = {}) {
  const query = buildDateQuery(filters);
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.fundId) {
    query.fundId = filters.fundId;
  }
  if (filters.linkedPledgeId) {
    query.linkedPledgeId = filters.linkedPledgeId;
  }

  const rows = await Transaction.find(query)
    .populate("memberId", "memberId firstName lastName")
    .populate("householdId", "familyId familyName")
    .populate("fundId", "name")
    .populate("method", "label key")
    .populate("transactionType", "label key")
    .populate("recordedBy", "displayName username")
    .populate("linkedPledgeId", "pledgedAmount status")
    .sort({ date: -1, createdAt: -1 });

  return rows.map((row) => sanitizeTransactionForUser(row, user));
}

async function createTransaction({ payload, user, ipAddress = "" }) {
  const normalized = await normalizeTransactionPayload(payload, user);
  const transaction = await Transaction.create(normalized);

  await logAudit({
    action: "create",
    module: "Finance",
    recordType: "Transaction",
    recordId: String(transaction._id),
    newValue: transaction.toObject(),
    user,
    ipAddress,
  });

  return transaction;
}

async function createTransactionBatch({ payload, user, ipAddress = "" }) {
  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];
  if (!lineItems.length) {
    throw new Error("Add at least one batch line item.");
  }

  const batchKey = `BATCH-${Date.now()}`;
  const created = [];
  for (const lineItem of lineItems) {
    const transaction = await createTransaction({
      payload: {
        ...lineItem,
        date: payload.date,
        notes: lineItem.notes || payload.notes || "",
        batch: {
          batchKey,
          serviceEventRef: payload.serviceEventRef || "",
          countedBy: payload.countedBy || "",
          totalExpected: Number(payload.totalExpected || 0),
        },
      },
      user,
      ipAddress,
    });
    created.push(transaction);
  }

  return created;
}

async function voidTransaction({ transactionId, reason, user, ipAddress = "" }) {
  if (!canVoidFinancialRecords(user)) {
    throw new Error("You are not allowed to void finance transactions.");
  }

  if (!String(reason || "").trim()) {
    throw new Error("Void reason is required.");
  }

  return voidWithReversal({
    entityModel: Transaction,
    entityName: "Transaction",
    entityId: transactionId,
    user,
    ipAddress,
    voidReason: reason,
    buildReversalPayload: async (transaction) => ({
      date: new Date(),
      memberId: transaction.memberId || null,
      householdId: transaction.householdId || null,
      amount: Number(transaction.amount || 0) * -1,
      fundId: transaction.fundId,
      method: transaction.method,
      transactionType: transaction.transactionType,
      referenceNumber: transaction.referenceNumber,
      receiptNumber: await getNextReceiptNumber(),
      recordedBy: user?._id,
      notes: `Reversal for receipt ${transaction.receiptNumber}. ${String(reason || "").trim()}`.trim(),
      linkedPledgeId: transaction.linkedPledgeId || null,
      status: "posted",
      reversalOf: transaction._id,
      isReversal: true,
      batch: transaction.batch || {},
      metadata: {
        originalReceiptNumber: transaction.receiptNumber,
      },
    }),
  });
}

async function listPledges({ user, filters = {} } = {}) {
  const query = {};
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.fundId) {
    query.fundId = filters.fundId;
  }

  const pledges = await Pledge.find(query)
    .populate("memberId", "memberId firstName lastName")
    .populate("householdId", "familyId familyName")
    .populate("fundId", "name")
    .populate("createdBy", "displayName username")
    .sort({ startDate: -1, createdAt: -1 });

  const pledgeIds = pledges.map((pledge) => pledge._id);
  const payments = await Transaction.aggregate([
    { $match: { linkedPledgeId: { $in: pledgeIds }, status: "posted" } },
    { $group: { _id: "$linkedPledgeId", fulfilledAmount: { $sum: "$amount" } } },
  ]);
  const paymentMap = new Map(payments.map((item) => [String(item._id), Number(item.fulfilledAmount || 0)]));

  return pledges.map((pledge) => {
    const fulfilledAmount = paymentMap.get(String(pledge._id)) || 0;
    const fulfillmentPercent = Number(pledge.pledgedAmount || 0) === 0 ? 0 : (fulfilledAmount / Number(pledge.pledgedAmount || 0)) * 100;
    return {
      ...pledge.toObject(),
      fulfilledAmount,
      fulfillmentPercent,
      canViewDetails: canViewIndividualGiving(user),
    };
  });
}

async function createPledge({ payload, user, ipAddress = "" }) {
  const normalized = await normalizePledgePayload(payload, user);
  const pledge = await Pledge.create(normalized);
  await logAudit({
    action: "create",
    module: "Finance",
    recordType: "Pledge",
    recordId: String(pledge._id),
    newValue: pledge.toObject(),
    user,
    ipAddress,
  });
  return pledge;
}

async function recordPledgePayment({ pledgeId, payload, user, ipAddress = "" }) {
  const pledge = await Pledge.findById(pledgeId);
  if (!pledge) {
    throw new Error("Pledge not found.");
  }

  return createTransaction({
    payload: {
      ...payload,
      memberId: payload.memberId || pledge.memberId || null,
      householdId: payload.householdId || pledge.householdId || null,
      fundId: payload.fundId || pledge.fundId,
      linkedPledgeId: pledge._id,
    },
    user,
    ipAddress,
  });
}

async function listExpenses({ filters = {} } = {}) {
  const query = buildDateQuery(filters);
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.ministryId) {
    query.ministryId = filters.ministryId;
  }

  return Expense.find(query)
    .populate("category", "label key")
    .populate("paymentMethod", "label key")
    .populate("budgetLineId", "period")
    .populate("ministryId", "name")
    .populate("requestedBy", "displayName username")
    .populate("approvedBy", "displayName username")
    .sort({ date: -1, createdAt: -1 });
}

async function createExpense({ payload, user, ipAddress = "" }) {
  const normalized = await normalizeExpensePayload(payload, user);
  const expense = await Expense.create(normalized);

  await logAudit({
    action: "create",
    module: "Finance",
    recordType: "Expense",
    recordId: String(expense._id),
    newValue: expense.toObject(),
    user,
    ipAddress,
  });

  return expense;
}

async function approveExpense({ expenseId, user, ipAddress = "" }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new Error("Expense not found.");
  }
  if (!canApproveExpense(user, expense.amount)) {
    throw new Error("You are not allowed to approve this expense.");
  }

  const previousValue = expense.toObject();
  expense.status = "approved";
  expense.approvedBy = user?._id || null;
  expense.approvedAt = new Date();
  await expense.save();

  await logAudit({
    action: "status-change",
    module: "Finance",
    recordType: "Expense",
    recordId: String(expense._id),
    previousValue,
    newValue: expense.toObject(),
    user,
    ipAddress,
  });

  return expense;
}

async function rejectExpense({ expenseId, reason, user, ipAddress = "" }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new Error("Expense not found.");
  }
  if (!canApproveExpense(user, expense.amount)) {
    throw new Error("You are not allowed to reject this expense.");
  }

  const previousValue = expense.toObject();
  expense.status = "rejected";
  expense.rejectedBy = user?._id || null;
  expense.rejectedAt = new Date();
  expense.rejectedReason = String(reason || "").trim();
  await expense.save();

  await logAudit({
    action: "status-change",
    module: "Finance",
    recordType: "Expense",
    recordId: String(expense._id),
    previousValue,
    newValue: expense.toObject(),
    user,
    ipAddress,
  });

  return expense;
}

async function payExpense({ expenseId, paymentMethod, paymentDate, user, ipAddress = "" }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    throw new Error("Expense not found.");
  }

  const previousValue = expense.toObject();
  expense.status = "paid";
  expense.paymentMethod = paymentMethod || expense.paymentMethod || null;
  expense.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
  expense.paidAt = new Date();
  await expense.save();

  await logAudit({
    action: "status-change",
    module: "Finance",
    recordType: "Expense",
    recordId: String(expense._id),
    previousValue,
    newValue: expense.toObject(),
    user,
    ipAddress,
  });

  return expense;
}

async function voidExpense({ expenseId, reason, user, ipAddress = "" }) {
  if (!canVoidFinancialRecords(user)) {
    throw new Error("You are not allowed to void expenses.");
  }

  if (!String(reason || "").trim()) {
    throw new Error("Void reason is required.");
  }

  return voidWithReversal({
    entityModel: Expense,
    entityName: "Expense",
    entityId: expenseId,
    user,
    ipAddress,
    voidReason: reason,
    buildReversalPayload: async (expense) => ({
      date: new Date(),
      category: expense.category,
      amount: Number(expense.amount || 0) * -1,
      payee: `${expense.payee} (Reversal)`,
      paymentMethod: expense.paymentMethod || null,
      receiptImageUrl: expense.receiptImageUrl || "",
      budgetLineId: expense.budgetLineId || null,
      ministryId: expense.ministryId || null,
      status: "paid",
      requestedBy: user?._id,
      approvedBy: user?._id,
      approvedAt: new Date(),
      paidAt: new Date(),
      paymentDate: new Date(),
      approvalThresholdFlag: false,
      notes: `Reversal for expense ${expense._id}. ${String(reason || "").trim()}`.trim(),
      reversalOf: expense._id,
      isReversal: true,
      metadata: {
        originalExpenseId: String(expense._id),
      },
    }),
  });
}

async function listBudgets({ filters = {} } = {}) {
  const query = {};
  if (filters.period) {
    query.period = filters.period;
  }
  if (filters.status) {
    query.status = filters.status;
  }

  const budgets = await Budget.find(query)
    .populate("ministryId", "name")
    .populate("category", "label key")
    .populate("fundId", "name")
    .sort({ period: -1, createdAt: -1 });

  return Promise.all(
    budgets.map(async (budget) => {
      const actualAmount = await computeBudgetActualAmount(budget);
      return {
        ...budget.toObject(),
        ...computeVariance(budget.budgetedAmount, actualAmount),
      };
    })
  );
}

async function createBudget({ payload, user, ipAddress = "" }) {
  const normalized = normalizeBudgetPayload(payload, user);
  const budget = await Budget.create(normalized);
  await logAudit({
    action: "create",
    module: "Finance",
    recordType: "Budget",
    recordId: String(budget._id),
    newValue: budget.toObject(),
    user,
    ipAddress,
  });
  return budget;
}

async function getFinanceOverview({ user }) {
  const [transactions, expenses, pledges, budgets] = await Promise.all([
    listTransactions({ user }),
    listExpenses({}),
    listPledges({ user }),
    listBudgets({}),
  ]);

  const currentIncome = transactions
    .filter((item) => item.status === "posted")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const currentExpenses = expenses
    .filter((item) => ["approved", "paid", "requested"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pledgeBehind = pledges.filter((item) => item.status === "active" && item.fulfillmentPercent < 100).length;
  const overBudgetLines = budgets.filter((item) => Number(item.actualValue || 0) > Number(item.targetValue || item.budgetedAmount || 0)).length;

  return {
    totals: {
      income: currentIncome,
      expenses: currentExpenses,
      net: currentIncome - currentExpenses,
    },
    givingTrend: buildMonthlyTotals(transactions, "date", "amount"),
    expenseTrend: buildMonthlyTotals(expenses, "date", "amount"),
    pledgeSnapshot: {
      totalPledges: pledges.length,
      behindSchedule: pledgeBehind,
      fulfilled: pledges.filter((item) => item.status === "fulfilled" || item.fulfillmentPercent >= 100).length,
    },
    budgetSnapshot: {
      totalLines: budgets.length,
      overBudgetLines,
      nearBudgetLines: budgets.filter((item) => Number(item.variancePercent || 0) >= -10 && Number(item.variancePercent || 0) < 0).length,
    },
    recentTransactions: transactions.slice(0, 8),
    recentExpenses: expenses.slice(0, 8),
    approvalThreshold: getExpenseApprovalThreshold(),
  };
}

async function getFinanceReports({ user, reportType = "income-statement", filters = {} } = {}) {
  if (reportType === "income-statement") {
    return getIncomeStatementReport({ user, filters });
  }
  if (reportType === "expense-report") {
    return getExpenseReport({ filters });
  }
  if (reportType === "pledge-fulfillment") {
    return getPledgeFulfillmentReport({ user, filters });
  }
  if (reportType === "budget-vs-actual") {
    return getBudgetVsActualReport({ filters });
  }
  if (reportType === "giving-statement") {
    return getIndividualGivingStatement({ user, filters });
  }

  throw new Error("Finance report type not found.");
}

async function getIncomeStatementReport({ user, filters = {} }) {
  const transactions = await listTransactions({ user, filters });
  const grouped = groupTotals(
    transactions.filter((item) => item.status === "posted"),
    (item) => item.fundId?.name || "Unassigned Fund"
  );

  return {
    rows: grouped,
    totals: {
      amount: grouped.reduce((sum, item) => sum + item.amount, 0),
    },
    transactions,
  };
}

async function getExpenseReport({ filters = {} }) {
  const expenses = await listExpenses({ filters });
  const byCategory = groupTotals(expenses.filter((item) => item.status !== "voided"), (item) => item.category?.label || "Unassigned Category");
  const byMinistry = groupTotals(expenses.filter((item) => item.status !== "voided"), (item) => item.ministryId?.name || "General");

  return {
    byCategory,
    byMinistry,
    expenses,
  };
}

async function getPledgeFulfillmentReport({ user, filters = {} }) {
  const pledges = await listPledges({ user, filters });
  const byFund = groupTotals(pledges, (item) => item.fundId?.name || "Unassigned Fund", "pledgedAmount", "fulfilledAmount");

  return {
    byFund,
    pledges,
  };
}

async function getBudgetVsActualReport({ filters = {} }) {
  const budgets = await listBudgets({ filters });
  const rollup = budgets.reduce(
    (accumulator, line) => {
      accumulator.budgetedAmount += Number(line.targetValue || line.budgetedAmount || 0);
      accumulator.actualAmount += Number(line.actualValue || 0);
      return accumulator;
    },
    { budgetedAmount: 0, actualAmount: 0 }
  );

  return {
    lines: budgets,
    churchWide: computeVariance(rollup.budgetedAmount, rollup.actualAmount),
  };
}

async function getIndividualGivingStatement({ user, filters = {} }) {
  if (!canViewIndividualGiving(user)) {
    throw new Error("You are not allowed to view individual giving statements.");
  }

  const query = buildDateQuery(filters);
  if (filters.memberId) {
    query.memberId = filters.memberId;
  }
  if (filters.householdId) {
    query.householdId = filters.householdId;
  }

  const transactions = await Transaction.find(query)
    .populate("memberId", "memberId firstName lastName")
    .populate("householdId", "familyId familyName")
    .populate("fundId", "name")
    .populate("method", "label")
    .sort({ date: -1, createdAt: -1 });

  return {
    rows: transactions.map((item) => item.toObject()),
    totals: {
      amount: transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    },
  };
}

async function normalizeTransactionPayload(payload = {}, user) {
  const amount = Number(payload.amount || 0);
  if (!payload.date) {
    throw new Error("Transaction date is required.");
  }
  if (!payload.fundId) {
    throw new Error("Fund is required.");
  }
  if (!payload.method) {
    throw new Error("Method is required.");
  }
  if (!payload.transactionType) {
    throw new Error("Transaction type is required.");
  }
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Amount is required.");
  }

  return {
    date: new Date(payload.date),
    memberId: payload.memberId || null,
    householdId: payload.householdId || null,
    amount,
    fundId: payload.fundId,
    method: payload.method,
    transactionType: payload.transactionType,
    referenceNumber: String(payload.referenceNumber || "").trim(),
    receiptNumber: payload.receiptNumber || (await getNextReceiptNumber()),
    recordedBy: user?._id,
    notes: String(payload.notes || "").trim(),
    linkedPledgeId: payload.linkedPledgeId || null,
    status: payload.status || "posted",
    batch: payload.batch || {},
    metadata: payload.metadata || {},
  };
}

async function normalizePledgePayload(payload = {}, user) {
  if (!payload.memberId && !payload.householdId) {
    throw new Error("Select a member or household for the pledge.");
  }
  if (!payload.fundId) {
    throw new Error("Fund is required.");
  }
  if (!payload.startDate) {
    throw new Error("Start date is required.");
  }
  if (!Number(payload.pledgedAmount || 0)) {
    throw new Error("Pledged amount is required.");
  }

  return {
    memberId: payload.memberId || null,
    householdId: payload.householdId || null,
    fundId: payload.fundId,
    pledgedAmount: Number(payload.pledgedAmount || 0),
    frequency: payload.frequency || "one-time",
    startDate: new Date(payload.startDate),
    endDate: payload.endDate ? new Date(payload.endDate) : null,
    status: payload.status || "active",
    notes: String(payload.notes || "").trim(),
    createdBy: user?._id,
    metadata: payload.metadata || {},
  };
}

async function normalizeExpensePayload(payload = {}, user) {
  if (!payload.date) {
    throw new Error("Expense date is required.");
  }
  if (!payload.category) {
    throw new Error("Expense category is required.");
  }
  if (!String(payload.payee || "").trim()) {
    throw new Error("Payee is required.");
  }
  if (!Number(payload.amount || 0)) {
    throw new Error("Amount is required.");
  }

  const amount = Number(payload.amount || 0);

  return {
    date: new Date(payload.date),
    category: payload.category,
    amount,
    payee: String(payload.payee || "").trim(),
    paymentMethod: payload.paymentMethod || null,
    receiptImageUrl: String(payload.receiptImageUrl || "").trim(),
    budgetLineId: payload.budgetLineId || null,
    ministryId: payload.ministryId || null,
    status: payload.status || "requested",
    requestedBy: user?._id,
    approvalThresholdFlag: requiresHigherExpenseApproval(amount),
    notes: String(payload.notes || "").trim(),
    metadata: payload.metadata || {},
  };
}

function normalizeBudgetPayload(payload = {}, user) {
  if (!String(payload.period || "").trim()) {
    throw new Error("Budget period is required.");
  }
  if (!Number(payload.budgetedAmount || 0)) {
    throw new Error("Budget amount is required.");
  }

  return {
    period: String(payload.period || "").trim(),
    granularity: String(payload.granularity || "annual").trim(),
    lineType: payload.lineType || "expense",
    ministryId: payload.ministryId || null,
    category: payload.category || null,
    fundId: payload.fundId || null,
    budgetedAmount: Number(payload.budgetedAmount || 0),
    status: payload.status || "draft",
    notes: String(payload.notes || "").trim(),
    createdBy: user?._id,
    metadata: payload.metadata || {},
  };
}

async function computeBudgetActualAmount(budget) {
  if (budget.lineType === "income") {
    const transactionQuery = {
      status: "posted",
      ...(budget.fundId ? { fundId: budget.fundId } : {}),
    };
    const totals = await Transaction.aggregate([
      { $match: transactionQuery },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return Number(totals[0]?.total || 0);
  }

  const expenseQuery = {
    status: { $in: ["approved", "paid"] },
    ...(budget._id ? { budgetLineId: budget._id } : {}),
    ...(budget.ministryId ? { ministryId: budget.ministryId } : {}),
    ...(budget.category ? { category: budget.category } : {}),
  };
  const totals = await Expense.aggregate([
    { $match: expenseQuery },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return Number(totals[0]?.total || 0);
}

function buildDateQuery(filters = {}) {
  const query = {};
  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) {
      query.date.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.date.$lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
    }
  }
  return query;
}

function groupTotals(items, getKey, primaryField = "amount", secondaryField = "") {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    const current = map.get(key) || {
      name: key,
      amount: 0,
      secondaryAmount: 0,
      count: 0,
    };
    current.amount += Number(item[primaryField] || 0);
    if (secondaryField) {
      current.secondaryAmount += Number(item[secondaryField] || 0);
    }
    current.count += 1;
    map.set(key, current);
  });
  return [...map.values()].sort((left, right) => right.amount - left.amount);
}

function buildMonthlyTotals(items = [], dateField = "date", amountField = "amount") {
  const monthlyMap = new Map();
  items.forEach((item) => {
    const rawDate = item?.[dateField];
    if (!rawDate) {
      return;
    }
    const date = new Date(rawDate);
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(label, (monthlyMap.get(label) || 0) + Number(item?.[amountField] || 0));
  });

  return [...monthlyMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([name, amount]) => ({ name, amount }));
}

module.exports = {
  approveExpense,
  createBudget,
  createExpense,
  createPledge,
  createTransaction,
  createTransactionBatch,
  getFinanceOverview,
  getFinanceReports,
  getNextReceiptNumber,
  listBudgets,
  listExpenses,
  listFunds,
  listPledges,
  listTransactions,
  payExpense,
  recordPledgePayment,
  rejectExpense,
  saveFund,
  voidExpense,
  voidTransaction,
};
