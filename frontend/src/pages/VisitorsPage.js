import { useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function VisitorsPage() {
  const location = useLocation();
  const { visitors, openRecordModal } = useAppContext();
  const sectionName = location.pathname.split("/")[2] || "register-list";

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Visitors</div>
          <div className="compact-stat-value">{visitors.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">In Pipeline</div>
          <div className="compact-stat-value">{visitors.filter((item) => item.stage !== "First Timer").length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Current View</div>
          <div className="compact-stat-value section-value">{sectionName.replace("-", " ")}</div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Stage</th>
                <th>Assigned To</th>
                <th>Next Step</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => (
                <tr key={visitor.id} className="clickable-row" onClick={() => openRecordModal("visitor", visitor)}>
                  <td>{visitor.fullName}</td>
                  <td>{visitor.phone}</td>
                  <td>{visitor.stage}</td>
                  <td>{visitor.assignedTo}</td>
                  <td>{visitor.nextStep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
