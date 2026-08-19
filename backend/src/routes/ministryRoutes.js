const express = require("express");
const Ministry = require("../models/Ministry");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const ministries = await Ministry.find().sort({ createdAt: -1 });
    res.json(ministries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ministry = await Ministry.create(req.body);
    res.status(201).json(ministry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
