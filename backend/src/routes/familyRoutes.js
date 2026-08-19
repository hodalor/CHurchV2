const express = require("express");
const Family = require("../models/Family");
const Member = require("../models/Member");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const families = await Family.find().sort({ createdAt: -1 });
    res.json(families);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/next-id", async (req, res) => {
  try {
    const familyId = await generateNextFamilyId();
    res.json({ familyId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = await normalizeFamilyPayload(req.body);
    const family = await Family.create(payload);
    await syncMembersToFamily(payload);
    res.status(201).json(family);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = await normalizeFamilyPayload(req.body);
    const family = await Family.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!family) {
      return res.status(404).json({ message: "Family not found." });
    }

    await syncMembersToFamily(payload);
    return res.json(family);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;

async function generateNextFamilyId() {
  const latestFamily = await Family.findOne().sort({ familyId: -1 }).lean();
  const latestNumericPart = latestFamily ? Number(String(latestFamily.familyId).replace("HH", "")) : 0;
  return `HH${String((Number.isNaN(latestNumericPart) ? 0 : latestNumericPart) + 1).padStart(6, "0")}`;
}

async function normalizeFamilyPayload(body) {
  if (!String(body.familyName || "").trim()) {
    throw new Error("Household name is required.");
  }

  if (!String(body.physicalAddress || "").trim()) {
    throw new Error("Residential address is required.");
  }

  const familyId = body.familyId || (await generateNextFamilyId());

  return {
    familyId,
    familyName: body.familyName,
    primaryContactMemberId:
      body.primaryContactMemberId ||
      normalizeLookup(body.headOfHousehold)?.memberId ||
      normalizeLookup(body.spouse)?.memberId ||
      "",
    primaryContactNumber: body.primaryContactNumber || "",
    headOfHousehold: normalizeLookup(body.headOfHousehold),
    spouse: normalizeLookup(body.spouse),
    children: normalizeLookupArray(body.children),
    dependants: normalizeLookupArray(body.dependants),
    residentialArea: body.residentialArea || "",
    physicalAddress: body.physicalAddress || "",
    fellowshipZone: body.fellowshipZone || "",
    familyContact: body.familyContact || "",
    visitationHistory: body.visitationHistory || "",
    dateLastVisited: body.dateLastVisited ? new Date(body.dateLastVisited) : null,
    sourceRecordRef: body.sourceRecordRef || "",
    dataEntryClerk: body.dataEntryClerk || "",
    dateCaptured: body.dateCaptured ? new Date(body.dateCaptured) : new Date(),
    householdMembers: normalizeHouseholdMembers(body.householdMembers),
  };
}

function normalizeLookup(value) {
  if (!value || !value.memberId) {
    return null;
  }

  return {
    memberId: value.memberId,
    memberName: value.memberName,
  };
}

function normalizeLookupArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeLookup(item))
    .filter(Boolean);
}

function normalizeHouseholdMembers(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item?.memberId && item?.memberName && item?.relationshipToHead)
    .map((item) => ({
      memberId: item.memberId,
      memberName: item.memberName,
      relationshipToHead: item.relationshipToHead,
      status: item.status || "Active",
    }));
}

async function syncMembersToFamily(family) {
  const householdMembers = Array.isArray(family.householdMembers) ? family.householdMembers : [];

  await Promise.all(
    householdMembers.map((item) =>
      Member.findOneAndUpdate(
        { memberId: item.memberId },
        {
          $set: {
            familyId: family.familyId,
            familyName: family.familyName,
            householdRole: item.relationshipToHead,
          },
        }
      )
    )
  );
}
