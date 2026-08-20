import { useState } from "react";
import AiAssistGeneratorCard from "../components/ai/AiAssistGeneratorCard";
import BulkImportModal from "../components/common/BulkImportModal";
import { useAppContext } from "../context/AppContext";

export default function MinistriesPage() {
  const [showImportModal, setShowImportModal] = useState(false);
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

      <section className="surface-card data-card">
        <div className="section-headline compact">
          <div>
            <h3>Ministry Assignments</h3>
            <p>Import ministry memberships or leadership slots from a CSV template.</p>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="ghost-button" onClick={() => setShowImportModal(true)}>
              Bulk Upload
            </button>
          </div>
        </div>
      </section>

      <AiAssistGeneratorCard
        title="AI Ministry Engagement Summary"
        description="Generate review-only summaries for ministries with leader gaps or low recent activity."
        moduleKey="ministry"
        buttonLabel="Generate Ministry Summaries"
      />

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

      {showImportModal ? <BulkImportModal entity="ministrymembers" onClose={() => setShowImportModal(false)} /> : null}
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
