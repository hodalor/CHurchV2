const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payee: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    receiptImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    budgetLineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Budget",
      default: null,
    },
    ministryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null,
    },
    status: {
      type: String,
      enum: ["requested", "approved", "paid", "rejected", "voided"],
      default: "requested",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedReason: {
      type: String,
      trim: true,
      default: "",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    approvalThresholdFlag: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
    voidReason: {
      type: String,
      trim: true,
      default: "",
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
    reversalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
    isReversal: {
      type: Boolean,
      default: false,
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

expenseSchema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
