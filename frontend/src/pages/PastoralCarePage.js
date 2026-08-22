import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { churchApi } from "../apis/churchApi";
import { useAppContext } from "../context/AppContext";

const emptyCaseForm = {
  memberId: "",
  householdId: "",
  category: "",
  title: "",
  responsibleLeaderId: "",
  status: "open",
  nextActionDate: "",
  confidentialityTier: "Standard",
  summary: "",
};

const emptyNoteForm = {
  careCaseId: "",
  memberId: "",
  householdId: "",
  dateTime: new Date().toISOString().slice(0, 16),
  noteType: "",
  content: "",
  confidentialityTier: "Standard",
};

const emptyCounselingForm = {
  ...emptyNoteForm,
  sessionNumber: 1,
  topic: "",
  attendees: "",
  followUpPlan: "",
  nextSessionDate: "",
};

const emptyVisitationForm = {
  ...emptyNoteForm,
  location: "home",
  purpose: "",
  outcome: "",
  followUpNeeded: false,
  followUpDate: "",
};

export default function PastoralCarePage() {
  const location = useLocation();
  const activeSection = location.pathname.split("/")[2] || "notes";
  const { members, families, users, notifyError, notifySuccess } = useAppContext();
  const [cases, setCases] = useState([]);
  const [notes, setNotes] = useState([]);
  const [options, setOptions] = useState({ noteTypes: [] });
  const [caseForm, setCaseForm] = useState(emptyCaseForm);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [counselingForm, setCounselingForm] = useState(emptyCounselingForm);
  const [visitationForm, setVisitationForm] = useState(emptyVisitationForm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCareState() {
      setLoading(true);
      try {
        const [casesResponse, notesResponse, optionsResponse] = await Promise.all([
          churchApi.getCareCases(),
          churchApi.getCareNotes(),
          churchApi.getCareOptions(),
        ]);
        if (cancelled) {
          return;
        }
        setCases(Array.isArray(casesResponse) ? casesResponse : []);
        setNotes(Array.isArray(notesResponse) ? notesResponse : []);
        setOptions({ noteTypes: optionsResponse.noteTypes || [] });
      } catch (error) {
        if (!cancelled) {
          notifyError(error.message || "Unable to load pastoral care data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCareState();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  useEffect(() => {
    if (options.noteTypes.length && !noteForm.noteType) {
      setNoteForm((current) => ({ ...current, noteType: options.noteTypes[0]._id }));
      setCounselingForm((current) => ({ ...current, noteType: options.noteTypes[0]._id }));
      setVisitationForm((current) => ({ ...current, noteType: options.noteTypes[0]._id }));
    }
  }, [noteForm.noteType, options.noteTypes]);

  async function refreshCareState() {
    const [casesResponse, notesResponse] = await Promise.all([churchApi.getCareCases(), churchApi.getCareNotes()]);
    setCases(Array.isArray(casesResponse) ? casesResponse : []);
    setNotes(Array.isArray(notesResponse) ? notesResponse : []);
  }

  async function handleCreateCase(event) {
    event.preventDefault();
    try {
      await churchApi.createCareCase(normalizeBlankObject(caseForm));
      setCaseForm(emptyCaseForm);
      await refreshCareState();
      notifySuccess("Care case saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save care case.");
    }
  }

  async function handleCreateNote(event) {
    event.preventDefault();
    try {
      await churchApi.createCareNote(normalizeBlankObject(noteForm));
      setNoteForm(emptyNoteForm);
      await refreshCareState();
      notifySuccess("Care note saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save care note.");
    }
  }

  async function handleCreateCounseling(event) {
    event.preventDefault();
    try {
      await churchApi.createCounselingSession({
        ...normalizeBlankObject(counselingForm),
        attendees: counselingForm.attendees.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setCounselingForm(emptyCounselingForm);
      await refreshCareState();
      notifySuccess("Counseling session saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save counseling session.");
    }
  }

  async function handleCreateVisitation(event) {
    event.preventDefault();
    try {
      await churchApi.createVisitationRecord(normalizeBlankObject(visitationForm));
      setVisitationForm(emptyVisitationForm);
      await refreshCareState();
      notifySuccess("Visitation record saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save visitation record.");
    }
  }

  async function handlePromoteNote(noteId) {
    try {
      await churchApi.promoteCareNote(noteId, {
        category: "Pastoral Follow-up",
        title: "Promoted pastoral care case",
        status: "open",
      });
      await refreshCareState();
      notifySuccess("Note promoted to care case.");
    } catch (error) {
      notifyError(error.message || "Unable to promote note.");
    }
  }

  if (loading && !cases.length && !notes.length) {
    return <div className="page-grid"><section className="surface-card data-card">Loading pastoral care...</section></div>;
  }

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Care Cases</div>
          <div className="compact-stat-value">{cases.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Care Notes</div>
          <div className="compact-stat-value">{notes.length}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Restricted</div>
          <div className="compact-stat-value">{notes.filter((item) => item.confidentialityTier !== "Standard").length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Section</div>
          <div className="compact-stat-value section-value">{activeSection}</div>
        </article>
      </section>

      {activeSection === "cases" && (
        <>
          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Formal Care Case</h3></div>
            <form className="form-grid" onSubmit={handleCreateCase}>
              <MemberAndHouseholdFields members={members} families={families} form={caseForm} setForm={setCaseForm} />
              <label>
                Category
                <input value={caseForm.category} onChange={(event) => setCaseForm((current) => ({ ...current, category: event.target.value }))} />
              </label>
              <label>
                Title
                <input value={caseForm.title} onChange={(event) => setCaseForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Responsible Leader
                <select value={caseForm.responsibleLeaderId} onChange={(event) => setCaseForm((current) => ({ ...current, responsibleLeaderId: event.target.value }))}>
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>{user.displayName || user.username}</option>
                  ))}
                </select>
              </label>
              <ConfidentialityField form={caseForm} setForm={setCaseForm} />
              <label className="full-width">
                Summary
                <textarea rows={3} value={caseForm.summary} onChange={(event) => setCaseForm((current) => ({ ...current, summary: event.target.value }))} />
              </label>
              <div className="full-width">
                <button type="submit" className="primary-button">Save Care Case</button>
              </div>
            </form>
          </section>

          <DataTable
            title="Care Cases"
            columns={["Title", "Category", "Subject", "Tier", "Status"]}
            rows={cases.map((item) => [
              item.title || "-",
              item.category || "-",
              item.memberId ? `${item.memberId.firstName} ${item.memberId.lastName}` : item.householdId?.familyName || "-",
              item.confidentialityTier,
              item.status,
            ])}
          />
        </>
      )}

      {activeSection === "notes" && (
        <>
          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Quick Note</h3></div>
            <form className="form-grid" onSubmit={handleCreateNote}>
              <label>
                Care Case
                <select value={noteForm.careCaseId} onChange={(event) => setNoteForm((current) => ({ ...current, careCaseId: event.target.value }))}>
                  <option value="">Standalone note</option>
                  {cases.map((item) => (
                    <option key={item._id} value={item._id}>{item.title || item.category || item._id}</option>
                  ))}
                </select>
              </label>
              <MemberAndHouseholdFields members={members} families={families} form={noteForm} setForm={setNoteForm} />
              <label>
                Date / Time
                <input type="datetime-local" value={noteForm.dateTime} onChange={(event) => setNoteForm((current) => ({ ...current, dateTime: event.target.value }))} />
              </label>
              <label>
                Note Type
                <select value={noteForm.noteType} onChange={(event) => setNoteForm((current) => ({ ...current, noteType: event.target.value }))}>
                  <option value="">Select note type</option>
                  {options.noteTypes.map((item) => (
                    <option key={item._id} value={item._id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <ConfidentialityField form={noteForm} setForm={setNoteForm} />
              <label className="full-width">
                Content
                <textarea rows={4} value={noteForm.content} onChange={(event) => setNoteForm((current) => ({ ...current, content: event.target.value }))} />
              </label>
              <div className="full-width">
                <button type="submit" className="primary-button">Save Quick Note</button>
              </div>
            </form>
          </section>

          <section className="surface-card data-card">
            <div className="toolbar-row"><h3>Care Notes</h3></div>
            <div className="table-accent-bar" />
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Tier</th>
                    <th>Preview</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((item) => (
                    <tr key={item._id}>
                      <td>{formatDateTime(item.dateTime)}</td>
                      <td>{item.noteType?.label || "-"}</td>
                      <td>{item.memberId ? `${item.memberId.firstName} ${item.memberId.lastName}` : item.householdId?.familyName || "-"}</td>
                      <td>{item.confidentialityTier}</td>
                      <td>{String(item.content || "").slice(0, 80)}</td>
                      <td>
                        {!item.careCaseId ? (
                          <button type="button" className="ghost-button small" onClick={() => handlePromoteNote(item._id)}>
                            Promote
                          </button>
                        ) : (
                          <span className="detail-label">Attached</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeSection === "counseling" && (
        <section className="surface-card data-card">
          <div className="toolbar-row"><h3>Counseling Session</h3></div>
          <form className="form-grid" onSubmit={handleCreateCounseling}>
            <label>
              Care Case
              <select value={counselingForm.careCaseId} onChange={(event) => setCounselingForm((current) => ({ ...current, careCaseId: event.target.value }))}>
                <option value="">Optional</option>
                {cases.map((item) => (
                  <option key={item._id} value={item._id}>{item.title || item.category || item._id}</option>
                ))}
              </select>
            </label>
            <MemberAndHouseholdFields members={members} families={families} form={counselingForm} setForm={setCounselingForm} />
            <label>
              Session Number
              <input value={counselingForm.sessionNumber} onChange={(event) => setCounselingForm((current) => ({ ...current, sessionNumber: event.target.value }))} />
            </label>
            <label>
              Topic
              <input value={counselingForm.topic} onChange={(event) => setCounselingForm((current) => ({ ...current, topic: event.target.value }))} />
            </label>
            <label>
              Attendees
              <input value={counselingForm.attendees} onChange={(event) => setCounselingForm((current) => ({ ...current, attendees: event.target.value }))} placeholder="Comma separated names" />
            </label>
            <ConfidentialityField form={counselingForm} setForm={setCounselingForm} />
            <label className="full-width">
              Content
              <textarea rows={4} value={counselingForm.content} onChange={(event) => setCounselingForm((current) => ({ ...current, content: event.target.value }))} />
            </label>
            <label className="full-width">
              Follow-up Plan
              <textarea rows={3} value={counselingForm.followUpPlan} onChange={(event) => setCounselingForm((current) => ({ ...current, followUpPlan: event.target.value }))} />
            </label>
            <div className="full-width">
              <button type="submit" className="primary-button">Save Counseling Session</button>
            </div>
          </form>
        </section>
      )}

      {activeSection === "visitations" && (
        <section className="surface-card data-card">
          <div className="toolbar-row"><h3>Visitation Record</h3></div>
          <form className="form-grid" onSubmit={handleCreateVisitation}>
            <label>
              Care Case
              <select value={visitationForm.careCaseId} onChange={(event) => setVisitationForm((current) => ({ ...current, careCaseId: event.target.value }))}>
                <option value="">Optional</option>
                {cases.map((item) => (
                  <option key={item._id} value={item._id}>{item.title || item.category || item._id}</option>
                ))}
              </select>
            </label>
            <MemberAndHouseholdFields members={members} families={families} form={visitationForm} setForm={setVisitationForm} />
            <label>
              Location
              <select value={visitationForm.location} onChange={(event) => setVisitationForm((current) => ({ ...current, location: event.target.value }))}>
                <option value="home">Home</option>
                <option value="hospital">Hospital</option>
                <option value="other">Other</option>
              </select>
            </label>
            <ConfidentialityField form={visitationForm} setForm={setVisitationForm} />
            <label className="full-width">
              Purpose
              <textarea rows={3} value={visitationForm.purpose} onChange={(event) => setVisitationForm((current) => ({ ...current, purpose: event.target.value }))} />
            </label>
            <label className="full-width">
              Outcome
              <textarea rows={3} value={visitationForm.outcome} onChange={(event) => setVisitationForm((current) => ({ ...current, outcome: event.target.value }))} />
            </label>
            <label>
              Follow-up Needed
              <select value={visitationForm.followUpNeeded ? "yes" : "no"} onChange={(event) => setVisitationForm((current) => ({ ...current, followUpNeeded: event.target.value === "yes" }))}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label>
              Follow-up Date
              <input type="date" value={visitationForm.followUpDate} onChange={(event) => setVisitationForm((current) => ({ ...current, followUpDate: event.target.value }))} />
            </label>
            <div className="full-width">
              <button type="submit" className="primary-button">Save Visitation</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function MemberAndHouseholdFields({ members, families, form, setForm }) {
  return (
    <>
      <label>
        Member
        <select value={form.memberId || ""} onChange={(event) => setForm((current) => ({ ...current, memberId: event.target.value }))}>
          <option value="">None</option>
          {members.map((member) => (
            <option key={member._id} value={member._id}>{member.memberId} - {member.firstName} {member.lastName}</option>
          ))}
        </select>
      </label>
      <label>
        Household
        <select value={form.householdId || ""} onChange={(event) => setForm((current) => ({ ...current, householdId: event.target.value }))}>
          <option value="">None</option>
          {families.map((family) => (
            <option key={family._id} value={family._id}>{family.familyName}</option>
          ))}
        </select>
      </label>
    </>
  );
}

function ConfidentialityField({ form, setForm }) {
  return (
    <label>
      Confidentiality
      <select value={form.confidentialityTier} onChange={(event) => setForm((current) => ({ ...current, confidentialityTier: event.target.value }))}>
        <option value="Standard">Standard</option>
        <option value="Restricted">Restricted</option>
        <option value="Elders-Only">Elders-Only</option>
      </select>
    </label>
  );
}

function DataTable({ title, columns, rows }) {
  return (
    <section className="surface-card data-card">
      <div className="toolbar-row"><h3>{title}</h3></div>
      <div className="table-accent-bar" />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((cell, cellIndex) => <td key={`${title}-${index}-${cellIndex}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function normalizeBlankObject(payload) {
  return Object.entries(payload).reduce((accumulator, [key, value]) => {
    accumulator[key] = value === "" ? null : value;
    return accumulator;
  }, {});
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}
