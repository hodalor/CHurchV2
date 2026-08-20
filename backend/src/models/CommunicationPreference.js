const mongoose = require("mongoose");

const communicationPreferenceSchema = new mongoose.Schema(
  {
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
    optedIn: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

communicationPreferenceSchema.index(
  { memberId: 1, visitorId: 1, channel: 1 },
  { unique: true, partialFilterExpression: { channel: { $type: "objectId" } } }
);

module.exports = mongoose.model("CommunicationPreference", communicationPreferenceSchema);
