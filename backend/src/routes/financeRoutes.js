const express = require("express");
const FinanceRecord = require("../models/FinanceRecord");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
router.use(authenticate);

router.get("/", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const records = await FinanceRecord.find().sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/next-record-no", authorizePermissions(PERMISSIONS.VIEW_FINANCE), async (req, res) => {
  try {
    const recordNo = await generateNextFinanceRecordNo();
    res.json({ recordNo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const payload = await normalizeFinancePayload(req.body);
    const record = await FinanceRecord.create(payload);
    await logAudit({
      action: "create",
      module: "Finance",
      recordType: "FinanceRecord",
      recordId: record.recordNo,
      newValue: record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:recordId", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ message: "Finance record not found." });
    }

    const previousValue = record.toObject();
    const payload = await normalizeFinancePayload(req.body, record);
    Object.assign(record, payload);
    await record.save();

    await logAudit({
      action: "update",
      module: "Finance",
      recordType: "FinanceRecord",
      recordId: record.recordNo,
      previousValue,
      newValue: record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });

    return res.json(record);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/:recordId", authorizePermissions(PERMISSIONS.MANAGE_FINANCE), async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.recordId);
    if (!record) {
      return res.status(404).json({ message: "Finance record not found." });
    }

    await FinanceRecord.deleteOne({ _id: record._id });
    await logAudit({
      action: "delete",
      module: "Finance",
      recordType: "FinanceRecord",
      recordId: record.recordNo,
      previousValue: record.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

async function normalizeFinancePayload(payload = {}, existingRecord = null) {
  if (!String(payload.category || "").trim()) {
    throw new Error("Category is required.");
  }

  if (payload.amount === "" || payload.amount === null || payload.amount === undefined || Number.isNaN(Number(payload.amount))) {
    throw new Error("Amount is required.");
  }

  if (!String(payload.date || existingRecord?.date || "").trim()) {
    throw new Error("Date is required.");
  }

  return {
    recordNo: payload.recordNo || existingRecord?.recordNo || (await generateNextFinanceRecordNo()),
    category: payload.category,
    description: payload.description || "",
    amount: Number(payload.amount || 0),
    date: new Date(payload.date || existingRecord?.date),
    status: payload.status || existingRecord?.status || "Pending",
  };
}

async function generateNextFinanceRecordNo() {
  const records = await FinanceRecord.find({}, { recordNo: 1 }).lean();
  const nextNumber =
    records.reduce((maxValue, item) => {
      const numericPart = Number(String(item.recordNo || "").replace("FIN-", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1;

  return `FIN-${String(nextNumber).padStart(3, "0")}`;
}

module.exports = router;
