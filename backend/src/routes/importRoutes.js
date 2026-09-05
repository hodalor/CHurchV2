const express = require("express");
const multer = require("multer");
const Member = require("../models/Member");
const Family = require("../models/Family");
const Ministry = require("../models/Ministry");
const Group = require("../models/Group");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { generateDuplicateExplanation } = require("../services/aiService");
const { logAudit } = require("../services/auditService");
const {
  evaluateDuplicateCandidatesForRecord,
  upsertDuplicateCandidates,
} = require("../services/duplicateDetectionService");
const { assignMemberQr } = require("../services/memberQrService");
const { parseCsv, toCsv } = require("../utils/csvUtils");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.use(authenticate);

router.get("/template/:entity", async (req, res) => {
  try {
    const entity = String(req.params.entity || "").toLowerCase();
    authorizeEntityAccess(entity, req, "manage");
    const template = getTemplateRows(entity);

    if (!template) {
      return res.status(404).json({ message: "Import template not found." });
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${entity}-import-template.csv\"`);
    return res.send(toCsv(template));
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
});

router.post("/preview/:entity", upload.single("file"), async (req, res) => {
  try {
    const entity = String(req.params.entity || "").toLowerCase();
    authorizeEntityAccess(entity, req, "manage");

    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "Choose a CSV file to preview." });
    }

    const rows = parseCsv(req.file.buffer.toString("utf8"));
    const preview = await previewImport(entity, rows);
    return res.json(preview);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
});

