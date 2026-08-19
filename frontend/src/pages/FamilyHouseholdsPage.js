import { useAppContext } from "../context/AppContext";

function getName(value) {
  if (!value) {
    return "-";
  }

  return typeof value === "string" ? value : value.memberName;
}

export default function FamilyHouseholdsPage() {
  const { families, groups, openRecordModal, familyApiState } = useAppContext();

  if (familyApiState.loading) {
    return <div className="empty-note">Loading households...</div>;
  }

  if (familyApiState.error) {
    return <div className="empty-note">{familyApiState.error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="surface-card data-card">
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
              {families.map((family) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
