import MemberLookupField from "../common/MemberLookupField";

const LEADERSHIP_FIELDS = [
  { key: "elderInCharge", label: "Elder In Charge" },
  { key: "deaconInCharge", label: "Deacon In Charge" },
  { key: "chairman", label: "Chairman" },
  { key: "assistantChairman", label: "Assistant Chairman" },
  { key: "organizer", label: "Organizer" },
  { key: "assistantOrganizer", label: "Assistant Organizer" },
  { key: "secretary", label: "Secretary" },
  { key: "assistantSecretary", label: "Assistant Secretary" },
  { key: "treasurer", label: "Treasurer" },
  { key: "assistantTreasurer", label: "Assistant Treasurer" },
];

export default function MinistryRecordFields({ draft, isEditing, members, onChange }) {
  const leadership = draft.leadership || {};
  const selectedIds = [
    ...(draft.members || []).map((item) => item.memberId),
    ...LEADERSHIP_FIELDS.map((field) => leadership[field.key]?.memberId),
  ].filter(Boolean);

  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Ministry Name
          <input
            value={draft.name || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </label>
        <label>
          Color
          <input
            value={draft.color || "#4f46e5"}
            readOnly={!isEditing}
            onChange={(event) => onChange("color", event.target.value)}
          />
        </label>
        <label className="full-width">
          Description
          <textarea
            rows="4"
            value={draft.description || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("description", event.target.value)}
          />
        </label>
      </div>

      <div className="subsection-card">
        <div className="section-headline">
          <div>
            <h3>Leadership Team</h3>
            <p>Select leadership roles from the member database.</p>
          </div>
        </div>

        <div className="lookup-grid">
          {LEADERSHIP_FIELDS.map((field) => (
            <MemberLookupField
              key={field.key}
              label={field.label}
              placeholder={`Search ${field.label.toLowerCase()}`}
              compact
              addLabel={`Add ${field.label}`}
              roleLabel={field.label}
              members={members}
              selected={leadership[field.key] || null}
              onSelect={(value) =>
                onChange("leadership", {
                  ...leadership,
                  [field.key]: value,
                })
              }
              onRemove={() =>
                onChange("leadership", {
                  ...leadership,
                  [field.key]: null,
                })
              }
              excludeIds={selectedIds.filter((item) => item !== leadership[field.key]?.memberId)}
              disabled={!isEditing}
            />
          ))}
        </div>
      </div>

      <div className="subsection-card">
        <div className="section-headline">
          <div>
            <h3>Ministry Members</h3>
            <p>Add members to the ministry roster from live member lookup.</p>
          </div>
        </div>

        <MemberLookupField
          label="Members"
          placeholder="Search ministry member"
          compact
          addLabel="Add Ministry Member"
          roleLabel="Ministry Member"
          members={members}
          selected={draft.members || []}
          multiple
          onSelect={(value) => onChange("members", [...(draft.members || []), value])}
          onRemove={(memberId) =>
            onChange(
              "members",
              (draft.members || []).filter((item) => item.memberId !== memberId)
            )
          }
          excludeIds={selectedIds.filter((item) => !(draft.members || []).some((entry) => entry.memberId === item))}
          disabled={!isEditing}
        />
      </div>
    </div>
  );
}
