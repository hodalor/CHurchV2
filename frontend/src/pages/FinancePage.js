import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaRobot, FaSearch } from "react-icons/fa";
import ModalShell from "../components/common/ModalShell";
import { churchApi } from "../apis/churchApi";
import { useAppContext } from "../context/AppContext";

const emptyTransactionForm = {
  date: new Date().toISOString().slice(0, 10),
  memberId: "",
  householdId: "",
  amount: "",
  fundId: "",
  method: "",
  transactionType: "",
  referenceNumber: "",
  notes: "",
};

const emptyExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  category: "",
  amount: "",
  payee: "",
  paymentMethod: "",
  sourceAccountId: "",
  receiptImageUrl: "",
  budgetLineId: "",
  ministryId: "",
  notes: "",
};

const emptyPledgeForm = {
  memberId: "",
  householdId: "",
  fundId: "",
  pledgedAmount: "",
  frequency: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
};

const emptyBudgetForm = {
  period: `${new Date().getFullYear()}`,
  granularity: "annual",
  lineType: "expense",
  ministryId: "",
  category: "",
  fundId: "",
  budgetedAmount: "",
  status: "draft",
  notes: "",
};

const emptyReconciliationForm = {
  reconciliationDate: new Date().toISOString().slice(0, 10),
  serviceEventRef: "",
  method: "",
  depositAccountId: "",
  amount: "",
  notes: "",
};

const createBatchLine = () => ({
  memberId: "",
  householdId: "",
  amount: "",
  fundId: "",
  method: "",
  transactionType: "",
  referenceNumber: "",
  notes: "",
});

function getCachedFinanceState() {
  const overview = churchApi.peekCached("/finance/overview");
  const optionsResponse = churchApi.peekCached("/finance/options");
  const transactions = churchApi.peekCached("/finance/transactions");
  const pledges = churchApi.peekCached("/finance/pledges");
  const expenses = churchApi.peekCached("/finance/expenses");
  const budgets = churchApi.peekCached("/finance/budgets");
  const reconciliations = churchApi.peekCached("/finance/reconciliations");

  if ([overview, optionsResponse, transactions, pledges, expenses, budgets, reconciliations].some((item) => item === null)) {
    return null;
  }

  return {
    overview,
    funds: optionsResponse.funds || [],
    options: {
      transactionMethods: optionsResponse.transactionMethods || [],
      expensePaymentMethods: optionsResponse.expensePaymentMethods || [],
      transactionTypes: optionsResponse.transactionTypes || [],
      expenseCategories: optionsResponse.expenseCategories || [],
      depositAccounts: optionsResponse.depositAccounts || [],
    },
    transactions: Array.isArray(transactions) ? transactions : [],
    pledges: Array.isArray(pledges) ? pledges : [],
    expenses: Array.isArray(expenses) ? expenses : [],
    budgets: Array.isArray(budgets) ? budgets : [],
    reconciliations: Array.isArray(reconciliations) ? reconciliations : [],
  };
}

