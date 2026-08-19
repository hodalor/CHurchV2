const mongoose = require("mongoose");

const householdMemberSchema = new mongoose.Schema(
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
    relationshipToHead: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      trim: true,
      default: "Active",
    },
  },
  { _id: false }
);

const memberLookupSchema = new mongoose.Schema(
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
  },
  { _id: false }
);

const familySchema = new mongoose.Schema(
  {
    familyId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    familyName: {
      type: String,
      required: true,
      trim: true,
    },
    headOfHousehold: {
      type: memberLookupSchema,
      default: null,
    },
    spouse: {
      type: memberLookupSchema,
      default: null,
    },
    children: [memberLookupSchema],
    dependants: [memberLookupSchema],
    residentialArea: {
      type: String,
      trim: true,
    },
    physicalAddress: {
      type: String,
      trim: true,
    },
    fellowshipZone: {
      type: String,
      trim: true,
    },
    familyContact: {
      type: String,
      trim: true,
    },
    visitationHistory: {
      type: String,
      trim: true,
    },
    householdMembers: [householdMemberSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Family", familySchema);
