const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const budgetSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      required: true,
      trim: true,
    },
    granularity: {
      type: String,
      trim: true,
      default: "annual",
    },
    lineType: {
      type: String,
      enum: ["expense", "income"],
      default: "expense",
    },
    ministryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    fundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fund",
      default: null,
    },
    budgetedAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

budgetSchema.index({ period: 1, ministryId: 1, category: 1, fundId: 1, lineType: 1 });

module.exports = createScopedModel("Budget", budgetSchema);


