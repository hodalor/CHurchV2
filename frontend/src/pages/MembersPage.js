import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import BulkImportModal from "../components/common/BulkImportModal";
import { useAppContext } from "../context/AppContext";

export default function MembersPage() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [memberGenderFilter, setMemberGenderFilter] = useState("all");
  const [memberHouseholdFilter, setMemberHouseholdFilter] = useState("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");
  const [memberSort, setMemberSort] = useState("name_asc");
  const {
    members,
    families,
    ministries,
    memberSearch,
    setMemberSearch,
    memberMinistryFilter,
    setMemberMinistryFilter,
    openRecordModal,
    regenerateMemberQr,
    mediaUploadState,
  } = useAppContext();

  const householdOptions = useMemo(
    () =>
      [...families]
        .sort((left, right) => compareText(left.familyName, right.familyName))
        .map((family) => ({
          value: family.familyId,
          label: `${family.familyName} (${family.familyId})`,
        })),
    [families]
  );

  const statusOptions = useMemo(
    () =>
      [...new Set(members.map((member) => member.membershipStatus).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [members]
  );

  const genderOptions = useMemo(
    () =>
      [...new Set(members.map((member) => member.gender).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [members]
  );

  const memberRows = useMemo(() => {
    return members
      .map((member) => {
        const memberMinistryId = member.ministryId || member.ministry?._id || member.ministry || "";
        const ministry =
          typeof member.ministry === "object" && member.ministry?.name
            ? member.ministry
            : ministries.find((item) => (item._id || item.id) === memberMinistryId);
        const household = families.find((item) => item.familyId === member.familyId);

        return {
          ...member,
          ministryName: ministry?.name || "Unassigned",
          householdName: household?.familyName || "",
          householdLabel: household ? `${household.familyName} (${household.familyId})` : "No household",
        };
      })
      .filter((member) => {
        const haystack = [
          member.firstName,
          member.otherName,
          member.lastName,
          member.memberId,
          member.phone,
          member.email,
          member.city,
          member.householdName,
          member.ministryName,
          member.membershipStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = haystack.includes(memberSearch.toLowerCase());
        const matchesMinistry =
          memberMinistryFilter === "all" ||
          (member.ministryId || member.ministry?._id || member.ministry || "") === memberMinistryFilter;
        const matchesGender = memberGenderFilter === "all" || member.gender === memberGenderFilter;
        const matchesHousehold =
          memberHouseholdFilter === "all" ||
          (memberHouseholdFilter === "unassigned" ? !member.familyId : member.familyId === memberHouseholdFilter);
        const matchesStatus = memberStatusFilter === "all" || member.membershipStatus === memberStatusFilter;

        return matchesSearch && matchesMinistry && matchesGender && matchesHousehold && matchesStatus;
      })
      .sort((left, right) => sortMembers(left, right, memberSort));
  }, [
    families,
    memberGenderFilter,
    memberHouseholdFilter,
    memberMinistryFilter,
    memberSearch,
    memberSort,
    memberStatusFilter,
    members,
    ministries,
  ]);

  const memberCards = [
    { label: "Members", value: memberRows.length, className: "purple" },
    { label: "Adults", value: memberRows.filter((member) => member.memberType === "Adult").length, className: "pink" },
    { label: "Children", value: memberRows.filter((member) => member.memberType === "Child").length, className: "orange" },
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
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search member, ID, or name" />
          </div>
          <select className="filter-select" value={memberMinistryFilter} onChange={(event) => setMemberMinistryFilter(event.target.value)}>
            <option value="all">All ministries</option>
            {ministries.map((ministry) => (
              <option key={ministry._id || ministry.id} value={ministry._id || ministry.id}>
                {ministry.name}
              </option>
            ))}
          </select>
          <select className="filter-select" value={memberGenderFilter} onChange={(event) => setMemberGenderFilter(event.target.value)}>
            <option value="all">All genders</option>
            {genderOptions.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
          <select className="filter-select" value={memberHouseholdFilter} onChange={(event) => setMemberHouseholdFilter(event.target.value)}>
            <option value="all">All households</option>
            <option value="unassigned">No household</option>
            {householdOptions.map((household) => (
              <option key={household.value} value={household.value}>
                {household.label}
              </option>
            ))}
          </select>
          <select className="filter-select" value={memberStatusFilter} onChange={(event) => setMemberStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="filter-select" value={memberSort} onChange={(event) => setMemberSort(event.target.value)}>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="name_desc">Sort: Name Z-A</option>
            <option value="gender">Sort: Gender</option>
            <option value="ministry">Sort: Ministry</option>
            <option value="household">Sort: Household</option>
            <option value="member_id">Sort: Member ID</option>
          </select>
          <div className="toolbar-actions">
            <button type="button" className="ghost-button" onClick={() => setShowImportModal(true)}>
              Bulk Upload
            </button>
          </div>
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
                <th>QR</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {memberRows.length ? memberRows.map((member) => {
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
                      <p>{member.ministryName}</p>
                    </td>
                    <td>
                      <strong>{member.householdLabel}</strong>
                      <p>{member.familyLinks?.map((item) => `${item.relationship}: ${item.memberName}`).join(", ") || "-"}</p>
                    </td>
                    <td>
                      <strong>{member.city || "-"}</strong>
                      <p>{member.address || "No address"}</p>
                    </td>
                    <td>
                      <div className="photo-stack">
                        {member.qrCodeImageUrl ? (
                          <a
                            href={member.qrCodeImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View QR
                          </a>
                        ) : (
                          <span>-</span>
                        )}
                        <button
                          type="button"
                          className="ghost-button small"
                          onClick={async (event) => {
                            event.stopPropagation();
                            await regenerateMemberQr(member._id);
                          }}
                          disabled={mediaUploadState.loading}
                        >
                          Reissue
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="photo-stack">
                        <MediaLink value={member.personalPhoto} label="Photo" />
                        <MediaLink value={member.idFrontPhoto} label="ID Front" />
                        <MediaLink value={member.idBackPhoto} label="ID Back" />
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="empty-table">
                    No members found for the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showImportModal ? <BulkImportModal entity="members" onClose={() => setShowImportModal(false)} /> : null}
    </div>
  );
}

function MediaLink({ value, label }) {
  if (value?.url) {
    return (
      <a href={value.url} target="_blank" rel="noreferrer">
        {value.label || label}
      </a>
    );
  }

  return <span>{value || "-"}</span>;
}

function sortMembers(left, right, sortKey) {
  switch (sortKey) {
    case "name_desc":
      return compareText(buildMemberName(right), buildMemberName(left));
    case "gender":
      return compareText(left.gender, right.gender) || compareText(buildMemberName(left), buildMemberName(right));
    case "ministry":
      return compareText(left.ministryName, right.ministryName) || compareText(buildMemberName(left), buildMemberName(right));
    case "household":
      return compareText(left.householdName, right.householdName) || compareText(buildMemberName(left), buildMemberName(right));
    case "member_id":
      return compareText(left.memberId, right.memberId);
    case "name_asc":
    default:
      return compareText(buildMemberName(left), buildMemberName(right));
  }
}

function buildMemberName(member) {
  return [member.firstName, member.otherName, member.lastName].filter(Boolean).join(" ");
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}
