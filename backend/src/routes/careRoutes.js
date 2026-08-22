const express = require("express");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const {
  createCareCase,
  createCareNote,
  createCounselingSession,
  createVisitationRecord,
  listCareCases,
  listCareNotes,
  promoteNoteToCase,
} = require("../services/pastoralCareService");
const { listLookupValuesByType } = require("../services/lookupService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
router.use(authenticate);

router.get("/options", authorizePermissions(PERMISSIONS.VIEW_PASTORAL_CARE), async (req, res) => {
  try {
    const noteTypes = await listLookupValuesByType("care_note_type");
    res.json({ noteTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/cases", authorizePermissions(PERMISSIONS.VIEW_PASTORAL_CARE), async (req, res) => {
  try {
    res.json(await listCareCases());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/cases", authorizePermissions(PERMISSIONS.MANAGE_PASTORAL_CARE), async (req, res) => {
  try {
    res.status(201).json(await createCareCase({ payload: req.body, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/notes", authorizePermissions(PERMISSIONS.VIEW_PASTORAL_CARE), async (req, res) => {
  try {
    res.json(await listCareNotes({ user: req.user, ipAddress: req.ip, careCaseId: req.query.careCaseId || "" }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/notes", authorizePermissions(PERMISSIONS.MANAGE_PASTORAL_CARE), async (req, res) => {
  try {
    res.status(201).json(await createCareNote({ payload: req.body, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/notes/:noteId/promote", authorizePermissions(PERMISSIONS.MANAGE_PASTORAL_CARE), async (req, res) => {
  try {
    res.json(await promoteNoteToCase({ noteId: req.params.noteId, payload: req.body, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/counseling-sessions", authorizePermissions(PERMISSIONS.MANAGE_PASTORAL_CARE), async (req, res) => {
  try {
    res.status(201).json(await createCounselingSession({ payload: req.body, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/visitations", authorizePermissions(PERMISSIONS.MANAGE_PASTORAL_CARE), async (req, res) => {
  try {
    res.status(201).json(await createVisitationRecord({ payload: req.body, user: req.user, ipAddress: req.ip }));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
