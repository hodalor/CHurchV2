const ChurchProfile = require("../models/ChurchProfile");
const { logAudit } = require("./auditService");

const DEFAULT_PROFILE = {
  churchName: "ChurchFlow Central",
};

async function getChurchProfile() {
  let profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
  if (!profile) {
    profile = await ChurchProfile.create(DEFAULT_PROFILE);
  }
  return profile;
}

async function listDepositAccounts() {
  const profile = await getChurchProfile();
  return Array.isArray(profile.depositAccounts) ? profile.depositAccounts : [];
}

async function saveDepositAccount({ accountId = "", payload = {}, user = null, ipAddress = "" }) {
  const profile = await getChurchProfile();
  const previousValue = profile.toObject();
  const accounts = Array.isArray(profile.depositAccounts) ? profile.depositAccounts : [];
  const existing = accountId ? accounts.id(accountId) : null;

  if (!String(payload.name || "").trim()) {
    throw new Error("Account name is required.");
  }

  const accountPayload = {
    name: String(payload.name || "").trim(),
    accountNumber: String(payload.accountNumber || "").trim(),
    provider: String(payload.provider || "").trim(),
    type: String(payload.type || "bank").trim(),
    active: payload.active !== false,
  };

  if (existing) {
    Object.assign(existing, accountPayload);
  } else {
    accounts.push(accountPayload);
  }

  profile.depositAccounts = accounts;
  await profile.save();

  await logAudit({
    action: existing ? "update" : "create",
    module: "Church Setup",
    recordType: "DepositAccount",
    recordId: String(existing?._id || profile.depositAccounts[profile.depositAccounts.length - 1]?._id || ""),
    previousValue,
    newValue: profile.toObject(),
    user,
    ipAddress,
  });

  return profile.depositAccounts;
}

module.exports = {
  getChurchProfile,
  listDepositAccounts,
  saveDepositAccount,
};
