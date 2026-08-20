import { useAppContext } from "../context/AppContext";

export default function UsersPage() {
  const { users, roles, openRecordModal } = useAppContext();

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Accounts</div>
          <div className="compact-stat-value">{users.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Active</div>
          <div className="compact-stat-value">{users.filter((user) => user.status === "Active").length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Roles</div>
          <div className="compact-stat-value">{roles.length}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Superadmin</div>
          <div className="compact-stat-value">{users.filter((user) => (user.roles || []).some((role) => role.name === "Superadmin")).length}</div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id || user._id || user.username} className="clickable-row" onClick={() => openRecordModal("user", user)}>
                  <td>{user.displayName || user.fullName}</td>
                  <td>{user.username || "-"}</td>
                  <td>{user.email}</td>
                  <td>{(user.roles || []).map((role) => role.name || role).join(", ") || "-"}</td>
                  <td>{user.permissions?.length || 0}</td>
                  <td>
                    <span className={`status-pill ${user.status.toLowerCase()}`}>{user.status}</span>
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
