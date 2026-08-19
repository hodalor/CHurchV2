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
      trim: true,
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    groupCode: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const familyLinkSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
      trim: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
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
    otherName: {
      type: String,
      trim: true,
    },
    preferredName: {
      type: String,
      trim: true,
    },
    memberType: {
      type: String,
      enum: ["Adult", "Child"],
      default: "Adult",
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      default: "Male",
    },
    maritalStatus: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
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
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    familyId: {
      type: String,
      trim: true,
    },
    familyName: {
      type: String,
      trim: true,
    },
    householdRole: {
      type: String,
      trim: true,
    },
    membershipStatus: {
      type: String,
      trim: true,
      default: "Active",
    },
    membershipDate: {
      type: Date,
    },
    dateJoined: {
      type: Date,
    },
    baptismStatus: {
      type: String,
      trim: true,
      default: "Not Baptized",
    },
    baptismDate: {
      type: Date,
    },
    placeBaptized: {
      type: String,
      trim: true,
    },
    baptizedBy: {
      type: String,
      trim: true,
    },
    previousCongregation: {
      type: String,
      trim: true,
    },
    transferDetails: {
      type: String,
      trim: true,
    },
    occupation: {
      type: String,
      trim: true,
    },
    employerOrBusiness: {
      type: String,
      trim: true,
    },
    educationOrSkills: {
      type: String,
      trim: true,
    },
    ministry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      default: null,
    },
    groups: [groupSelectionSchema],
    familyLinks: [familyLinkSchema],
    personalPhoto: photoSchema,
    idFrontPhoto: photoSchema,
    idBackPhoto: photoSchema,
    photoFileName: {
      type: String,
      trim: true,
    },
    gpsLatitude: {
      type: String,
      trim: true,
    },
    gpsLongitude: {
      type: String,
      trim: true,
    },
    sourceRecordRef: {
      type: String,
      trim: true,
    },
    dataEntryClerk: {
      type: String,
      trim: true,
    },
    dateCaptured: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Member", memberSchema);
