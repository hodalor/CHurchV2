import { FaSearch } from "react-icons/fa";
import { useAppContext } from "../context/AppContext";

export default function MembersPage() {
  const {
    filteredMembers,
    ministries,
    memberSearch,
    setMemberSearch,
    memberMinistryFilter,
    setMemberMinistryFilter,
    openRecordModal,
  } = useAppContext();

  const memberCards = [
    { label: "Members", value: filteredMembers.length, className: "purple" },
    { label: "Adults", value: filteredMembers.filter((member) => member.memberType === "Adult").length, className: "pink" },
    { label: "Children", value: filteredMembers.filter((member) => member.memberType === "Child").length, className: "orange" },
  ];

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        {memberCards.map((card) => (
          <article key={card.label} className={`compact-stat-card ${card.className}`}>
            <div className="compact-stat-label">{card.label}</div>
            <div className="compact-stat-value">{card.value}</div>
          </article>
        ))}
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row">
          <div className="search-field">
            <FaSearch />
            <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search member, ID, or name" />
          </div>
          <select className="filter-select" value={memberMinistryFilter} onChange={(event) => setMemberMinistryFilter(event.target.value)}>
            <option value="all">All ministries</option>
            {ministries.map((ministry) => (
              <option key={ministry.id} value={ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-accent-bar" />

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Church Info</th>
                <th>Family</th>
                <th>Location</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const ministry = ministries.find((item) => item.id === member.ministryId);
                return (
                  <tr key={member.memberId} className="clickable-row" onClick={() => openRecordModal("member", member)}>
                    <td>
                      <div className="member-cell">
                        <div className="avatar-badge">
                          {(member.firstName[0] || "") + (member.lastName[0] || "")}
                        </div>
                        <div>
                          <strong>{member.firstName} {member.lastName}</strong>
                          <p>{member.memberType}</p>
                        </div>
                      </div>
                    </td>
                    <td>{member.memberId}</td>
                    <td>
                      <strong>{member.membershipStatus}</strong>
                      <p>{ministry ? ministry.name : "Unassigned"}</p>
                    </td>
                    <td>{member.familyLinks?.map((item) => `${item.relationship}: ${item.memberName}`).join(", ") || "-"}</td>
                    <td>
                      <strong>{member.city || "-"}</strong>
                      <p>{member.address || "No address"}</p>
                    </td>
                    <td>
                      <div className="photo-stack">
                        <span>{member.personalPhoto || "-"}</span>
                        <span>{member.idFrontPhoto || "-"}</span>
                        <span>{member.idBackPhoto || "-"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
