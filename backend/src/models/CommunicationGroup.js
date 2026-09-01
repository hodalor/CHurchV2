const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const communicationGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    filterCriteria: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    frozen: {
      type: Boolean,
      default: false,
    },
    frozenMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
    frozenVisitors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Visitor",
      },
    ],
  },
  { timestamps: true }
);

module.exports = createScopedModel("CommunicationGroup", communicationGroupSchema);


