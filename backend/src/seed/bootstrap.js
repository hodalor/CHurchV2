const LookupType = require("../models/LookupType");
const LookupValue = require("../models/LookupValue");
const Role = require("../models/Role");
const User = require("../models/User");
const { hashPin } = require("../services/authService");
const { ROLE_PERMISSION_MAP, ROLES } = require("../utils/permissions");

async function bootstrapApplicationData() {
  await seedRoles();
  await seedLookupData();
  await seedInitialAdminUser();
}

async function seedRoles() {
  const roleNames = Object.keys(ROLE_PERMISSION_MAP);
  await Promise.all(
    roleNames.map((roleName) =>
      Role.findOneAndUpdate(
        { name: roleName },
        {
          $set: {
            description: `${roleName} role`,
            permissions: ROLE_PERMISSION_MAP[roleName],
            isSystem: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
}

async function seedLookupData() {
  const lookupSeeds = [
    {
      key: "visitor_how_heard",
      label: "Visitor How Heard",
      module: "visitor",
      values: ["Friend Invite", "Crusade", "Social Media", "Walk-In", "Other"],
    },
    {
      key: "visitor_status",
      label: "Visitor Status",
      module: "visitor",
      values: ["First-Time", "Repeat/Staying", "Lapsed", "Converted-to-Prospect", "Converted-to-Member"],
    },
    {
      key: "visitor_retention_window",
      label: "Visitor Retention Window",
      module: "visitor",
      values: ["30 Days", "60 Days", "90 Days"],
    },
    {
      key: "evangelism_pipeline_stage",
      label: "Evangelism Pipeline Stage",
      module: "evangelism",
      values: ["Contact", "Gospel Shared", "Bible Study", "Worship Attendance", "Baptism", "Discipleship", "Ministry Integration"],
    },
    {
      key: "evangelism_source",
      label: "Evangelism Source",
      module: "evangelism",
      values: ["Visitor Conversion", "Outreach", "Friend Invite", "Crusade", "Community Visit", "Social Media", "Other"],
    },
    {
      key: "bible_study_status",
      label: "Bible Study Status",
      module: "evangelism",
      values: ["In Progress", "Completed", "Paused"],
    },
  ];

  for (const seed of lookupSeeds) {
    const lookupType = await LookupType.findOneAndUpdate(
      { key: seed.key },
      {
        $set: {
          label: seed.label,
          module: seed.module,
          description: `${seed.label} seeded lookup`,
          isSystem: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const [index, label] of seed.values.entries()) {
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      await LookupValue.findOneAndUpdate(
        { type: lookupType._id, key },
        {
          $set: {
            label,
            sortOrder: index,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
}

async function seedInitialAdminUser() {
  const adminUsername = String(process.env.INITIAL_ADMIN_USERNAME || "admin").toLowerCase();
  const adminPin = String(process.env.INITIAL_ADMIN_PIN || "1234");
  const adminRole = await Role.findOne({ name: ROLES.SYSTEM_ADMINISTRATOR });

  if (!adminRole) {
    return;
  }

  const existingUser = await User.findOne({ username: adminUsername });
  if (existingUser) {
    if (!existingUser.roles.some((roleId) => roleId.toString() === adminRole._id.toString())) {
      existingUser.roles = [...existingUser.roles, adminRole._id];
      await existingUser.save();
    }
    return;
  }

  const pinHash = await hashPin(adminPin);
  await User.create({
    username: adminUsername,
    pinHash,
    displayName: "System Administrator",
    email: "admin@churchflow.org",
    roles: [adminRole._id],
    status: "Active",
  });
}

module.exports = {
  bootstrapApplicationData,
};
