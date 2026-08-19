const mongoose = require("mongoose");

const ministryMemberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      trim: true,
    },
    memberName: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

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
    leadership: {
      elderInCharge: ministryMemberSchema,
      deaconInCharge: ministryMemberSchema,
      chairman: ministryMemberSchema,
      assistantChairman: ministryMemberSchema,
      organizer: ministryMemberSchema,
      assistantOrganizer: ministryMemberSchema,
      secretary: ministryMemberSchema,
      assistantSecretary: ministryMemberSchema,
      treasurer: ministryMemberSchema,
      assistantTreasurer: ministryMemberSchema,
    },
    members: [ministryMemberSchema],
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
