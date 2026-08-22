const Initiative = require("../models/Initiative");
const KPI = require("../models/KPI");
const KPIActual = require("../models/KPIActual");
const KPITarget = require("../models/KPITarget");
const StrategicObjective = require("../models/StrategicObjective");
const StrategicPillar = require("../models/StrategicPillar");
const { getLookupValueByTypeAndKey } = require("./lookupService");
const { computeVariance } = require("./varianceService");

async function computeKpiActualFields(kpiId, period, actualValue) {
  const [kpi, target] = await Promise.all([
    KPI.findById(kpiId).lean(),
    KPITarget.findOne({ kpiId, period }).lean(),
  ]);

  if (!kpi) {
    throw new Error("KPI not found.");
  }

  const targetValue = Number(target?.targetValue || 0);
  const { variance } = computeVariance(targetValue, Number(actualValue || 0));
  const ragStatus = await resolveRagStatus(kpi.ragThresholds || {}, targetValue, Number(actualValue || 0));

  return {
    variance,
    ragStatus,
  };
}

async function getStrategicScorecard({ ministryId = "" } = {}) {
  const objectives = await StrategicObjective.find(ministryId ? { responsibleMinistryId: ministryId } : {})
    .populate("pillarId", "name planId")
    .populate("responsibleMinistryId", "name")
    .lean();

  const objectiveIds = objectives.map((objective) => objective._id);
  const initiatives = await Initiative.find({ objectiveId: { $in: objectiveIds } }).lean();
  const initiativeIds = initiatives.map((initiative) => initiative._id);
  const kpis = await KPI.find({ initiativeId: { $in: initiativeIds } })
    .populate("targetFrequency", "label key")
    .lean();
  const kpiIds = kpis.map((kpi) => kpi._id);
  const [targets, actuals, greenStatus, amberStatus, redStatus] = await Promise.all([
    KPITarget.find({ kpiId: { $in: kpiIds } }).lean(),
    KPIActual.find({ kpiId: { $in: kpiIds } }).populate("ragStatus", "label key").lean(),
    getLookupValueByTypeAndKey("rag_status", "green"),
    getLookupValueByTypeAndKey("rag_status", "amber"),
    getLookupValueByTypeAndKey("rag_status", "red"),
  ]);

  const ragCounts = {
    Green: actuals.filter((item) => String(item.ragStatus?._id || item.ragStatus) === String(greenStatus?._id)).length,
    Amber: actuals.filter((item) => String(item.ragStatus?._id || item.ragStatus) === String(amberStatus?._id)).length,
    Red: actuals.filter((item) => String(item.ragStatus?._id || item.ragStatus) === String(redStatus?._id)).length,
  };

  return {
    totals: {
      objectives: objectives.length,
      initiatives: initiatives.length,
      kpis: kpis.length,
      targets: targets.length,
      actuals: actuals.length,
    },
    ragCounts,
    objectives,
    initiatives,
    kpis,
    targets,
    actuals,
  };
}

async function resolveRagStatus(thresholds, targetValue, actualValue) {
  const direction = thresholds.direction || "higher";
  const greenPercent = Number(thresholds.greenPercent || 100);
  const amberPercent = Number(thresholds.amberPercent || 80);
  const achievement = targetValue === 0 ? 100 : (actualValue / targetValue) * 100;

  let key = "green";
  if (direction === "lower") {
    if (achievement > amberPercent) {
      key = "red";
    } else if (achievement > greenPercent) {
      key = "amber";
    }
  } else if (achievement < amberPercent) {
    key = "red";
  } else if (achievement < greenPercent) {
    key = "amber";
  }

  return getLookupValueByTypeAndKey("rag_status", key);
}

module.exports = {
  computeKpiActualFields,
  getStrategicScorecard,
};
