const mongoose = require("mongoose");

const successionRequirementSchema = new mongoose.Schema(
  {
    roleName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    requirements: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    keyRole: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuccessionRequirement", successionRequirementSchema);
