import { useEffect, useMemo, useState } from "react";
import { churchApi } from "../apis/churchApi";
import ModalShell from "../components/common/ModalShell";
import { useAppContext } from "../context/AppContext";

function getCachedSpiritualHealthState() {
  const rules = churchApi.peekCached("/spiritual-health/trigger-rules");
  const alerts = churchApi.peekCached("/spiritual-health/alerts?resolved=false");

  if ([rules, alerts].some((item) => item === null)) {
    return null;
  }

  return {
    loading: false,
    error: "",
    rules: Array.isArray(rules) ? rules : [],
    alerts: Array.isArray(alerts) ? alerts : [],
  };
}

export default function SpiritualHealthPage({ section = "dashboard" }) {
  const activeSection = section;
  const { users, notifySuccess, notifyError, requestConfirmation } = useAppContext();
  const cachedSpiritualHealthState = useMemo(() => getCachedSpiritualHealthState(), []);
  const [state, setState] = useState(cachedSpiritualHealthState || {
    loading: true,
    error: "",
    rules: [],
    alerts: [],
  });
  const [activeModal, setActiveModal] = useState("");
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    sourceModule: "Attendance",
    amberDays: 30,
    redDays: 60,
  });
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    if (!cachedSpiritualHealthState) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedSpiritualHealthState]);

  const loadData = async () => {
    try {
      const [rules, alerts] = await Promise.all([churchApi.getTriggerRules(), churchApi.getSpiritualAlerts(false)]);
      setState({
        loading: false,
        error: "",
        rules,
        alerts,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load spiritual health data.",
      }));
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
      notifyError(error.message || "Unable to complete spiritual health action.");
      throw error;
    }
  };

  const redAlerts = useMemo(() => state.alerts.filter((alert) => alert.status === "Red" && !alert.resolvedAt), [state.alerts]);
  const amberAlerts = useMemo(() => state.alerts.filter((alert) => alert.status === "Amber" && !alert.resolvedAt), [state.alerts]);

  if (state.loading) {
    return <div className="empty-note">Loading spiritual health module...</div>;
  }

  return (
    <div className="page-grid">
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <section className="compact-stats-grid">
        <StatCard color="pink" label="Red Alerts" value={redAlerts.length} />
        <StatCard color="orange" label="Amber Alerts" value={amberAlerts.length} />
        <StatCard color="blue" label="Active Rules" value={state.rules.filter((rule) => rule.active).length} />
        <StatCard color="purple" label="Tracked Alerts" value={state.alerts.length} />
      </section>

      {activeSection === "dashboard" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Evaluate Alerts</h3>
                <p>Recompute dashboard alerts from attendance, visitors, evangelism, and discipleship activity.</p>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const alerts = await runAction(() => churchApi.evaluateSpiritualAlerts(), "Spiritual health alerts recalculated.");
                  setState((current) => ({ ...current, alerts }));
                }}
              >
                Recalculate Alerts
              </button>
            </div>
            <div className="info-grid">
              <article className="info-tile">
                <span>Priority Queue</span>
                <strong>
                  {redAlerts.length} red, {amberAlerts.length} amber
                </strong>
              </article>
              <article className="info-tile">
                <span>Rules In Use</span>
                <strong>{state.rules.filter((rule) => rule.active).length}</strong>
              </article>
            </div>
          </section>
          <AlertsTable
            alerts={[...redAlerts, ...amberAlerts]}
            users={users}
            assignments={assignments}
            setAssignments={setAssignments}
            onAssign={async (alertId, assignedToUserId) => {
              const updated = await runAction(
                () => churchApi.assignSpiritualAlert(alertId, { assignedToUserId }),
                "Alert follow-up assigned."
              );
              setState((current) => ({
                ...current,
                alerts: current.alerts.map((item) => (item._id === updated._id ? updated : item)),
              }));
            }}
            onResolve={async (alertId) => {
              const updated = await runAction(() => churchApi.resolveSpiritualAlert(alertId), "Alert resolved.");
              setState((current) => ({
                ...current,
                alerts: current.alerts.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
              }));
            }}
          />
        </>
      ) : null}

      {activeSection === "alerts" ? (
        <AlertsTable
          alerts={state.alerts}
          users={users}
          assignments={assignments}
          setAssignments={setAssignments}
          onAssign={async (alertId, assignedToUserId) => {
            const updated = await runAction(
              () => churchApi.assignSpiritualAlert(alertId, { assignedToUserId }),
              "Alert follow-up assigned."
            );
            setState((current) => ({
              ...current,
              alerts: current.alerts.map((item) => (item._id === updated._id ? updated : item)),
            }));
          }}
          onResolve={async (alertId) => {
            const updated = await runAction(() => churchApi.resolveSpiritualAlert(alertId), "Alert resolved.");
            setState((current) => ({
              ...current,
              alerts: current.alerts.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)),
            }));
          }}
        />
      ) : null}

      {activeSection === "rules" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Trigger Rules</h3>
                <p>Define threshold logic without leaving open forms on the page.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => setActiveModal("rule")}>
                Add Rule
              </button>
            </div>
          </section>
          <ActionTable
            title="Configured Rules"
            columns={["Name", "Module", "Amber", "Red", "Active", "Actions"]}
            rows={state.rules.map((rule) => [
              rule.name,
              rule.sourceModule,
              rule.severityMapping?.amberDays || "-",
              rule.severityMapping?.redDays || "-",
              rule.active ? "Yes" : "No",
              <div className="modal-actions" key={`rule-actions-${rule._id}`}>
                <button
                  type="button"
                  className="ghost-button small delete-button"
                  onClick={async () => {
                    const confirmed = await requestConfirmation({
                      title: "Delete Trigger Rule",
                      message: `Delete ${rule.name}? This action cannot be undone.`,
                      confirmLabel: "Delete",
                      tone: "danger",
                    });
                    if (!confirmed) {
                      return;
                    }
                    await runAction(() => churchApi.deleteTriggerRule(rule._id), "Trigger rule deleted.");
                    setState((current) => ({
                      ...current,
                      rules: current.rules.filter((item) => item._id !== rule._id),
                    }));
                  }}
                >
                  Delete
                </button>
              </div>,
            ])}
            emptyMessage="No trigger rules configured yet."
          />
        </>
      ) : null}

      {activeModal === "rule" ? (
        <ModalShell
          title="Trigger Rule"
          subtitle="Create a rule in the same modal-only workflow used elsewhere in the system."
          onClose={() => setActiveModal("")}
        >
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Rule Name
                <input value={ruleForm.name} onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Source Module
                <select value={ruleForm.sourceModule} onChange={(event) => setRuleForm((current) => ({ ...current, sourceModule: event.target.value }))}>
                  <option value="Attendance">Attendance</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Evangelism">Evangelism</option>
                  <option value="Discipleship">Discipleship</option>
                </select>
              </label>
              <label>
                Amber After Days
                <input type="number" value={ruleForm.amberDays} onChange={(event) => setRuleForm((current) => ({ ...current, amberDays: event.target.value }))} />
              </label>
              <label>
                Red After Days
                <input type="number" value={ruleForm.redDays} onChange={(event) => setRuleForm((current) => ({ ...current, redDays: event.target.value }))} />
              </label>
              <label className="full-width">
                Description
                <textarea rows="3" value={ruleForm.description} onChange={(event) => setRuleForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createTriggerRule({
                        name: ruleForm.name,
                        description: ruleForm.description,
                        sourceModule: ruleForm.sourceModule,
                        condition: {
                          thresholdDays: Number(ruleForm.amberDays),
                        },
                        severityMapping: {
                          amberDays: Number(ruleForm.amberDays),
                          redDays: Number(ruleForm.redDays),
                        },
                        active: true,
                      }),
                    "Trigger rule saved."
                  );
                  setState((current) => ({ ...current, rules: [created, ...current.rules] }));
                  setActiveModal("");
                }}
              >
                Save Rule
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function AlertsTable({ alerts, users, assignments, setAssignments, onAssign, onResolve }) {
  return (
    <section className="surface-card data-card">
      <div className="section-headline compact">
        <h3>Spiritual Health Alerts</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Reason</th>
              <th>Trigger</th>
              <th>Assigned</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length ? (
              alerts.map((alert) => (
                <tr key={alert._id}>
                  <td>
                    <span className={`status-pill ${alert.status === "Red" ? "disabled" : "pending"}`}>{alert.status}</span>
                  </td>
                  <td>{alert.reason}</td>
                  <td>{alert.triggerRuleId?.name || "-"}</td>
                  <td>
                    <select
                      value={assignments[alert._id] || ""}
                      onChange={(event) => setAssignments((current) => ({ ...current, [alert._id]: event.target.value }))}
                    >
                      <option value="">Select user</option>
                      {users.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="modal-actions">
                      <button type="button" className="ghost-button small" onClick={() => onAssign(alert._id, assignments[alert._id] || "")}>
                        Assign
                      </button>
                      <button type="button" className="ghost-button small" onClick={() => onResolve(alert._id)}>
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="empty-table">
                  No alerts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionTable({ title, columns, rows, emptyMessage }) {
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

function StatCard({ color, label, value }) {
  return (
    <article className={`compact-stat-card ${color}`}>
      <div className="compact-stat-label">{label}</div>
      <div className="compact-stat-value">{value}</div>
    </article>
  );
}
