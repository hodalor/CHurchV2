import { useAppContext } from "../context/AppContext";

export default function MinistriesPage() {
  const { ministries, members, openRecordModal } = useAppContext();
  const assignedMembers = members.filter((member) => member.ministryId || member.ministry?._id || member.ministry).length;
  const ledMinistries = ministries.filter((item) => getLeadDisplayName(item)).length;

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Ministries</div>
          <div className="compact-stat-value">{ministries.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Assigned Members</div>
          <div className="compact-stat-value">{assignedMembers}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Leaders</div>
          <div className="compact-stat-value">{ledMinistries}</div>
        </article>
      </section>

      <section className="ministry-grid">
        {ministries.map((ministry) => (
          <article
            className="surface-card ministry-tile clickable-card"
            key={ministry._id || ministry.id}
            onClick={() => openRecordModal("ministry", ministry)}
          >
            <div className="ministry-strip" style={{ background: ministry.color }} />
            <h3>{ministry.name}</h3>
            <p>{ministry.description}</p>
            <span>Lead: {getLeadDisplayName(ministry) || "Not assigned"}</span>
            <span>Members: {(ministry.members || []).length}</span>
          </article>
        ))}
      </section>
    </div>
  );
}

function getLeadDisplayName(ministry) {
  return (
    ministry.leadership?.chairman?.memberName ||
    ministry.leadership?.elderInCharge?.memberName ||
    ministry.leadership?.deaconInCharge?.memberName ||
    ministry.leader ||
    ""
  );
}
