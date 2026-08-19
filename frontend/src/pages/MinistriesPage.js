import { useAppContext } from "../context/AppContext";

export default function MinistriesPage() {
  const { ministries, members, openRecordModal } = useAppContext();

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Ministries</div>
          <div className="compact-stat-value">{ministries.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Assigned Members</div>
          <div className="compact-stat-value">{members.filter((member) => member.ministryId).length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Leaders</div>
          <div className="compact-stat-value">{ministries.filter((item) => item.leader).length}</div>
        </article>
      </section>

      <section className="ministry-grid">
        {ministries.map((ministry) => (
          <article className="surface-card ministry-tile clickable-card" key={ministry.id} onClick={() => openRecordModal("ministry", ministry)}>
            <div className="ministry-strip" style={{ background: ministry.color }} />
            <h3>{ministry.name}</h3>
            <p>{ministry.description}</p>
            <span>Leader: {ministry.leader || "Not assigned"}</span>
          </article>
        ))}
      </section>
    </div>
  );
}
