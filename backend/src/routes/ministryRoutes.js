const express = require("express");
const Ministry = require("../models/Ministry");
const Member = require("../models/Member");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/", authorizePermissions(PERMISSIONS.VIEW_MINISTRIES), async (req, res) => {
  try {
    const ministries = await Ministry.find().sort({ createdAt: -1 });
    res.json(ministries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authorizePermissions(PERMISSIONS.MANAGE_MINISTRIES), async (req, res) => {
  try {
    const payload = normalizeMinistryPayload(req.body);
    const ministry = await Ministry.create(payload);
    await syncMinistryMembers(ministry, payload);
    await logAudit({
      action: "create",
      module: "Ministry",
      recordType: "Ministry",
      recordId: ministry._id.toString(),
      newValue: ministry.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(ministry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:ministryId", authorizePermissions(PERMISSIONS.MANAGE_MINISTRIES), async (req, res) => {
  const ministry = await Ministry.findById(req.params.ministryId);
  if (!ministry) {
    return res.status(404).json({ message: "Ministry not found." });
  }

  const previousValue = ministry.toObject();
  const payload = normalizeMinistryPayload(req.body);

  ministry.name = payload.name ?? ministry.name;
  ministry.description = payload.description ?? ministry.description;
  ministry.leader = payload.leader ?? ministry.leader;
  ministry.leadership = payload.leadership ?? ministry.leadership;
  ministry.members = payload.members ?? ministry.members;
  ministry.color = payload.color ?? ministry.color;

  try {
    await ministry.save();
    await syncMinistryMembers(ministry, payload);
    await logAudit({
      action: "update",
      module: "Ministry",
      recordType: "Ministry",
      recordId: ministry._id.toString(),
      previousValue,
      newValue: ministry.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    return res.json(ministry);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

function normalizeMinistryPayload(payload = {}) {
  const leadership = normalizeLeadership(payload.leadership || payload);
  const members = normalizeSelectionArray(payload.members);

  return {
    name: payload.name || "",
    description: payload.description || "",
    color: payload.color || "#5b8def",
    leadership,
    members,
    leader:
      leadership.chairman?.memberName ||
      leadership.elderInCharge?.memberName ||
      leadership.deaconInCharge?.memberName ||
      payload.leader ||
      "",
  };
}

function normalizeLeadership(source = {}) {
  return {
    elderInCharge: normalizeSelection(source.elderInCharge),
    deaconInCharge: normalizeSelection(source.deaconInCharge),
    chairman: normalizeSelection(source.chairman),
    assistantChairman: normalizeSelection(source.assistantChairman),
    organizer: normalizeSelection(source.organizer),
    assistantOrganizer: normalizeSelection(source.assistantOrganizer),
    secretary: normalizeSelection(source.secretary),
    assistantSecretary: normalizeSelection(source.assistantSecretary),
    treasurer: normalizeSelection(source.treasurer),
    assistantTreasurer: normalizeSelection(source.assistantTreasurer),
  };
}

function normalizeSelection(value) {
  if (!value?.memberId) {
    return undefined;
  }

  return {
    memberId: value.memberId,
    memberName: value.memberName || value.memberId,
  };
}

function normalizeSelectionArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeSelection(item))
    .filter(Boolean)
    .reduce((accumulator, item) => {
      if (accumulator.some((entry) => entry.memberId === item.memberId)) {
        return accumulator;
      }

      return [...accumulator, item];
    }, []);
}

async function syncMinistryMembers(ministry, payload) {
  const leadershipSelections = Object.values(payload.leadership || {}).filter(Boolean);
  const assignedMemberIds = [...(payload.members || []), ...leadershipSelections]
    .map((item) => item.memberId)
    .filter(Boolean);

  await Member.updateMany({ ministry: ministry._id }, { $set: { ministry: null } });

  if (assignedMemberIds.length) {
    await Member.updateMany(
      { memberId: { $in: assignedMemberIds } },
      { $set: { ministry: ministry._id } }
    );
  }
}

module.exports = router;
