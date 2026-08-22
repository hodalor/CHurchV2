import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import AiAssistGeneratorCard from "../components/ai/AiAssistGeneratorCard";
import BulkImportModal from "../components/common/BulkImportModal";
import { useAppContext } from "../context/AppContext";

export default function MinistriesPage() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [leaderFilter, setLeaderFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("name_asc");
  const { ministries, members, openRecordModal } = useAppContext();
  const assignedMembers = members.filter((member) => member.ministryId || member.ministry?._id || member.ministry).length;
  const ledMinistries = ministries.filter((item) => getLeadDisplayName(item)).length;
  const ministryCards = useMemo(() => {
    return ministries
      .map((ministry) => {
        const ministryId = ministry._id || ministry.id;
        const assignedCount =
          (ministry.members || []).length ||
          members.filter((member) => (member.ministryId || member.ministry?._id || member.ministry) === ministryId).length;

        return {
          ...ministry,
          leaderName: getLeadDisplayName(ministry),
          assignedCount,
        };
      })
      .filter((ministry) => {
        const haystack = [
          ministry.name,
          ministry.description,
          ministry.leaderName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesLeader =
          leaderFilter === "all" ||
          (leaderFilter === "assigned" ? Boolean(ministry.leaderName) : !ministry.leaderName);

        return matchesSearch && matchesLeader;
      })
      .sort((left, right) => sortMinistries(left, right, sortOrder));
  }, [leaderFilter, members, ministries, search, sortOrder]);

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
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ministry, description, or leader" />
          </div>
          <select className="filter-select" value={leaderFilter} onChange={(event) => setLeaderFilter(event.target.value)}>
            <option value="all">All leadership states</option>
            <option value="assigned">Leader assigned</option>
            <option value="unassigned">No leader assigned</option>
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="members_desc">Sort: Most Members</option>
            <option value="leader_asc">Sort: Leader A-Z</option>
          </select>
        </div>
      </section>

      <AiAssistGeneratorCard
        title="AI Ministry Engagement Summary"
        description="Generate review-only summaries for ministries with leader gaps or low recent activity."
        moduleKey="ministry"
        buttonLabel="Generate Ministry Summaries"
      />

      <section className="ministry-grid">
        {ministryCards.length ? ministryCards.map((ministry) => (
          <article
            className="surface-card ministry-tile clickable-card"
            key={ministry._id || ministry.id}
            onClick={() => openRecordModal("ministry", ministry)}
          >
            <div className="ministry-strip" style={{ background: ministry.color }} />
            <h3>{ministry.name}</h3>
            <p>{ministry.description}</p>
            <span>Lead: {ministry.leaderName || "Not assigned"}</span>
            <span>Members: {ministry.assignedCount}</span>
          </article>
        )) : (
          <article className="surface-card">
            <div className="empty-note">No ministries match the current filter.</div>
          </article>
        )}
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

function sortMinistries(left, right, sortOrder) {
  switch (sortOrder) {
    case "members_desc":
      return Number(right.assignedCount || 0) - Number(left.assignedCount || 0);
    case "leader_asc":
      return compareText(left.leaderName, right.leaderName) || compareText(left.name, right.name);
    case "name_asc":
    default:
      return compareText(left.name, right.name);
  }
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}
