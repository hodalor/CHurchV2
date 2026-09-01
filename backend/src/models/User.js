const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    pinHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    memberId: {
      type: String,
      trim: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    permissionsConfigured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      trim: true,
      default: "Active",
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("User", userSchema);


