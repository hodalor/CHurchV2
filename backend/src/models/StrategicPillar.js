const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const strategicPillarSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StrategicPlan",
      required: true,
    },
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
  },
  { timestamps: true }
);

module.exports = createScopedModel("StrategicPillar", strategicPillarSchema);


