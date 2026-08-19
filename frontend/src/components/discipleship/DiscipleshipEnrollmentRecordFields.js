export default function DiscipleshipEnrollmentRecordFields({
  draft,
  isEditing,
  onChange,
  members,
  programmes,
  users,
  statusOptions,
}) {
  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Member
          <select
            value={draft.memberId?._id || draft.memberId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = members.find((item) => item._id === event.target.value) || "";
              onChange("memberId", selected);
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
          Programme
          <select
            value={draft.programmeId?._id || draft.programmeId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = programmes.find((item) => item._id === event.target.value) || "";
              onChange("programmeId", selected);
            }}
          >
            <option value="">Select programme</option>
            {programmes.map((programme) => (
              <option key={programme._id} value={programme._id}>
                {programme.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mentor
          <select
            value={draft.mentorId?._id || draft.mentorId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = users.find((item) => item._id === event.target.value) || "";
              onChange("mentorId", selected);
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
          Enrollment Date
          <input
            type="date"
            value={formatDateValue(draft.enrollmentDate)}
            readOnly={!isEditing}
            onChange={(event) => onChange("enrollmentDate", event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={draft.status?._id || draft.status || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = statusOptions.find((item) => item._id === event.target.value) || "";
              onChange("status", selected);
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
          Completion Date
          <input
            type="date"
            value={formatDateValue(draft.completionDate)}
            readOnly={!isEditing}
            onChange={(event) => onChange("completionDate", event.target.value)}
          />
        </label>
        <label className="full-width">
          Source Prospect
          <input
            value={draft.sourceProspectId || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("sourceProspectId", event.target.value)}
          />
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
