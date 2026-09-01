const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const triggerRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    sourceModule: {
      type: String,
      required: true,
      trim: true,
    },
    condition: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severityMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = createScopedModel("TriggerRule", triggerRuleSchema);


