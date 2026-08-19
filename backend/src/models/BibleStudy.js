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
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    lessonsCompleted: [completedLessonSchema],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BibleStudy", bibleStudySchema);
