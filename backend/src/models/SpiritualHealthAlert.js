const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const spiritualHealthAlertSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    householdId: {
      type: String,
      trim: true,
      default: "",
    },
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvangelismProspect",
      default: null,
    },
    triggerRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TriggerRule",
      required: true,
    },
    status: {
      type: String,
      trim: true,
      default: "Amber",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    sourceRecordRef: {
      type: String,
      trim: true,
      default: "",
    },
    assignedToUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedActionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PendingAction",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = createScopedModel("SpiritualHealthAlert", spiritualHealthAlertSchema);


