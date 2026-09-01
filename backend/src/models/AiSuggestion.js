const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const aiSuggestionSchema = new mongoose.Schema(
  {
    suggestionType: {
      type: String,
      required: true,
      trim: true,
    },
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
    subjectLabel: {
      type: String,
      trim: true,
    },
    sourceModule: {
      type: String,
      required: true,
      trim: true,
    },
    generatedForUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    title: {
      type: String,
      trim: true,
    },
    generatedText: {
      type: String,
      trim: true,
    },
    basedOnRefs: {
      type: [
        {
          recordType: {
            type: String,
            trim: true,
          },
          recordId: {
            type: String,
            trim: true,
          },
          label: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      trim: true,
      default: "pending",
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    promptContextSummary: {
      type: String,
      trim: true,
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

module.exports = createScopedModel("AiSuggestion", aiSuggestionSchema);


