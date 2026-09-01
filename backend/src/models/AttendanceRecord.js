const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const attendanceRecordSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceEvent",
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      default: null,
    },
    present: {
      type: Boolean,
      default: true,
    },
    capturedVia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    correctedFlag: {
      type: Boolean,
      default: false,
    },
    correctionReason: {
      type: String,
      trim: true,
      default: "",
    },
    capturedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

attendanceRecordSchema.index(
  { eventId: 1, memberId: 1 },
  {
    unique: true,
    partialFilterExpression: { memberId: { $type: "objectId" } },
  }
);

attendanceRecordSchema.index(
  { eventId: 1, visitorId: 1 },
  {
    unique: true,
    partialFilterExpression: { visitorId: { $type: "objectId" } },
  }
);

module.exports = createScopedModel("AttendanceRecord", attendanceRecordSchema);


