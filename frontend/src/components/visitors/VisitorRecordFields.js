export default function VisitorRecordFields({
  draft,
  isEditing,
  onChange,
  howHeardOptions,
  users,
}) {
  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Visitor ID
          <input value={draft.visitorId || ""} readOnly />
        </label>
        <label>
          First Name
          <input
            value={draft.firstName || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("firstName", event.target.value)}
          />
        </label>
        <label>
          Surname
          <input
            value={draft.surname || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("surname", event.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            value={draft.phone || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("phone", event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            value={draft.email || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("email", event.target.value)}
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
          First Visit Date
          <input
            type="date"
            value={formatDateValue(draft.firstVisitDate)}
            readOnly={!isEditing}
            onChange={(event) => onChange("firstVisitDate", event.target.value)}
          />
        </label>
        <label>
          How Heard
          <select
            value={draft.howHeard?._id || draft.howHeard || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = howHeardOptions.find((item) => item._id === event.target.value);
              onChange("howHeard", selected || "");
            }}
          >
            <option value="">Select source</option>
            {howHeardOptions.map((option) => (
              <option key={option._id} value={option._id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assigned Follow-Up User
          <select
            value={draft.assignedFollowUpUserId?._id || draft.assignedFollowUpUserId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = users.find((item) => item._id === event.target.value);
              onChange("assignedFollowUpUserId", selected || "");
            }}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <input value={draft.status?.label || draft.status || "Pending"} readOnly />
        </label>
        <label>
          Church Visits
          <input value={draft.visitCount || 0} readOnly />
        </label>
      </div>
    </div>
  );
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
