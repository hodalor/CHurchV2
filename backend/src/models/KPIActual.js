const mongoose = require("mongoose");

const kpiActualSchema = new mongoose.Schema(
  {
    kpiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KPI",
      required: true,
    },
    period: {
      type: String,
      required: true,
      trim: true,
    },
    actualValue: {
      type: Number,
      required: true,
    },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    capturedDate: {
      type: Date,
      default: Date.now,
    },
    variance: {
      type: Number,
      default: 0,
    },
    ragStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    commentary: {
      type: String,
      trim: true,
      default: "",
    },
    correctiveAction: {
      type: String,
      trim: true,
      default: "",
    },
    correctiveActionDueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

kpiActualSchema.index({ kpiId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("KPIActual", kpiActualSchema);