router.post("/commit/:entity", async (req, res) => {
  try {
    const entity = String(req.params.entity || "").toLowerCase();
    authorizeEntityAccess(entity, req, "manage");
    const rows = Array.isArray(req.body?.rows)
      ? req.body.rows.map((item) => (item?.row ? item.row : item))
      : [];

    if (!rows.length) {
      return res.status(400).json({ message: "No preview rows were provided for import." });
    }

    const result = await commitImport(entity, rows, req.user, req.ip);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
});

function authorizeEntityAccess(entity, req, mode) {
  const permissionByEntity = {
    members: mode === "manage" ? PERMISSIONS.MANAGE_MEMBERS : PERMISSIONS.VIEW_MEMBERS,
    households: mode === "manage" ? PERMISSIONS.MANAGE_HOUSEHOLDS : PERMISSIONS.VIEW_HOUSEHOLDS,
    ministrymembers: mode === "manage" ? PERMISSIONS.MANAGE_MINISTRIES : PERMISSIONS.VIEW_MINISTRIES,
  };

  const permission = permissionByEntity[entity];
  if (!permission) {
    const error = new Error("Import type is not supported.");
    error.status = 404;
    throw error;
  }

  const userPermissions = new Set(req.user?.permissions || []);
  if (!userPermissions.has(permission)) {
    const error = new Error("You do not have permission to use this import.");
    error.status = 403;
    throw error;
  }
}

function getTemplateRows(entity) {
  if (entity === "members") {
    return [
      [
        "*firstName",
        "*lastName",
        "otherName",
        "preferredName",
        "memberType",
        "*gender",
        "maritalStatus",
        "dateOfBirth",
        "*phone",
        "email",
        "*residentialArea",
        "address",
        "city",
        "country",
        "occupation",
        "employerOrBusiness",
        "educationOrSkills",
        "*membershipStatus",
        "membershipDate",
        "dateJoined",
        "baptismStatus",
        "baptismDate",
        "placeBaptized",
        "baptizedBy",
        "previousCongregation",
        "transferDetails",
        "notes",
        "ministryName",
        "groupNames",
        "sourceRecordRef",
      ],
      [
        "John",
        "Banda",
        "",
        "",
        "Adult",
        "Male",
        "Married",
        "1988-04-15",
        "+260977000111",
        "john@example.com",
        "Chilenje",
        "Plot 10",
        "Lusaka",
        "Zambia",
        "Teacher",
        "",
        "",
        "Active",
        "2026-01-05",
        "2026-01-05",
        "Not Baptized",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Bulk import template row",
      ],
    ];
  }

  if (entity === "households") {
    return [
      [
        "*familyName",
        "*physicalAddress",
        "residentialArea",
        "fellowshipZone",
        "primaryContactMemberId",
        "primaryContactNumber",
        "headOfHouseholdMemberId",
        "spouseMemberId",
        "childrenMemberIds",
        "dependantsMemberIds",
        "visitationHistory",
        "dateLastVisited",
        "sourceRecordRef",
      ],
      [
        "Banda Household",
        "Plot 10 Chilenje",
        "Chilenje",
        "Kabwata",
        "M000001",
        "+260977000111",
        "M000001",
        "M000002",
        "M000003;M000004",
        "",
        "Visited by deacons",
        "2026-08-01",
        "Bulk import template row",
      ],
    ];
  }

  if (entity === "ministrymembers") {
    return [
      [
        "*ministryName",
        "*memberId",
        "assignmentType",
      ],
      [
        "Choir",
        "M000001",
        "member",
      ],
    ];
  }

  return null;
}

async function previewImport(entity, rows) {
  if (entity === "members") {
    return previewMembers(rows);
  }

  if (entity === "households") {
    return previewHouseholds(rows);
  }

  if (entity === "ministrymembers") {
    return previewMinistryMembers(rows);
  }

  throw new Error("Import type is not supported.");
}

async function commitImport(entity, rows, user, ipAddress) {
  if (entity === "members") {
    return commitMembers(rows, user, ipAddress);
  }

  if (entity === "households") {
    return commitHouseholds(rows, user, ipAddress);
  }

  if (entity === "ministrymembers") {
    return commitMinistryMembers(rows, user, ipAddress);
  }

  throw new Error("Import type is not supported.");
}

async function previewMembers(rows) {
  const ministries = await Ministry.find({}, { name: 1 }).lean();
  const groups = await Group.find({}, { name: 1, code: 1 }).lean();
  const ministryNames = new Set(ministries.map((item) => item.name.toLowerCase()));
  const groupNames = new Set(groups.map((item) => item.name.toLowerCase()));

  const previewRows = await Promise.all(rows.map(async (row) => {
    const errors = [];
    const warnings = [];
    requireFields(row, ["firstName", "lastName", "gender", "phone", "residentialArea", "membershipStatus"], errors);
    validateIsoDateField(row, "dateOfBirth", errors);
    validateIsoDateField(row, "membershipDate", errors);
    validateIsoDateField(row, "dateJoined", errors);
    validateIsoDateField(row, "baptismDate", errors);

    if (row.ministryName && !ministryNames.has(row.ministryName.toLowerCase())) {
      errors.push(`Ministry \"${row.ministryName}\" was not found.`);
    }

    const requestedGroups = splitList(row.groupNames);
    requestedGroups.forEach((name) => {
      if (!groupNames.has(name.toLowerCase())) {
        errors.push(`Group \"${name}\" was not found.`);
      }
    });

    const duplicates = await evaluateDuplicateCandidatesForRecord("member", row, {
      minimumScore: 70,
    });
    const duplicatePreview = await Promise.all(
      duplicates.slice(0, 3).map(async (candidate) => {
        const explanation = await generateDuplicateExplanation({
          recordType: "member",
          incomingLabel: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
          candidateLabel: candidate.recordLabel,
          reasons: candidate.matchReasons,
        });
        return {
          ...candidate,
          aiExplanation: explanation.text,
        };
      })
    );
    if (duplicatePreview.length) {
      warnings.push(`Possible duplicate with ${duplicatePreview.map((item) => item.recordId).join(", ")}.`);
    }

    return {
      rowNumber: row.__rowNumber,
      valid: !errors.length,
      errors,
      warnings,
      duplicates: duplicatePreview,
      preview: {
        firstName: row.firstName || "",
        lastName: row.lastName || "",
        phone: row.phone || "",
        membershipStatus: row.membershipStatus || "",
        ministryName: row.ministryName || "",
        groupNames: requestedGroups.join(", "),
      },
      row,
    };
  }));

  return buildPreviewResponse(previewRows);
}

async function previewHouseholds(rows) {
  const members = await Member.find({}, { memberId: 1, firstName: 1, lastName: 1 }).lean();
  const memberIds = new Set(members.map((item) => item.memberId));

  const previewRows = rows.map((row) => {
    const errors = [];
    requireFields(row, ["familyName", "physicalAddress"], errors);
    validateIsoDateField(row, "dateLastVisited", errors);

    [
      row.primaryContactMemberId,
      row.headOfHouseholdMemberId,
      row.spouseMemberId,
      ...splitList(row.childrenMemberIds),
      ...splitList(row.dependantsMemberIds),
    ]
      .filter(Boolean)
      .forEach((memberId) => {
        if (!memberIds.has(memberId)) {
          errors.push(`Member \"${memberId}\" was not found.`);
        }
      });

    return {
      rowNumber: row.__rowNumber,
      valid: !errors.length,
      errors,
      preview: {
        familyName: row.familyName || "",
        physicalAddress: row.physicalAddress || "",
        headOfHouseholdMemberId: row.headOfHouseholdMemberId || "",
      },
      row,
    };
  });

  return buildPreviewResponse(previewRows);
}

async function previewMinistryMembers(rows) {
  const ministries = await Ministry.find({}, { name: 1 }).lean();
  const members = await Member.find({}, { memberId: 1, firstName: 1, lastName: 1 }).lean();
  const ministryNames = new Set(ministries.map((item) => item.name.toLowerCase()));
  const memberIds = new Set(members.map((item) => item.memberId));
  const validAssignmentTypes = new Set([
    "member",
    "elderInCharge",
    "deaconInCharge",
    "chairman",
    "assistantChairman",
    "organizer",
    "assistantOrganizer",
    "secretary",
    "assistantSecretary",
    "treasurer",
    "assistantTreasurer",
  ]);

  const previewRows = rows.map((row) => {
    const errors = [];
    requireFields(row, ["ministryName", "memberId"], errors);

    if (row.ministryName && !ministryNames.has(row.ministryName.toLowerCase())) {
      errors.push(`Ministry \"${row.ministryName}\" was not found.`);
    }

    if (row.memberId && !memberIds.has(row.memberId)) {
      errors.push(`Member \"${row.memberId}\" was not found.`);
    }

    if (row.assignmentType && !validAssignmentTypes.has(row.assignmentType)) {
      errors.push(`Assignment type \"${row.assignmentType}\" is not supported.`);
    }

    return {
      rowNumber: row.__rowNumber,
      valid: !errors.length,
      errors,
      preview: {
        ministryName: row.ministryName || "",
        memberId: row.memberId || "",
        assignmentType: row.assignmentType || "member",
      },
      row,
    };
  });

  return buildPreviewResponse(previewRows);
}

async function commitMembers(rows, user, ipAddress) {
  const preview = await previewMembers(rows);
  throwIfPreviewHasErrors(preview);

  const ministries = await Ministry.find();
  const groups = await Group.find().lean();
  let nextNumber = await getNextMemberNumber();
  const created = [];

  for (const entry of preview.rows) {
    const row = entry.row;
    const ministry = ministries.find((item) => item.name.toLowerCase() === String(row.ministryName || "").toLowerCase());
    const selectedGroups = splitList(row.groupNames)
      .map((name) => groups.find((item) => item.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean)
      .map((group) => ({
        groupId: group._id,
        levelName: "",
        groupName: group.name,
        groupCode: group.code || "",
      }));

    const member = await Member.create({
      memberId: `M${String(nextNumber).padStart(6, "0")}`,
      firstName: row.firstName,
      lastName: row.lastName,
      otherName: row.otherName || "",
      preferredName: row.preferredName || "",
      memberType: row.memberType || "Adult",
      gender: row.gender || "Male",
      maritalStatus: row.maritalStatus || "",
      dateOfBirth: parseIsoDateValue(row.dateOfBirth),
      phone: row.phone,
      email: row.email || "",
      residentialArea: row.residentialArea,
      address: row.address || "",
      city: row.city || "",
      country: row.country || "",
      occupation: row.occupation || "",
      employerOrBusiness: row.employerOrBusiness || "",
      educationOrSkills: row.educationOrSkills || "",
      membershipStatus: row.membershipStatus,
      membershipDate: parseIsoDateValue(row.membershipDate),
      dateJoined: parseIsoDateValue(row.dateJoined) || parseIsoDateValue(row.membershipDate),
      baptismStatus: row.baptismStatus || "Not Baptized",
      baptismDate: parseIsoDateValue(row.baptismDate),
      placeBaptized: row.placeBaptized || "",
      baptizedBy: row.baptizedBy || "",
      previousCongregation: row.previousCongregation || "",
      transferDetails: row.transferDetails || "",
      notes: row.notes || "",
      ministry: ministry?._id || null,
      groups: selectedGroups,
      sourceRecordRef: row.sourceRecordRef || "bulk-import",
      dataEntryClerk: user?.displayName || user?.username || "",
      dateCaptured: new Date(),
    });

    if (ministry) {
      const existingMembers = Array.isArray(ministry.members) ? ministry.members : [];
      if (!existingMembers.some((item) => item.memberId === member.memberId)) {
        ministry.members = [
          ...existingMembers,
          {
            memberId: member.memberId,
            memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
          },
        ];
        await ministry.save();
      }
    }

    await assignMemberQr(member, user || null);
    if (entry.duplicates?.length) {
      await upsertDuplicateCandidates({
        recordType: "member",
        baseRecordId: member.memberId,
        baseRecordLabel: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
        candidates: entry.duplicates,
        sourceModule: "Imports",
        metadata: {
          trigger: "bulk-import",
          rowNumber: entry.rowNumber,
        },
        user,
        ipAddress,
      });
    }
    created.push(member);
    nextNumber += 1;
  }

  await logAudit({
    action: "create",
    module: "Imports",
    recordType: "MemberImport",
    recordId: `member-import-${Date.now()}`,
    newValue: {
      importedCount: created.length,
      memberIds: created.map((item) => item.memberId),
    },
    user,
    ipAddress,
  });

  return {
    success: true,
    importedCount: created.length,
  };
}

async function commitHouseholds(rows, user, ipAddress) {
  const preview = await previewHouseholds(rows);
  throwIfPreviewHasErrors(preview);

  const members = await Member.find({}, { memberId: 1, firstName: 1, lastName: 1 }).lean();
  let nextNumber = await getNextHouseholdNumber();
  const created = [];

  for (const entry of preview.rows) {
    const row = entry.row;
    const householdMembers = buildHouseholdMembers(row, members);
    const family = await Family.create({
      familyId: `HH${String(nextNumber).padStart(6, "0")}`,
      familyName: row.familyName,
      physicalAddress: row.physicalAddress,
      residentialArea: row.residentialArea || "",
      fellowshipZone: row.fellowshipZone || "",
      primaryContactMemberId: row.primaryContactMemberId || row.headOfHouseholdMemberId || "",
      primaryContactNumber: row.primaryContactNumber || "",
      headOfHousehold: buildMemberLookup(row.headOfHouseholdMemberId, members),
      spouse: buildMemberLookup(row.spouseMemberId, members),
      children: splitList(row.childrenMemberIds).map((memberId) => buildMemberLookup(memberId, members)).filter(Boolean),
      dependants: splitList(row.dependantsMemberIds).map((memberId) => buildMemberLookup(memberId, members)).filter(Boolean),
      visitationHistory: row.visitationHistory || "",
      dateLastVisited: parseIsoDateValue(row.dateLastVisited),
      sourceRecordRef: row.sourceRecordRef || "bulk-import",
      dataEntryClerk: user?.displayName || user?.username || "",
      dateCaptured: new Date(),
      householdMembers,
    });

    await syncMembersToFamily(family);
    created.push(family);
    nextNumber += 1;
  }

  await logAudit({
    action: "create",
    module: "Imports",
    recordType: "HouseholdImport",
    recordId: `household-import-${Date.now()}`,
    newValue: {
      importedCount: created.length,
      familyIds: created.map((item) => item.familyId),
    },
    user,
    ipAddress,
  });

  return {
    success: true,
    importedCount: created.length,
  };
}

async function commitMinistryMembers(rows, user, ipAddress) {
  const preview = await previewMinistryMembers(rows);
  throwIfPreviewHasErrors(preview);

  const ministries = await Ministry.find();
  const members = await Member.find({}, { memberId: 1, firstName: 1, lastName: 1 }).lean();
  const touchedMinistries = new Map();

  for (const entry of preview.rows) {
    const row = entry.row;
    const ministry = ministries.find((item) => item.name.toLowerCase() === row.ministryName.toLowerCase());
    const member = members.find((item) => item.memberId === row.memberId);
    const selection = {
      memberId: member.memberId,
      memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
    };
    const assignmentType = row.assignmentType || "member";

    if (assignmentType === "member") {
      const existingMembers = Array.isArray(ministry.members) ? ministry.members : [];
      if (!existingMembers.some((item) => item.memberId === selection.memberId)) {
        ministry.members = [...existingMembers, selection];
      }
    } else {
      ministry.leadership = {
        ...(ministry.leadership || {}),
        [assignmentType]: selection,
      };
    }

    touchedMinistries.set(ministry._id.toString(), ministry);
  }

  for (const ministry of touchedMinistries.values()) {
    await ministry.save();
    await syncMinistryMembers(ministry);
  }

  await logAudit({
    action: "create",
    module: "Imports",
    recordType: "MinistryMembershipImport",
    recordId: `ministry-member-import-${Date.now()}`,
    newValue: {
      importedCount: preview.rows.length,
      ministriesUpdated: [...touchedMinistries.values()].map((item) => item.name),
    },
    user,
    ipAddress,
  });

  return {
    success: true,
    importedCount: preview.rows.length,
  };
}

function buildPreviewResponse(previewRows) {
  return {
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      validRows: previewRows.filter((item) => item.valid).length,
      invalidRows: previewRows.filter((item) => !item.valid).length,
    },
  };
}

function throwIfPreviewHasErrors(preview) {
  if (preview.summary.invalidRows > 0) {
    throw new Error("Fix the invalid rows in preview before importing.");
  }
}

function requireFields(row, fieldNames, errors) {
  fieldNames.forEach((fieldName) => {
    if (!String(row[fieldName] || "").trim()) {
      errors.push(`${fieldName} is required.`);
    }
  });
}

function validateIsoDateField(row, fieldName, errors) {
  const value = String(row?.[fieldName] || "").trim();
  if (!value) {
    return;
  }

  if (!parseIsoDateValue(value)) {
    errors.push(`${fieldName} must use YYYY-MM-DD format.`);
  }
}

function splitList(value = "") {
  return String(value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseIsoDateValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map((item) => Number(item));
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

async function getNextMemberNumber() {
  const members = await Member.find({}, { memberId: 1 }).lean();
  return (
    members.reduce((maxValue, item) => {
      const numericPart = Number(String(item.memberId || "").replace("M", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1
  );
}

async function getNextHouseholdNumber() {
  const families = await Family.find({}, { familyId: 1 }).lean();
  return (
    families.reduce((maxValue, item) => {
      const numericPart = Number(String(item.familyId || "").replace("HH", ""));
      return Number.isNaN(numericPart) ? maxValue : Math.max(maxValue, numericPart);
    }, 0) + 1
  );
}

function buildMemberLookup(memberId, members) {
  if (!memberId) {
    return null;
  }

  const member = members.find((item) => item.memberId === memberId);
  if (!member) {
    return null;
  }

  return {
    memberId: member.memberId,
    memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
  };
}

function buildHouseholdMembers(row, members) {
  const membersToAttach = [];
  const pushMember = (memberId, relationshipToHead) => {
    const lookup = buildMemberLookup(memberId, members);
    if (!lookup || membersToAttach.some((item) => item.memberId === lookup.memberId)) {
      return;
    }
    membersToAttach.push({
      ...lookup,
      relationshipToHead,
      status: "Active",
    });
  };

  pushMember(row.headOfHouseholdMemberId, "Head");
  pushMember(row.spouseMemberId, "Spouse");
  splitList(row.childrenMemberIds).forEach((memberId) => pushMember(memberId, "Child"));
  splitList(row.dependantsMemberIds).forEach((memberId) => pushMember(memberId, "Dependant"));
  return membersToAttach;
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

async function syncMinistryMembers(ministry) {
  const leadershipSelections = Object.values(ministry.leadership || {}).filter(Boolean);
  const assignedMemberIds = [...(ministry.members || []), ...leadershipSelections]
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
