import MemberLookupField from "../common/MemberLookupField";

export default function FamilyRecordFields({
  draft,
  isEditing,
  members,
  groups,
  onChange,
}) {
  const previewMembers = [
    draft.headOfHousehold?.memberId
      ? { ...draft.headOfHousehold, relationshipToHead: "Head" }
      : null,
    draft.spouse?.memberId
      ? { ...draft.spouse, relationshipToHead: getPreviewRole("Spouse", draft.spouse, members) }
      : null,
    ...(draft.children || []).map((item) => ({ ...item, relationshipToHead: getPreviewRole("Child", item, members) })),
    ...(draft.dependants || []).map((item) => ({ ...item, relationshipToHead: "Dependant" })),
  ].filter(Boolean);

  const selectedIds = [
    draft.headOfHousehold?.memberId,
    draft.spouse?.memberId,
    ...(draft.children || []).map((item) => item.memberId),
    ...(draft.dependants || []).map((item) => item.memberId),
  ].filter(Boolean);

  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Family/Household ID
          <input value={draft.familyId || ""} readOnly />
        </label>
        <label>
          Family Name
          <input
            value={draft.familyName || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("familyName", event.target.value)}
          />
        </label>
        <label>
          Residential Area
          <input
            value={draft.residentialArea || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("residentialArea", event.target.value)}
          />
        </label>
        <label>
          Fellowship/Zone
          <select
            value={draft.fellowshipZone || ""}
            disabled={!isEditing}
            onChange={(event) => onChange("fellowshipZone", event.target.value)}
          >
            <option value="">Select group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.levelName}: {group.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Family Contact
          <input
            value={draft.familyContact || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("familyContact", event.target.value)}
          />
        </label>
        <label className="full-width">
          Physical Address
          <input
            value={draft.physicalAddress || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("physicalAddress", event.target.value)}
          />
        </label>
      </div>

      <div className="subsection-card">
        <div className="section-headline">
          <div>
            <h3>Household Composition</h3>
            <p>Select members from the live search results.</p>
          </div>
        </div>

        <div className="lookup-grid">
          <MemberLookupField
            label="Head of Household"
            placeholder="Search head of household"
            members={members}
            selected={draft.headOfHousehold}
            onSelect={(value) => onChange("headOfHousehold", value)}
            onRemove={() => onChange("headOfHousehold", null)}
            excludeIds={selectedIds.filter((item) => item !== draft.headOfHousehold?.memberId)}
            disabled={!isEditing}
          />

          <MemberLookupField
            label="Spouse"
            placeholder="Search spouse"
            members={members}
            selected={draft.spouse}
            onSelect={(value) => onChange("spouse", value)}
            onRemove={() => onChange("spouse", null)}
            excludeIds={selectedIds.filter((item) => item !== draft.spouse?.memberId)}
            disabled={!isEditing}
          />

          <MemberLookupField
            label="Children"
            placeholder="Search child member"
            members={members}
            selected={draft.children || []}
            multiple
            onSelect={(value) => onChange("children", [...(draft.children || []), value])}
            onRemove={(memberId) =>
              onChange(
                "children",
                (draft.children || []).filter((item) => item.memberId !== memberId)
              )
            }
            excludeIds={selectedIds.filter((item) => !(draft.children || []).some((child) => child.memberId === item))}
            disabled={!isEditing}
          />

          <MemberLookupField
            label="Dependants"
            placeholder="Search dependant"
            members={members}
            selected={draft.dependants || []}
            multiple
            onSelect={(value) => onChange("dependants", [...(draft.dependants || []), value])}
            onRemove={(memberId) =>
              onChange(
                "dependants",
                (draft.dependants || []).filter((item) => item.memberId !== memberId)
              )
            }
            excludeIds={selectedIds.filter((item) => !(draft.dependants || []).some((child) => child.memberId === item))}
            disabled={!isEditing}
          />
        </div>
      </div>

      <label className="full-width">
        Family Visitation History
        <textarea
          rows="5"
          value={draft.visitationHistory || ""}
          readOnly={!isEditing}
          onChange={(event) => onChange("visitationHistory", event.target.value)}
        />
      </label>

      {previewMembers.length ? (
        <div className="subsection-card">
          <div className="section-headline">
            <div>
              <h3>Household Members</h3>
              <p>Current family members, roles, and status.</p>
            </div>
          </div>
          <div className="simple-list">
            {previewMembers.map((member) => (
              <div className="simple-list-item" key={`${member.memberId}-${member.relationshipToHead}`}>
                <div>
                  <strong>{member.memberName}</strong>
                  <p>{member.relationshipToHead}</p>
                </div>
                <span className="status-pill active">Selected</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getPreviewRole(baseRole, selection, members) {
  const linkedMember = members.find((member) => member.memberId === selection?.memberId);

  if (baseRole === "Spouse") {
    return linkedMember?.gender === "Male" ? "Husband" : "Wife";
  }

  if (baseRole === "Child") {
    return linkedMember?.gender === "Female" ? "Daughter" : "Son";
  }

  return baseRole;
}
