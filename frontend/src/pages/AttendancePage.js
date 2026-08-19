import { useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function AttendancePage() {
  const location = useLocation();
  const { attendanceSessions, members, openRecordModal } = useAppContext();
  const activeSection = location.pathname.split("/")[2] || "services";

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Attendance Logs</div>
          <div className="compact-stat-value">{attendanceSessions.length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Expected Pool</div>
          <div className="compact-stat-value">{members.length}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Latest Rate</div>
          <div className="compact-stat-value">{attendanceSessions[0]?.rate || "0%"}</div>
        </article>
        <article className="compact-stat-card pink">
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
                <th>Service</th>
                <th>Zone</th>
                <th>Date</th>
                <th>Expected</th>
                <th>Present</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {attendanceSessions.map((session) => (
                <tr key={session.id} className="clickable-row" onClick={() => openRecordModal("attendance", session)}>
                  <td>{session.service}</td>
                  <td>{session.zone}</td>
                  <td>{session.date}</td>
                  <td>{session.expected}</td>
                  <td>{session.present}</td>
                  <td>{session.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
