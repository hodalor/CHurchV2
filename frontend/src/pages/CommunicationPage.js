import { useEffect, useMemo, useState } from "react";
import { churchApi } from "../apis/churchApi";
import AiAssistGeneratorCard from "../components/ai/AiAssistGeneratorCard";
import ModalShell from "../components/common/ModalShell";
import { useAppContext } from "../context/AppContext";

function getCachedCommunicationState() {
  const groups = churchApi.peekCached("/communication/groups");
  const preferences = churchApi.peekCached("/communication/preferences");
  const logs = churchApi.peekCached("/communication/logs");

  if ([groups, preferences, logs].some((item) => item === null)) {
    return null;
  }

  return {
    loading: false,
    error: "",
    groups: Array.isArray(groups) ? groups : [],
    preferences: Array.isArray(preferences) ? preferences : [],
    logs: Array.isArray(logs) ? logs : [],
    preview: null,
    exportSummary: null,
  };
}

export default function CommunicationPage({ section = "groups" }) {
  const activeSection = section;
  const { lookupState, members, visitors, notifySuccess, notifyError } = useAppContext();
  const cachedCommunicationState = useMemo(() => getCachedCommunicationState(), []);
  const channelOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "communication_channel"),
    [lookupState.values]
  );
  const [state, setState] = useState(cachedCommunicationState || {
    loading: true,
    error: "",
    groups: [],
    preferences: [],
    logs: [],
    preview: null,
    exportSummary: null,
  });
  const [activeModal, setActiveModal] = useState("");
  const [actionError, setActionError] = useState("");
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    membershipStatus: "",
    residentialArea: "",
  });
  const [preferenceForm, setPreferenceForm] = useState({
    memberId: "",
    visitorId: "",
    channel: "",
    optedIn: true,
  });
  const [composer, setComposer] = useState({
    groupId: "",
    channelId: "",
    content: "",
  });

  useEffect(() => {
    if (!cachedCommunicationState) {
      loadCommunicationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedCommunicationState]);

  const loadCommunicationData = async () => {
    try {
      const [groups, preferences, logs] = await Promise.all([
        churchApi.getCommunicationGroups(),
        churchApi.getCommunicationPreferences(),
        churchApi.getCommunicationLogs(),
      ]);
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        groups,
        preferences,
        logs,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load communication data.",
      }));
    }
  };

  const runAction = async (work, successMessage = "") => {
    try {
      setActionError("");
      const result = await work();
      if (successMessage) {
        notifySuccess(successMessage);
      }
      return result;
    } catch (error) {
      const message = error.message || "Unable to complete communication action.";
      setActionError(message);
      notifyError(message);
      return null;
    }
  };

  const openModal = (name) => {
    setActionError("");
    setActiveModal(name);
  };

  const closeModal = () => {
    setActionError("");
    setActiveModal("");
  };

  const buildFilterCriteria = () => ({
    membershipStatus: groupForm.membershipStatus,
    residentialArea: groupForm.residentialArea,
  });

  if (state.loading) {
    return <div className="empty-note">Loading communication module...</div>;
  }

  return (
    <div className="page-grid">
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <section className="compact-stats-grid">
        <StatCard color="purple" label="Groups" value={state.groups.length} />
        <StatCard color="blue" label="Preferences" value={state.preferences.length} />
        <StatCard color="orange" label="Logs" value={state.logs.length} />
        <StatCard color="pink" label="Contacts" value={members.length + visitors.length} />
      </section>

      {activeSection === "groups" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Audience And Dispatch</h3>
                <p>Build dynamic groups, preview recipients, and queue communication from modal forms.</p>
              </div>
              <div className="toolbar-row">
                <button type="button" className="ghost-button" onClick={() => openModal("group")}>
                  Add Group
                </button>
                <button type="button" className="primary-button" onClick={() => openModal("dispatch")}>
                  New Dispatch
                </button>
              </div>
            </div>
            {state.preview ? (
              <div className="info-grid">
                <article className="info-tile">
                  <span>Members</span>
                  <strong>{state.preview.totals?.members || 0}</strong>
                </article>
                <article className="info-tile">
                  <span>Visitors</span>
                  <strong>{state.preview.totals?.visitors || 0}</strong>
                </article>
                <article className="info-tile wide">
                  <span>Total Reach</span>
                  <strong>{state.preview.totals?.total || 0}</strong>
                </article>
              </div>
            ) : (
              <div className="empty-note">Use the group or dispatch modal to preview the audience before sending.</div>
            )}
            {state.exportSummary ? (
              <div className="info-grid">
                <article className="info-tile">
                  <span>Exported Members</span>
                  <strong>{state.exportSummary.members}</strong>
                </article>
                <article className="info-tile">
                  <span>Exported Visitors</span>
                  <strong>{state.exportSummary.visitors}</strong>
                </article>
                <article className="info-tile wide">
                  <span>Total Export Rows</span>
                  <strong>{state.exportSummary.members + state.exportSummary.visitors}</strong>
                </article>
              </div>
            ) : null}
          </section>

          <div className="content-layout">
            <AiAssistGeneratorCard
              title="AI Message Draft"
              description="Generate a communication draft from a short instruction, then review it in AI Assist before using it."
              moduleKey="communication-draft"
              buttonLabel="Generate Draft"
              initialValues={{ groupId: "", channelId: "", promptText: "" }}
              fields={[
                {
                  name: "groupId",
                  label: "Communication Group",
                  type: "select",
                  placeholder: "Optional group",
                  options: state.groups.map((group) => ({ value: group._id, label: group.name })),
                },
                {
                  name: "channelId",
                  label: "Channel",
                  type: "select",
                  placeholder: "Optional channel",
                  options: channelOptions.map((option) => ({ value: option._id, label: option.label })),
                },
                {
                  name: "promptText",
                  label: "Prompt",
                  type: "textarea",
                  wide: true,
                  placeholder: "Reminder for Sunday's youth event",
                },
              ]}
            />

            <AiAssistGeneratorCard
              title="AI Audience Suggestion"
              description="Translate a plain-language audience request into a reviewable structured filter proposal."
              moduleKey="communication-audience"
              buttonLabel="Suggest Audience Filter"
              initialValues={{ requestText: "" }}
              fields={[
                {
                  name: "requestText",
                  label: "Audience Request",
                  type: "textarea",
                  wide: true,
                  placeholder: "everyone in youth ministry who hasn't been contacted this month",
                },
              ]}
            />
          </div>

          <ActionTableCard
            title="Communication Groups"
            columns={["Name", "Description", "Frozen", "Actions"]}
            rows={state.groups.map((group) => [
              group.name,
              group.description || "-",
              group.frozen ? "Yes" : "No",
              <div className="modal-actions" key={`actions-${group._id}`}>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={async () => {
                    const frozen = await runAction(
                      () => churchApi.freezeCommunicationGroup(group._id),
                      `${group.name} frozen successfully.`
                    );
                    setState((current) => ({
                      ...current,
                      groups: current.groups.map((item) => (item._id === frozen._id ? frozen : item)),
                    }));
                  }}
                >
                  Freeze
                </button>
                <button
                  type="button"
                  className="ghost-button small delete-button"
                  onClick={async () => {
                    const confirmed = window.confirm(`Delete ${group.name}?`);
                    if (!confirmed) {
                      return;
                    }
                    await runAction(() => churchApi.deleteCommunicationGroup(group._id), "Communication group deleted.");
                    setState((current) => ({
                      ...current,
                      groups: current.groups.filter((item) => item._id !== group._id),
                    }));
                  }}
                >
                  Delete
                </button>
              </div>,
            ])}
            emptyMessage="No communication groups saved yet."
          />
        </>
      ) : null}

      {activeSection === "preferences" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Communication Preferences</h3>
                <p>Respect opt-in settings before any send leaves the system.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => openModal("preference")}>
                Add Preference
              </button>
            </div>
          </section>
          <ActionTableCard
            title="Saved Preferences"
            columns={["Contact", "Channel", "Opt-In"]}
            rows={state.preferences.map((item) => [
              item.memberId
                ? `${item.memberId.memberId} - ${item.memberId.firstName} ${item.memberId.lastName}`
                : item.visitorId
                  ? `${item.visitorId.visitorId} - ${item.visitorId.firstName} ${item.visitorId.surname}`
                  : "-",
              item.channel?.label || "-",
              item.optedIn ? "Yes" : "No",
            ])}
            emptyMessage="No communication preferences recorded yet."
          />
        </>
      ) : null}

      {activeSection === "logs" ? (
        <ActionTableCard
          title="Communication Logs"
          columns={["Recipient", "Channel", "Status", "Sent By", "Sent At"]}
          rows={state.logs.map((log) => [
            log.memberId
              ? `${log.memberId.memberId} - ${log.memberId.firstName} ${log.memberId.lastName}`
              : log.visitorId
                ? `${log.visitorId.visitorId} - ${log.visitorId.firstName} ${log.visitorId.surname}`
                : log.groupId?.name || "-",
            log.channel?.label || "-",
            log.status?.label || "-",
            log.sentBy?.displayName || "-",
            formatDateTime(log.sentAt),
          ])}
          emptyMessage="No communication logs yet."
        />
      ) : null}

      {activeModal === "group" ? (
        <ModalShell
          title="Communication Group"
          subtitle="Create a saved audience filter without exposing the form directly on the page."
          onClose={closeModal}
        >
          <div className="modal-form">
            {actionError ? <div className="form-error">{actionError}</div> : null}
            <div className="form-grid">
              <label>
                Group Name
                <input value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Membership Status
                <input
                  value={groupForm.membershipStatus}
                  onChange={(event) => setGroupForm((current) => ({ ...current, membershipStatus: event.target.value }))}
                />
              </label>
              <label>
                Residential Area
                <input
                  value={groupForm.residentialArea}
                  onChange={(event) => setGroupForm((current) => ({ ...current, residentialArea: event.target.value }))}
                />
              </label>
              <label className="full-width">
                Description
                <textarea rows="3" value={groupForm.description} onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  const preview = await runAction(
                    () =>
                      churchApi.previewCommunicationAudience({
                        filterCriteria: buildFilterCriteria(),
                      }),
                    "Audience preview refreshed."
                  );
                  if (!preview) {
                    return;
                  }
                  setState((current) => ({ ...current, preview }));
                }}
              >
                Preview Audience
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createCommunicationGroup({
                        name: groupForm.name,
                        description: groupForm.description,
                        filterCriteria: buildFilterCriteria(),
                      }),
                    "Communication group saved."
                  );
                  if (!created) {
                    return;
                  }
                  setState((current) => ({ ...current, groups: [created, ...current.groups] }));
                  setComposer((current) => ({ ...current, groupId: created._id }));
                  closeModal();
                }}
              >
                Save Group
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "dispatch" ? (
        <ModalShell
          title="Communication Dispatch"
          subtitle="Preview recipients, queue the stubbed send, or export contacts from one focused modal."
          onClose={closeModal}
        >
          <div className="modal-form">
            {actionError ? <div className="form-error">{actionError}</div> : null}
            <div className="form-grid">
              <label>
                Send To Group
                <select value={composer.groupId} onChange={(event) => setComposer((current) => ({ ...current, groupId: event.target.value }))}>
                  <option value="">Select group</option>
                  {state.groups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Channel
                <select value={composer.channelId} onChange={(event) => setComposer((current) => ({ ...current, channelId: event.target.value }))}>
                  <option value="">Select channel</option>
                  {channelOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Content
                <textarea rows="4" value={composer.content} onChange={(event) => setComposer((current) => ({ ...current, content: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  const preview = await runAction(
                    () =>
                      churchApi.previewCommunicationAudience({
                        groupId: composer.groupId || undefined,
                        channelId: composer.channelId || undefined,
                        filterCriteria: composer.groupId ? undefined : buildFilterCriteria(),
                      }),
                    "Dispatch preview refreshed."
                  );
                  if (!preview) {
                    return;
                  }
                  setState((current) => ({ ...current, preview }));
                }}
              >
                Preview Dispatch
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const response = await runAction(
                    () =>
                      churchApi.sendCommunication({
                        groupId: composer.groupId,
                        channelId: composer.channelId,
                        content: composer.content,
                      }),
                    "Communication queued successfully."
                  );
                  if (!response) {
                    return;
                  }
                  const logs = await churchApi.getCommunicationLogs();
                  setState((current) => ({
                    ...current,
                    logs,
                    preview: {
                      totals: { total: response.sentCount, members: 0, visitors: 0 },
                    },
                  }));
                  closeModal();
                }}
              >
                Queue Communication
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  const exported = await runAction(
                    () =>
                      churchApi.exportCommunicationContacts({
                        groupId: composer.groupId || undefined,
                        filterCriteria: composer.groupId ? undefined : buildFilterCriteria(),
                      }),
                    "Contacts exported successfully."
                  );
                  if (!exported) {
                    return;
                  }
                  setState((current) => ({
                    ...current,
                    exportSummary: {
                      members: exported.members?.length || 0,
                      visitors: exported.visitors?.length || 0,
                    },
                  }));
                }}
              >
                Export Contacts
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "preference" ? (
        <ModalShell
          title="Communication Preference"
          subtitle="Capture opt-in choices in a focused modal instead of leaving the form open on the page."
          onClose={closeModal}
        >
          <div className="modal-form">
            {actionError ? <div className="form-error">{actionError}</div> : null}
            <div className="form-grid">
              <label>
                Member
                <select value={preferenceForm.memberId} onChange={(event) => setPreferenceForm((current) => ({ ...current, memberId: event.target.value, visitorId: "" }))}>
                  <option value="">Select member</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.memberId} - {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Visitor
                <select value={preferenceForm.visitorId} onChange={(event) => setPreferenceForm((current) => ({ ...current, visitorId: event.target.value, memberId: "" }))}>
                  <option value="">Select visitor</option>
                  {visitors.map((visitor) => (
                    <option key={visitor._id} value={visitor._id}>
                      {visitor.visitorId} - {visitor.firstName} {visitor.surname}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Channel
                <select value={preferenceForm.channel} onChange={(event) => setPreferenceForm((current) => ({ ...current, channel: event.target.value }))}>
                  <option value="">Select channel</option>
                  {channelOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Opt-In
                <select value={String(preferenceForm.optedIn)} onChange={(event) => setPreferenceForm((current) => ({ ...current, optedIn: event.target.value === "true" }))}>
                  <option value="true">Opted In</option>
                  <option value="false">Opted Out</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const saved = await runAction(() => churchApi.saveCommunicationPreference(preferenceForm), "Communication preference saved.");
                  if (!saved) {
                    return;
                  }
                  setState((current) => ({
                    ...current,
                    preferences: [saved, ...current.preferences.filter((item) => item._id !== saved._id)],
                  }));
                  closeModal();
                }}
              >
                Save Preference
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
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

function ActionTableCard({ title, columns, rows, emptyMessage }) {
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}
