const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const mentorAssignmentSchema = new mongoose.Schema(
  {
    menteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    focusArea: {
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

module.exports = createScopedModel("MentorAssignment", mentorAssignmentSchema);


