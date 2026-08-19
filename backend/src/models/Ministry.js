const mongoose = require("mongoose");

const ministrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    leader: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: "#5b8def",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ministry", ministrySchema);
