const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const pledgeSchema = new mongoose.Schema(
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
    fundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fund",
      required: true,
    },
    pledgedAmount: {
      type: Number,
      required: true,
    },
    frequency: {
      type: String,
      enum: ["one-time", "monthly", "quarterly", "annual"],
      default: "one-time",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "fulfilled", "lapsed", "cancelled"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
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

pledgeSchema.index({ startDate: -1, createdAt: -1 });

module.exports = createScopedModel("Pledge", pledgeSchema);


