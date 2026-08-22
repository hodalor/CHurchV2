const express = require("express");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { listLookupValuesByType } = require("../services/lookupService");
const {
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
} = require("../services/financeManagementService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
router.use(authenticate);

router.get("/", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const transactions = await listTransactions({ user: req.user, filters: req.query });
    res.json(
      transactions.map((transaction) => ({
        _id: transaction._id,
        recordNo: transaction.receiptNumber,
        category: transaction.fundId?.name || transaction.transactionType?.label || "-",
        description: transaction.notes || transaction.referenceNumber || "",
        amount: transaction.amount,
        date: transaction.date,
        status: transaction.status === "posted" ? "Posted" : "Voided",
        memberId: transaction.memberId || null,
        householdId: transaction.householdId || null,
        fundId: transaction.fundId || null,
        method: transaction.method || null,
        transactionType: transaction.transactionType || null,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/next-record-no", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const recordNo = await getNextReceiptNumber();
    res.json({ recordNo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/options", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const [funds, transactionMethods, transactionTypes, expenseCategories] = await Promise.all([
      listFunds(),
      listLookupValuesByType("finance_transaction_method"),
      listLookupValuesByType("finance_transaction_type"),
      listLookupValuesByType("finance_expense_category"),
    ]);

    res.json({
      funds,
      transactionMethods,
      transactionTypes,
      expenseCategories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/overview", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const overview = await getFinanceOverview({ user: req.user });
    res.json(overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/funds", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    res.json(await listFunds());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/funds", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const fund = await saveFund({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json(fund);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/funds/:fundId", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const fund = await saveFund({
      payload: req.body,
      user: req.user,
      ipAddress: req.ip,
      fundId: req.params.fundId,
    });
    res.json(fund);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/transactions", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    res.json(await listTransactions({ user: req.user, filters: req.query }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/transactions", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const transaction = await createTransaction({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/transactions/batch", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const items = await createTransactionBatch({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json({ createdCount: items.length, items });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/transactions/:transactionId/void", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const result = await voidTransaction({
      transactionId: req.params.transactionId,
      reason: req.body.reason || "",
      user: req.user,
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/pledges", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    res.json(await listPledges({ user: req.user, filters: req.query }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/pledges", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const pledge = await createPledge({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json(pledge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/pledges/:pledgeId/payments", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const transaction = await recordPledgePayment({
      pledgeId: req.params.pledgeId,
      payload: req.body,
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/expenses", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    res.json(await listExpenses({ filters: req.query }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/expenses", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const expense = await createExpense({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/expenses/:expenseId/approve", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    res.json(await approveExpense({ expenseId: req.params.expenseId, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/expenses/:expenseId/reject", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    res.json(
      await rejectExpense({
        expenseId: req.params.expenseId,
        reason: req.body.reason || "",
        user: req.user,
        ipAddress: req.ip,
      })
    );
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/expenses/:expenseId/pay", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    res.json(
      await payExpense({
        expenseId: req.params.expenseId,
        paymentMethod: req.body.paymentMethod || null,
        paymentDate: req.body.paymentDate || null,
        user: req.user,
        ipAddress: req.ip,
      })
    );
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/expenses/:expenseId/void", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    res.json(
      await voidExpense({
        expenseId: req.params.expenseId,
        reason: req.body.reason || "",
        user: req.user,
        ipAddress: req.ip,
      })
    );
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/budgets", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    res.json(await listBudgets({ filters: req.query }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/budgets", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    res.status(201).json(await createBudget({ payload: req.body, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/reports/:reportType", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const report = await getFinanceReports({ user: req.user, reportType: req.params.reportType, filters: req.query });
    if (String(req.query.format || "").toLowerCase() === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.reportType}.csv"`);
      return res.send(convertReportToCsv(report));
    }
    res.json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function convertReportToCsv(report) {
  const rows = [];

  if (Array.isArray(report?.rows)) {
    rows.push(["name", "amount"]);
    report.rows.forEach((item) => rows.push([item.name || item.label || "", item.amount || item.total || 0]));
  } else if (Array.isArray(report?.byCategory)) {
    rows.push(["category", "amount", "count"]);
    report.byCategory.forEach((item) => rows.push([item.name || "", item.amount || 0, item.count || 0]));
  } else if (Array.isArray(report?.byFund)) {
    rows.push(["fund", "pledged", "fulfilled", "count"]);
    report.byFund.forEach((item) => rows.push([item.name || "", item.amount || 0, item.secondaryAmount || 0, item.count || 0]));
  } else if (Array.isArray(report?.lines)) {
    rows.push(["line", "budgetedAmount", "actualAmount", "variance", "variancePercent"]);
    report.lines.forEach((item) =>
      rows.push([
        item.ministryId?.name || item.category?.label || item.fundId?.name || item.lineType || "",
        item.targetValue || item.budgetedAmount || 0,
        item.actualValue || 0,
        item.variance || 0,
        item.variancePercent || 0,
      ])
    );
  } else {
    rows.push(["value"], [JSON.stringify(report || {})]);
  }

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

module.exports = router;
