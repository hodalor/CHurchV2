import { useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function FinancePage() {
  const location = useLocation();
  const { financeRecords, openRecordModal } = useAppContext();
  const activeSection = location.pathname.split("/")[2] || "overview";
  const totalFinance = financeRecords.reduce((sum, item) => sum + Number(item.amount), 0);

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
          <div className="compact-stat-value">${totalFinance}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Section</div>
          <div className="compact-stat-value section-value">{activeSection}</div>
        </article>
      </section>

      <section className="surface-card data-card">
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
              {financeRecords.map((record) => (
                <tr key={record.id} className="clickable-row" onClick={() => openRecordModal("finance", record)}>
                  <td>{record.recordNo}</td>
                  <td>{record.category}</td>
                  <td>{record.description}</td>
                  <td>${record.amount}</td>
                  <td>{record.date}</td>
                  <td>
                    <span className={`status-pill ${record.status.toLowerCase()}`}>{record.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
