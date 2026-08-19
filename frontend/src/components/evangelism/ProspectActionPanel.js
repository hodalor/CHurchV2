import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";

const EVANGELISM_PERMISSIONS = {
  manage: "manage_evangelism",
  convert: "convert_prospect",
};

export default function ProspectActionPanel({ prospect }) {
  const {
    users,
    evangelismApiState,
    evangelismStageOptions,
    bibleStudyStatusOptions,
    bibleStudies,
    assignProspect,
    moveProspectStage,
    logProspectContact,
    convertProspectToMember,
    openRecordModal,
    addBibleStudyLesson,
  } = useAppContext();
  const { authUser } = useAuth();
  const [assignment, setAssignment] = useState(prospect?.assignedEvangelistId?._id || "");
  const [nextStage, setNextStage] = useState(prospect?.currentStage?._id || "");
  const [contactForm, setContactForm] = useState({
    date: getToday(),
    notes: "",
    nextFollowUpDate: "",
  });
  const [memberConversion, setMemberConversion] = useState({
    city: "",
    address: "",
    membershipStatus: "Active",
    baptismStatus: "Not Baptized",
    membershipDate: getToday(),
    baptismDate: "",
    notes: "Created from evangelism prospect conversion",
  });
  const [lessonForm, setLessonForm] = useState({
    lessonName: "",
    completedAt: getToday(),
    notes: "",
    status: "",
  });

  const permissionSet = useMemo(() => new Set(authUser?.permissions || []), [authUser?.permissions]);
  const canManage = permissionSet.has(EVANGELISM_PERMISSIONS.manage);
  const canConvert = permissionSet.has(EVANGELISM_PERMISSIONS.convert);
  const actionDisabled = evangelismApiState.loading || !prospect?._id;
  const studyForProspect = bibleStudies.find((study) => study.prospect?._id === prospect?._id);

  useEffect(() => {
    setAssignment(prospect?.assignedEvangelistId?._id || "");
    setNextStage(prospect?.currentStage?._id || "");
  }, [prospect?.assignedEvangelistId?._id, prospect?.currentStage?._id]);

  if (!prospect?._id) {
    return null;
  }

  const handleLogContact = async () => {
    await logProspectContact(prospect.prospectId, contactForm);
    setContactForm({
      date: getToday(),
      notes: "",
      nextFollowUpDate: "",
    });
  };

  const handleConvert = async () => {
    await convertProspectToMember(prospect.prospectId, memberConversion);
  };

  const handleStartBibleStudy = () => {
    openRecordModal(
      "bibleStudy",
      {
        prospect,
        teacherId: prospect.assignedEvangelistId || users[0] || null,
        startDate: getToday(),
        status: bibleStudyStatusOptions.find((item) => item.key === "in_progress") || "",
        lessonsCompleted: [],
      },
      "edit"
    );
  };

  const handleSaveLesson = async () => {
    if (!studyForProspect?._id) {
      return;
    }

    await addBibleStudyLesson(studyForProspect._id, {
      lessonName: lessonForm.lessonName,
      completedAt: lessonForm.completedAt,
      notes: lessonForm.notes,
      status: lessonForm.status,
    });

    setLessonForm({
      lessonName: "",
      completedAt: getToday(),
      notes: "",
      status: "",
    });
  };

  return (
    <div className="visitor-action-stack">
      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Journey Snapshot</h3>
        </div>
        <div className="info-grid">
          <article className="info-tile">
            <span>Current Stage</span>
            <strong>{prospect.currentStage?.label || "Not set"}</strong>
          </article>
          <article className="info-tile">
            <span>Assigned Evangelist</span>
            <strong>{prospect.assignedEvangelistId?.displayName || "Unassigned"}</strong>
          </article>
          <article className="info-tile">
            <span>Stage Changes</span>
            <strong>{prospect.stageHistory?.length || 0}</strong>
          </article>
          <article className="info-tile">
            <span>Bible Study</span>
            <strong>{studyForProspect ? "Started" : "Not started"}</strong>
          </article>
        </div>
      </section>

      {canManage ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Assignment And Stage</h3>
          </div>
          <div className="form-grid">
            <label>
              Assigned Evangelist
              <select value={assignment} onChange={(event) => setAssignment(event.target.value)}>
                <option value="">Select evangelist</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Move To Stage
              <select value={nextStage} onChange={(event) => setNextStage(event.target.value)}>
                <option value="">Select stage</option>
                {evangelismStageOptions.map((stage) => (
                  <option key={stage._id} value={stage._id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled || !assignment}
              onClick={() => assignProspect(prospect.prospectId, assignment)}
            >
              Assign Evangelist
            </button>
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled || !nextStage}
              onClick={() => moveProspectStage(prospect.prospectId, nextStage)}
            >
              Update Stage
            </button>
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Log Contact</h3>
          </div>
          <div className="form-grid">
            <label>
              Contact Date
              <input
                type="date"
                value={contactForm.date}
                onChange={(event) => setContactForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label>
              Next Follow-Up
              <input
                type="date"
                value={contactForm.nextFollowUpDate}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Notes
              <textarea
                rows="3"
                value={contactForm.notes}
                onChange={(event) => setContactForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled}
              onClick={handleLogContact}
            >
              Save Contact
            </button>
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Bible Study</h3>
          </div>
          {studyForProspect ? (
            <>
              <div className="info-grid">
                <article className="info-tile">
                  <span>Teacher</span>
                  <strong>{studyForProspect.teacherId?.displayName || "-"}</strong>
                </article>
                <article className="info-tile">
                  <span>Status</span>
                  <strong>{studyForProspect.status?.label || "In Progress"}</strong>
                </article>
              </div>
              <div className="form-grid">
                <label>
                  Lesson Name
                  <input
                    value={lessonForm.lessonName}
                    onChange={(event) =>
                      setLessonForm((current) => ({ ...current, lessonName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Completed At
                  <input
                    type="date"
                    value={lessonForm.completedAt}
                    onChange={(event) =>
                      setLessonForm((current) => ({ ...current, completedAt: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Study Status
                  <select
                    value={lessonForm.status}
                    onChange={(event) =>
                      setLessonForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="">Keep current status</option>
                    {bibleStudyStatusOptions.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full-width">
                  Lesson Notes
                  <textarea
                    rows="3"
                    value={lessonForm.notes}
                    onChange={(event) =>
                      setLessonForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-button small"
                  disabled={actionDisabled || !lessonForm.lessonName}
                  onClick={handleSaveLesson}
                >
                  Add Lesson Progress
                </button>
              </div>
            </>
          ) : (
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button small"
                disabled={actionDisabled}
                onClick={handleStartBibleStudy}
              >
                Start Bible Study
              </button>
            </div>
          )}
        </section>
      ) : null}

      {canConvert ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Convert To Member</h3>
          </div>
          <div className="form-grid">
            <label>
              City
              <input
                value={memberConversion.city}
                onChange={(event) =>
                  setMemberConversion((current) => ({ ...current, city: event.target.value }))
                }
              />
            </label>
            <label>
              Address
              <input
                value={memberConversion.address}
                onChange={(event) =>
                  setMemberConversion((current) => ({ ...current, address: event.target.value }))
                }
              />
            </label>
            <label>
              Membership Status
              <select
                value={memberConversion.membershipStatus}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    membershipStatus: event.target.value,
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Dormant">Dormant</option>
                <option value="Inactive">Inactive</option>
                <option value="Passed On">Passed On</option>
              </select>
            </label>
            <label>
              Baptism Status
              <select
                value={memberConversion.baptismStatus}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    baptismStatus: event.target.value,
                  }))
                }
              >
                <option value="Not Baptized">Not Baptized</option>
                <option value="Baptized">Baptized</option>
              </select>
            </label>
            <label>
              Membership Date
              <input
                type="date"
                value={memberConversion.membershipDate}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    membershipDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Baptism Date
              <input
                type="date"
                value={memberConversion.baptismDate}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    baptismDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="full-width">
              Notes
              <textarea
                rows="3"
                value={memberConversion.notes}
                onChange={(event) =>
                  setMemberConversion((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="primary-button"
              disabled={actionDisabled}
              onClick={handleConvert}
            >
              Convert Prospect
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
