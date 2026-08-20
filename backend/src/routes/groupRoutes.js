const express = require("express");
const Group = require("../models/Group");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
router.use(authenticate);

router.get("/", authorizePermissions(PERMISSIONS.VIEW_GROUPS), async (req, res) => {
  try {
    const groups = await Group.find().populate("parent", "name code").sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authorizePermissions(PERMISSIONS.MANAGE_GROUPS), async (req, res) => {
  try {
    const payload = await normalizeGroupPayload(req.body);
    const group = await Group.create(payload);
    await group.populate("parent", "name code");
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:groupId", authorizePermissions(PERMISSIONS.MANAGE_GROUPS), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const payload = await normalizeGroupPayload(req.body, group._id);
    group.name = payload.name;
    group.code = payload.code;
    group.parent = payload.parent;
    group.description = payload.description;
    await group.save();
    await group.populate("parent", "name code");
    return res.json(group);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/:groupId", authorizePermissions(PERMISSIONS.MANAGE_GROUPS), async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const hasChildren = await Group.exists({ parent: group._id });
    if (hasChildren) {
      return res.status(400).json({ message: "Delete child groups first." });
    }

    await Group.deleteOne({ _id: group._id });
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

async function normalizeGroupPayload(payload = {}, currentGroupId = null) {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Group name is required.");
  }

  const parent = payload.parentId || payload.parent || null;
  if (parent && currentGroupId && String(parent) === String(currentGroupId)) {
    throw new Error("A group cannot be its own parent.");
  }

  if (parent) {
    const parentGroup = await Group.findById(parent);
    if (!parentGroup) {
      throw new Error("Selected parent group was not found.");
    }
  }

  const code = await generateGroupCode(name, currentGroupId);

  return {
    name,
    code,
    parent,
    description: String(payload.description || "").trim(),
  };
}

async function generateGroupCode(name, currentGroupId = null) {
  const baseCode = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18) || "GROUP";

  let code = baseCode;
  let suffix = 1;

  while (
    await Group.exists({
      code,
      ...(currentGroupId ? { _id: { $ne: currentGroupId } } : {}),
    })
  ) {
    suffix += 1;
    code = `${baseCode}_${suffix}`;
  }

  return code;
}

module.exports = router;
