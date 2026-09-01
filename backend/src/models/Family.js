const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

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
    primaryContactMemberId: {
      type: String,
      trim: true,
    },
    primaryContactNumber: {
      type: String,
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
    dateLastVisited: {
      type: Date,
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
    householdMembers: [householdMemberSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = createScopedModel("Family", familySchema);


