const mongoose = require("mongoose");

const pendingActionSchema = new mongoose.Schema(
  {
    subjectType: {
      type: String,
      required: true,
      trim: true,
    },
    subjectId: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      trim: true,
      default: "Open",
    },
    sourceModule: {
      type: String,
      required: true,
      trim: true,
    },
    sourceRecordType: {
      type: String,
      required: true,
      trim: true,
    },
    sourceRecordId: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      trim: true,
      default: "Normal",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PendingAction", pendingActionSchema);
