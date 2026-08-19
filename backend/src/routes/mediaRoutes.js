const express = require("express");
const multer = require("multer");
const authenticate = require("../middleware/authenticate");
const { uploadBufferToGoogleStorage } = require("../services/mediaStorageService");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(authenticate);

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Choose a file to upload." });
    }

    const uploadedFile = await uploadBufferToGoogleStorage({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: req.body.folder || "general",
    });

    return res.status(201).json(uploadedFile);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to upload file." });
  }
});

module.exports = router;
