import DetailGrid from "../common/DetailGrid";

export default function AttendanceEventRecordFields({
  draft,
  isEditing,
  onChange,
  eventTypeOptions,
  ministries,
}) {
  return (
    <div className="modal-form">
      {isEditing ? (
        <div className="form-grid">
          <label>
            Event Title
            <input value={draft.title || ""} readOnly={!isEditing} onChange={(event) => onChange("title", event.target.value)} />
          </label>
          <label>
            Event Type
            <select
              value={draft.eventTypeId?._id || draft.eventTypeId || ""}
              disabled={!isEditing}
              onChange={(event) => {
                const selected = eventTypeOptions.find((item) => item._id === event.target.value) || "";
                onChange("eventTypeId", selected);
              }}
            >
              <option value="">Select event type</option>
              {eventTypeOptions.map((option) => (
                <option key={option._id} value={option._id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={formatDateValue(draft.date)} readOnly={!isEditing} onChange={(event) => onChange("date", event.target.value)} />
          </label>
          <label>
            Ministry
            <select
              value={draft.ministryId?._id || draft.ministryId || ""}
              disabled={!isEditing}
              onChange={(event) => {
                const selected = ministries.find((item) => item._id === event.target.value) || "";
                onChange("ministryId", selected);
              }}
            >
              <option value="">General event</option>
              {ministries.map((ministry) => (
                <option key={ministry._id || ministry.id} value={ministry._id || ""}>
                  {ministry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Location
            <input value={draft.location || ""} readOnly={!isEditing} onChange={(event) => onChange("location", event.target.value)} />
          </label>
          <label>
            Check-In Window
            <select
              value={draft.isCheckInOpen !== false ? "open" : "closed"}
              disabled={!isEditing}
              onChange={(event) => onChange("isCheckInOpen", event.target.value === "open")}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="full-width">
            QR Token
            <input value={draft.qrToken || "Generated automatically after save"} readOnly />
          </label>
        </div>
      ) : (
        <DetailGrid
          items={[
            { label: "Event Title", value: draft.title || "" },
            { label: "Event Type", value: draft.eventTypeId?.label || "" },
            { label: "Date", value: formatDateValue(draft.date) },
            { label: "Ministry", value: draft.ministryId?.name || "" },
            { label: "Location", value: draft.location || "", wide: true },
            { label: "Check-In Window", value: draft.isCheckInOpen !== false ? "Open" : "Closed" },
            { label: "QR Token", value: draft.qrToken || "Generated automatically after save", wide: true },
          ]}
        />
      )}
    </div>
  );
}

function formatDateValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
