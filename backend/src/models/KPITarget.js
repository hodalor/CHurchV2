const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const kpiTargetSchema = new mongoose.Schema(
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
    targetValue: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

kpiTargetSchema.index({ kpiId: 1, period: 1 }, { unique: true });

module.exports = createScopedModel("KPITarget", kpiTargetSchema);


