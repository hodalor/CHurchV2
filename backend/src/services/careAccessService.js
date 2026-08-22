const { logAudit } = require("./auditService");
const { ROLES } = require("../utils/permissions");

const TIER_ORDER = {
  Standard: 1,
  Restricted: 2,
  "Elders-Only": 3,
};

function canAccessCareNote(note, user) {
  const tier = note?.confidentialityTier || "Standard";
  const userId = String(user?._id || "");
  const roles = new Set(user?.roles || []);
  const overrideIds = new Set((note?.visibleToOverride || []).map((value) => String(value?._id || value)));

  if (overrideIds.has(userId)) {
    return true;
  }

  if (tier === "Elders-Only") {
    return roles.has(ROLES.ELDERS);
  }

  if (tier === "Restricted") {
    return roles.has(ROLES.ELDERS) || roles.has(ROLES.DEACONS) || roles.has(ROLES.CHURCH_ADMINISTRATOR);
  }

  return roles.has(ROLES.ELDERS) || roles.has(ROLES.DEACONS) || roles.has(ROLES.CHURCH_ADMINISTRATOR) || roles.has(ROLES.MINISTRY_LEADERS);
}

function getHighestCareTier(notes = []) {
  return notes.reduce((highest, note) => {
    const currentTier = note?.confidentialityTier || "Standard";
    return TIER_ORDER[currentTier] > TIER_ORDER[highest] ? currentTier : highest;
  }, "Standard");
}

async function logRestrictedCareView(note, user, ipAddress = "") {
  const tier = note?.confidentialityTier || "Standard";
  if (tier === "Standard") {
    return;
  }

  await logAudit({
    action: "view",
    module: "Pastoral Care",
    recordType: "CareNote",
    recordId: String(note?._id || ""),
    newValue: {
      confidentialityTier: tier,
    },
    user,
    ipAddress,
  });
}

module.exports = {
  canAccessCareNote,
  getHighestCareTier,
  logRestrictedCareView,
};
