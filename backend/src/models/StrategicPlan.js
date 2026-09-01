const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const strategicPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = createScopedModel("StrategicPlan", strategicPlanSchema);


