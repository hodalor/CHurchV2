const mongoose = require("mongoose");

const communicationLogSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunicationGroup",
      default: null,
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
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    deliveryMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunicationLog", communicationLogSchema);
