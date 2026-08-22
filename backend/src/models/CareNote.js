const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      required: true,
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const careNoteSchema = new mongoose.Schema(
  {
    careCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareCase",
      default: null,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    noteType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    confidentialityTier: {
      type: String,
      enum: ["Standard", "Restricted", "Elders-Only"],
      default: "Standard",
    },
    visibleToOverride: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
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

careNoteSchema.index({ dateTime: -1, createdAt: -1 });

module.exports = mongoose.model("CareNote", careNoteSchema);
