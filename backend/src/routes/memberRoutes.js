const express = require("express");
const Member = require("../models/Member");
const { logAudit } = require("../services/auditService");
const {
  assignMemberQr,
  migrateMemberQRCodes,
  regenerateMemberQr,
} = require("../services/memberQrService");

const router = express.Router();

router.get("/next-id", async (req, res) => {
  try {
    const members = await Member.find({}, { memberId: 1 }).lean();
    const nextNumber =
      members.reduce((maxValue, item) => {
        const numericPart = Number(String(item.memberId || "").replace("M", ""));
        return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
      }, 0) + 1;
    const memberId = `M${String(nextNumber).padStart(6, "0")}`;
    res.json({ memberId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const members = await populateMembersQuery();
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/qr/migrate", async (req, res) => {
  try {
    const summary = await migrateMemberQRCodes({
      limit: Number(req.body?.limit) || 0,
      user: req.user || null,
    });

    await logAudit({
      action: "update",
      module: "Members",
      recordType: "MemberQRMigration",
      recordId: "bulk-member-qr-migration",
      newValue: summary,
      user: req.user,
      ipAddress: req.ip,
    });

    res.json(summary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const member = await Member.create(normalizeMemberPayload(req.body));
    await assignMemberQr(member, req.user || null);
    const populatedMember = await populateMemberById(member._id);
    res.status(201).json(populatedMember);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:memberId/qr", async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId).populate("qrRegeneratedBy", "displayName username");
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    return res.json({
      memberId: member.memberId,
      fullName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
      qrToken: member.qrToken || "",
      qrCodeImageUrl: member.qrCodeImageUrl || "",
      qrGeneratedAt: member.qrGeneratedAt || null,
      qrRegeneratedAt: member.qrRegeneratedAt || null,
      qrRegeneratedBy: member.qrRegeneratedBy || null,
      qrActive: Boolean(member.qrActive),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/:memberId/qr/regenerate", async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    const previousValue = {
      qrToken: member.qrToken,
      qrCodeImageUrl: member.qrCodeImageUrl,
      qrGeneratedAt: member.qrGeneratedAt,
      qrRegeneratedAt: member.qrRegeneratedAt,
      qrActive: member.qrActive,
    };

    await regenerateMemberQr(member, req.user || null);
    const populatedMember = await populateMemberById(member._id);

    await logAudit({
      action: "update",
      module: "Members",
      recordType: "Member",
      recordId: member.memberId,
      previousValue,
      newValue: {
        qrToken: member.qrToken,
        qrCodeImageUrl: member.qrCodeImageUrl,
        qrGeneratedAt: member.qrGeneratedAt,
        qrRegeneratedAt: member.qrRegeneratedAt,
        qrActive: member.qrActive,
      },
      user: req.user,
      ipAddress: req.ip,
    });

    return res.json(populatedMember);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/:memberId", async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    Object.assign(member, normalizeMemberPayload(req.body));
    await member.save();
    const populatedMember = await populateMemberById(member._id);

    return res.json(populatedMember);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/:memberId", async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    await Member.deleteOne({ _id: member._id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

async function populateMembersQuery() {
  return Member.find()
    .populate("ministry", "name color")
    .populate("qrRegeneratedBy", "displayName username")
    .sort({ createdAt: -1 });
}

async function populateMemberById(memberId) {
  return Member.findById(memberId)
    .populate("ministry", "name color")
    .populate("qrRegeneratedBy", "displayName username");
}

function normalizeMemberPayload(payload = {}) {
  const personalPhoto = normalizePhotoField(payload.personalPhoto);
  validateRequiredFields(payload);
  const normalized = {
    ...payload,
    ministry: payload.ministry || payload.ministryId || null,
    personalPhoto,
    idFrontPhoto: normalizePhotoField(payload.idFrontPhoto),
    idBackPhoto: normalizePhotoField(payload.idBackPhoto),
    photoFileName: payload.photoFileName || personalPhoto?.label || "",
    membershipDate: payload.membershipDate || payload.dateJoined || null,
    dateJoined: payload.dateJoined || payload.membershipDate || null,
    baptismDate: payload.baptismDate || payload.dateBaptized || null,
    dateCaptured: payload.dateCaptured || new Date(),
  };

  delete normalized.ministryId;
  delete normalized.dateBaptized;
  delete normalized.qrToken;
  delete normalized.qrCodeImageUrl;
  delete normalized.qrGeneratedAt;
  delete normalized.qrRegeneratedAt;
  delete normalized.qrRegeneratedBy;
  delete normalized.qrActive;

  return normalized;
}

function validateRequiredFields(payload = {}) {
  const requiredPairs = [
    ["firstName", "First name"],
    ["lastName", "Surname"],
    ["gender", "Gender"],
    ["phone", "Primary mobile"],
    ["residentialArea", "Residential area"],
    ["membershipStatus", "Membership status"],
  ];

  const missing = requiredPairs.find(([fieldName]) => !String(payload[fieldName] || "").trim());

  if (missing) {
    throw new Error(`${missing[1]} is required.`);
  }
}

function normalizePhotoField(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    if (!/^https?:\/\//i.test(value) && !/^data:image\//i.test(value)) {
      return undefined;
    }

    return {
      url: value,
      label: extractFileName(value),
    };
  }

  if (typeof value === "object" && value.url) {
    return {
      url: value.url,
      label: value.label || extractFileName(value.url),
    };
  }

  return undefined;
}

function extractFileName(value = "") {
  const cleanValue = String(value).split("?")[0];
  const parts = cleanValue.split("/");
  return parts[parts.length - 1] || "upload";
}

module.exports = router;
