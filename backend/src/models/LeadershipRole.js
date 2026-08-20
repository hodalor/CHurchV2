const mongoose = require("mongoose");

const leadershipRoleSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    roleName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      trim: true,
      default: "Current",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeadershipRole", leadershipRoleSchema);
