const mongoose = require("mongoose");

const biometricProfileSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      trim: true,
      default: "zkteco",
    },
    templateRef: {
      type: String,
      trim: true,
      default: "",
    },
    deviceName: {
      type: String,
      trim: true,
      default: "",
    },
    qualityScore: {
      type: Number,
      default: null,
    },
    enrolledAt: {
      type: Date,
      default: null,
    },
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMatchedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

module.exports = biometricProfileSchema;
