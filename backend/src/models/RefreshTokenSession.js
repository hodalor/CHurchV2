const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const refreshTokenSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    familyId: {
      type: String,
      required: true,
      trim: true,
    },
    replacedByTokenHash: {
      type: String,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdByIp: {
      type: String,
      trim: true,
    },
    revokedByIp: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    scope: {
      type: String,
      enum: ["master", "tenant"],
      default: "master",
    },
    churchId: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("RefreshTokenSession", refreshTokenSessionSchema);


