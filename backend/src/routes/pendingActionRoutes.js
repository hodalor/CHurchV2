const express = require("express");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { listPendingActions } = require("../services/pendingActionService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get("/", authorizePermissions(PERMISSIONS.VIEW_PENDING_ACTIONS), async (req, res) => {
  const filters = {};
  if (req.query.status) {
    filters.status = req.query.status;
  }

  const actions = await listPendingActions(filters);
  res.json(actions);
});

module.exports = router;
