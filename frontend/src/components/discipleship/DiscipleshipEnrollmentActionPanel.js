import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";

export default function DiscipleshipEnrollmentActionPanel({ enrollment }) {
  const {
    users,
    discipleshipApiState,
    discipleshipStatusOptions,
    assignDiscipleshipMentor,
    addDiscipleshipSession,
    completeDiscipleshipEnrollment,
  } = useAppContext();
  const [mentorId, setMentorId] = useState(enrollment?.mentorId?._id || "");
  const [sessionDraft, setSessionDraft] = useState({
    sessionName: "",
    completedAt: getToday(),
    notes: "",
    status: "",
  });
  const [completionDate, setCompletionDate] = useState(getToday());

  useEffect(() => {
    setMentorId(enrollment?.mentorId?._id || "");
  }, [enrollment?.mentorId?._id]);

  if (!enrollment?._id) {
    return null;
  }

  return (
    <div className="visitor-action-stack">
      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Journey Snapshot</h3>
        </div>
        <div className="info-grid">
          <article className="info-tile">
            <span>Programme</span>
            <strong>{enrollment.programmeId?.name || "Not set"}</strong>
          </article>
          <article className="info-tile">
            <span>Mentor</span>
            <strong>{enrollment.mentorId?.displayName || "Unassigned"}</strong>
          </article>
          <article className="info-tile">
            <span>Sessions Completed</span>
            <strong>{enrollment.sessionsCompleted?.length || 0}</strong>
          </article>
          <article className="info-tile">
            <span>Status</span>
            <strong>{enrollment.status?.label || "Pending"}</strong>
          </article>
        </div>
      </section>

      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Assign Mentor</h3>
        </div>
        <div className="form-grid">
          <label>
            Mentor
            <select value={mentorId} onChange={(event) => setMentorId(event.target.value)}>
              <option value="">Select mentor</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button small"
            disabled={discipleshipApiState.loading || !mentorId}
            onClick={() => assignDiscipleshipMentor(enrollment._id, mentorId)}
          >
            Save Mentor
          </button>
        </div>
      </section>

      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Log Session</h3>
        </div>
        <div className="form-grid">
          <label>
            Session Name
            <input
              value={sessionDraft.sessionName}
              onChange={(event) =>
                setSessionDraft((current) => ({ ...current, sessionName: event.target.value }))
              }
            />
          </label>
          <label>
            Completed At
            <input
              type="date"
              value={sessionDraft.completedAt}
              onChange={(event) =>
                setSessionDraft((current) => ({ ...current, completedAt: event.target.value }))
              }
            />
          </label>
          <label>
            Status After Session
            <select
              value={sessionDraft.status}
              onChange={(event) =>
                setSessionDraft((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="">Keep current status</option>
              {discipleshipStatusOptions.map((option) => (
                <option key={option._id} value={option._id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Notes
            <textarea
              rows="3"
              value={sessionDraft.notes}
              onChange={(event) =>
                setSessionDraft((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="ghost-button small"
            disabled={discipleshipApiState.loading || !sessionDraft.sessionName}
            onClick={async () => {
              await addDiscipleshipSession(enrollment._id, sessionDraft);
              setSessionDraft({ sessionName: "", completedAt: getToday(), notes: "", status: "" });
            }}
          >
            Save Session
          </button>
        </div>
      </section>

      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Complete Enrollment</h3>
        </div>
        <div className="form-grid">
          <label>
            Completion Date
            <input
              type="date"
              value={completionDate}
              onChange={(event) => setCompletionDate(event.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="primary-button"
            disabled={discipleshipApiState.loading}
            onClick={() => completeDiscipleshipEnrollment(enrollment._id, { completionDate })}
          >
            Mark Complete
          </button>
        </div>
      </section>
    </div>
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
