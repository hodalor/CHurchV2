export default function BibleStudyRecordFields({
  draft,
  isEditing,
  onChange,
  prospects,
  members,
  users,
  statusOptions,
}) {
  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Prospect
          <select
            value={draft.prospect?._id || draft.prospect || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = prospects.find((item) => item._id === event.target.value);
              onChange("prospect", selected || "");
            }}
          >
            <option value="">Select prospect</option>
            {prospects.map((prospect) => (
              <option key={prospect._id} value={prospect._id}>
                {prospect.prospectId} - {prospect.firstName} {prospect.surname}
              </option>
            ))}
          </select>
        </label>
        <label>
          Member
          <select
            value={draft.member?._id || draft.member || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = members.find((item) => item._id === event.target.value);
              onChange("member", selected || "");
            }}
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member._id || member.memberId} value={member._id || ""}>
                {member.memberId} - {member.firstName} {member.lastName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Teacher
          <select
            value={draft.teacherId?._id || draft.teacherId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = users.find((item) => item._id === event.target.value);
              onChange("teacherId", selected || "");
            }}
          >
            <option value="">Select teacher</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Start Date
          <input
            type="date"
            value={formatDateValue(draft.startDate)}
            readOnly={!isEditing}
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={draft.status?._id || draft.status || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = statusOptions.find((item) => item._id === event.target.value);
              onChange("status", selected || "");
            }}
          >
            <option value="">Select status</option>
            {statusOptions.map((option) => (
              <option key={option._id} value={option._id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lessons Completed
          <input value={draft.lessonsCompleted?.length || 0} readOnly />
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
