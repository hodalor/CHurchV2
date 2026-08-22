import { useMemo, useState } from "react";
import { FaCheck, FaMinus, FaSearch } from "react-icons/fa";
import BulkImportModal from "../components/common/BulkImportModal";
import { useAppContext } from "../context/AppContext";
import { exportRowsToCsv, exportRowsToPdf } from "../utils/exportUtils";

export default function MembersPage() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [memberGenderFilter, setMemberGenderFilter] = useState("all");
  const [memberHouseholdFilter, setMemberHouseholdFilter] = useState("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");
  const [memberGroupFilter, setMemberGroupFilter] = useState("all");
  const [memberTypeFilter, setMemberTypeFilter] = useState("all");
  const [memberMaritalStatusFilter, setMemberMaritalStatusFilter] = useState("all");
  const [memberSort, setMemberSort] = useState("name_asc");
  const {
    members,
    families,
    groups,
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

  const memberTypeOptions = useMemo(
    () =>
      [...new Set(members.map((member) => member.memberType).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [members]
  );

  const maritalStatusOptions = useMemo(
    () =>
      [...new Set(members.map((member) => member.maritalStatus).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [members]
  );

  const groupOptions = useMemo(() => {
    const options = members.reduce((accumulator, member) => {
      (member.groups || []).forEach((group) => {
        const value = group.groupId || group._id || group.id || "";
        const matchedGroup = groups.find((item) => (item._id || item.id) === value);
        const label =
          group.groupName ||
          group.name ||
          matchedGroup?.name ||
          "";
        if (value && label) {
          accumulator.set(value, label);
        }
      });
      return accumulator;
    }, new Map());

    return [...options.entries()].sort((left, right) => compareText(left[1], right[1]));
  }, [groups, members]);

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
          groupIds: (member.groups || []).map((group) => group.groupId || group._id || group.id).filter(Boolean),
          groupNames: (member.groups || [])
            .map((group) => {
              const groupId = group.groupId || group._id || group.id || "";
              return group.groupName || group.name || groups.find((item) => (item._id || item.id) === groupId)?.name || "";
            })
            .filter(Boolean),
        };
      })
      .map((member) => ({
        ...member,
        groupLabel: member.groupNames.length ? member.groupNames.join(", ") : "No group assigned",
      }))
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
          member.memberType,
          member.maritalStatus,
          member.householdRole,
          member.groupLabel,
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
        const matchesGroup = memberGroupFilter === "all" || member.groupIds.includes(memberGroupFilter);
        const matchesType = memberTypeFilter === "all" || member.memberType === memberTypeFilter;
        const matchesMaritalStatus =
          memberMaritalStatusFilter === "all" || member.maritalStatus === memberMaritalStatusFilter;

        return (
          matchesSearch &&
          matchesMinistry &&
          matchesGender &&
          matchesHousehold &&
          matchesStatus &&
          matchesGroup &&
          matchesType &&
          matchesMaritalStatus
        );
      })
      .sort((left, right) => sortMembers(left, right, memberSort));
  }, [
    families,
    memberGenderFilter,
    memberGroupFilter,
    memberHouseholdFilter,
    memberMaritalStatusFilter,
    memberMinistryFilter,
    memberSearch,
    memberSort,
    memberStatusFilter,
    memberTypeFilter,
    members,
    groups,
    ministries,
  ]);

  const memberCards = [
    { label: "Members", value: memberRows.length, className: "purple" },
    { label: "Adults", value: memberRows.filter((member) => member.memberType === "Adult").length, className: "pink" },
    { label: "Children", value: memberRows.filter((member) => member.memberType === "Child").length, className: "orange" },
  ];

  const memberExportColumns = [
    { key: "memberId", header: "Member ID" },
    { key: "firstName", header: "First Name" },
    { key: "otherName", header: "Other Name" },
    { key: "lastName", header: "Surname" },
    { key: "preferredName", header: "Preferred Name" },
    { key: "gender", header: "Gender" },
    { key: "maritalStatus", header: "Marital Status" },
    { key: "memberType", header: "Member Type" },
    { key: "membershipStatus", header: "Membership Status" },
    { key: "ministryName", header: "Ministry" },
    { key: "groupLabel", header: "Groups" },
    { key: "familyId", header: "Household ID" },
    { key: "householdName", header: "Household Name" },
    { key: "householdRole", header: "Household Role" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "dateOfBirth", header: "Date of Birth" },
    { key: "dateJoined", header: "Date Joined" },
    { key: "residentialArea", header: "Residential Area" },
    { key: "city", header: "City" },
    { key: "address", header: "Address" },
    { key: "occupation", header: "Occupation" },
    { key: "baptismStatus", header: "Baptism Status" },
  ];

  const handleExportMembersCsv = () => {
    exportRowsToCsv({
      fileName: "members-export.csv",
      columns: memberExportColumns,
      rows: memberRows,
    });
  };

  const handleExportMembersPdf = () => {
    exportRowsToPdf({
      fileName: "members-export.pdf",
      title: "Members Export",
      columns: memberExportColumns,
      rows: memberRows,
    });
  };

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
          <select className="filter-select" value={memberGroupFilter} onChange={(event) => setMemberGroupFilter(event.target.value)}>
            <option value="all">All groups</option>
            {groupOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="filter-select" value={memberTypeFilter} onChange={(event) => setMemberTypeFilter(event.target.value)}>
            <option value="all">All member types</option>
            {memberTypeOptions.map((memberType) => (
              <option key={memberType} value={memberType}>
                {memberType}
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
          <select className="filter-select" value={memberMaritalStatusFilter} onChange={(event) => setMemberMaritalStatusFilter(event.target.value)}>
            <option value="all">All marital statuses</option>
            {maritalStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="filter-select" value={memberSort} onChange={(event) => setMemberSort(event.target.value)}>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="name_desc">Sort: Name Z-A</option>
          </select>
          <div className="toolbar-actions">
            <button type="button" className="ghost-button" onClick={handleExportMembersCsv}>
              Export CSV
            </button>
            <button type="button" className="ghost-button" onClick={handleExportMembersPdf}>
              Export PDF
            </button>
            <button type="button" className="ghost-button" onClick={() => setShowImportModal(true)}>
              Bulk Upload
            </button>
          </div>
        </div>

        <div className="table-accent-bar" />

        <div className="table-wrap">
          <table className="data-table member-directory-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Status</th>
                <th>Marital Status</th>
                <th>Ministry</th>
                <th>Groups</th>
                <th>Type</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Family</th>
                <th>Location</th>
                <th>QR</th>
                <th>Images</th>
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
                    </td>
                    <td>
                      <strong>{member.maritalStatus || "-"}</strong>
                    </td>
                    <td>
                      <strong>{member.ministryName}</strong>
                      <p>{member.dateJoined || member.membershipDate || "-"}</p>
                    </td>
                    <td>
                      <div className="cell-scroll-row">
                        {(member.groupNames.length ? member.groupNames : ["No group assigned"]).map((groupName) => (
                          <span key={`${member.memberId}-${groupName}`} className="cell-pill">
                            {groupName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <strong>{member.memberType || "-"}</strong>
                      <p>{member.householdRole || "-"}</p>
                    </td>
                    <td>
                      <strong>{member.gender || "-"}</strong>
                    </td>
                    <td>
                      <strong>{member.phone || "-"}</strong>
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
                      <div className="cell-scroll-row">
                        {member.qrCodeImageUrl ? (
                          <a
                            className="media-indicator available"
                            href={member.qrCodeImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <FaCheck />
                            QR
                          </a>
                        ) : (
                          <span className="media-indicator missing">
                            <FaMinus />
                            QR
                          </span>
                        )}
                        <button
                          type="button"
                          className="ghost-button small media-action-button"
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
                      <div className="cell-scroll-row">
                        <MediaLink value={member.personalPhoto} label="Photo" />
                        <MediaLink value={member.idFrontPhoto} label="ID Front" />
                        <MediaLink value={member.idBackPhoto} label="ID Back" />
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={13} className="empty-table">
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
      <a className="media-indicator available" href={value.url} target="_blank" rel="noreferrer">
        <FaCheck />
        {value.label || label}
      </a>
    );
  }

  if (value) {
    return (
      <span className="media-indicator available">
        <FaCheck />
        {label}
      </span>
    );
  }

  return (
    <span className="media-indicator missing">
      <FaMinus />
      {label}
    </span>
  );
}

function sortMembers(left, right, sortKey) {
  switch (sortKey) {
    case "name_desc":
      return compareText(buildMemberName(right), buildMemberName(left));
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
