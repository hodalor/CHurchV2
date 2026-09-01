const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const careCaseSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    responsibleLeaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      trim: true,
      default: "open",
    },
    nextActionDate: {
      type: Date,
      default: null,
    },
    confidentialityTier: {
      type: String,
      enum: ["Standard", "Restricted", "Elders-Only"],
      default: "Standard",
    },
    summary: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("CareCase", careCaseSchema);


