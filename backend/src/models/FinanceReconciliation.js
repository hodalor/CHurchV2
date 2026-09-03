const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const financeReconciliationSchema = new mongoose.Schema(
  {
    reconciliationDate: {
      type: Date,
      required: true,
    },
    serviceEventRef: {
      type: String,
      trim: true,
      default: "",
    },
    method: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      default: null,
    },
    methodSummary: {
      type: String,
      trim: true,
      default: "",
    },
    sourceTransactionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transaction",
        },
      ],
      default: [],
    },
    depositAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    selectedTransactionCount: {
      type: Number,
      default: 0,
    },
    initiatedBy: {
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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvalNotes: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

financeReconciliationSchema.index({ reconciliationDate: -1, createdAt: -1 });

module.exports = createScopedModel("FinanceReconciliation", financeReconciliationSchema);


