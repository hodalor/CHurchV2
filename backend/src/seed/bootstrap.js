const LookupType = require("../models/LookupType");
const LookupValue = require("../models/LookupValue");
const DiscipleshipProgramme = require("../models/DiscipleshipProgramme");
const Ministry = require("../models/Ministry");
const Role = require("../models/Role");
const User = require("../models/User");
const { hashPin } = require("../services/authService");
const { ROLE_PERMISSION_MAP, ROLES } = require("../utils/permissions");

async function bootstrapApplicationData() {
  await seedRoles();
  await seedLookupData();
  await seedDiscipleshipProgrammes();
  await seedMinistries();
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
    {
      key: "discipleship_enrollment_status",
      label: "Discipleship Enrollment Status",
      module: "discipleship",
      values: ["Active", "Completed", "Overdue", "Dropped"],
    },
    {
      key: "attendance_event_type",
      label: "Attendance Event Type",
      module: "attendance",
      values: [
        "Sunday Worship",
        "Bible Class",
        "Prayer Meeting",
        "Ministry Meeting",
        "Youth Activity",
        "Retreat",
        "Seminar",
        "Evangelism Activity",
        "Other",
      ],
    },
    {
      key: "attendance_capture_mode",
      label: "Attendance Capture Mode",
      module: "attendance",
      values: ["Manual", "Bulk", "QR", "Mobile"],
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

async function seedDiscipleshipProgrammes() {
  const existingProgramme = await DiscipleshipProgramme.findOne({ name: "New Converts Foundation" });
  if (existingProgramme) {
    return;
  }

  await DiscipleshipProgramme.create({
    name: "New Converts Foundation",
    expectedDurationDays: 90,
    modules: [
      { title: "Salvation Assurance", order: 1 },
      { title: "Prayer And Devotion", order: 2 },
      { title: "Bible Foundations", order: 3 },
      { title: "Church Fellowship", order: 4 },
      { title: "Ministry Integration", order: 5 },
    ],
    isActive: true,
  });
}

async function seedMinistries() {
  const ministrySeeds = [
    { name: "Evangelism", description: "Outreach, follow-up, and prospect engagement.", color: "#4f46e5" },
    { name: "Men", description: "Men's fellowship and discipleship activities.", color: "#0ea5e9" },
    { name: "Women", description: "Women's fellowship and care activities.", color: "#ec4899" },
    { name: "Youth", description: "Youth services, mentoring, and events.", color: "#f59e0b" },
    { name: "Children", description: "Children's church and teaching support.", color: "#14b8a6" },
    { name: "Marriage", description: "Marriage enrichment and household support.", color: "#8b5cf6" },
    { name: "Empowerment", description: "Skills, support, and empowerment initiatives.", color: "#f97316" },
    { name: "Finance", description: "Finance stewardship and reporting support.", color: "#22c55e" },
    { name: "Administration", description: "Operations, records, and service coordination.", color: "#64748b" },
  ];

  await Promise.all(
    ministrySeeds.map((ministry) =>
      Ministry.findOneAndUpdate(
        { name: ministry.name },
        {
          $set: ministry,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
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
