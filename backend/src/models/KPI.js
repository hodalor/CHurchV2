const mongoose = require("mongoose");

const kpiSchema = new mongoose.Schema(
  {
    initiativeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Initiative",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    baseline: {
      type: Number,
      default: 0,
    },
    targetFrequency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    ragThresholds: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        direction: "higher",
        greenPercent: 100,
        amberPercent: 80,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KPI", kpiSchema);
