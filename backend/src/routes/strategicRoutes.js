const express = require("express");
const Initiative = require("../models/Initiative");
const KPI = require("../models/KPI");
const KPIActual = require("../models/KPIActual");
const KPITarget = require("../models/KPITarget");
const StrategicObjective = require("../models/StrategicObjective");
const StrategicPillar = require("../models/StrategicPillar");
const StrategicPlan = require("../models/StrategicPlan");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { computeKpiActualFields, getStrategicScorecard } = require("../services/strategicService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

registerCrud({
  path: "/plans",
  Model: StrategicPlan,
  viewPermission: PERMISSIONS.VIEW_STRATEGIC_PLANNING,
  managePermission: PERMISSIONS.MANAGE_STRATEGIC_PLANNING,
  moduleName: "Strategic Planning",
  recordType: "StrategicPlan",
  populateQuery: (query) => query.populate("status", "label key").sort({ createdAt: -1 }),
});

registerCrud({
  path: "/pillars",
  Model: StrategicPillar,
  viewPermission: PERMISSIONS.VIEW_STRATEGIC_PLANNING,
  managePermission: PERMISSIONS.MANAGE_STRATEGIC_PLANNING,
  moduleName: "Strategic Planning",
  recordType: "StrategicPillar",
  populateQuery: (query) => query.populate("planId", "name").sort({ createdAt: -1 }),
});

registerCrud({
  path: "/objectives",
  Model: StrategicObjective,
  viewPermission: PERMISSIONS.VIEW_STRATEGIC_PLANNING,
  managePermission: PERMISSIONS.MANAGE_STRATEGIC_PLANNING,
  moduleName: "Strategic Planning",
  recordType: "StrategicObjective",
  populateQuery: (query) =>
    query
      .populate("pillarId", "name")
      .populate("responsibleMinistryId", "name")
      .sort({ createdAt: -1 }),
});

registerCrud({
  path: "/initiatives",
  Model: Initiative,
  viewPermission: PERMISSIONS.VIEW_STRATEGIC_PLANNING,
  managePermission: PERMISSIONS.MANAGE_STRATEGIC_PLANNING,
  moduleName: "Strategic Planning",
  recordType: "Initiative",
  populateQuery: (query) => query.populate("objectiveId", "title").sort({ createdAt: -1 }),
});

registerCrud({
  path: "/kpis",
  Model: KPI,
  viewPermission: PERMISSIONS.VIEW_STRATEGIC_PLANNING,
  managePermission: PERMISSIONS.MANAGE_STRATEGIC_PLANNING,
  moduleName: "Strategic Planning",
  recordType: "KPI",
  populateQuery: (query) =>
    query
      .populate("initiativeId", "title")
      .populate("targetFrequency", "label key")
      .sort({ createdAt: -1 }),
});

registerCrud({
  path: "/targets",
  Model: KPITarget,
  viewPermission: PERMISSIONS.VIEW_STRATEGIC_PLANNING,
  managePermission: PERMISSIONS.MANAGE_STRATEGIC_PLANNING,
  moduleName: "Strategic Planning",
  recordType: "KPITarget",
  populateQuery: (query) => query.populate("kpiId", "name unit").sort({ period: -1, createdAt: -1 }),
});

router.get("/actuals", authorizePermissions(PERMISSIONS.VIEW_STRATEGIC_PLANNING), async (req, res) => {
  const actuals = await KPIActual.find()
    .populate("kpiId", "name unit")
    .populate("capturedBy", "displayName username")
    .populate("ragStatus", "label key")
    .sort({ period: -1, createdAt: -1 });
  res.json(actuals);
});

router.post("/actuals", authorizePermissions(PERMISSIONS.MANAGE_STRATEGIC_PLANNING), async (req, res) => {
  try {
    const computed = await computeKpiActualFields(req.body.kpiId, req.body.period, req.body.actualValue);
    const actual = await KPIActual.findOneAndUpdate(
      { kpiId: req.body.kpiId, period: req.body.period },
      {
        $set: {
          ...req.body,
          capturedBy: req.user?._id || null,
          capturedDate: new Date(),
          variance: computed.variance,
          ragStatus: computed.ragStatus?._id || null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("kpiId", "name unit")
      .populate("capturedBy", "displayName username")
      .populate("ragStatus", "label key");
    res.status(201).json(actual);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/actuals/:id", authorizePermissions(PERMISSIONS.MANAGE_STRATEGIC_PLANNING), async (req, res) => {
  const actual = await KPIActual.findById(req.params.id);
  if (!actual) {
    return res.status(404).json({ message: "KPI actual not found." });
  }

  const previousValue = actual.toObject();
  await KPIActual.deleteOne({ _id: actual._id });
  await logAudit({
    action: "delete",
    module: "Strategic Planning",
    recordType: "KPIActual",
    recordId: String(actual._id),
    previousValue,
    user: req.user,
    ipAddress: req.ip,
  });
  return res.json({ success: true });
});

router.get("/scorecards/ministry/:ministryId", authorizePermissions(PERMISSIONS.VIEW_STRATEGIC_PLANNING), async (req, res) => {
  try {
    const scorecard = await getStrategicScorecard({ ministryId: req.params.ministryId });
    res.json(scorecard);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/scorecards/church", authorizePermissions(PERMISSIONS.VIEW_STRATEGIC_PLANNING), async (req, res) => {
  try {
    const scorecard = await getStrategicScorecard({});
    res.json(scorecard);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function registerCrud({ path, Model, viewPermission, managePermission, moduleName, recordType, populateQuery }) {
  router.get(path, authorizePermissions(viewPermission), async (req, res) => {
    const query = Model.find();
    const records = populateQuery ? await populateQuery(query) : await query.sort({ createdAt: -1 });
    res.json(records);
  });

  router.post(path, authorizePermissions(managePermission), async (req, res) => {
    try {
      const record = await Model.create(req.body);
      const hydratedRecord = populateQuery ? await populateQuery(Model.find({ _id: record._id })) : [record];
      await logAudit({
        action: "create",
        module: moduleName,
        recordType,
        recordId: String(record._id),
        newValue: record.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      res.status(201).json(Array.isArray(hydratedRecord) ? hydratedRecord[0] : hydratedRecord);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.put(`${path}/:id`, authorizePermissions(managePermission), async (req, res) => {
    const record = await Model.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: `${recordType} not found.` });
    }

    const previousValue = record.toObject();
    Object.assign(record, req.body);
    await record.save();
    await logAudit({
      action: "update",
      module: moduleName,
      recordType,
      recordId: String(record._id),
      previousValue,
      newValue: record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    const hydratedRecord = populateQuery ? await populateQuery(Model.find({ _id: record._id })) : [record];
    return res.json(Array.isArray(hydratedRecord) ? hydratedRecord[0] : hydratedRecord);
  });

  router.delete(`${path}/:id`, authorizePermissions(managePermission), async (req, res) => {
    const record = await Model.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: `${recordType} not found.` });
    }

    const previousValue = record.toObject();
    await Model.deleteOne({ _id: record._id });
    await logAudit({
      action: "delete",
      module: moduleName,
      recordType,
      recordId: String(record._id),
      previousValue,
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json({ success: true });
  });
}

module.exports = router;
