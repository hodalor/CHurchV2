export default function GroupRecordFields({ draft, isEditing, groups, onChange }) {
  const currentGroupId = draft._id || draft.id;
  const parentOptions = groups.filter((group) => (group._id || group.id) !== currentGroupId);

  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Group Name
          <input
            value={draft.name || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </label>
        <label>
          Group Code
          <input
            value={draft.code || "Generated automatically after save"}
            readOnly
          />
        </label>
        <label>
          Parent Group
          <select
            value={draft.parentId || ""}
            disabled={!isEditing}
            onChange={(event) => onChange("parentId", event.target.value)}
          >
            <option value="">No parent group</option>
            {parentOptions.map((group) => (
              <option key={group._id || group.id} value={group._id || group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
