const PendingAction = require("../models/PendingAction");

async function createPendingAction(payload) {
  return PendingAction.create(payload);
}

async function listPendingActions(filters = {}) {
  return PendingAction.find(filters).populate("assignedUser", "displayName username").sort({ dueDate: 1, createdAt: -1 });
}

module.exports = {
  createPendingAction,
  listPendingActions,
};
