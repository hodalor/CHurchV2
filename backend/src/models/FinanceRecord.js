const mongoose = require("mongoose");

const financeRecordSchema = new mongoose.Schema(
  {
    recordNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      trim: true,
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FinanceRecord", financeRecordSchema);
