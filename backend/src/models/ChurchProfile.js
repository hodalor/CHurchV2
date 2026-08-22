const mongoose = require("mongoose");

const depositAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },
    provider: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["bank", "mobile_money", "cash", "other"],
      default: "bank",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

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
    depositAccounts: {
      type: [depositAccountSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChurchProfile", churchProfileSchema);
