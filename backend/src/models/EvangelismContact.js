const mongoose = require("mongoose");

const evangelismContactSchema = new mongoose.Schema(
  {
    prospect: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvangelismProspect",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    contactedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EvangelismContact", evangelismContactSchema);
