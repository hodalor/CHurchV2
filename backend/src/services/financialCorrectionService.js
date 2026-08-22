const { logAudit } = require("./auditService");

async function voidWithReversal({
  entityModel,
  entityName,
  entityId,
  user,
  ipAddress = "",
  voidReason = "",
  buildReversalPayload,
}) {
  const entity = await entityModel.findById(entityId);
  if (!entity) {
    throw new Error(`${entityName} not found.`);
  }

  if (entity.status === "voided") {
    throw new Error(`${entityName} is already voided.`);
  }

  const previousValue = entity.toObject();
  const reversalPayload = await buildReversalPayload(entity);
  const reversalEntity = await entityModel.create(reversalPayload);

  entity.status = "voided";
  entity.voidedBy = user?._id || null;
  entity.voidedAt = new Date();
  entity.voidReason = String(voidReason || "").trim();
  entity.reversalEntryId = reversalEntity._id;
  await entity.save();

  reversalEntity.reversalEntryId = entity._id;
  await reversalEntity.save();

  await logAudit({
    action: "status-change",
    module: "Finance",
    recordType: entityName,
    recordId: String(entity._id),
    previousValue,
    newValue: entity.toObject(),
    user,
    ipAddress,
  });

  await logAudit({
    action: "create",
    module: "Finance",
    recordType: entityName,
    recordId: String(reversalEntity._id),
    newValue: reversalEntity.toObject(),
    user,
    ipAddress,
  });

  return {
    original: entity,
    reversal: reversalEntity,
  };
}

module.exports = {
  voidWithReversal,
};
