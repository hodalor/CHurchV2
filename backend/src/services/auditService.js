const AuditLog = require("../models/AuditLog");

async function logAudit({
  action,
  module,
  recordType,
  recordId,
  previousValue = null,
  newValue = null,
  user = null,
  ipAddress = "",
}) {
  await AuditLog.create({
    action,
    module,
    recordType,
    recordId,
    previousValue,
    newValue,
    changedByUserId: user?._id || null,
    changedByUsername: user?.username || "",
    ipAddress,
  });
}

module.exports = {
  logAudit,
};
