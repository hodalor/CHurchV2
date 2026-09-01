const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const batchMetadataSchema = new mongoose.Schema(
  {
    batchKey: {
      type: String,
      trim: true,
      default: "",
    },
    serviceEventRef: {
      type: String,
      trim: true,
      default: "",
    },
    countedBy: {
      type: String,
      trim: true,
      default: "",
    },
    totalExpected: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
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
    amount: {
      type: Number,
      required: true,
    },
    fundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fund",
      required: true,
    },
    method: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    transactionType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LookupValue",
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    recordedBy: {
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
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    linkedPledgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pledge",
      default: null,
    },
    status: {
      type: String,
      enum: ["posted", "voided"],
      default: "posted",
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
      ref: "Transaction",
      default: null,
    },
    reversalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    isReversal: {
      type: Boolean,
      default: false,
    },
    batch: {
      type: batchMetadataSchema,
      default: () => ({}),
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

transactionSchema.index({ date: -1, createdAt: -1 });

module.exports = createScopedModel("Transaction", transactionSchema);


