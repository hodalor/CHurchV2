import { useEffect, useMemo, useState } from "react";
import AttendanceParticipantLookupField from "./AttendanceParticipantLookupField";
import { useAppContext } from "../../context/AppContext";
import { formatDateTimeDisplay } from "../../utils/dateUtils";

function getDefaultManualMode(options) {
  return options.find((item) => item.key === "manual")?._id || "";
}

export default function AttendanceEventActionPanel({ event }) {
  const {
    members,
    visitors,
    attendanceApiState,
    attendanceCaptureModeOptions,
    captureAttendanceRecord,
    captureBulkAttendance,
    correctAttendanceRecord,
    toggleAttendanceCheckIn,
    fetchAttendanceCheckInDashboard,
    checkInMemberByQr,
  } = useAppContext();
  const [activePanel, setActivePanel] = useState("");
  const [manualEntry, setManualEntry] = useState({
    member: null,
    visitor: null,
    present: true,
    capturedVia: getDefaultManualMode(attendanceCaptureModeOptions),
    correctionReason: "",
  });
  const [qrEntry, setQrEntry] = useState("");
  const [dashboard, setDashboard] = useState({
    counters: { members: 0, visitors: 0, children: 0, online: 0, total: 0 },
    recentCheckIns: [],
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

  const records = Array.isArray(event.attendanceRecords) ? event.attendanceRecords : [];
  const resolvedDashboard = {
    counters: {
      members: dashboard.counters?.members || records.filter((record) => Boolean(record.memberId)).length,
      visitors: dashboard.counters?.visitors || records.filter((record) => Boolean(record.visitorId)).length,
      children:
        dashboard.counters?.children ||
        records.filter((record) => record.memberId?.memberType === "Child").length,
      online: dashboard.counters?.online || 0,
      total: dashboard.counters?.total || records.length,
    },
    recentCheckIns:
      dashboard.recentCheckIns?.length ? dashboard.recentCheckIns : records.slice(0, 10),
  };

  useEffect(() => {
    if (!event?._id) {
      return undefined;
    }

    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const payload = await fetchAttendanceCheckInDashboard(event._id);
        if (isMounted) {
          setDashboard(payload);
        }
      } catch (error) {
        if (isMounted) {
          setDashboard({
            counters: { members: 0, visitors: 0, children: 0, online: 0, total: 0 },
            recentCheckIns: [],
          });
        }
      }
    };

    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [event?._id, fetchAttendanceCheckInDashboard, records.length]);

  if (!event?._id) {
    return null;
  }

  return (
    <div className="visitor-action-stack">
      <section className="subsection-card">
        <div className="section-headline compact">
          <div>
            <h3>Check-In Snapshot</h3>
            <p>Live event view with QR, manual, and bulk recording options.</p>
          </div>
        </div>
        <div className="info-grid">
          <article className="info-tile">
            <span>Check-In Window</span>
            <strong>{event.isCheckInOpen !== false ? "Open" : "Closed"}</strong>
          </article>
          <article className="info-tile">
            <span>Recorded Entries</span>
            <strong>{resolvedDashboard.counters.total}</strong>
          </article>
          <article className="info-tile">
            <span>Present Members</span>
            <strong>{resolvedDashboard.counters.members}</strong>
          </article>
          <article className="info-tile">
            <span>Visitors</span>
            <strong>{resolvedDashboard.counters.visitors}</strong>
          </article>
          <article className="info-tile">
            <span>Children</span>
            <strong>{resolvedDashboard.counters.children}</strong>
          </article>
          <article className="info-tile">
            <span>Attendance Rate</span>
            <strong>{event.attendanceRate || 0}%</strong>
          </article>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button small"
            disabled={attendanceApiState.loading}
            onClick={() => toggleAttendanceCheckIn(event._id, event.isCheckInOpen === false)}
          >
            {event.isCheckInOpen !== false ? "Close Check-In" : "Open Check-In"}
          </button>
          <button
            type="button"
            className="ghost-button small"
            onClick={() => setActivePanel((current) => (current === "qr" ? "" : "qr"))}
          >
            {activePanel === "qr" ? "Hide QR Entry" : "QR Check-In"}
          </button>
          <button
            type="button"
            className="ghost-button small"
            onClick={() => setActivePanel((current) => (current === "manual" ? "" : "manual"))}
          >
            {activePanel === "manual" ? "Hide Manual Entry" : "Manual Search"}
          </button>
          <button
            type="button"
            className="ghost-button small"
            onClick={() => setActivePanel((current) => (current === "bulk" ? "" : "bulk"))}
          >
            {activePanel === "bulk" ? "Hide Bulk Entry" : "Bulk Record"}
          </button>
        </div>
      </section>

      {activePanel === "qr" ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <div>
              <h3>QR Scan / Manual Token Entry</h3>
              <p>Paste or type the member QR token when a scanner or camera decodes it.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="full-width">
              Member QR Token
              <input
                value={qrEntry}
                onChange={(eventValue) => setQrEntry(eventValue.target.value)}
                placeholder="Paste scanned token or enter it manually"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="primary-button"
              disabled={attendanceApiState.loading || !qrEntry.trim()}
              onClick={async () => {
                await checkInMemberByQr(event._id, {
                  qrToken: qrEntry.trim(),
                  capturedVia: "qr",
                });
                setQrEntry("");
                setActivePanel("");
              }}
            >
              Resolve And Check In
            </button>
          </div>
        </section>
      ) : null}

      {activePanel === "manual" ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <div>
              <h3>Manual Search</h3>
              <p>Search a member or visitor, then record attendance directly.</p>
            </div>
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
                onChange={(eventValue) =>
                  setManualEntry((current) => ({ ...current, capturedVia: eventValue.target.value }))
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
                onChange={(eventValue) =>
                  setManualEntry((current) => ({
                    ...current,
                    present: eventValue.target.value === "true",
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
                onChange={(eventValue) =>
                  setManualEntry((current) => ({
                    ...current,
                    correctionReason: eventValue.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="primary-button"
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
            <div>
              <h3>Bulk Record</h3>
              <p>Select multiple expected members and record them in one pass.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="full-width">
              Search Members
              <input
                value={bulkSearch}
                onChange={(eventValue) => setBulkSearch(eventValue.target.value)}
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
                  onChange={(eventValue) =>
                    setBulkSelection((current) =>
                      eventValue.target.checked
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
              className="primary-button"
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
          <div>
            <h3>Last 10 Check-Ins</h3>
            <p>A near-live feed of the most recent event entries.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Mode</th>
                <th>Present</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {resolvedDashboard.recentCheckIns.length ? (
                resolvedDashboard.recentCheckIns.map((record) => (
                  <tr key={record._id}>
                    <td>
                      {record.memberId
                        ? `${record.memberId.memberId} - ${record.memberId.firstName} ${record.memberId.lastName}`
                        : record.visitorId
                          ? `${record.visitorId.visitorId} - ${record.visitorId.firstName} ${record.visitorId.surname}`
                          : "-"}
                    </td>
                    <td>{record.capturedVia?.label || "-"}</td>
                    <td>{record.present ? "Yes" : "No"}</td>
                    <td>{formatTimestamp(record.createdAt || record.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-table">
                    No check-ins captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="subsection-card">
        <div className="section-headline compact">
          <div>
            <h3>Recorded Entries</h3>
            <p>Click any row to flip present status and record a correction.</p>
          </div>
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

function formatTimestamp(value) {
  if (!value) {
    return "-";
  }

  return formatDateTimeDisplay(value);
}
