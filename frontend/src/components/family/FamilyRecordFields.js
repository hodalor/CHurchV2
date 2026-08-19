import MemberLookupField from "../common/MemberLookupField";

export default function FamilyRecordFields({
  draft,
  isEditing,
  members,
  groups,
  onChange,
}) {
  const householdSelections = [
    draft.headOfHousehold?.memberId
      ? { ...draft.headOfHousehold, relationshipToHead: "Head" }
      : null,
    draft.spouse?.memberId
      ? { ...draft.spouse, relationshipToHead: getPreviewRole("Spouse", draft.spouse, members) }
      : null,
    ...(draft.children || []).map((item) => ({ ...item, relationshipToHead: getPreviewRole("Child", item, members) })),
    ...(draft.dependants || []).map((item) => ({ ...item, relationshipToHead: "Dependent" })),
  ].filter(Boolean);

  const selectedIds = [
    draft.headOfHousehold?.memberId,
    draft.spouse?.memberId,
    ...(draft.children || []).map((item) => item.memberId),
    ...(draft.dependants || []).map((item) => item.memberId),
  ].filter(Boolean);

  const primaryContactOptions = householdSelections.filter((item) => item.memberId);

  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Family/Household ID
          <input value={draft.familyId || ""} readOnly />
        </label>
        <label>
          Household Name
          <input
            value={draft.familyName || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("familyName", event.target.value)}
          />
        </label>
        <label>
          Primary Contact Member ID
          <select
            value={draft.primaryContactMemberId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = primaryContactOptions.find((item) => item.memberId === event.target.value);
              onChange("primaryContactMemberId", event.target.value);
              onChange("primaryContactNumber", selected?.phone || draft.primaryContactNumber || "");
            }}
          >
            <option value="">Select household member</option>
            {primaryContactOptions.map((item) => (
              <option key={item.memberId} value={item.memberId}>
                {item.memberId} - {item.memberName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Primary Contact Number
          <input
            value={draft.primaryContactNumber || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("primaryContactNumber", event.target.value)}
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
              <option key={group._id || group.id} value={group._id || group.id}>
                {group.name}
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
        <label>
          Date Last Visited
          <input
            type="date"
            value={draft.dateLastVisited || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("dateLastVisited", event.target.value)}
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
        <label>
          Source Record Ref
          <input
            value={draft.sourceRecordRef || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("sourceRecordRef", event.target.value)}
          />
        </label>
        <label>
          Data Entry Clerk
          <input value={draft.dataEntryClerk || ""} readOnly />
        </label>
        <label>
          Date Captured
          <input type="date" value={draft.dateCaptured || ""} readOnly />
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
            compact
            addLabel="Add Head"
            roleLabel="Head"
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
            compact
            addLabel="Add Spouse"
            roleLabel="Spouse"
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
            compact
            addLabel="Add Child"
            roleLabel={(item) => item.relationshipToHead || "Child"}
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
            label="Dependents"
            placeholder="Search dependant"
            compact
            addLabel="Add Dependent"
            roleLabel="Dependent"
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

      {householdSelections.length ? (
        <div className="subsection-card">
          <div className="section-headline">
            <div>
              <h3>Household Members</h3>
              <p>Current family members, roles, and status.</p>
            </div>
          </div>
          <div className="simple-list">
            {householdSelections.map((member) => (
              <div className="simple-list-item" key={`${member.memberId}-${member.relationshipToHead}`}>
                <div>
                  <strong>{member.memberName}</strong>
                  <p>{member.memberId}</p>
                  <p>{member.gender || "-"} {member.phone ? `| ${member.phone}` : ""}</p>
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
    return "Spouse";
  }

  if (baseRole === "Child") {
    return linkedMember?.gender === "Female" ? "Daughter" : "Son";
  }

  return baseRole;
}
