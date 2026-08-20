import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { churchApi } from "../apis/churchApi";
import AiAssistGeneratorCard from "../components/ai/AiAssistGeneratorCard";
import ModalShell from "../components/common/ModalShell";
import { useAppContext } from "../context/AppContext";

export default function LeadershipDevelopmentPage() {
  const location = useLocation();
  const activeSection = location.pathname.split("/")[2] || "roles";
  const { members, lookupState, notifySuccess, notifyError, authUser } = useAppContext();
  const roleTypeOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "leadership_role_type"),
    [lookupState.values]
  );
  const emergingStatusOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "emerging_leader_status"),
    [lookupState.values]
  );
  const mentorStatusOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "mentor_assignment_status"),
    [lookupState.values]
  );
  const readinessOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "succession_readiness_category"),
    [lookupState.values]
  );
  const [state, setState] = useState({
    loading: true,
    error: "",
    roles: [],
    skills: [],
    flags: [],
    mentors: [],
    trainings: [],
    requirements: [],
    readiness: [],
    report: null,
  });
  const [activeModal, setActiveModal] = useState("");
  const [roleForm, setRoleForm] = useState({ memberId: "", roleName: "", startDate: new Date().toISOString().slice(0, 10) });
  const [skillForm, setSkillForm] = useState({ memberId: "", skillOrTalent: "", proficiencyNote: "" });
  const [flagForm, setFlagForm] = useState({ memberId: "", notes: "", status: "" });
  const [mentorForm, setMentorForm] = useState({
    menteeId: "",
    mentorId: "",
    startDate: new Date().toISOString().slice(0, 10),
    focusArea: "",
    status: "",
  });
  const [trainingForm, setTrainingForm] = useState({
    memberId: "",
    trainingName: "",
    date: new Date().toISOString().slice(0, 10),
    provider: "",
    completionStatus: "Completed",
  });
  const [requirementForm, setRequirementForm] = useState({
    roleName: "",
    requirements: "",
    keyRole: true,
  });
  const [successionForm, setSuccessionForm] = useState({ memberId: "", targetRoleName: "", readinessCategory: "", notes: "" });
  const permissions = authUser?.permissions || [];
  const canManageLeadership = permissions.includes("manage_leadership");
  const canViewSuccession = permissions.includes("view_succession_sensitive");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [roles, skills, flags, mentors, trainings, requirements, readiness, report] = await Promise.all([
        churchApi.getLeadershipRoles(),
        churchApi.getLeadershipSkills(),
        churchApi.getEmergingLeaderFlags(),
        churchApi.getMentorAssignments(),
        churchApi.getLeadershipTrainingRecords(),
        churchApi.getSuccessionRequirements(),
        churchApi.getSuccessionReadiness(),
        churchApi.getLeadershipPipelineReport(),
      ]);
      setState({ loading: false, error: "", roles, skills, flags, mentors, trainings, requirements, readiness, report });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || "Unable to load leadership data." }));
    }
  };

  const runAction = async (work, successMessage = "") => {
    try {
      const result = await work();
      if (successMessage) {
        notifySuccess(successMessage);
      }
      return result;
    } catch (error) {
      notifyError(error.message || "Unable to complete leadership action.");
      throw error;
    }
  };

  const deleteRecord = async (label, action, collectionKey, id) => {
    const confirmed = window.confirm(`Delete ${label}?`);
    if (!confirmed) {
      return;
    }
    await runAction(action, `${label} deleted.`);
    setState((current) => ({
      ...current,
      [collectionKey]: current[collectionKey].filter((item) => item._id !== id),
    }));
  };

  if (state.loading) {
    return <div className="empty-note">Loading leadership module...</div>;
  }

  return (
    <div className="page-grid">
      {state.error ? <div className="form-error">{state.error}</div> : null}
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Leadership Roles" value={state.roles.length} />
        <StatCard color="blue" label="Skills" value={state.skills.length} />
        <StatCard color="orange" label="Succession" value={state.readiness.length} />
        <StatCard color="pink" label="Mentors" value={state.mentors.length} />
      </section>

      {activeSection === "succession" && canViewSuccession ? (
        <AiAssistGeneratorCard
          title="AI Leadership Gap Summary"
          description="Generate administrative summaries for key roles that do not yet have ready or developing candidates recorded."
          moduleKey="leadership"
          buttonLabel="Generate Leadership Summary"
        />
      ) : null}

      {activeSection === "roles" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Leadership Service</h3>
                <p>Track current and historical leadership roles through modal-driven forms.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => setActiveModal("role")}>
                Add Role
              </button>
            </div>
          </section>
          <TableCard
            title="Leadership Role Register"
            columns={["Member", "Role", "Start Date", "Status", "Actions"]}
            rows={state.roles.map((item) => [
              `${item.memberId?.memberId || ""} - ${item.memberId?.firstName || ""} ${item.memberId?.lastName || ""}`.trim(),
              item.roleName?.label || "-",
              formatDate(item.startDate),
              item.status || "-",
              <DeleteButton
                key={`delete-role-${item._id}`}
                onClick={() => deleteRecord(item.roleName?.label || "role", () => churchApi.deleteLeadershipRole(item._id), "roles", item._id)}
              />,
            ])}
            emptyMessage="No leadership roles recorded yet."
          />
        </>
      ) : null}

      {activeSection === "talent" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Talent Development</h3>
                <p>Capture skills, emerging leaders, mentors, and training with the same modal-only workflow used elsewhere.</p>
              </div>
              <div className="toolbar-row">
                <button type="button" className="ghost-button" onClick={() => setActiveModal("skill")}>
                  Add Skill
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveModal("flag")}>
                  Flag Leader
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveModal("mentor")}>
                  Add Mentor
                </button>
                <button type="button" className="primary-button" onClick={() => setActiveModal("training")}>
                  Add Training
                </button>
              </div>
            </div>
          </section>
          <TableCard
            title="Skill Register"
            columns={["Member", "Skill", "Note", "Actions"]}
            rows={state.skills.map((item) => [
              `${item.memberId?.memberId || ""} - ${item.memberId?.firstName || ""} ${item.memberId?.lastName || ""}`.trim(),
              item.skillOrTalent,
              item.proficiencyNote || "-",
              <DeleteButton
                key={`delete-skill-${item._id}`}
                onClick={() => deleteRecord(item.skillOrTalent || "skill", () => churchApi.deleteLeadershipSkill(item._id), "skills", item._id)}
              />,
            ])}
            emptyMessage="No skill records yet."
          />
          <TableCard
            title="Emerging Leader Flags"
            columns={["Member", "Status", "Flagged Date", "Notes", "Actions"]}
            rows={state.flags.map((item) => [
              `${item.memberId?.memberId || ""} - ${item.memberId?.firstName || ""} ${item.memberId?.lastName || ""}`.trim(),
              item.status?.label || "-",
              formatDate(item.flaggedDate),
              item.notes || "-",
              <DeleteButton
                key={`delete-flag-${item._id}`}
                onClick={() => deleteRecord("emerging leader flag", () => churchApi.deleteEmergingLeaderFlag(item._id), "flags", item._id)}
              />,
            ])}
            emptyMessage="No emerging leader flags yet."
          />
          <TableCard
            title="Mentor Assignments"
            columns={["Mentee", "Mentor", "Status", "Focus Area", "Actions"]}
            rows={state.mentors.map((item) => [
              `${item.menteeId?.memberId || ""} - ${item.menteeId?.firstName || ""} ${item.menteeId?.lastName || ""}`.trim(),
              `${item.mentorId?.memberId || ""} - ${item.mentorId?.firstName || ""} ${item.mentorId?.lastName || ""}`.trim(),
              item.status?.label || "-",
              item.focusArea || "-",
              <DeleteButton
                key={`delete-mentor-${item._id}`}
                onClick={() => deleteRecord("mentor assignment", () => churchApi.deleteMentorAssignment(item._id), "mentors", item._id)}
              />,
            ])}
            emptyMessage="No mentor assignments yet."
          />
          <TableCard
            title="Leadership Training Records"
            columns={["Member", "Training", "Date", "Provider", "Status", "Actions"]}
            rows={state.trainings.map((item) => [
              `${item.memberId?.memberId || ""} - ${item.memberId?.firstName || ""} ${item.memberId?.lastName || ""}`.trim(),
              item.trainingName || "-",
              formatDate(item.date),
              item.provider || "-",
              item.completionStatus || "-",
              <DeleteButton
                key={`delete-training-${item._id}`}
                onClick={() => deleteRecord(item.trainingName || "training record", () => churchApi.deleteLeadershipTrainingRecord(item._id), "trainings", item._id)}
              />,
            ])}
            emptyMessage="No training records yet."
          />
        </>
      ) : null}

      {activeSection === "succession" ? (
        canViewSuccession ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Succession Planning</h3>
                <p>Keep readiness and requirement records restricted and off the page until needed.</p>
              </div>
              <div className="toolbar-row">
                <button type="button" className="ghost-button" onClick={() => setActiveModal("requirement")} disabled={!canManageLeadership}>
                  Add Requirement
                </button>
                <button type="button" className="primary-button" onClick={() => setActiveModal("readiness")} disabled={!canManageLeadership}>
                  Add Readiness
                </button>
              </div>
            </div>
          </section>
          <TableCard
            title="Succession Requirements"
            columns={["Role", "Key Role", "Requirements", "Actions"]}
            rows={state.requirements.map((item) => [
              item.roleName?.label || "-",
              item.keyRole ? "Yes" : "No",
              item.requirements || "-",
              <DeleteButton
                key={`delete-requirement-${item._id}`}
                onClick={() =>
                  deleteRecord(item.roleName?.label || "succession requirement", () => churchApi.deleteSuccessionRequirement(item._id), "requirements", item._id)
                }
              />,
            ])}
            emptyMessage="No succession requirements yet."
          />
          <TableCard
            title="Succession Readiness Register"
            columns={["Member", "Target Role", "Readiness", "Assessed Date", "Actions"]}
            rows={state.readiness.map((item) => [
              `${item.memberId?.memberId || ""} - ${item.memberId?.firstName || ""} ${item.memberId?.lastName || ""}`.trim(),
              item.targetRoleName?.label || "-",
              item.readinessCategory?.label || "-",
              formatDate(item.assessedDate),
              <DeleteButton
                key={`delete-readiness-${item._id}`}
                onClick={() =>
                  deleteRecord(item.targetRoleName?.label || "succession readiness", () => churchApi.deleteSuccessionReadiness(item._id), "readiness", item._id)
                }
              />,
            ])}
            emptyMessage="No succession readiness records yet."
          />
        </>
        ) : (
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Succession Planning</h3>
                <p>These records are restricted to elders and authorized administrators.</p>
              </div>
            </div>
            <div className="form-error">You do not have permission to view succession records.</div>
          </section>
        )
      ) : null}

      {activeSection === "reports" ? (
        <>
          <section className="compact-stats-grid">
            <StatCard color="purple" label="Current Roles" value={state.report?.totals?.currentRoles || 0} />
            <StatCard color="blue" label="Readiness Records" value={state.report?.totals?.readinessRecords || 0} />
            <StatCard color="orange" label="Role Categories" value={state.report?.byRole?.length || 0} />
            <StatCard color="pink" label="Readiness Categories" value={state.report?.byReadiness?.length || 0} />
          </section>
          <TableCard
            title="Leadership Pipeline By Role"
            columns={["Role", "Count"]}
            rows={(state.report?.byRole || []).map((item) => [item.name, item.value])}
            emptyMessage="No role report data yet."
          />
          <TableCard
            title="Leadership Pipeline By Readiness"
            columns={["Readiness", "Count"]}
            rows={(state.report?.byReadiness || []).map((item) => [item.name, item.value])}
            emptyMessage="No readiness report data yet."
          />
        </>
      ) : null}

      {activeModal === "role" ? (
        <ModalShell title="Leadership Role" subtitle="Record current or historical leadership service." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <MemberSelect label="Member" value={roleForm.memberId} onChange={(value) => setRoleForm((current) => ({ ...current, memberId: value }))} members={members} />
              <label>
                Role
                <select value={roleForm.roleName} onChange={(event) => setRoleForm((current) => ({ ...current, roleName: event.target.value }))}>
                  <option value="">Select role</option>
                  {roleTypeOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start Date
                <input type="date" value={roleForm.startDate} onChange={(event) => setRoleForm((current) => ({ ...current, startDate: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createLeadershipRole({
                        memberId: roleForm.memberId,
                        roleName: roleForm.roleName,
                        startDate: roleForm.startDate,
                        status: "Current",
                      }),
                    "Leadership role saved."
                  );
                  setState((current) => ({ ...current, roles: [created, ...current.roles] }));
                  setActiveModal("");
                }}
              >
                Save Role
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "skill" ? (
        <ModalShell title="Skill And Talent" subtitle="Record ministry strengths without turning them into scores." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <MemberSelect label="Member" value={skillForm.memberId} onChange={(value) => setSkillForm((current) => ({ ...current, memberId: value }))} members={members} />
              <label>
                Skill Or Talent
                <input value={skillForm.skillOrTalent} onChange={(event) => setSkillForm((current) => ({ ...current, skillOrTalent: event.target.value }))} />
              </label>
              <label className="full-width">
                Proficiency Note
                <textarea rows="3" value={skillForm.proficiencyNote} onChange={(event) => setSkillForm((current) => ({ ...current, proficiencyNote: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createLeadershipSkill(skillForm), "Leadership skill saved.");
                  setState((current) => ({ ...current, skills: [created, ...current.skills] }));
                  setActiveModal("");
                }}
              >
                Save Skill
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "flag" ? (
        <ModalShell title="Emerging Leader Flag" subtitle="Track emerging leaders as administrative records, not automatic recommendations." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <MemberSelect label="Member" value={flagForm.memberId} onChange={(value) => setFlagForm((current) => ({ ...current, memberId: value }))} members={members} />
              <label>
                Status
                <select value={flagForm.status} onChange={(event) => setFlagForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">Select status</option>
                  {emergingStatusOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Notes
                <textarea rows="3" value={flagForm.notes} onChange={(event) => setFlagForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createEmergingLeaderFlag({
                        memberId: flagForm.memberId,
                        flaggedDate: new Date().toISOString().slice(0, 10),
                        notes: flagForm.notes,
                        status: flagForm.status || emergingStatusOptions[0]?._id || null,
                      }),
                    "Emerging leader flag saved."
                  );
                  setState((current) => ({ ...current, flags: [created, ...current.flags] }));
                  setActiveModal("");
                }}
              >
                Save Flag
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "mentor" ? (
        <ModalShell title="Mentor Assignment" subtitle="Capture mentoring relationships without leaving the page cluttered." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <MemberSelect label="Mentee" value={mentorForm.menteeId} onChange={(value) => setMentorForm((current) => ({ ...current, menteeId: value }))} members={members} />
              <MemberSelect label="Mentor" value={mentorForm.mentorId} onChange={(value) => setMentorForm((current) => ({ ...current, mentorId: value }))} members={members} />
              <label>
                Start Date
                <input type="date" value={mentorForm.startDate} onChange={(event) => setMentorForm((current) => ({ ...current, startDate: event.target.value }))} />
              </label>
              <label>
                Status
                <select value={mentorForm.status} onChange={(event) => setMentorForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">Select status</option>
                  {mentorStatusOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Focus Area
                <textarea rows="3" value={mentorForm.focusArea} onChange={(event) => setMentorForm((current) => ({ ...current, focusArea: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createMentorAssignment(mentorForm), "Mentor assignment saved.");
                  setState((current) => ({ ...current, mentors: [created, ...current.mentors] }));
                  setActiveModal("");
                }}
              >
                Save Mentor Assignment
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "training" ? (
        <ModalShell title="Training Record" subtitle="Keep leadership training in a modal flow like the rest of the app." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <MemberSelect label="Member" value={trainingForm.memberId} onChange={(value) => setTrainingForm((current) => ({ ...current, memberId: value }))} members={members} />
              <label>
                Training Name
                <input value={trainingForm.trainingName} onChange={(event) => setTrainingForm((current) => ({ ...current, trainingName: event.target.value }))} />
              </label>
              <label>
                Provider
                <input value={trainingForm.provider} onChange={(event) => setTrainingForm((current) => ({ ...current, provider: event.target.value }))} />
              </label>
              <label>
                Date
                <input type="date" value={trainingForm.date} onChange={(event) => setTrainingForm((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label>
                Completion Status
                <input value={trainingForm.completionStatus} onChange={(event) => setTrainingForm((current) => ({ ...current, completionStatus: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createLeadershipTrainingRecord(trainingForm), "Training record saved.");
                  setState((current) => ({ ...current, trainings: [created, ...current.trainings] }));
                  setActiveModal("");
                }}
              >
                Save Training Record
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "requirement" ? (
        <ModalShell title="Succession Requirement" subtitle="Define the role requirements in a restricted modal form." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Role
                <select value={requirementForm.roleName} onChange={(event) => setRequirementForm((current) => ({ ...current, roleName: event.target.value }))}>
                  <option value="">Select role</option>
                  {roleTypeOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Key Role
                <select value={String(requirementForm.keyRole)} onChange={(event) => setRequirementForm((current) => ({ ...current, keyRole: event.target.value === "true" }))}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className="full-width">
                Requirements
                <textarea rows="3" value={requirementForm.requirements} onChange={(event) => setRequirementForm((current) => ({ ...current, requirements: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createSuccessionRequirement(requirementForm), "Succession requirement saved.");
                  setState((current) => ({ ...current, requirements: [created, ...current.requirements] }));
                  setActiveModal("");
                }}
              >
                Save Requirement
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "readiness" ? (
        <ModalShell title="Succession Readiness" subtitle="Record readiness categories in a controlled modal flow." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <MemberSelect label="Member" value={successionForm.memberId} onChange={(value) => setSuccessionForm((current) => ({ ...current, memberId: value }))} members={members} />
              <label>
                Target Role
                <select value={successionForm.targetRoleName} onChange={(event) => setSuccessionForm((current) => ({ ...current, targetRoleName: event.target.value }))}>
                  <option value="">Select role</option>
                  {roleTypeOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Readiness Category
                <select value={successionForm.readinessCategory} onChange={(event) => setSuccessionForm((current) => ({ ...current, readinessCategory: event.target.value }))}>
                  <option value="">Select category</option>
                  {readinessOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Notes
                <textarea rows="3" value={successionForm.notes} onChange={(event) => setSuccessionForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createSuccessionReadiness({
                        memberId: successionForm.memberId,
                        targetRoleName: successionForm.targetRoleName,
                        readinessCategory: successionForm.readinessCategory,
                        assessedDate: new Date().toISOString().slice(0, 10),
                        notes: successionForm.notes,
                      }),
                    "Succession readiness saved."
                  );
                  setState((current) => ({ ...current, readiness: [created, ...current.readiness] }));
                  setActiveModal("");
                }}
              >
                Save Readiness
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function MemberSelect({ label, value, onChange, members }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select member</option>
        {members.map((member) => (
          <option key={member._id} value={member._id}>
            {member.memberId} - {member.firstName} {member.lastName}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeleteButton({ onClick }) {
  return (
    <button type="button" className="ghost-button small delete-button" onClick={onClick}>
      Delete
    </button>
  );
}

function StatCard({ color, label, value }) {
  return (
    <article className={`compact-stat-card ${color}`}>
      <div className="compact-stat-label">{label}</div>
      <div className="compact-stat-value">{value}</div>
    </article>
  );
}

function TableCard({ title, columns, rows, emptyMessage }) {
  return (
    <section className="surface-card data-card">
      <div className="section-headline compact">
        <h3>{title}</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {row.map((value, valueIndex) => (
                    <td key={`${title}-${index}-${valueIndex}`}>{value}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="empty-table">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
}
