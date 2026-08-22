const express = require("express");
const ChurchProfile = require("../models/ChurchProfile");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { listDepositAccounts, saveDepositAccount } = require("../services/churchProfileService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
const DEFAULT_CURRENCIES = [{ code: "GHS", name: "Ghana Cedi", symbol: "GH¢" }];

function normalizeCurrencies(currencies = []) {
  const normalized = Array.isArray(currencies)
    ? currencies
        .map((item) => ({
          code: String(item?.code || "").trim().toUpperCase(),
          name: String(item?.name || "").trim(),
          symbol: String(item?.symbol || "").trim(),
        }))
        .filter((item) => item.code && item.name)
    : [];

  const uniqueByCode = normalized.filter(
    (item, index, collection) => collection.findIndex((entry) => entry.code === item.code) === index
  );

  return uniqueByCode.length ? uniqueByCode : DEFAULT_CURRENCIES;
}

router.get("/branding", async (req, res) => {
  try {
    const profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/app-config", authenticate, async (req, res) => {
  try {
    const profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
    res.json({
      appName: profile?.appName || "ChurchSuite Pro",
      appLogoUrl: profile?.appLogoUrl || "",
      currencies: normalizeCurrencies(profile?.currencies),
      defaultCurrencyCode:
        profile?.defaultCurrencyCode ||
        normalizeCurrencies(profile?.currencies)[0]?.code ||
        DEFAULT_CURRENCIES[0].code,
      depositAccounts: Array.isArray(profile?.depositAccounts) ? profile.depositAccounts : [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/branding", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SYSTEM), async (req, res) => {
  try {
    const existingProfile = await ChurchProfile.findOne();
    const brandingPayload = {
      churchName: req.body.churchName,
      address: req.body.address || "",
      phone: req.body.phone || "",
      email: req.body.email || "",
      website: req.body.website || "",
    };

    if (!existingProfile) {
      const createdProfile = await ChurchProfile.create(brandingPayload);
      return res.status(201).json(createdProfile);
    }

    Object.assign(existingProfile, brandingPayload);
    await existingProfile.save();
    return res.json(existingProfile);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.put("/app-config", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const existingProfile = await ChurchProfile.findOne();
    const currencies = normalizeCurrencies(req.body.currencies);
    const requestedDefault = String(req.body.defaultCurrencyCode || "").trim().toUpperCase();
    const appConfigPayload = {
      appName: req.body.appName || "ChurchSuite Pro",
      appLogoUrl: req.body.appLogoUrl || "",
      currencies,
      defaultCurrencyCode:
        currencies.find((item) => item.code === requestedDefault)?.code || currencies[0]?.code || DEFAULT_CURRENCIES[0].code,
      depositAccounts: Array.isArray(req.body.depositAccounts) ? req.body.depositAccounts : existingProfile?.depositAccounts || [],
    };

    if (!existingProfile) {
      const createdProfile = await ChurchProfile.create({
        churchName: "ChurchFlow Central",
        ...appConfigPayload,
      });
      return res.status(201).json(createdProfile);
    }

    Object.assign(existingProfile, appConfigPayload);
    await existingProfile.save();
    return res.json(existingProfile);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/deposit-accounts", authenticate, authorizePermissions(PERMISSIONS.VIEW_SETUP), async (req, res) => {
  try {
    res.json(await listDepositAccounts());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/deposit-accounts", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const accounts = await saveDepositAccount({ payload: req.body, user: req.user, ipAddress: req.ip });
    res.status(201).json(accounts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/deposit-accounts/:accountId", authenticate, authorizePermissions(PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const accounts = await saveDepositAccount({
      accountId: req.params.accountId,
      payload: req.body,
      user: req.user,
      ipAddress: req.ip,
    });
    res.json(accounts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
