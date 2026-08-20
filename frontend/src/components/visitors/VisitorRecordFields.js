import MemberLookupField from "../common/MemberLookupField";
import DetailGrid from "../common/DetailGrid";

const genderOptions = ["Male", "Female"];

export default function VisitorRecordFields({
  draft,
  isEditing,
  onChange,
  howHeardOptions,
  members,
  users,
}) {
  const selectedFollowUpMember =
    members.find((member) => member.memberId === draft.assignedFollowUpMemberId) ||
    members.find((member) => member.memberId === draft.assignedFollowUpUserId?.memberId) ||
    null;

  return (
    <div className="modal-form">
      {isEditing ? (
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
            Gender
            <select
              value={draft.gender || ""}
              disabled={!isEditing}
              onChange={(event) => onChange("gender", event.target.value)}
            >
              <option value="">Select gender</option>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Primary Mobile
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
            Linked User Account
            <input
              value={draft.assignedFollowUpUserId?.displayName || draft.assignedFollowUpUserId?.username || ""}
              readOnly
            />
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
      ) : (
        <DetailGrid
          items={[
            { label: "Visitor ID", value: draft.visitorId || "" },
            { label: "First Name", value: draft.firstName || "" },
            { label: "Surname", value: draft.surname || "" },
            { label: "Gender", value: draft.gender || "" },
            { label: "Primary Mobile", value: draft.phone || "" },
            { label: "Email", value: draft.email || "" },
            { label: "Residential Area", value: draft.residentialArea || "" },
            { label: "First Visit Date", value: formatDateValue(draft.firstVisitDate) },
            { label: "How Heard", value: draft.howHeard?.label || "" },
            { label: "Linked User Account", value: draft.assignedFollowUpUserId?.displayName || draft.assignedFollowUpUserId?.username || "" },
            { label: "Status", value: draft.status?.label || draft.status || "Pending" },
            { label: "Church Visits", value: draft.visitCount || 0 },
          ]}
        />
      )}

      <MemberLookupField
        label="Assign Follow-Up"
        placeholder="Search member for follow-up"
        compact
        addLabel="Add Follow-Up Member"
        roleLabel="Follow-Up"
        members={members}
        selected={selectedFollowUpMember}
        onSelect={(value) => onChange("assignedFollowUpMemberId", value.memberId)}
        onRemove={() => {
          onChange("assignedFollowUpMemberId", "");
          if (!users.some((user) => user._id === draft.assignedFollowUpUserId?._id)) {
            onChange("assignedFollowUpUserId", "");
          }
        }}
        disabled={!isEditing}
      />
    </div>
  );
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
