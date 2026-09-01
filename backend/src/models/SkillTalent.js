const mongoose = require("mongoose");
const createScopedModel = require("../utils/scopedModel");

const skillTalentSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    skillOrTalent: {
      type: String,
      required: true,
      trim: true,
    },
    proficiencyNote: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = createScopedModel("SkillTalent", skillTalentSchema);


