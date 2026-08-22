const mongoose = require("mongoose");

const counselingSessionSchema = new mongoose.Schema(
  {
    careNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareNote",
      required: true,
      unique: true,
    },
    sessionNumber: {
      type: Number,
      default: 1,
    },
    topic: {
      type: String,
      trim: true,
      default: "",
    },
    attendees: {
      type: [String],
      default: [],
    },
    followUpPlan: {
      type: String,
      trim: true,
      default: "",
    },
    nextSessionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CounselingSession", counselingSessionSchema);
