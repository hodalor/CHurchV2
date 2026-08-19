const mongoose = require("mongoose");

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const evangelismProspectSchema = new mongoose.Schema(
  {
    prospectId: {
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
    gender: {
      type: String,
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
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    assignedEvangelistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedEvangelistMemberId: {
      type: String,
      trim: true,
    },
    currentStage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
    stageHistory: [stageHistorySchema],
    sourceVisitorId: {
      type: String,
      trim: true,
    },
    dateFirstContact: {
      type: Date,
    },
    nextFollowUpDate: {
      type: Date,
    },
    baptismDate: {
      type: Date,
    },
    convertedMemberId: {
      type: String,
      trim: true,
    },
    notesSummary: {
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

module.exports = mongoose.model("EvangelismProspect", evangelismProspectSchema);
