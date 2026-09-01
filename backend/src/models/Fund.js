const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const fundSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("Fund", fundSchema);


