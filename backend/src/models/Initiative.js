const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const initiativeSchema = new mongoose.Schema(
  {
    objectiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StrategicObjective",
      required: true,
    },
    title: {
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

module.exports = createScopedModel("Initiative", initiativeSchema);


