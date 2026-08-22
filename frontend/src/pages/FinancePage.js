import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { useAppContext } from "../context/AppContext";

export default function FinancePage() {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const { financeRecords, openRecordModal, formatCurrency } = useAppContext();
  const activeSection = location.pathname.split("/")[2] || "overview";
  const totalFinance = financeRecords.reduce((sum, item) => sum + Number(item.amount), 0);
  const categoryOptions = useMemo(
    () =>
      [...new Set(financeRecords.map((record) => record.category).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [financeRecords]
  );
  const statusOptions = useMemo(
    () =>
      [...new Set(financeRecords.map((record) => record.status).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [financeRecords]
  );
  const filteredRecords = useMemo(() => {
    return [...financeRecords]
      .filter((record) => {
        const haystack = [
          record.recordNo,
          record.category,
          record.description,
          record.status,
          record.date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || record.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((left, right) => sortFinanceRecords(left, right, sortOrder));
  }, [categoryFilter, financeRecords, search, sortOrder, statusFilter]);

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Records</div>
          <div className="compact-stat-value">{financeRecords.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Posted</div>
          <div className="compact-stat-value">{financeRecords.filter((item) => item.status === "Posted").length}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Total</div>
          <div className="compact-stat-value">{formatCurrency(totalFinance)}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Section</div>
          <div className="compact-stat-value section-value">{activeSection}</div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search record no, category, description, or date" />
          </div>
          <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="date_desc">Sort: Latest Date</option>
            <option value="date_asc">Sort: Oldest Date</option>
            <option value="amount_desc">Sort: Highest Amount</option>
            <option value="amount_asc">Sort: Lowest Amount</option>
            <option value="category_asc">Sort: Category A-Z</option>
          </select>
        </div>
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record No</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length ? filteredRecords.map((record) => (
                <tr key={record._id || record.id || record.recordNo} className="clickable-row" onClick={() => openRecordModal("finance", record)}>
                  <td>{record.recordNo}</td>
                  <td>{record.category}</td>
                  <td>{record.description}</td>
                  <td>{formatCurrency(record.amount)}</td>
                  <td>{record.date}</td>
                  <td>
                    <span className={`status-pill ${record.status.toLowerCase()}`}>{record.status}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="empty-table">
                    No finance records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function sortFinanceRecords(left, right, sortOrder) {
  switch (sortOrder) {
    case "date_asc":
      return getDateValue(left.date) - getDateValue(right.date);
    case "amount_desc":
      return Number(right.amount || 0) - Number(left.amount || 0);
    case "amount_asc":
      return Number(left.amount || 0) - Number(right.amount || 0);
    case "category_asc":
      return compareText(left.category, right.category) || compareText(left.recordNo, right.recordNo);
    case "date_desc":
    default:
      return getDateValue(right.date) - getDateValue(left.date);
  }
}

function getDateValue(value) {
  return new Date(value || 0).getTime();
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}
