import { useMemo, useState } from "react";
import AttendanceParticipantLookupField from "./AttendanceParticipantLookupField";
import { useAppContext } from "../../context/AppContext";

export default function AttendanceEventActionPanel({ event }) {
  const {
    members,
    visitors,
    attendanceApiState,
    attendanceCaptureModeOptions,
    captureAttendanceRecord,
    captureBulkAttendance,
    correctAttendanceRecord,
  } = useAppContext();
  const [activePanel, setActivePanel] = useState("");
  const [manualEntry, setManualEntry] = useState({
    member: null,
    visitor: null,
    present: true,
    capturedVia: attendanceCaptureModeOptions.find((item) => item.key === "manual")?._id || "",
    correctionReason: "",
  });
  const [bulkSelection, setBulkSelection] = useState([]);
  const [bulkSearch, setBulkSearch] = useState("");

  const filteredMembers = useMemo(() => {
    const search = bulkSearch.toLowerCase().trim();
    if (!search) {
      return members.slice(0, 18);
    }

    return members.filter((member) =>
      `${member.memberId || ""} ${member.firstName || ""} ${member.lastName || ""}`
        .toLowerCase()
        .includes(search)
    );
  }, [bulkSearch, members]);

  if (!event?._id) {
    return null;
  }

  const records = Array.isArray(event.attendanceRecords) ? event.attendanceRecords : [];

  return (
    <div className="visitor-action-stack">
      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Attendance Snapshot</h3>
        </div>
        <div className="info-grid">
          <article className="info-tile">
            <span>Recorded Entries</span>
            <strong>{records.length}</strong>
          </article>
          <article className="info-tile">
            <span>Present</span>
            <strong>{records.filter((record) => record.present).length}</strong>
          </article>
          <article className="info-tile">
            <span>Attendance Rate</span>
            <strong>{event.attendanceRate || 0}%</strong>
          </article>
          <article className="info-tile">
            <span>QR Token</span>
            <strong>{event.qrToken || "-"}</strong>
          </article>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button small"
            onClick={() => setActivePanel((current) => (current === "manual" ? "" : "manual"))}
          >
            {activePanel === "manual" ? "Hide Record Form" : "Record Attendance"}
          </button>
          <button
            type="button"
            className="ghost-button small"
            onClick={() => setActivePanel((current) => (current === "bulk" ? "" : "bulk"))}
          >
            {activePanel === "bulk" ? "Hide Bulk Form" : "Bulk Record"}
          </button>
        </div>
      </section>

      {activePanel === "manual" ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Manual Capture</h3>
          </div>
          <div className="lookup-grid">
            <AttendanceParticipantLookupField
              label="Member"
              placeholder="Search member by name or member ID"
              items={members}
              selected={manualEntry.member}
              onSelect={(member) =>
                setManualEntry((current) => ({
                  ...current,
                  member,
                  visitor: null,
                }))
              }
              onClear={() =>
                setManualEntry((current) => ({
                  ...current,
                  member: null,
                }))
              }
              getKey={(member) => member._id || member.memberId}
              getLabel={(member) => `${member.memberId} - ${member.firstName} ${member.lastName}`}
            />
            <AttendanceParticipantLookupField
              label="Visitor"
              placeholder="Search visitor by name or visitor ID"
              items={visitors}
              selected={manualEntry.visitor}
              onSelect={(visitor) =>
                setManualEntry((current) => ({
                  ...current,
                  visitor,
                  member: null,
                }))
              }
              onClear={() =>
                setManualEntry((current) => ({
                  ...current,
                  visitor: null,
                }))
              }
              getKey={(visitor) => visitor._id || visitor.visitorId}
              getLabel={(visitor) => `${visitor.visitorId} - ${visitor.firstName} ${visitor.surname}`}
            />
          </div>
          <div className="form-grid">
            <label>
              Capture Mode
              <select
                value={manualEntry.capturedVia}
                onChange={(event) =>
                  setManualEntry((current) => ({ ...current, capturedVia: event.target.value }))
                }
              >
                <option value="">Select mode</option>
                {attendanceCaptureModeOptions.map((option) => (
                  <option key={option._id} value={option._id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Present
              <select
                value={String(manualEntry.present)}
                onChange={(event) =>
                  setManualEntry((current) => ({
                    ...current,
                    present: event.target.value === "true",
                  }))
                }
              >
                <option value="true">Present</option>
                <option value="false">Absent</option>
              </select>
            </label>
            <label className="full-width">
              Correction Reason
              <textarea
                rows="3"
                value={manualEntry.correctionReason}
                onChange={(event) =>
                  setManualEntry((current) => ({
                    ...current,
                    correctionReason: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={attendanceApiState.loading || (!manualEntry.member && !manualEntry.visitor)}
              onClick={async () => {
                await captureAttendanceRecord(event._id, {
                  memberId: manualEntry.member?._id || null,
                  visitorId: manualEntry.visitor?._id || null,
                  present: manualEntry.present,
                  capturedVia: manualEntry.capturedVia,
                  correctedFlag: Boolean(manualEntry.correctionReason),
                  correctionReason: manualEntry.correctionReason,
                });
                setManualEntry((current) => ({
                  ...current,
                  member: null,
                  visitor: null,
                  present: true,
                  correctionReason: "",
                }));
                setActivePanel("");
              }}
            >
              Save Attendance
            </button>
          </div>
        </section>
      ) : null}

      {activePanel === "bulk" ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Bulk Capture</h3>
          </div>
          <div className="form-grid">
            <label className="full-width">
              Search Members
              <input
                value={bulkSearch}
                onChange={(event) => setBulkSearch(event.target.value)}
                placeholder="Search members to mark present"
              />
            </label>
          </div>
          <div className="attendance-checklist">
            {filteredMembers.map((member) => (
              <label key={member._id || member.memberId} className="attendance-checklist-item">
                <input
                  type="checkbox"
                  checked={bulkSelection.includes(member._id)}
                  onChange={(event) =>
                    setBulkSelection((current) =>
                      event.target.checked
                        ? [...current, member._id]
                        : current.filter((item) => item !== member._id)
                    )
                  }
                />
                <span>
                  {member.memberId} - {member.firstName} {member.lastName}
                </span>
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={attendanceApiState.loading || !bulkSelection.length}
              onClick={async () => {
                await captureBulkAttendance(event._id, {
                  capturedVia: "bulk",
                  records: bulkSelection.map((memberId) => ({
                    memberId,
                    present: true,
                  })),
                });
                setBulkSelection([]);
                setBulkSearch("");
                setActivePanel("");
              }}
            >
              Save Bulk Attendance
            </button>
          </div>
        </section>
      ) : null}

      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Recorded Entries</h3>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Mode</th>
                <th>Present</th>
                <th>Corrected</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((record) => (
                  <tr
                    key={record._id}
                    className="clickable-row"
                    onClick={() =>
                      correctAttendanceRecord(
                        record._id,
                        {
                          present: !record.present,
                          capturedVia: record.capturedVia?._id || record.capturedVia?.key || "manual",
                          correctionReason: "Adjusted from attendance modal.",
                        },
                        event._id
                      )
                    }
                  >
                    <td>
                      {record.memberId
                        ? `${record.memberId.memberId} - ${record.memberId.firstName} ${record.memberId.lastName}`
                        : record.visitorId
                          ? `${record.visitorId.visitorId} - ${record.visitorId.firstName} ${record.visitorId.surname}`
                          : "-"}
                    </td>
                    <td>{record.capturedVia?.label || "-"}</td>
                    <td>{record.present ? "Yes" : "No"}</td>
                    <td>{record.correctedFlag ? "Yes" : "No"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-table">
                    No attendance entries captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
