import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { churchApi } from "../apis/churchApi";
import ModalShell from "../components/common/ModalShell";
import { useAppContext } from "../context/AppContext";

export default function StrategicPlanningPage() {
  const location = useLocation();
  const activeSection = location.pathname.split("/")[2] || "plans";
  const { ministries, lookupState, notifySuccess, notifyError } = useAppContext();
  const planStatusOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "strategic_plan_status"),
    [lookupState.values]
  );
  const frequencyOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "kpi_target_frequency"),
    [lookupState.values]
  );
  const [state, setState] = useState({
    loading: true,
    error: "",
    plans: [],
    pillars: [],
    objectives: [],
    initiatives: [],
    kpis: [],
    targets: [],
    actuals: [],
    churchScorecard: null,
    ministryScorecard: null,
  });
  const [activeModal, setActiveModal] = useState("");
  const [planForm, setPlanForm] = useState({
    name: "Church Strategic Plan",
    periodStart: "2026-01-01",
    periodEnd: "2028-12-31",
    status: "",
  });
  const [pillarForm, setPillarForm] = useState({
    planId: "",
    name: "",
    description: "",
  });
  const [objectiveForm, setObjectiveForm] = useState({
    pillarId: "",
    title: "",
    description: "",
    responsibleMinistryId: "",
  });
  const [initiativeForm, setInitiativeForm] = useState({
    objectiveId: "",
    title: "",
    description: "",
  });
  const [kpiForm, setKpiForm] = useState({
    initiativeId: "",
    name: "",
    baseline: 0,
    targetFrequency: "",
    unit: "",
    direction: "higher",
    greenPercent: 100,
    amberPercent: 80,
  });
  const [targetForm, setTargetForm] = useState({
    kpiId: "",
    period: "",
    targetValue: "",
  });
  const [actualForm, setActualForm] = useState({
    kpiId: "",
    period: "",
    actualValue: "",
    commentary: "",
    correctiveAction: "",
    correctiveActionDueDate: "",
  });
  const [selectedMinistryId, setSelectedMinistryId] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planStatusOptions.length, frequencyOptions.length]);

  const loadData = async () => {
    try {
      const [plans, pillars, objectives, initiatives, kpis, targets, actuals, churchScorecard] = await Promise.all([
        churchApi.getStrategicPlans(),
        churchApi.getStrategicPillars(),
        churchApi.getStrategicObjectives(),
        churchApi.getStrategicInitiatives(),
        churchApi.getKpis(),
        churchApi.getKpiTargets(),
        churchApi.getKpiActuals(),
        churchApi.getChurchScorecard(),
      ]);
      setState({
        loading: false,
        error: "",
        plans,
        pillars,
        objectives,
        initiatives,
        kpis,
        targets,
        actuals,
        churchScorecard,
        ministryScorecard: null,
      });
      setPlanForm((current) => ({ ...current, status: current.status || plans[0]?.status?._id || planStatusOptions[0]?._id || "" }));
      setPillarForm((current) => ({ ...current, planId: current.planId || plans[0]?._id || "" }));
      setObjectiveForm((current) => ({ ...current, pillarId: current.pillarId || pillars[0]?._id || "" }));
      setInitiativeForm((current) => ({ ...current, objectiveId: current.objectiveId || objectives[0]?._id || "" }));
      setKpiForm((current) => ({
        ...current,
        initiativeId: current.initiativeId || initiatives[0]?._id || "",
        targetFrequency: current.targetFrequency || frequencyOptions[0]?._id || "",
      }));
      setTargetForm((current) => ({ ...current, kpiId: current.kpiId || kpis[0]?._id || "" }));
      setActualForm((current) => ({ ...current, kpiId: current.kpiId || kpis[0]?._id || "" }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load strategic planning data.",
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
      notifyError(error.message || "Unable to complete strategic planning action.");
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
    return <div className="empty-note">Loading strategic planning module...</div>;
  }

  return (
    <div className="page-grid">
      {state.error ? <div className="form-error">{state.error}</div> : null}

      <section className="compact-stats-grid">
        <StatCard color="purple" label="Plans" value={state.plans.length} />
        <StatCard color="blue" label="Objectives" value={state.objectives.length} />
        <StatCard color="orange" label="KPIs" value={state.kpis.length} />
        <StatCard color="pink" label="Actuals" value={state.actuals.length} />
      </section>

      {activeSection === "plans" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Strategic Structure</h3>
                <p>Create the plan hierarchy from focused modal forms instead of stacked page forms.</p>
              </div>
              <div className="toolbar-row">
                <button type="button" className="ghost-button" onClick={() => setActiveModal("plan")}>
                  Add Plan
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveModal("pillar")}>
                  Add Pillar
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveModal("objective")}>
                  Add Objective
                </button>
                <button type="button" className="primary-button" onClick={() => setActiveModal("initiative")}>
                  Add Initiative
                </button>
              </div>
            </div>
          </section>

          <TableCard
            title="Strategic Plans"
            columns={["Plan", "Period", "Status", "Actions"]}
            rows={state.plans.map((plan) => [
              plan.name,
              `${formatDate(plan.periodStart)} to ${formatDate(plan.periodEnd)}`,
              plan.status?.label || "-",
              <DeleteButton
                key={`delete-plan-${plan._id}`}
                onClick={() => deleteRecord(plan.name, () => churchApi.deleteStrategicPlan(plan._id), "plans", plan._id)}
              />,
            ])}
            emptyMessage="No strategic plans recorded yet."
          />
          <TableCard
            title="Strategic Pillars"
            columns={["Pillar", "Plan", "Description", "Actions"]}
            rows={state.pillars.map((pillar) => [
              pillar.name,
              pillar.planId?.name || "-",
              pillar.description || "-",
              <DeleteButton
                key={`delete-pillar-${pillar._id}`}
                onClick={() => deleteRecord(pillar.name, () => churchApi.deleteStrategicPillar(pillar._id), "pillars", pillar._id)}
              />,
            ])}
            emptyMessage="No pillars recorded yet."
          />
          <TableCard
            title="Strategic Objectives"
            columns={["Objective", "Pillar", "Ministry", "Actions"]}
            rows={state.objectives.map((objective) => [
              objective.title,
              objective.pillarId?.name || "-",
              objective.responsibleMinistryId?.name || "-",
              <DeleteButton
                key={`delete-objective-${objective._id}`}
                onClick={() => deleteRecord(objective.title, () => churchApi.deleteStrategicObjective(objective._id), "objectives", objective._id)}
              />,
            ])}
            emptyMessage="No strategic objectives recorded yet."
          />
          <TableCard
            title="Initiatives"
            columns={["Initiative", "Objective", "Description", "Actions"]}
            rows={state.initiatives.map((initiative) => [
              initiative.title,
              initiative.objectiveId?.title || "-",
              initiative.description || "-",
              <DeleteButton
                key={`delete-initiative-${initiative._id}`}
                onClick={() => deleteRecord(initiative.title, () => churchApi.deleteStrategicInitiative(initiative._id), "initiatives", initiative._id)}
              />,
            ])}
            emptyMessage="No initiatives recorded yet."
          />
        </>
      ) : null}

      {activeSection === "kpis" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>KPI Setup And Capture</h3>
                <p>Define KPI targets once, then capture actuals from modal forms with server-side variance and RAG status.</p>
              </div>
              <div className="toolbar-row">
                <button type="button" className="ghost-button" onClick={() => setActiveModal("kpi")}>
                  Add KPI
                </button>
                <button type="button" className="ghost-button" onClick={() => setActiveModal("target")}>
                  Add Target
                </button>
                <button type="button" className="primary-button" onClick={() => setActiveModal("actual")}>
                  Capture Actual
                </button>
              </div>
            </div>
          </section>

          <TableCard
            title="Strategic KPIs"
            columns={["KPI", "Initiative", "Frequency", "Unit", "Actions"]}
            rows={state.kpis.map((kpi) => [
              kpi.name,
              kpi.initiativeId?.title || "-",
              kpi.targetFrequency?.label || "-",
              kpi.unit || "-",
              <DeleteButton
                key={`delete-kpi-${kpi._id}`}
                onClick={() => deleteRecord(kpi.name, () => churchApi.deleteKpi(kpi._id), "kpis", kpi._id)}
              />,
            ])}
            emptyMessage="No KPIs configured yet."
          />
          <TableCard
            title="KPI Targets"
            columns={["KPI", "Period", "Target", "Actions"]}
            rows={state.targets.map((target) => [
              target.kpiId?.name || "-",
              target.period,
              target.targetValue,
              <DeleteButton
                key={`delete-target-${target._id}`}
                onClick={() => deleteRecord(`${target.kpiId?.name || "KPI"} target`, () => churchApi.deleteKpiTarget(target._id), "targets", target._id)}
              />,
            ])}
            emptyMessage="No KPI targets captured yet."
          />
          <TableCard
            title="KPI Actuals"
            columns={["KPI", "Period", "Actual", "Variance", "RAG", "Due", "Actions"]}
            rows={state.actuals.map((actual) => [
              actual.kpiId?.name || "-",
              actual.period,
              actual.actualValue,
              actual.variance,
              actual.ragStatus?.label || "-",
              formatDate(actual.correctiveActionDueDate),
              <DeleteButton
                key={`delete-actual-${actual._id}`}
                onClick={() => deleteRecord(`${actual.kpiId?.name || "KPI"} actual`, () => churchApi.deleteKpiActual(actual._id), "actuals", actual._id)}
              />,
            ])}
            emptyMessage="No KPI actuals captured yet."
          />
        </>
      ) : null}

      {activeSection === "scorecards" ? (
        <>
          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Scorecards</h3>
                <p>Use the church-wide view for the full picture and filter by ministry when a team needs its own scorecard.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Ministry Scorecard
                <select value={selectedMinistryId} onChange={(event) => setSelectedMinistryId(event.target.value)}>
                  <option value="">Select ministry</option>
                  {ministries.map((ministry) => (
                    <option key={ministry._id || ministry.id} value={ministry._id || ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  const churchScorecard = await runAction(() => churchApi.getChurchScorecard(), "Church scorecard refreshed.");
                  setState((current) => ({ ...current, churchScorecard }));
                }}
              >
                Refresh Church Scorecard
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  if (!selectedMinistryId) {
                    notifyError("Select a ministry first.");
                    return;
                  }
                  const ministryScorecard = await runAction(() => churchApi.getMinistryScorecard(selectedMinistryId), "Ministry scorecard loaded.");
                  setState((current) => ({ ...current, ministryScorecard }));
                }}
              >
                Load Ministry Scorecard
              </button>
            </div>
          </section>

          <section className="compact-stats-grid">
            <StatCard color="purple" label="Green" value={state.churchScorecard?.ragCounts?.Green || 0} />
            <StatCard color="orange" label="Amber" value={state.churchScorecard?.ragCounts?.Amber || 0} />
            <StatCard color="pink" label="Red" value={state.churchScorecard?.ragCounts?.Red || 0} />
            <StatCard color="blue" label="Objectives" value={state.churchScorecard?.totals?.objectives || 0} />
          </section>

          <TableCard
            title="Church Scorecard KPIs"
            columns={["KPI", "Frequency", "Latest Period", "RAG"]}
            rows={buildScorecardRows(state.churchScorecard)}
            emptyMessage="No church-wide KPI scorecard data yet."
          />

          <TableCard
            title="Ministry Scorecard KPIs"
            columns={["KPI", "Frequency", "Latest Period", "RAG"]}
            rows={buildScorecardRows(state.ministryScorecard)}
            emptyMessage="Select a ministry to load its scorecard."
          />
        </>
      ) : null}

      {activeModal === "plan" ? (
        <ModalShell title="Strategic Plan" subtitle="Create the plan record in a focused modal." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Plan Name
                <input value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Period Start
                <input type="date" value={planForm.periodStart} onChange={(event) => setPlanForm((current) => ({ ...current, periodStart: event.target.value }))} />
              </label>
              <label>
                Period End
                <input type="date" value={planForm.periodEnd} onChange={(event) => setPlanForm((current) => ({ ...current, periodEnd: event.target.value }))} />
              </label>
              <label>
                Status
                <select value={planForm.status} onChange={(event) => setPlanForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">Select status</option>
                  {planStatusOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createStrategicPlan(planForm), "Strategic plan saved.");
                  setState((current) => ({ ...current, plans: [created, ...current.plans] }));
                  setPillarForm((current) => ({ ...current, planId: created._id }));
                  setActiveModal("");
                }}
              >
                Save Plan
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "pillar" ? (
        <ModalShell title="Strategic Pillar" subtitle="Add a pillar without keeping the form open on the page." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Plan
                <select value={pillarForm.planId} onChange={(event) => setPillarForm((current) => ({ ...current, planId: event.target.value }))}>
                  <option value="">Select plan</option>
                  {state.plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pillar Name
                <input value={pillarForm.name} onChange={(event) => setPillarForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="full-width">
                Pillar Description
                <textarea rows="3" value={pillarForm.description} onChange={(event) => setPillarForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createStrategicPillar(pillarForm), "Strategic pillar saved.");
                  setState((current) => ({ ...current, pillars: [created, ...current.pillars] }));
                  setObjectiveForm((current) => ({ ...current, pillarId: created._id }));
                  setActiveModal("");
                }}
              >
                Save Pillar
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "objective" ? (
        <ModalShell title="Strategic Objective" subtitle="Assign the objective to a pillar and ministry from one modal." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Pillar
                <select value={objectiveForm.pillarId} onChange={(event) => setObjectiveForm((current) => ({ ...current, pillarId: event.target.value }))}>
                  <option value="">Select pillar</option>
                  {state.pillars.map((pillar) => (
                    <option key={pillar._id} value={pillar._id}>
                      {pillar.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Responsible Ministry
                <select
                  value={objectiveForm.responsibleMinistryId}
                  onChange={(event) => setObjectiveForm((current) => ({ ...current, responsibleMinistryId: event.target.value }))}
                >
                  <option value="">Select ministry</option>
                  {ministries.map((ministry) => (
                    <option key={ministry._id || ministry.id} value={ministry._id || ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Objective Title
                <input value={objectiveForm.title} onChange={(event) => setObjectiveForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="full-width">
                Objective Description
                <textarea rows="3" value={objectiveForm.description} onChange={(event) => setObjectiveForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createStrategicObjective(objectiveForm), "Strategic objective saved.");
                  setState((current) => ({ ...current, objectives: [created, ...current.objectives] }));
                  setInitiativeForm((current) => ({ ...current, objectiveId: created._id }));
                  setActiveModal("");
                }}
              >
                Save Objective
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "initiative" ? (
        <ModalShell title="Strategic Initiative" subtitle="Attach the initiative to an objective from a focused modal." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Objective
                <select value={initiativeForm.objectiveId} onChange={(event) => setInitiativeForm((current) => ({ ...current, objectiveId: event.target.value }))}>
                  <option value="">Select objective</option>
                  {state.objectives.map((objective) => (
                    <option key={objective._id} value={objective._id}>
                      {objective.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-width">
                Initiative Title
                <input value={initiativeForm.title} onChange={(event) => setInitiativeForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="full-width">
                Initiative Description
                <textarea rows="3" value={initiativeForm.description} onChange={(event) => setInitiativeForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(() => churchApi.createStrategicInitiative(initiativeForm), "Strategic initiative saved.");
                  setState((current) => ({ ...current, initiatives: [created, ...current.initiatives] }));
                  setKpiForm((current) => ({ ...current, initiativeId: created._id }));
                  setActiveModal("");
                }}
              >
                Save Initiative
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "kpi" ? (
        <ModalShell title="KPI" subtitle="Create the KPI and its RAG thresholds from a modal form." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Initiative
                <select value={kpiForm.initiativeId} onChange={(event) => setKpiForm((current) => ({ ...current, initiativeId: event.target.value }))}>
                  <option value="">Select initiative</option>
                  {state.initiatives.map((initiative) => (
                    <option key={initiative._id} value={initiative._id}>
                      {initiative.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                KPI Name
                <input value={kpiForm.name} onChange={(event) => setKpiForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Baseline
                <input type="number" value={kpiForm.baseline} onChange={(event) => setKpiForm((current) => ({ ...current, baseline: event.target.value }))} />
              </label>
              <label>
                Target Frequency
                <select value={kpiForm.targetFrequency} onChange={(event) => setKpiForm((current) => ({ ...current, targetFrequency: event.target.value }))}>
                  <option value="">Select frequency</option>
                  {frequencyOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Unit
                <input value={kpiForm.unit} onChange={(event) => setKpiForm((current) => ({ ...current, unit: event.target.value }))} />
              </label>
              <label>
                Direction
                <select value={kpiForm.direction} onChange={(event) => setKpiForm((current) => ({ ...current, direction: event.target.value }))}>
                  <option value="higher">Higher is better</option>
                  <option value="lower">Lower is better</option>
                </select>
              </label>
              <label>
                Green %
                <input type="number" value={kpiForm.greenPercent} onChange={(event) => setKpiForm((current) => ({ ...current, greenPercent: event.target.value }))} />
              </label>
              <label>
                Amber %
                <input type="number" value={kpiForm.amberPercent} onChange={(event) => setKpiForm((current) => ({ ...current, amberPercent: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createKpi({
                        initiativeId: kpiForm.initiativeId,
                        name: kpiForm.name,
                        baseline: Number(kpiForm.baseline || 0),
                        targetFrequency: kpiForm.targetFrequency || null,
                        unit: kpiForm.unit,
                        ragThresholds: {
                          direction: kpiForm.direction,
                          greenPercent: Number(kpiForm.greenPercent || 100),
                          amberPercent: Number(kpiForm.amberPercent || 80),
                        },
                      }),
                    "KPI saved."
                  );
                  setState((current) => ({ ...current, kpis: [created, ...current.kpis] }));
                  setTargetForm((current) => ({ ...current, kpiId: created._id }));
                  setActualForm((current) => ({ ...current, kpiId: created._id }));
                  setActiveModal("");
                }}
              >
                Save KPI
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "target" ? (
        <ModalShell title="KPI Target" subtitle="Capture the target in a modal to keep the page tight." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                KPI
                <select value={targetForm.kpiId} onChange={(event) => setTargetForm((current) => ({ ...current, kpiId: event.target.value }))}>
                  <option value="">Select KPI</option>
                  {state.kpis.map((kpi) => (
                    <option key={kpi._id} value={kpi._id}>
                      {kpi.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Target Period
                <input value={targetForm.period} onChange={(event) => setTargetForm((current) => ({ ...current, period: event.target.value }))} placeholder="2026-Q1" />
              </label>
              <label>
                Target Value
                <input type="number" value={targetForm.targetValue} onChange={(event) => setTargetForm((current) => ({ ...current, targetValue: event.target.value }))} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createKpiTarget({
                        kpiId: targetForm.kpiId,
                        period: targetForm.period,
                        targetValue: Number(targetForm.targetValue || 0),
                      }),
                    "KPI target saved."
                  );
                  setState((current) => ({ ...current, targets: [created, ...current.targets] }));
                  setActiveModal("");
                }}
              >
                Save Target
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {activeModal === "actual" ? (
        <ModalShell title="KPI Actual" subtitle="Capture actual performance and let the server compute variance and RAG." onClose={() => setActiveModal("")}>
          <div className="modal-form">
            <div className="form-grid">
              <label>
                KPI
                <select value={actualForm.kpiId} onChange={(event) => setActualForm((current) => ({ ...current, kpiId: event.target.value }))}>
                  <option value="">Select KPI</option>
                  {state.kpis.map((kpi) => (
                    <option key={kpi._id} value={kpi._id}>
                      {kpi.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Actual Period
                <input value={actualForm.period} onChange={(event) => setActualForm((current) => ({ ...current, period: event.target.value }))} placeholder="2026-Q1" />
              </label>
              <label>
                Actual Value
                <input type="number" value={actualForm.actualValue} onChange={(event) => setActualForm((current) => ({ ...current, actualValue: event.target.value }))} />
              </label>
              <label className="full-width">
                Commentary
                <textarea rows="3" value={actualForm.commentary} onChange={(event) => setActualForm((current) => ({ ...current, commentary: event.target.value }))} />
              </label>
              <label className="full-width">
                Corrective Action
                <textarea rows="3" value={actualForm.correctiveAction} onChange={(event) => setActualForm((current) => ({ ...current, correctiveAction: event.target.value }))} />
              </label>
              <label>
                Corrective Action Due
                <input
                  type="date"
                  value={actualForm.correctiveActionDueDate}
                  onChange={(event) => setActualForm((current) => ({ ...current, correctiveActionDueDate: event.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const created = await runAction(
                    () =>
                      churchApi.createKpiActual({
                        kpiId: actualForm.kpiId,
                        period: actualForm.period,
                        actualValue: Number(actualForm.actualValue || 0),
                        commentary: actualForm.commentary,
                        correctiveAction: actualForm.correctiveAction,
                        correctiveActionDueDate: actualForm.correctiveActionDueDate || null,
                      }),
                    "KPI actual captured."
                  );
                  const churchScorecard = await churchApi.getChurchScorecard();
                  setState((current) => ({
                    ...current,
                    actuals: [created, ...current.actuals.filter((item) => !(item.kpiId?._id === created.kpiId?._id && item.period === created.period))],
                    churchScorecard,
                  }));
                  setActiveModal("");
                }}
              >
                Capture Actual
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function buildScorecardRows(scorecard) {
  if (!scorecard?.kpis?.length) {
    return [];
  }

  return scorecard.kpis.map((kpi) => {
    const latestActual = (scorecard.actuals || []).find((actual) => String(actual.kpiId?._id || actual.kpiId) === String(kpi._id));
    return [kpi.name, kpi.targetFrequency?.label || "-", latestActual?.period || "-", latestActual?.ragStatus?.label || "-"];
  });
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
