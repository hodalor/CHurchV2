const express = require("express");
const Member = require("../models/Member");

const router = express.Router();

router.get("/next-id", async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const memberId = `MB${String(totalMembers + 1).padStart(4, "0")}`;
    res.json({ memberId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const members = await Member.find()
      .populate("ministry", "name color")
      .sort({ createdAt: -1 });

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const member = await Member.create(normalizeMemberPayload(req.body));
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    await member.populate("ministry", "name color");

    return res.json(member);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

function normalizeMemberPayload(payload = {}) {
  const personalPhoto = normalizePhotoField(payload.personalPhoto);
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

  return normalized;
}

function normalizePhotoField(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    if (!/^https?:\/\//i.test(value)) {
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
