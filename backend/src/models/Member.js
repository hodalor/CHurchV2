const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const groupSelectionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    levelName: {
      type: String,
      required: true,
      trim: true,
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Child"],
      default: "Male",
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
    address: {
      type: String,
      trim: true,
    },
    ministry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null,
    },
    groups: [groupSelectionSchema],
    personalPhoto: photoSchema,
    idFrontPhoto: photoSchema,
    idBackPhoto: photoSchema,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Member", memberSchema);
