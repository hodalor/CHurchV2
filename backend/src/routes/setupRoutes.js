const express = require("express");
const ChurchProfile = require("../models/ChurchProfile");

const router = express.Router();

router.get("/branding", async (req, res) => {
  try {
    const profile = await ChurchProfile.findOne().sort({ createdAt: -1 });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/branding", async (req, res) => {
  try {
    const existingProfile = await ChurchProfile.findOne();

    if (!existingProfile) {
      const createdProfile = await ChurchProfile.create(req.body);
      return res.status(201).json(createdProfile);
    }

    Object.assign(existingProfile, req.body);
    await existingProfile.save();
    return res.json(existingProfile);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
