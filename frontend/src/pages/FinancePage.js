import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaPlus, FaRobot, FaSearch } from "react-icons/fa";
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

export default function FinancePage() {
  const location = useLocation();
  const { authUser, members, families, ministries, formatCurrency, notifyError, notifySuccess } = useAppContext();
  const activeSection = location.pathname.split("/")[2] || "overview";
  const canManageFinance = authUser?.permissions?.includes("manage_finance");
  const canReviewAi = authUser?.permissions?.includes("review_ai_assist");

  const [overview, setOverview] = useState(null);
  const [funds, setFunds] = useState([]);
  const [options, setOptions] = useState({
    transactionMethods: [],
    transactionTypes: [],
    expenseCategories: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reportType, setReportType] = useState("income-statement");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [pledgeForm, setPledgeForm] = useState(emptyPledgeForm);
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [batchForm, setBatchForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    serviceEventRef: "",
    countedBy: "",
    totalExpected: "",
    notes: "",
    lineItems: [createBatchLine()],
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFinanceState() {
      setLoading(true);
      try {
        const [overviewResponse, optionsResponse, transactionsResponse, pledgesResponse, expensesResponse, budgetsResponse] =
          await Promise.all([
            churchApi.getFinanceOverview(),
            churchApi.getFinanceOptions(),
            churchApi.getTransactions(),
            churchApi.getPledges(),
            churchApi.getExpenses(),
            churchApi.getBudgets(),
          ]);

        if (cancelled) {
          return;
        }

        setOverview(overviewResponse);
        setFunds(optionsResponse.funds || []);
        setOptions({
          transactionMethods: optionsResponse.transactionMethods || [],
          transactionTypes: optionsResponse.transactionTypes || [],
          expenseCategories: optionsResponse.expenseCategories || [],
        });
        setTransactions(Array.isArray(transactionsResponse) ? transactionsResponse : []);
        setPledges(Array.isArray(pledgesResponse) ? pledgesResponse : []);
        setExpenses(Array.isArray(expensesResponse) ? expensesResponse : []);
        setBudgets(Array.isArray(budgetsResponse) ? budgetsResponse : []);
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

    loadFinanceState();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  useEffect(() => {
    if (funds.length && !transactionForm.fundId) {
      setTransactionForm((current) => ({ ...current, fundId: funds[0]._id }));
    }
    if (options.transactionMethods.length && !transactionForm.method) {
      setTransactionForm((current) => ({ ...current, method: options.transactionMethods[0]._id }));
    }
    if (options.transactionTypes.length && !transactionForm.transactionType) {
      setTransactionForm((current) => ({ ...current, transactionType: options.transactionTypes[0]._id }));
    }
    if (options.expenseCategories.length && !expenseForm.category) {
      setExpenseForm((current) => ({ ...current, category: options.expenseCategories[0]._id }));
    }
  }, [expenseForm.category, funds, options, transactionForm.fundId, transactionForm.method, transactionForm.transactionType]);

  useEffect(() => {
    if (activeSection === "reports") {
      loadReport(reportType);
    }
  }, [activeSection, reportType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const haystack = [
        item.receiptNumber,
        item.referenceNumber,
        item.notes,
        item.fundId?.name,
        item.memberId?.firstName,
        item.memberId?.lastName,
        item.householdId?.familyName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [search, transactions]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const haystack = [item.payee, item.category?.label, item.ministryId?.name, item.notes].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [expenses, search]);

  async function refreshCollections() {
    const [overviewResponse, transactionsResponse, pledgesResponse, expensesResponse, budgetsResponse] = await Promise.all([
      churchApi.getFinanceOverview(),
      churchApi.getTransactions(),
      churchApi.getPledges(),
      churchApi.getExpenses(),
      churchApi.getBudgets(),
    ]);

    setOverview(overviewResponse);
    setTransactions(Array.isArray(transactionsResponse) ? transactionsResponse : []);
    setPledges(Array.isArray(pledgesResponse) ? pledgesResponse : []);
    setExpenses(Array.isArray(expensesResponse) ? expensesResponse : []);
    setBudgets(Array.isArray(budgetsResponse) ? budgetsResponse : []);
  }

  async function handleTransactionSubmit(event) {
    event.preventDefault();
    try {
      await churchApi.createTransaction(normalizeBlankObject(transactionForm));
      setTransactionForm(emptyTransactionForm);
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
      await refreshCollections();
      notifySuccess("Budget line saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save budget.");
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

  async function loadReport(nextType) {
    try {
      const payload = await churchApi.getFinanceReport(nextType);
      setReportData(payload);
    } catch (error) {
      notifyError(error.message || "Unable to load finance report.");
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

      {(activeSection === "transactions" || activeSection === "expenses") && (
        <section className="surface-card data-card">
          <div className="toolbar-row inline-toolbar">
            <div className="search-field">
              <FaSearch />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search finance data" />
            </div>
          </div>
        </section>
      )}

      {activeSection === "overview" && (
        <>
          <section className="surface-card data-card">
            <div className="toolbar-row">
              <h3>Recent Transactions</h3>
              {canReviewAi && (
                <button type="button" className="ghost-button" onClick={handleGenerateGivingInsights}>
                  <FaRobot />
                  Generate Giving Intelligence
                </button>
              )}
            </div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Fund</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentTransactions || []).map((item) => (
                    <tr key={item._id}>
                      <td>{item.receiptNumber}</td>
                      <td>{item.fundId?.name || "-"}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                      <td>{formatDate(item.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface-card data-card">
            <div className="toolbar-row">
              <h3>Budget Snapshot</h3>
              <p>{overview?.budgetSnapshot?.overBudgetLines || 0} over-budget line(s)</p>
            </div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expense</th>
                  </tr>
                </thead>
                <tbody>
                  {mergeFinanceTrendRows(overview?.givingTrend || [], overview?.expenseTrend || []).map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{formatCurrency(row.income)}</td>
                      <td>{formatCurrency(row.expense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeSection === "transactions" && (
        <>
          {canManageFinance && (
            <section className="surface-card data-card">
              <div className="toolbar-row"><h3>Single Transaction Entry</h3></div>
              <form className="form-grid" onSubmit={handleTransactionSubmit}>
                <label>
                  Date
                  <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))} />
                </label>
                <label>
                  Amount
                  <input value={transactionForm.amount} onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))} />
                </label>
                <label>
                  Member
                  <select value={transactionForm.memberId} onChange={(event) => setTransactionForm((current) => ({ ...current, memberId: event.target.value }))}>
                    <option value="">Anonymous / none</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>{member.memberId} - {member.firstName} {member.lastName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Household
                  <select value={transactionForm.householdId} onChange={(event) => setTransactionForm((current) => ({ ...current, householdId: event.target.value }))}>
                    <option value="">None</option>
                    {families.map((family) => (
                      <option key={family._id} value={family._id}>{family.familyName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Fund
                  <select value={transactionForm.fundId} onChange={(event) => setTransactionForm((current) => ({ ...current, fundId: event.target.value }))}>
                    <option value="">Select fund</option>
                    {funds.map((fund) => (
                      <option key={fund._id} value={fund._id}>{fund.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Method
                  <select value={transactionForm.method} onChange={(event) => setTransactionForm((current) => ({ ...current, method: event.target.value }))}>
                    <option value="">Select method</option>
                    {options.transactionMethods.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Transaction Type
                  <select value={transactionForm.transactionType} onChange={(event) => setTransactionForm((current) => ({ ...current, transactionType: event.target.value }))}>
                    <option value="">Select type</option>
                    {options.transactionTypes.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Reference Number
                  <input value={transactionForm.referenceNumber} onChange={(event) => setTransactionForm((current) => ({ ...current, referenceNumber: event.target.value }))} />
                </label>
                <label className="full-width">
                  Notes
                  <textarea rows={3} value={transactionForm.notes} onChange={(event) => setTransactionForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <div className="full-width">
                  <button type="submit" className="primary-button">
                    <FaPlus />
                    Save Transaction
                  </button>
                </div>
              </form>
            </section>
          )}

          {canManageFinance && (
            <section className="surface-card data-card">
              <div className="toolbar-row"><h3>Batch Entry</h3></div>
              <form className="form-grid" onSubmit={handleBatchSubmit}>
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
                <div className="full-width finance-batch-lines">
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
                        <option value="">Fund</option>
                        {funds.map((fund) => (
                          <option key={fund._id} value={fund._id}>{fund.name}</option>
                        ))}
                      </select>
                      <select value={lineItem.method} onChange={(event) => updateBatchLine(index, "method", event.target.value, setBatchForm)}>
                        <option value="">Method</option>
                        {options.transactionMethods.map((item) => (
                          <option key={item._id} value={item._id}>{item.label}</option>
                        ))}
                      </select>
                      <select value={lineItem.transactionType} onChange={(event) => updateBatchLine(index, "transactionType", event.target.value, setBatchForm)}>
                        <option value="">Type</option>
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
                <div className="full-width">
                  <button type="submit" className="primary-button">
                    <FaPlus />
                    Save Batch
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Transactions</h3></div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Fund</th>
                    <th>Giver</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    {canManageFinance ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) => (
                    <tr key={item._id}>
                      <td>{item.receiptNumber}</td>
                      <td>{item.fundId?.name || "-"}</td>
                      <td>{item.memberId ? `${item.memberId.firstName} ${item.memberId.lastName}` : item.householdId?.familyName || "Anonymous"}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{formatDate(item.date)}</td>
                      <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                      {canManageFinance ? (
                        <td>
                          {item.status === "posted" ? (
                            <button type="button" className="ghost-button small" onClick={() => handleVoidTransaction(item._id)}>Void</button>
                          ) : (
                            <span className="detail-label">Reversed</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeSection === "pledges" && (
        <>
          {canManageFinance && (
            <section className="surface-card data-card">
              <div className="toolbar-row"><h3>Create Pledge</h3></div>
              <form className="form-grid" onSubmit={handlePledgeSubmit}>
                <label>
                  Member
                  <select value={pledgeForm.memberId} onChange={(event) => setPledgeForm((current) => ({ ...current, memberId: event.target.value }))}>
                    <option value="">None</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>{member.memberId} - {member.firstName} {member.lastName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Household
                  <select value={pledgeForm.householdId} onChange={(event) => setPledgeForm((current) => ({ ...current, householdId: event.target.value }))}>
                    <option value="">None</option>
                    {families.map((family) => (
                      <option key={family._id} value={family._id}>{family.familyName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Fund
                  <select value={pledgeForm.fundId} onChange={(event) => setPledgeForm((current) => ({ ...current, fundId: event.target.value }))}>
                    <option value="">Select fund</option>
                    {funds.map((fund) => (
                      <option key={fund._id} value={fund._id}>{fund.name}</option>
                    ))}
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
                <div className="full-width">
                  <button type="submit" className="primary-button">Save Pledge</button>
                </div>
              </form>
            </section>
          )}

          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Pledges</h3></div>
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
        </>
      )}

      {activeSection === "expenses" && (
        <>
          {canManageFinance && (
            <section className="surface-card data-card">
              <div className="toolbar-row"><h3>Request Expense</h3></div>
              <form className="form-grid" onSubmit={handleExpenseSubmit}>
                <label>
                  Date
                  <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))} />
                </label>
                <label>
                  Category
                  <select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))}>
                    <option value="">Select category</option>
                    {options.expenseCategories.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
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
                  Payment Method
                  <select value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                    <option value="">Select method</option>
                    {options.transactionMethods.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Ministry
                  <select value={expenseForm.ministryId} onChange={(event) => setExpenseForm((current) => ({ ...current, ministryId: event.target.value }))}>
                    <option value="">General</option>
                    {ministries.map((item) => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
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
                <div className="full-width">
                  <button type="submit" className="primary-button">Save Expense Request</button>
                </div>
              </form>
            </section>
          )}

          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Expenses</h3></div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Payee</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Threshold</th>
                    {canManageFinance ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((item) => (
                    <tr key={item._id}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.category?.label || "-"}</td>
                      <td>{item.payee}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                      <td>{item.approvalThresholdFlag ? "Higher approval" : "Normal"}</td>
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
        </>
      )}

      {activeSection === "budgets" && (
        <>
          {canManageFinance && (
            <section className="surface-card data-card">
              <div className="toolbar-row"><h3>Add Budget Line</h3></div>
              <form className="form-grid" onSubmit={handleBudgetSubmit}>
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
                    {ministries.map((item) => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select value={budgetForm.category} onChange={(event) => setBudgetForm((current) => ({ ...current, category: event.target.value }))}>
                    <option value="">None</option>
                    {options.expenseCategories.map((item) => (
                      <option key={item._id} value={item._id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Fund
                  <select value={budgetForm.fundId} onChange={(event) => setBudgetForm((current) => ({ ...current, fundId: event.target.value }))}>
                    <option value="">None</option>
                    {funds.map((fund) => (
                      <option key={fund._id} value={fund._id}>{fund.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Budgeted Amount
                  <input value={budgetForm.budgetedAmount} onChange={(event) => setBudgetForm((current) => ({ ...current, budgetedAmount: event.target.value }))} />
                </label>
                <div className="full-width">
                  <button type="submit" className="primary-button">Save Budget Line</button>
                </div>
              </form>
            </section>
          )}

          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Budget vs Actual</h3></div>
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
        </>
      )}

      {activeSection === "reports" && (
        <section className="surface-card data-card">
          <div className="toolbar-row inline-toolbar">
            <select className="filter-select" value={reportType} onChange={(event) => setReportType(event.target.value)}>
              <option value="income-statement">Income Statement</option>
              <option value="expense-report">Expense Report</option>
              <option value="pledge-fulfillment">Pledge Fulfillment</option>
              <option value="budget-vs-actual">Budget vs Actual</option>
              <option value="giving-statement">Individual Giving Statement</option>
            </select>
            <button type="button" className="ghost-button" onClick={() => loadReport(reportType)}>
              Refresh Report
            </button>
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
      )}
    </div>
  );
}

function normalizeBlankObject(payload) {
  return Object.entries(payload).reduce((accumulator, [key, value]) => {
    if (value === "") {
      accumulator[key] = null;
      return accumulator;
    }
    accumulator[key] = value;
    return accumulator;
  }, {});
}

function formatDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

function mergeFinanceTrendRows(incomeRows, expenseRows) {
  const map = new Map();
  incomeRows.forEach((row) => {
    map.set(row.name, { name: row.name, income: row.amount, expense: 0 });
  });
  expenseRows.forEach((row) => {
    const current = map.get(row.name) || { name: row.name, income: 0, expense: 0 };
    current.expense = row.amount;
    map.set(row.name, current);
  });
  return [...map.values()].sort((left, right) => left.name.localeCompare(right.name));
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
