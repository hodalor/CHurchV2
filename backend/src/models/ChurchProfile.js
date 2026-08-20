const mongoose = require("mongoose");

const churchProfileSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      trim: true,
      default: "ChurchSuite Pro",
    },
    appLogoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    currencies: {
      type: [
        {
          code: {
            type: String,
            trim: true,
            uppercase: true,
          },
          name: {
            type: String,
            trim: true,
          },
          symbol: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [
        {
          code: "GHS",
          name: "Ghana Cedi",
          symbol: "GH¢",
        },
      ],
    },
    defaultCurrencyCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "GHS",
    },
    churchName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChurchProfile", churchProfileSchema);
