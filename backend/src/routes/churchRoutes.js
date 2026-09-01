const express = require("express");
const authenticate = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { createChurch, listChurches, updateChurch } = require("../services/churchService");
const { ROLES } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPERADMIN));

router.get("/", async (req, res) => {
  try {
    const churches = await listChurches();
    res.json(churches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const church = await createChurch({
      payload: req.body,
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(church);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/:churchId", async (req, res) => {
  try {
    const church = await updateChurch({
      churchId: req.params.churchId,
      payload: req.body,
      user: req.user,
      ipAddress: req.ip,
    });
    res.json(church);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
