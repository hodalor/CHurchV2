const mongoose = require("mongoose");

const successionReadinessSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    targetRoleName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    readinessCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assessedDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuccessionReadiness", successionReadinessSchema);
