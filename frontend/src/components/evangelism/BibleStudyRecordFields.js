import MemberLookupField from "../common/MemberLookupField";
import DetailGrid from "../common/DetailGrid";

export default function BibleStudyRecordFields({
  draft,
  isEditing,
  onChange,
  prospects,
  members,
  statusOptions,
}) {
  const selectedTeacher =
    members.find((member) => member.memberId === draft.teacherMemberId) ||
    members.find((member) => member.memberId === draft.teacherId?.memberId) ||
    null;

  return (
    <div className="modal-form">
      {isEditing ? (
        <div className="form-grid">
          <label>
            Bible Study ID
            <input value={draft.bibleStudyId || ""} readOnly />
          </label>
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
            Study Type
            <input value={draft.studyType || ""} readOnly={!isEditing} onChange={(event) => onChange("studyType", event.target.value)} />
          </label>
          <label>
            Start Date
            <input type="date" value={formatDateValue(draft.startDate)} readOnly={!isEditing} onChange={(event) => onChange("startDate", event.target.value)} />
          </label>
          <label>
            Last Session Date
            <input type="date" value={formatDateValue(draft.lastSessionDate)} readOnly={!isEditing} onChange={(event) => onChange("lastSessionDate", event.target.value)} />
          </label>
          <label>
            Current Status
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
            Next Session Date
            <input type="date" value={formatDateValue(draft.nextSessionDate)} readOnly={!isEditing} onChange={(event) => onChange("nextSessionDate", event.target.value)} />
          </label>
          <label>
            Sessions Completed
            <input value={draft.lessonsCompleted?.length || 0} readOnly />
          </label>
          <label>
            Data Entry Clerk
            <input value={draft.dataEntryClerk || ""} readOnly />
          </label>
          <label>
            Date Captured
            <input type="date" value={formatDateValue(draft.dateCaptured)} readOnly />
          </label>
          <label className="full-width">
            Outcome
            <textarea rows="4" value={draft.outcome || ""} readOnly={!isEditing} onChange={(event) => onChange("outcome", event.target.value)} />
          </label>
        </div>
      ) : (
        <DetailGrid
          items={[
            { label: "Bible Study ID", value: draft.bibleStudyId || "" },
            { label: "Prospect", value: draft.prospect?.prospectId ? `${draft.prospect.prospectId} - ${draft.prospect.firstName} ${draft.prospect.surname}` : "" },
            { label: "Member", value: draft.member?.memberId ? `${draft.member.memberId} - ${draft.member.firstName} ${draft.member.lastName}` : "" },
            { label: "Study Type", value: draft.studyType || "" },
            { label: "Start Date", value: formatDateValue(draft.startDate) },
            { label: "Last Session Date", value: formatDateValue(draft.lastSessionDate) },
            { label: "Current Status", value: draft.status?.label || "" },
            { label: "Next Session Date", value: formatDateValue(draft.nextSessionDate) },
            { label: "Sessions Completed", value: draft.lessonsCompleted?.length || 0 },
            { label: "Teacher Or Evangelist", value: selectedTeacher?.memberName || selectedTeacher?.fullName || "" },
            { label: "Data Entry Clerk", value: draft.dataEntryClerk || "" },
            { label: "Date Captured", value: formatDateValue(draft.dateCaptured) },
            { label: "Outcome", value: draft.outcome || "", wide: true },
          ]}
        />
      )}

      <MemberLookupField
        label="Teacher Or Evangelist"
        placeholder="Search teacher or evangelist"
        compact
        addLabel="Add Teacher"
        roleLabel="Teacher"
        members={members}
        selected={selectedTeacher}
        onSelect={(value) => onChange("teacherMemberId", value.memberId)}
        onRemove={() => onChange("teacherMemberId", "")}
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
