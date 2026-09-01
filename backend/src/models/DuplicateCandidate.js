const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const duplicateCandidateSchema = new mongoose.Schema(
  {
    recordType: {
      type: String,
      required: true,
      trim: true,
    },
    recordIdA: {
      type: String,
      required: true,
      trim: true,
    },
    recordIdB: {
      type: String,
      required: true,
      trim: true,
    },
    recordLabelA: {
      type: String,
      trim: true,
    },
    recordLabelB: {
      type: String,
      trim: true,
    },
    pairKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    matchScore: {
      type: Number,
      required: true,
      default: 0,
    },
    matchReasons: {
      type: [String],
      default: [],
    },
    aiExplanation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      trim: true,
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    sourceModule: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("DuplicateCandidate", duplicateCandidateSchema);


