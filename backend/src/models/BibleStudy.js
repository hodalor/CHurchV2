const mongoose = require("mongoose");

const completedLessonSchema = new mongoose.Schema(
  {
    lessonName: {
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

const bibleStudySchema = new mongoose.Schema(
  {
    bibleStudyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    prospect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvangelismProspect",
      default: null,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    teacherMemberId: {
      type: String,
      trim: true,
    },
    studyType: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    lastSessionDate: {
      type: Date,
    },
    lessonsCompleted: [completedLessonSchema],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    nextSessionDate: {
      type: Date,
    },
    outcome: {
      type: String,
      trim: true,
    },
    dataEntryClerk: {
      type: String,
      trim: true,
    },
    dateCaptured: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BibleStudy", bibleStudySchema);