export default function FinancePage({ section = "overview" }) {
  const { authUser, members, families, ministries, formatCurrency, notifyError, notifySuccess } = useAppContext();
  const activeSection = section;
  const cachedFinanceState = useMemo(() => getCachedFinanceState(), []);
  const canManageFinance = authUser?.permissions?.includes("manage_finance");
  const canReviewAi = authUser?.permissions?.includes("review_ai_assist");

  const [overview, setOverview] = useState(cachedFinanceState?.overview || null);
  const [funds, setFunds] = useState(cachedFinanceState?.funds || []);
  const [options, setOptions] = useState(
    cachedFinanceState?.options || {
      transactionMethods: [],
      expensePaymentMethods: [],
      transactionTypes: [],
      expenseCategories: [],
      depositAccounts: [],
    }
  );
  const [transactions, setTransactions] = useState(cachedFinanceState?.transactions || []);
  const [pledges, setPledges] = useState(cachedFinanceState?.pledges || []);
  const [expenses, setExpenses] = useState(cachedFinanceState?.expenses || []);
  const [budgets, setBudgets] = useState(cachedFinanceState?.budgets || []);
  const [reconciliations, setReconciliations] = useState(cachedFinanceState?.reconciliations || []);
  const [reportType, setReportType] = useState("income-statement");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(!cachedFinanceState);
  const [activeModal, setActiveModal] = useState("");
  const [search, setSearch] = useState("");
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [pledgeForm, setPledgeForm] = useState(emptyPledgeForm);
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [reconciliationForm, setReconciliationForm] = useState(emptyReconciliationForm);
  const [batchForm, setBatchForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    serviceEventRef: "",
    countedBy: "",
    totalExpected: "",
    notes: "",
    lineItems: [createBatchLine()],
  });
  const loadReport = useCallback(async (nextType) => {
    try {
      const cachedReport = churchApi.peekCached(`/finance/reports/${nextType}`);
      if (cachedReport) {
        setReportData(cachedReport);
        return;
      }

      const payload = await churchApi.getFinanceReport(nextType);
      setReportData(payload);
    } catch (error) {
      notifyError(error.message || "Unable to load finance report.");
    }
  }, [notifyError]);

  useEffect(() => {
    let cancelled = false;

    async function loadFinanceState() {
      if (!cachedFinanceState) {
        setLoading(true);
      }
      try {
        const [overviewResponse, optionsResponse, transactionsResponse, pledgesResponse, expensesResponse, budgetsResponse, reconciliationsResponse] =
          await Promise.all([
            churchApi.getFinanceOverview(),
            churchApi.getFinanceOptions(),
            churchApi.getTransactions(),
            churchApi.getPledges(),
            churchApi.getExpenses(),
            churchApi.getBudgets(),
            churchApi.getReconciliations(),
          ]);

        if (cancelled) {
          return;
        }

        setOverview(overviewResponse);
        setFunds(optionsResponse.funds || []);
        setOptions({
          transactionMethods: optionsResponse.transactionMethods || [],
          expensePaymentMethods: optionsResponse.expensePaymentMethods || [],
          transactionTypes: optionsResponse.transactionTypes || [],
          expenseCategories: optionsResponse.expenseCategories || [],
          depositAccounts: optionsResponse.depositAccounts || [],
        });
        setTransactions(Array.isArray(transactionsResponse) ? transactionsResponse : []);
        setPledges(Array.isArray(pledgesResponse) ? pledgesResponse : []);
        setExpenses(Array.isArray(expensesResponse) ? expensesResponse : []);
        setBudgets(Array.isArray(budgetsResponse) ? budgetsResponse : []);
        setReconciliations(Array.isArray(reconciliationsResponse) ? reconciliationsResponse : []);
      } catch (error) {
        if (!cancelled) {
          notifyError(error.message || "Unable to load finance data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!cachedFinanceState) {
      loadFinanceState();
    }
    return () => {
      cancelled = true;
    };
  }, [cachedFinanceState, notifyError]);

  useEffect(() => {
    if (funds.length && !transactionForm.fundId) {
      setTransactionForm((current) => ({ ...current, fundId: funds[0]._id }));
      setPledgeForm((current) => ({ ...current, fundId: current.fundId || funds[0]._id }));
      setBudgetForm((current) => ({ ...current, fundId: current.fundId || funds[0]._id }));
      setBatchForm((current) => ({
        ...current,
        lineItems: current.lineItems.map((item) => ({ ...item, fundId: item.fundId || funds[0]._id })),
      }));
    }
    if (options.transactionMethods.length && !transactionForm.method) {
      setTransactionForm((current) => ({ ...current, method: options.transactionMethods[0]._id }));
      setReconciliationForm((current) => ({ ...current, method: current.method || options.transactionMethods[0]._id }));
      setBatchForm((current) => ({
        ...current,
        lineItems: current.lineItems.map((item) => ({ ...item, method: item.method || options.transactionMethods[0]._id })),
      }));
    }
    if (options.transactionTypes.length && !transactionForm.transactionType) {
      setTransactionForm((current) => ({ ...current, transactionType: options.transactionTypes[0]._id }));
      setBatchForm((current) => ({
        ...current,
        lineItems: current.lineItems.map((item) => ({ ...item, transactionType: item.transactionType || options.transactionTypes[0]._id })),
      }));
    }
    if (options.expenseCategories.length && !expenseForm.category) {
      setExpenseForm((current) => ({ ...current, category: options.expenseCategories[0]._id }));
      setBudgetForm((current) => ({ ...current, category: current.category || options.expenseCategories[0]._id }));
    }
    if (options.expensePaymentMethods.length && !expenseForm.paymentMethod) {
      setExpenseForm((current) => ({ ...current, paymentMethod: current.paymentMethod || options.expensePaymentMethods[0]._id }));
    }
    if (options.depositAccounts.length && !expenseForm.sourceAccountId) {
      setExpenseForm((current) => ({ ...current, sourceAccountId: options.depositAccounts[0]._id }));
      setReconciliationForm((current) => ({ ...current, depositAccountId: current.depositAccountId || options.depositAccounts[0]._id }));
    }
  }, [expenseForm.category, expenseForm.paymentMethod, expenseForm.sourceAccountId, funds, options, transactionForm.fundId, transactionForm.method, transactionForm.transactionType]);

  useEffect(() => {
    if (activeSection === "reports") {
      loadReport(reportType);
    }
  }, [activeSection, loadReport, reportType]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((item) =>
        [
          item.receiptNumber,
          item.referenceNumber,
          item.notes,
          item.fundId?.name,
          item.method?.label,
          item.memberId?.firstName,
          item.memberId?.lastName,
          item.householdId?.familyName,
          item.recordedBy?.displayName,
          item.approvedBy?.displayName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search, transactions]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((item) =>
        [
          item.payee,
          item.category?.label,
          item.ministryId?.name,
          item.sourceAccount?.name,
          item.notes,
          item.requestedBy?.displayName,
          item.approvedBy?.displayName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [expenses, search]
  );

  const selectedExpenseAccountBalance = useMemo(() => {
    const accountId = expenseForm.sourceAccountId;
    return overview?.accountSnapshot?.find((item) => item._id === accountId)?.balance ?? null;
  }, [expenseForm.sourceAccountId, overview]);

  const selectedReconciliationAccountBalance = useMemo(() => {
    const accountId = reconciliationForm.depositAccountId;
    return overview?.accountSnapshot?.find((item) => item._id === accountId)?.balance ?? null;
  }, [overview, reconciliationForm.depositAccountId]);

  async function refreshCollections() {
    const [overviewResponse, transactionsResponse, pledgesResponse, expensesResponse, budgetsResponse, reconciliationsResponse] = await Promise.all([
      churchApi.getFinanceOverview(),
      churchApi.getTransactions(),
      churchApi.getPledges(),
      churchApi.getExpenses(),
      churchApi.getBudgets(),
      churchApi.getReconciliations(),
    ]);

    setOverview(overviewResponse);
    setTransactions(Array.isArray(transactionsResponse) ? transactionsResponse : []);
    setPledges(Array.isArray(pledgesResponse) ? pledgesResponse : []);
    setExpenses(Array.isArray(expensesResponse) ? expensesResponse : []);
    setBudgets(Array.isArray(budgetsResponse) ? budgetsResponse : []);
    setReconciliations(Array.isArray(reconciliationsResponse) ? reconciliationsResponse : []);
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createTransaction(normalizeBlankObject(transactionForm));
      setTransactionForm(emptyTransactionForm);
      setActiveModal("");
      await refreshCollections();
      notifySuccess("Transaction saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save transaction.");
    }
  }

  async function handleBatchSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createTransactionBatch({
        ...normalizeBlankObject(batchForm),
        lineItems: batchForm.lineItems.map((lineItem) => normalizeBlankObject(lineItem)).filter((lineItem) => Number(lineItem.amount || 0)),
      });
      setBatchForm({
        date: new Date().toISOString().slice(0, 10),
        serviceEventRef: "",
        countedBy: "",
        totalExpected: "",
        notes: "",
        lineItems: [createBatchLine()],
      });
      setActiveModal("");
      await refreshCollections();
      notifySuccess("Batch transactions saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save transaction batch.");
    }
  }

  async function handlePledgeSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createPledge(normalizeBlankObject(pledgeForm));
      setPledgeForm(emptyPledgeForm);
      setActiveModal("");
      await refreshCollections();
      notifySuccess("Pledge saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save pledge.");
    }
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createExpense(normalizeBlankObject(expenseForm));
      setExpenseForm(emptyExpenseForm);
      setActiveModal("");
      await refreshCollections();
      notifySuccess("Expense request saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save expense.");
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createBudget(normalizeBlankObject(budgetForm));
      setBudgetForm(emptyBudgetForm);
      setActiveModal("");
      await refreshCollections();
      notifySuccess("Budget line saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save budget.");
    }
  }

  async function handleReconciliationSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createReconciliation(normalizeBlankObject(reconciliationForm));
      setReconciliationForm(emptyReconciliationForm);
      setActiveModal("");
      await refreshCollections();
      notifySuccess("Reconciliation submitted for approval.");
    } catch (error) {
      notifyError(error.message || "Unable to save reconciliation.");
    }
  }

  async function handleExpenseReceiptUpload(file) {
    if (!file) {
      return;
    }
    try {
      const uploaded = await churchApi.uploadMemberMedia(file, "receipt", "finance/expenses");
      setExpenseForm((current) => ({ ...current, receiptImageUrl: uploaded.url || "" }));
      notifySuccess("Receipt uploaded.");
    } catch (error) {
      notifyError(error.message || "Unable to upload receipt.");
    }
  }

  async function handleExpenseAction(action, expenseId) {
    try {
      if (action === "approve") {
        await churchApi.approveExpense(expenseId);
      } else if (action === "pay") {
        await churchApi.payExpense(expenseId, {
          paymentMethod: expenseForm.paymentMethod || null,
          paymentDate: new Date().toISOString().slice(0, 10),
        });
      } else if (action === "reject") {
        const reason = window.prompt("Why are you rejecting this expense?") || "";
        if (!reason.trim()) {
          return;
        }
        await churchApi.rejectExpense(expenseId, reason);
      } else if (action === "void") {
        const reason = window.prompt("Why are you voiding this expense?") || "";
        if (!reason.trim()) {
          return;
        }
        await churchApi.voidExpense(expenseId, reason);
      }

      await refreshCollections();
      notifySuccess(`Expense ${action}d successfully.`);
    } catch (error) {
      notifyError(error.message || `Unable to ${action} expense.`);
    }
  }

  async function handleVoidTransaction(transactionId) {
    const reason = window.prompt("Why are you voiding this transaction?") || "";
    if (!reason.trim()) {
      return;
    }
    try {
      await churchApi.voidTransaction(transactionId, reason);
      await refreshCollections();
      notifySuccess("Transaction voided with reversal.");
    } catch (error) {
      notifyError(error.message || "Unable to void transaction.");
    }
  }

  async function handleApproveReconciliation(reconciliationId) {
    try {
      await churchApi.approveReconciliation(reconciliationId);
      await refreshCollections();
      notifySuccess("Reconciliation approved.");
    } catch (error) {
      notifyError(error.message || "Unable to approve reconciliation.");
    }
  }

  async function handleGenerateGivingInsights() {
    try {
      await churchApi.generateAiSuggestions("finance", {});
      notifySuccess("Giving intelligence suggestions generated.");
    } catch (error) {
      notifyError(error.message || "Unable to generate giving intelligence suggestions.");
    }
  }

  if (loading && !overview) {
    return <div className="page-grid"><section className="surface-card data-card">Loading finance...</section></div>;
  }

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Income</div>
          <div className="compact-stat-value">{formatCurrency(overview?.totals?.income || 0)}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Expenses</div>
          <div className="compact-stat-value">{formatCurrency(overview?.totals?.expenses || 0)}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Net</div>
          <div className="compact-stat-value">{formatCurrency(overview?.totals?.net || 0)}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Section</div>
          <div className="compact-stat-value section-value">{activeSection}</div>
        </article>
      </section>

      {(activeSection === "transactions" || activeSection === "expenses") ? (
        <section className="surface-card data-card">
          <div className="toolbar-row inline-toolbar">
            <div className="search-field">
              <FaSearch />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search finance data" />
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "overview" ? (
        <>
          <section className="surface-card data-card">
            <div className="toolbar-row">
              <h3>Account Balances</h3>
              <div className="toolbar-actions">
                {canManageFinance ? (
                  <button type="button" className="primary-button" onClick={() => setActiveModal("reconciliation")}>
                    <FaPlus />
                    Add Reconciliation
                  </button>
                ) : null}
                {canReviewAi ? (
                  <button type="button" className="ghost-button" onClick={handleGenerateGivingInsights}>
                    <FaRobot />
                    Giving Intelligence
                  </button>
                ) : null}
              </div>
            </div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.accountSnapshot || []).map((item) => (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{formatCurrency(item.balance || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Recent Reconciliations</h3></div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Account</th>
                    <th>Amount</th>
                    <th>Initiator</th>
                    <th>Approver</th>
                    <th>Status</th>
                    {canManageFinance ? <th>Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {reconciliations.map((item) => (
                    <tr key={item._id}>
                      <td>{formatDate(item.reconciliationDate)}</td>
                      <td>{item.method?.label || "-"}</td>
                      <td>{item.depositAccount?.name || "-"}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{item.initiatedBy?.displayName || item.initiatedBy?.username || "-"}</td>
                      <td>{item.approvedBy?.displayName || item.approvedBy?.username || "-"}</td>
                      <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                      {canManageFinance ? (
                        <td>{item.status === "pending" ? <button type="button" className="ghost-button small" onClick={() => handleApproveReconciliation(item._id)}>Approve</button> : "-"}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {activeSection === "transactions" ? (
        <section className="surface-card data-card">
          <div className="toolbar-row">
            <h3>Transactions</h3>
            {canManageFinance ? (
              <div className="toolbar-actions">
                <button type="button" className="primary-button" onClick={() => setActiveModal("transaction")}>
                  <FaPlus />
                  Add Transaction
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveModal("batch")}>
                  <FaPlus />
                  Add Batch
                </button>
              </div>
            ) : null}
          </div>
          <div className="table-accent-bar" />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Method</th>
                  <th>Fund</th>
                  <th>Giver</th>
                  <th>Amount</th>
                  <th>Initiator</th>
                  <th>Approver</th>
                  <th>Status</th>
                  {canManageFinance ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((item) => (
                  <tr key={item._id}>
                    <td>{item.receiptNumber}</td>
                    <td>{item.method?.label || "-"}</td>
                    <td>{item.fundId?.name || "-"}</td>
                    <td>{item.memberId ? `${item.memberId.firstName} ${item.memberId.lastName}` : item.householdId?.familyName || "Anonymous"}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{item.recordedBy?.displayName || item.recordedBy?.username || "-"}</td>
                    <td>{item.approvedBy?.displayName || item.approvedBy?.username || "-"}</td>
                    <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                    {canManageFinance ? (
                      <td>{item.status === "posted" ? <button type="button" className="ghost-button small" onClick={() => handleVoidTransaction(item._id)}>Void</button> : "-"}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "pledges" ? (
        <section className="surface-card data-card">
          <div className="toolbar-row">
            <h3>Pledges</h3>
            {canManageFinance ? (
              <button type="button" className="primary-button" onClick={() => setActiveModal("pledge")}>
                <FaPlus />
                Add Pledge
              </button>
            ) : null}
          </div>
          <div className="table-accent-bar" />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Fund</th>
                  <th>Pledged</th>
                  <th>Fulfilled</th>
                  <th>Percent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pledges.map((item) => (
                  <tr key={item._id}>
                    <td>{item.memberId ? `${item.memberId.firstName} ${item.memberId.lastName}` : item.householdId?.familyName || "-"}</td>
                    <td>{item.fundId?.name || "-"}</td>
                    <td>{formatCurrency(item.pledgedAmount)}</td>
                    <td>{formatCurrency(item.fulfilledAmount || 0)}</td>
                    <td>{Math.round(item.fulfillmentPercent || 0)}%</td>
                    <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "expenses" ? (
        <section className="surface-card data-card">
          <div className="toolbar-row">
            <h3>Expenses</h3>
            {canManageFinance ? (
              <button type="button" className="primary-button" onClick={() => setActiveModal("expense")}>
                <FaPlus />
                Add Expense
              </button>
            ) : null}
          </div>
          <div className="table-accent-bar" />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Payee</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Initiator</th>
                  <th>Approver</th>
                  <th>Status</th>
                  {canManageFinance ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((item) => (
                  <tr key={item._id}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.category?.label || "-"}</td>
                    <td>{item.payee}</td>
                    <td>{item.sourceAccount?.name || "-"}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{item.requestedBy?.displayName || item.requestedBy?.username || "-"}</td>
                    <td>{item.approvedBy?.displayName || item.approvedBy?.username || "-"}</td>
                    <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                    {canManageFinance ? (
                      <td>
                        <div className="cell-scroll-row">
                          {item.status === "requested" ? <button type="button" className="ghost-button small" onClick={() => handleExpenseAction("approve", item._id)}>Approve</button> : null}
                          {item.status === "requested" ? <button type="button" className="ghost-button small" onClick={() => handleExpenseAction("reject", item._id)}>Reject</button> : null}
                          {item.status === "approved" ? <button type="button" className="ghost-button small" onClick={() => handleExpenseAction("pay", item._id)}>Mark Paid</button> : null}
                          {item.status !== "voided" ? <button type="button" className="ghost-button small" onClick={() => handleExpenseAction("void", item._id)}>Void</button> : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "budgets" ? (
        <section className="surface-card data-card">
          <div className="toolbar-row">
            <h3>Budget vs Actual</h3>
            {canManageFinance ? (
              <button type="button" className="primary-button" onClick={() => setActiveModal("budget")}>
                <FaPlus />
                Add Budget Line
              </button>
            ) : null}
          </div>
          <div className="table-accent-bar" />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Line</th>
                  <th>Budgeted</th>
                  <th>Actual</th>
                  <th>Variance</th>
                  <th>Variance %</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((item) => (
                  <tr key={item._id}>
                    <td>{item.period}</td>
                    <td>{item.ministryId?.name || item.category?.label || item.fundId?.name || item.lineType}</td>
                    <td>{formatCurrency(item.targetValue || item.budgetedAmount)}</td>
                    <td>{formatCurrency(item.actualValue || 0)}</td>
                    <td>{formatCurrency(item.variance || 0)}</td>
                    <td>{Math.round(item.variancePercent || 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeSection === "reports" ? (
        <section className="surface-card data-card">
          <div className="toolbar-row inline-toolbar">
            <select className="filter-select" value={reportType} onChange={(event) => setReportType(event.target.value)}>
              <option value="income-statement">Income Statement</option>
              <option value="expense-report">Expense Report</option>
              <option value="pledge-fulfillment">Pledge Fulfillment</option>
              <option value="budget-vs-actual">Budget vs Actual</option>
              <option value="giving-statement">Individual Giving Statement</option>
            </select>
            <button type="button" className="ghost-button" onClick={() => loadReport(reportType)}>Refresh Report</button>
          </div>
          <div className="table-accent-bar" />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {normalizeReportRows(reportData).map((row, index) => (
                  <tr key={`${row.name}-${index}`}>
                    <td>{row.name}</td>
                    <td>{formatCurrency(row.amount || row.budgetedAmount || row.actualAmount || row.total || 0)}</td>
                    <td>{row.count || row.secondaryAmount || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeModal === "transaction" ? (
        <ModalShell title="Single Transaction Entry" subtitle="Capture a single giving transaction without leaving the page." onClose={() => setActiveModal("")}>
          <form className="modal-form" onSubmit={handleTransactionSubmit}>
            <div className="form-grid">
              <TransactionFields
                form={transactionForm}
                setForm={setTransactionForm}
                funds={funds}
                methods={options.transactionMethods}
                transactionTypes={options.transactionTypes}
                members={members}
                families={families}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button">Save Transaction</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "batch" ? (
        <ModalShell title="Batch Entry" subtitle="Capture multiple Sunday collection lines under one batch header." onClose={() => setActiveModal("")}>
          <form className="modal-form" onSubmit={handleBatchSubmit}>
            <div className="form-grid">
              <label>
                Batch Date
                <input type="date" value={batchForm.date} onChange={(event) => setBatchForm((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label>
                Service / Event Ref
                <input value={batchForm.serviceEventRef} onChange={(event) => setBatchForm((current) => ({ ...current, serviceEventRef: event.target.value }))} />
              </label>
              <label>
                Counted By
                <input value={batchForm.countedBy} onChange={(event) => setBatchForm((current) => ({ ...current, countedBy: event.target.value }))} />
              </label>
              <label>
                Total Expected
                <input value={batchForm.totalExpected} onChange={(event) => setBatchForm((current) => ({ ...current, totalExpected: event.target.value }))} />
              </label>
            </div>
            <div className="finance-batch-lines">
              {batchForm.lineItems.map((lineItem, index) => (
                <div key={`batch-line-${index}`} className="finance-batch-line">
                  <select value={lineItem.memberId} onChange={(event) => updateBatchLine(index, "memberId", event.target.value, setBatchForm)}>
                    <option value="">Known giver (optional)</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>{member.memberId} - {member.firstName} {member.lastName}</option>
                    ))}
                  </select>
                  <select value={lineItem.householdId} onChange={(event) => updateBatchLine(index, "householdId", event.target.value, setBatchForm)}>
                    <option value="">Household (optional)</option>
                    {families.map((family) => (
                      <option key={family._id} value={family._id}>{family.familyName}</option>
                    ))}
                  </select>
                  <input placeholder="Amount" value={lineItem.amount} onChange={(event) => updateBatchLine(index, "amount", event.target.value, setBatchForm)} />
                  <select value={lineItem.fundId} onChange={(event) => updateBatchLine(index, "fundId", event.target.value, setBatchForm)}>
                    {funds.map((fund) => (
                      <option key={fund._id} value={fund._id}>{fund.name}</option>
                    ))}
                  </select>
                  <select value={lineItem.method} onChange={(event) => updateBatchLine(index, "method", event.target.value, setBatchForm)}>
                    {options.transactionMethods.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
                  </select>
                  <select value={lineItem.transactionType} onChange={(event) => updateBatchLine(index, "transactionType", event.target.value, setBatchForm)}>
                    {options.transactionTypes.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => setBatchForm((current) => ({ ...current, lineItems: [...current.lineItems, createBatchLine()] }))}>
                <FaPlus />
                Add Batch Line
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button">Save Batch</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "pledge" ? (
        <ModalShell title="Create Pledge" subtitle="Capture a member or household commitment against a fund." onClose={() => setActiveModal("")}>
          <form className="modal-form" onSubmit={handlePledgeSubmit}>
            <div className="form-grid">
              <MemberAndHouseholdFields members={members} families={families} form={pledgeForm} setForm={setPledgeForm} />
              <label>
                Fund
                <select value={pledgeForm.fundId} onChange={(event) => setPledgeForm((current) => ({ ...current, fundId: event.target.value }))}>
                  {funds.map((fund) => <option key={fund._id} value={fund._id}>{fund.name}</option>)}
                </select>
              </label>
              <label>
                Amount
                <input value={pledgeForm.pledgedAmount} onChange={(event) => setPledgeForm((current) => ({ ...current, pledgedAmount: event.target.value }))} />
              </label>
              <label>
                Frequency
                <select value={pledgeForm.frequency} onChange={(event) => setPledgeForm((current) => ({ ...current, frequency: event.target.value }))}>
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
              <label>
                Start Date
                <input type="date" value={pledgeForm.startDate} onChange={(event) => setPledgeForm((current) => ({ ...current, startDate: event.target.value }))} />
              </label>
              <label>
                End Date
                <input type="date" value={pledgeForm.endDate} onChange={(event) => setPledgeForm((current) => ({ ...current, endDate: event.target.value }))} />
              </label>
              <label className="full-width">
                Notes
                <textarea rows={3} value={pledgeForm.notes} onChange={(event) => setPledgeForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button">Save Pledge</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "expense" ? (
        <ModalShell title="Request Expense" subtitle="Choose the source account and keep the request inside the available balance." onClose={() => setActiveModal("")}>
          <form className="modal-form" onSubmit={handleExpenseSubmit}>
            <div className="form-grid">
              <label>
                Date
                <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label>
                Category
                <select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}>
                  {options.expenseCategories.map((item) => <option key={item._id} value={item._id}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Amount
                <input value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label>
                Payee
                <input value={expenseForm.payee} onChange={(event) => setExpenseForm((current) => ({ ...current, payee: event.target.value }))} />
              </label>
              <label>
                Deduct From Account
                <select value={expenseForm.sourceAccountId} onChange={(event) => setExpenseForm((current) => ({ ...current, sourceAccountId: event.target.value }))}>
                  {options.depositAccounts.length ? options.depositAccounts.map((item) => <option key={item._id} value={item._id}>{item.name}</option>) : <option value="">No account configured</option>}
                </select>
              </label>
              <label>
                Payment Method
                <select value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                  {options.expensePaymentMethods.map((item) => <option key={item._id} value={item._id}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Available Balance
                <input value={selectedExpenseAccountBalance == null ? "Select account" : formatCurrency(selectedExpenseAccountBalance)} readOnly />
              </label>
              <label>
                Ministry
                <select value={expenseForm.ministryId} onChange={(event) => setExpenseForm((current) => ({ ...current, ministryId: event.target.value }))}>
                  <option value="">General</option>
                  {ministries.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                </select>
              </label>
              <label className="full-width">
                Receipt Upload
                <input type="file" onChange={(event) => handleExpenseReceiptUpload(event.target.files?.[0])} />
              </label>
              <label className="full-width">
                Notes
                <textarea rows={3} value={expenseForm.notes} onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button">Save Expense</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "budget" ? (
        <ModalShell title="Budget Line" subtitle="Create a budget line without keeping the form open on the page." onClose={() => setActiveModal("")}>
          <form className="modal-form" onSubmit={handleBudgetSubmit}>
            <div className="form-grid">
              <label>
                Period
                <input value={budgetForm.period} onChange={(event) => setBudgetForm((current) => ({ ...current, period: event.target.value }))} />
              </label>
              <label>
                Line Type
                <select value={budgetForm.lineType} onChange={(event) => setBudgetForm((current) => ({ ...current, lineType: event.target.value }))}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label>
                Ministry
                <select value={budgetForm.ministryId} onChange={(event) => setBudgetForm((current) => ({ ...current, ministryId: event.target.value }))}>
                  <option value="">General</option>
                  {ministries.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                Category
                <select value={budgetForm.category} onChange={(event) => setBudgetForm((current) => ({ ...current, category: event.target.value }))}>
                  {options.expenseCategories.map((item) => <option key={item._id} value={item._id}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Fund
                <select value={budgetForm.fundId} onChange={(event) => setBudgetForm((current) => ({ ...current, fundId: event.target.value }))}>
                  {funds.map((fund) => <option key={fund._id} value={fund._id}>{fund.name}</option>)}
                </select>
              </label>
              <label>
                Budgeted Amount
                <input value={budgetForm.budgetedAmount} onChange={(event) => setBudgetForm((current) => ({ ...current, budgetedAmount: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button">Save Budget</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {activeModal === "reconciliation" ? (
        <ModalShell title="Reconciliation" subtitle="Submit the deposit that needs to be approved against a church account." onClose={() => setActiveModal("")}>
          <form className="modal-form" onSubmit={handleReconciliationSubmit}>
            <div className="form-grid">
              <label>
                Reconciliation Date
                <input type="date" value={reconciliationForm.reconciliationDate} onChange={(event) => setReconciliationForm((current) => ({ ...current, reconciliationDate: event.target.value }))} />
              </label>
              <label>
                Service / Event Ref
                <input value={reconciliationForm.serviceEventRef} onChange={(event) => setReconciliationForm((current) => ({ ...current, serviceEventRef: event.target.value }))} />
              </label>
              <label>
                Collection Method
                <select value={reconciliationForm.method} onChange={(event) => setReconciliationForm((current) => ({ ...current, method: event.target.value }))}>
                  {options.transactionMethods.map((item) => <option key={item._id} value={item._id}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Deposit Account
                <select value={reconciliationForm.depositAccountId} onChange={(event) => setReconciliationForm((current) => ({ ...current, depositAccountId: event.target.value }))}>
                  {options.depositAccounts.length ? options.depositAccounts.map((item) => <option key={item._id} value={item._id}>{item.name}</option>) : <option value="">No account configured</option>}
                </select>
              </label>
              <label>
                Current Account Balance
                <input value={selectedReconciliationAccountBalance == null ? "Select account" : formatCurrency(selectedReconciliationAccountBalance)} readOnly />
              </label>
              <label>
                Amount
                <input value={reconciliationForm.amount} onChange={(event) => setReconciliationForm((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label className="full-width">
                Notes
                <textarea rows={3} value={reconciliationForm.notes} onChange={(event) => setReconciliationForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button">Submit Reconciliation</button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

function TransactionFields({ form, setForm, funds, methods, transactionTypes, members, families }) {
  return (
    <>
      <label>
        Date
        <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
      </label>
      <label>
        Amount
        <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
      </label>
      <MemberAndHouseholdFields members={members} families={families} form={form} setForm={setForm} />
      <label>
        Fund
        <select value={form.fundId} onChange={(event) => setForm((current) => ({ ...current, fundId: event.target.value }))}>
          {funds.map((fund) => <option key={fund._id} value={fund._id}>{fund.name}</option>)}
        </select>
      </label>
      <label>
        Collection Method
        <select value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}>
          {methods.map((item) => <option key={item._id} value={item._id}>{item.label}</option>)}
        </select>
      </label>
      <label>
        Transaction Type
        <select value={form.transactionType} onChange={(event) => setForm((current) => ({ ...current, transactionType: event.target.value }))}>
          {transactionTypes.map((item) => <option key={item._id} value={item._id}>{item.label}</option>)}
        </select>
      </label>
      <label>
        Reference Number
        <input value={form.referenceNumber} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} />
      </label>
      <label className="full-width">
        Notes
        <textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
      </label>
    </>
  );
}

function MemberAndHouseholdFields({ members, families, form, setForm }) {
  return (
    <>
      <label>
        Member
        <select value={form.memberId || ""} onChange={(event) => setForm((current) => ({ ...current, memberId: event.target.value }))}>
          <option value="">Anonymous / none</option>
          {members.map((member) => <option key={member._id} value={member._id}>{member.memberId} - {member.firstName} {member.lastName}</option>)}
        </select>
      </label>
      <label>
        Household
        <select value={form.householdId || ""} onChange={(event) => setForm((current) => ({ ...current, householdId: event.target.value }))}>
          <option value="">None</option>
          {families.map((family) => <option key={family._id} value={family._id}>{family.familyName}</option>)}
        </select>
      </label>
    </>
  );
}

function normalizeBlankObject(payload) {
  return Object.entries(payload).reduce((accumulator, [key, value]) => {
    accumulator[key] = value === "" ? null : value;
    return accumulator;
  }, {});
}

function formatDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

function normalizeReportRows(reportData) {
  if (!reportData) {
    return [];
  }
  if (Array.isArray(reportData.rows)) {
    return reportData.rows;
  }
  if (Array.isArray(reportData.byCategory)) {
    return reportData.byCategory;
  }
  if (Array.isArray(reportData.byFund)) {
    return reportData.byFund;
  }
  if (Array.isArray(reportData.lines)) {
    return reportData.lines.map((line) => ({
      name: line.ministryId?.name || line.category?.label || line.fundId?.name || line.lineType,
      amount: line.actualValue || 0,
      count: `${Math.round(line.variancePercent || 0)}%`,
    }));
  }
  return [];
}

function updateBatchLine(index, field, value, setBatchForm) {
  setBatchForm((current) => ({
    ...current,
    lineItems: current.lineItems.map((lineItem, lineIndex) =>
      lineIndex === index
        ? {
            ...lineItem,
            [field]: value,
          }
        : lineItem
    ),
  }));
}
