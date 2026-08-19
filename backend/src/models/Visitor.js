const mongoose = require("mongoose");

const visitEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const homeVisitSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    visitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const visitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    surname: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    residentialArea: {
      type: String,
      trim: true,
    },
    firstVisitDate: {
      type: Date,
      required: true,
    },
    howHeard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    visitCount: {
      type: Number,
      default: 1,
    },
    visitDates: [visitEntrySchema],
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    assignedFollowUpUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    visitationHistory: [homeVisitSchema],
    convertedToProspectId: {
      type: String,
      trim: true,
    },
    convertedToMemberId: {
      type: String,
      trim: true,
    },
    sourceVisitorId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Visitor", visitorSchema);
