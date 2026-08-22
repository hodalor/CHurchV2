import { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import BulkImportModal from "../components/common/BulkImportModal";
import { useAppContext } from "../context/AppContext";
import { exportRowsToCsv, exportRowsToPdf } from "../utils/exportUtils";

function getName(value) {
  if (!value) {
    return "-";
  }

  return typeof value === "string" ? value : value.memberName;
}

function sortFamilies(left, right, sortOrder, groups) {
  switch (sortOrder) {
    case "members_desc":
      return (right.householdMembers?.length || 0) - (left.householdMembers?.length || 0);
    case "zone_asc": {
      const leftZone = groups.find((group) => group.id === left.fellowshipZone)?.name || left.fellowshipZone;
      const rightZone = groups.find((group) => group.id === right.fellowshipZone)?.name || right.fellowshipZone;
      return compareText(leftZone, rightZone) || compareText(left.familyName, right.familyName);
    }
    case "name_asc":
    default:
      return compareText(left.familyName, right.familyName);
  }
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}

export default function FamilyHouseholdsPage() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("name_asc");
  const { families, groups, openRecordModal, familyApiState } = useAppContext();

  const filteredFamilies = useMemo(() => {
    return [...families]
      .filter((family) => {
        const zoneName = groups.find((group) => group.id === family.fellowshipZone)?.name || family.fellowshipZone || "";
        const haystack = [
          family.familyId,
          family.familyName,
          family.residentialArea,
          getName(family.headOfHousehold),
          family.familyContact,
          zoneName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesZone = zoneFilter === "all" || zoneName === zoneFilter;
        const matchesArea = areaFilter === "all" || family.residentialArea === areaFilter;

        return matchesSearch && matchesZone && matchesArea;
      })
      .sort((left, right) => sortFamilies(left, right, sortOrder, groups));
  }, [areaFilter, families, groups, search, sortOrder, zoneFilter]);

  const zoneOptions = useMemo(
    () =>
      [...new Set(
        families
          .map((family) => groups.find((group) => group.id === family.fellowshipZone)?.name || family.fellowshipZone)
          .filter(Boolean)
      )].sort((left, right) => compareText(left, right)),
    [families, groups]
  );

  const areaOptions = useMemo(
    () =>
      [...new Set(families.map((family) => family.residentialArea).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [families]
  );

  const familyExportRows = useMemo(
    () =>
      filteredFamilies.map((family) => ({
        familyId: family.familyId,
        familyName: family.familyName,
        residentialArea: family.residentialArea,
        fellowshipZone: groups.find((group) => group.id === family.fellowshipZone)?.name || family.fellowshipZone || "",
        headOfHousehold: getName(family.headOfHousehold),
        spouse: family.spouse?.memberName || "",
        familyContact: family.familyContact,
        totalMembers: family.householdMembers?.length || 0,
        householdMembers: (family.householdMembers || [])
          .map((member) => `${member.relationshipToHead}: ${member.memberName}`)
          .join(", "),
        visitationHistory: family.visitationHistory || "",
      })),
    [filteredFamilies, groups]
  );

  const familyExportColumns = [
    { key: "familyId", header: "Family ID" },
    { key: "familyName", header: "Family Name" },
    { key: "residentialArea", header: "Residential Area" },
    { key: "fellowshipZone", header: "Fellowship Or Zone" },
    { key: "headOfHousehold", header: "Head Of Household" },
    { key: "spouse", header: "Spouse" },
    { key: "familyContact", header: "Contact" },
    { key: "totalMembers", header: "Total Members" },
    { key: "householdMembers", header: "Household Members" },
    { key: "visitationHistory", header: "Visit History" },
  ];

  const handleExportHouseholdsCsv = () => {
    exportRowsToCsv({
      fileName: "households-export.csv",
      columns: familyExportColumns,
      rows: familyExportRows,
    });
  };

  const handleExportHouseholdsPdf = () => {
    exportRowsToPdf({
      fileName: "households-export.pdf",
      title: "Households Export",
      columns: familyExportColumns,
      rows: familyExportRows,
    });
  };

  if (familyApiState.loading) {
    return <div className="empty-note">Loading households...</div>;
  }

  if (familyApiState.error) {
    return <div className="empty-note">{familyApiState.error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="surface-card data-card">
        <div className="section-headline compact">
          <div>
            <h3>Households</h3>
            <p>Open any row to view or edit a household, or import many households from a template.</p>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="ghost-button" onClick={handleExportHouseholdsCsv}>
              Export CSV
            </button>
            <button type="button" className="ghost-button" onClick={handleExportHouseholdsPdf}>
              Export PDF
            </button>
            <button type="button" className="ghost-button" onClick={() => setShowImportModal(true)}>
              Bulk Upload
            </button>
          </div>
        </div>
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search household, head, contact, or area" />
          </div>
          <select className="filter-select" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
            <option value="all">All zones</option>
            {zoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <select className="filter-select" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
            <option value="all">All areas</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="members_desc">Sort: Largest Household</option>
            <option value="zone_asc">Sort: Zone</option>
          </select>
        </div>
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Family ID</th>
                <th>Family Name</th>
                <th>Head of Household</th>
                <th>Members</th>
                <th>Fellowship/Zone</th>
                <th>Contact</th>
                <th>Visit History</th>
              </tr>
            </thead>
            <tbody>
              {filteredFamilies.length ? filteredFamilies.map((family) => (
                <tr
                  key={family.familyId}
                  className="clickable-row"
                  onClick={() => openRecordModal("family", family)}
                >
                  <td>{family.familyId}</td>
                  <td>
                    <strong>{family.familyName}</strong>
                    <p>{family.residentialArea}</p>
                  </td>
                  <td>
                    <strong>{getName(family.headOfHousehold)}</strong>
                    <p>{family.spouse?.memberName ? `Spouse: ${family.spouse.memberName}` : "No spouse recorded"}</p>
                  </td>
                  <td>
                    {(family.householdMembers || []).map((member) => `${member.relationshipToHead}: ${member.memberName}`).join(", ")}
                  </td>
                  <td>{groups.find((group) => group.id === family.fellowshipZone)?.name || family.fellowshipZone}</td>
                  <td>{family.familyContact}</td>
                  <td>{family.visitationHistory || "No visit recorded"}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="empty-table">
                    No households found for the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showImportModal ? <BulkImportModal entity="households" onClose={() => setShowImportModal(false)} /> : null}
    </div>
  );
}
