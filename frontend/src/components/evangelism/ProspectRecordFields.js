import MemberLookupField from "../common/MemberLookupField";

const genderOptions = ["Male", "Female"];

export default function ProspectRecordFields({
  draft,
  isEditing,
  onChange,
  sourceOptions,
  stageOptions,
  campaignOptions,
  members,
}) {
  const selectedEvangelist =
    members.find((member) => member.memberId === draft.assignedEvangelistMemberId) ||
    members.find((member) => member.memberId === draft.assignedEvangelistId?.memberId) ||
    null;

  return (
    <div className="modal-form">
      <div className="form-grid">
        <label>
          Prospect ID
          <input value={draft.prospectId || ""} readOnly />
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
          Source
          <select
            value={draft.source?._id || draft.source || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = sourceOptions.find((item) => item._id === event.target.value);
              onChange("source", selected || "");
            }}
          >
            <option value="">Select source</option>
            {sourceOptions.map((option) => (
              <option key={option._id} value={option._id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Current Stage
          <select
            value={draft.currentStage?._id || draft.currentStage || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = stageOptions.find((item) => item._id === event.target.value);
              onChange("currentStage", selected || "");
            }}
          >
            <option value="">Select stage</option>
            {stageOptions.map((option) => (
              <option key={option._id} value={option._id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Campaign
          <select
            value={draft.campaignId?._id || draft.campaignId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = campaignOptions.find((item) => item._id === event.target.value);
              onChange("campaignId", selected || "");
            }}
          >
            <option value="">No campaign</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign._id} value={campaign._id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visitor ID If Any
          <input value={draft.sourceVisitorId || ""} readOnly={!isEditing} onChange={(event) => onChange("sourceVisitorId", event.target.value)} />
        </label>
        <label>
          Date First Contact
          <input
            type="date"
            value={draft.dateFirstContact || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("dateFirstContact", event.target.value)}
          />
        </label>
        <label>
          Next Follow-Up Date
          <input
            type="date"
            value={draft.nextFollowUpDate || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("nextFollowUpDate", event.target.value)}
          />
        </label>
        <label>
          Baptism Date
          <input
            type="date"
            value={draft.baptismDate || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("baptismDate", event.target.value)}
          />
        </label>
        <label>
          Converted Member ID
          <input value={draft.convertedMemberId || ""} readOnly />
        </label>
        <label>
          Linked User Account
          <input
            value={draft.assignedEvangelistId?.displayName || draft.assignedEvangelistId?.username || ""}
            readOnly
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
        <label className="full-width">
          Notes Summary
          <textarea
            rows="4"
            value={draft.notesSummary || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("notesSummary", event.target.value)}
          />
        </label>
      </div>

      <MemberLookupField
        label="Assigned Evangelist"
        placeholder="Search evangelist from members"
        compact
        addLabel="Add Evangelist"
        roleLabel="Assigned Evangelist"
        members={members}
        selected={selectedEvangelist}
        onSelect={(value) => onChange("assignedEvangelistMemberId", value.memberId)}
        onRemove={() => onChange("assignedEvangelistMemberId", "")}
        disabled={!isEditing}
      />
    </div>
  );
}
