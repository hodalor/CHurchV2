const mongoose = require("mongoose");

const strategicObjectiveSchema = new mongoose.Schema(
  {
    pillarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StrategicPillar",
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
    responsibleMinistryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StrategicObjective", strategicObjectiveSchema);
