export default function ProspectRecordFields({
  draft,
  isEditing,
  onChange,
  sourceOptions,
  stageOptions,
  campaignOptions,
  users,
}) {
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
          Assigned Evangelist
          <select
            value={draft.assignedEvangelistId?._id || draft.assignedEvangelistId || ""}
            disabled={!isEditing}
            onChange={(event) => {
              const selected = users.find((item) => item._id === event.target.value);
              onChange("assignedEvangelistId", selected || "");
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
          Source Visitor
          <input value={draft.sourceVisitorId || "-"} readOnly />
        </label>
      </div>
    </div>
  );
}
