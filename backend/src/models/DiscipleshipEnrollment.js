const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const completedSessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: true,
      trim: true,
    },
    completedAt: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const discipleshipEnrollmentSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    programmeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiscipleshipProgramme",
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    mentorAssignedAt: {
      type: Date,
      default: null,
    },
    enrollmentDate: {
      type: Date,
      required: true,
    },
    sessionsCompleted: [completedSessionSchema],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    sourceProspectId: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("DiscipleshipEnrollment", discipleshipEnrollmentSchema);


