const express = require("express");
const Member = require("../models/Member");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const members = await Member.find()
      .populate("ministry", "name color")
      .sort({ createdAt: -1 });

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const member = await Member.create(req.body);
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
