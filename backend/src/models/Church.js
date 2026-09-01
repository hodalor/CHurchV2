const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const tenantAdminSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true, default: "" },
    username: { type: String, trim: true, lowercase: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
  },
  { _id: false }
);

const churchSchema = new mongoose.Schema(
  {
    churchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    dbName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    enabledNavigation: [
      {
        type: String,
        trim: true,
      },
    ],
    createdAdmin: {
      type: tenantAdminSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("Church", churchSchema, { scope: "master" });

