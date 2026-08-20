const mongoose = require("mongoose");

const emergingLeaderFlagSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    flaggedDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmergingLeaderFlag", emergingLeaderFlagSchema);
