const LookupType = require("../models/LookupType");
const LookupValue = require("../models/LookupValue");

async function getLookupTypeByKey(key) {
  return LookupType.findOne({ key: String(key || "").toLowerCase() });
}

async function getLookupValueByTypeAndKey(typeKey, valueKey) {
  const type = await getLookupTypeByKey(typeKey);
  if (!type) {
    return null;
  }

  return LookupValue.findOne({
    type: type._id,
    key: String(valueKey || "").toLowerCase(),
    isActive: true,
  });
}

async function listLookupValuesByType(typeKey) {
  const type = await getLookupTypeByKey(typeKey);
  if (!type) {
    return [];
  }

  return LookupValue.find({ type: type._id, isActive: true }).sort({ sortOrder: 1, label: 1 });
}

module.exports = {
  getLookupTypeByKey,
  getLookupValueByTypeAndKey,
  listLookupValuesByType,
};
