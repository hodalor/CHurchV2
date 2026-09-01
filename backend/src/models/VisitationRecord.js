const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const visitationRecordSchema = new mongoose.Schema(
  {
    careNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareNote",
      required: true,
      unique: true,
    },
    location: {
      type: String,
      enum: ["home", "hospital", "other"],
      default: "home",
    },
    purpose: {
      type: String,
      trim: true,
      default: "",
    },
    outcome: {
      type: String,
      trim: true,
      default: "",
    },
    followUpNeeded: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("VisitationRecord", visitationRecordSchema);


