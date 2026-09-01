const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const attendanceEventSchema = new mongoose.Schema(
  {
    eventTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    ministryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    isCheckInOpen: {
      type: Boolean,
      default: true,
    },
    qrToken: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("AttendanceEvent", attendanceEventSchema);


