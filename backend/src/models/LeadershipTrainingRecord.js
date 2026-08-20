const mongoose = require("mongoose");

const leadershipTrainingRecordSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    trainingName: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    provider: {
      type: String,
      trim: true,
      default: "",
    },
    completionStatus: {
      type: String,
      trim: true,
      default: "Completed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeadershipTrainingRecord", leadershipTrainingRecordSchema);
