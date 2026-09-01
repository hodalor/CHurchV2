const LookupType = require("../models/LookupType");
const LookupValue = require("../models/LookupValue");
const DiscipleshipProgramme = require("../models/DiscipleshipProgramme");
const Ministry = require("../models/Ministry");
const Role = require("../models/Role");
const StrategicPillar = require("../models/StrategicPillar");
const StrategicPlan = require("../models/StrategicPlan");
const User = require("../models/User");
const { hashPin } = require("../services/authService");
const { getLookupValueByTypeAndKey } = require("../services/lookupService");
const { ROLE_PERMISSION_MAP, ROLES } = require("../utils/permissions");

async function bootstrapApplicationData() {
  await seedRoles();
  await seedLookupData();
  await seedDiscipleshipProgrammes();
  await seedMinistries();
  await seedStrategicPlanningData();
  await seedInitialAdminUser();
  await seedInitialSuperadminUser();
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
    {
      key: "finance_transaction_method",
      label: "Finance Transaction Method",
      module: "finance",
      values: ["Collection Box", "Pouched", "Mobile Money", "Bank Account", "Cash"],
      strictSync: true,
    },
    {
      key: "finance_expense_payment_method",
      label: "Finance Expense Payment Method",
      module: "finance",
      values: ["Cash", "Mobile Money", "Bank Account", "Other"],
      strictSync: true,
    },
    {
      key: "finance_transaction_type",
      label: "Finance Transaction Type",
      module: "finance",
      values: ["Tithe", "Offering", "Donation", "Pledge Payment", "Other Income"],
    },
    {
      key: "finance_expense_category",
      label: "Finance Expense Category",
      module: "finance",
      values: ["Utilities", "Salaries", "Maintenance", "Ministry Expense", "Missions", "Administration", "Other"],
    },
    {
      key: "care_note_type",
      label: "Care Note Type",
      module: "care",
      values: ["Visitation", "Hospital Visit", "Phone Call", "Counseling Session", "Crisis Intervention", "Prayer Follow-Up", "General Check-In", "Other"],
    },
    {
      key: "communication_channel",
      label: "Communication Channel",
      module: "communication",
      values: ["SMS", "Email", "WhatsApp"],
    },
    {
      key: "communication_log_status",
      label: "Communication Log Status",
      module: "communication",
      values: ["Pending", "Sent", "Failed"],
    },
    {
      key: "trigger_source_module",
      label: "Trigger Source Module",
      module: "spiritual_health",
      values: ["Attendance", "Evangelism", "Discipleship", "Care", "Visitor"],
    },
    {
      key: "leadership_role_type",
      label: "Leadership Role Type",
      module: "leadership",
      values: ["Elder", "Deacon", "Ministry Leader", "Department Head", "Teacher", "Coordinator"],
    },
    {
      key: "emerging_leader_status",
      label: "Emerging Leader Status",
      module: "leadership",
      values: ["Identified", "In Development", "Deployed"],
    },
    {
      key: "mentor_assignment_status",
      label: "Mentor Assignment Status",
      module: "leadership",
      values: ["Active", "Completed", "Paused"],
    },
    {
      key: "succession_readiness_category",
      label: "Succession Readiness Category",
      module: "leadership",
      values: ["Not Yet", "Developing", "Ready", "Ready With Development Needs"],
    },
    {
      key: "strategic_plan_status",
      label: "Strategic Plan Status",
      module: "strategic",
      values: ["Draft", "Active", "Closed"],
    },
    {
      key: "kpi_target_frequency",
      label: "KPI Target Frequency",
      module: "strategic",
      values: ["Annual", "Quarterly", "Monthly"],
    },
    {
      key: "rag_status",
      label: "RAG Status",
      module: "strategic",
      values: ["Green", "Amber", "Red"],
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

    const seededKeys = [];

    for (const [index, label] of seed.values.entries()) {
      const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      seededKeys.push(key);
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

    if (seed.strictSync) {
      await LookupValue.updateMany(
        {
          type: lookupType._id,
          key: { $nin: seededKeys },
        },
        {
          $set: {
            isActive: false,
          },
        }
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

async function seedStrategicPlanningData() {
  const activeStatus = await getLookupValueByTypeAndKey("strategic_plan_status", "active");
  const plan = await StrategicPlan.findOneAndUpdate(
    { name: "Church Strategic Plan" },
    {
      $set: {
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2028-12-31"),
        status: activeStatus?._id || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const pillarSeeds = [
    {
      name: "Pillar 1 – Faith-Based Church",
      description:
        "Worship attendance, Bible study participation, prayer participation, discipleship, spiritual development, Men/Women/Youth and Children ministries, teaching and fellowship.",
    },
    {
      name: "Pillar 2 – Financial Sustainability and Stewardship",
      description:
        "Giving trends, financial reporting, budget performance, internal control and audit, asset management, maintenance, infrastructure development, Barnabas School performance, and resource stewardship.",
    },
    {
      name: "Pillar 3 – Strong Evangelism and Edification",
      description:
        "Evangelism contacts, door-to-door campaigns, crusades and outreach, Bible studies, visitors, visitor retention, baptisms, discipleship, community outreach, marriage, and family strengthening.",
    },
    {
      name: "Pillar 4 – Organisational Strength and Operational Excellence",
      description:
        "Governance meetings, AGM and statutory reporting, ministry reporting, leadership development, succession, administration, membership data quality, ICT adoption, property management, and operational effectiveness.",
    },
  ];

  await Promise.all(
    pillarSeeds.map((pillar) =>
      StrategicPillar.findOneAndUpdate(
        { planId: plan._id, name: pillar.name },
        {
          $set: pillar,
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
    permissions: ROLE_PERMISSION_MAP[ROLES.SYSTEM_ADMINISTRATOR],
    permissionsConfigured: true,
    status: "Active",
  });
}

async function seedInitialSuperadminUser() {
  const superadminUsername = "superadmin";
  const superadminPin = "0903";
  const superadminRole = await Role.findOne({ name: ROLES.SUPERADMIN });

  if (!superadminRole) {
    return;
  }

  const existingUser = await User.findOne({ username: superadminUsername });
  if (existingUser) {
    if (!existingUser.roles.some((roleId) => roleId.toString() === superadminRole._id.toString())) {
      existingUser.roles = [superadminRole._id];
    }
    existingUser.pinHash = await hashPin(superadminPin);
    existingUser.permissions = ROLE_PERMISSION_MAP[ROLES.SUPERADMIN];
    existingUser.permissionsConfigured = true;
    existingUser.status = "Active";
    await existingUser.save();
    return;
  }

  const pinHash = await hashPin(superadminPin);
  await User.create({
    username: superadminUsername,
    pinHash,
    displayName: "Superadmin",
    email: "superadmin@churchflow.org",
    roles: [superadminRole._id],
    permissions: ROLE_PERMISSION_MAP[ROLES.SUPERADMIN],
    permissionsConfigured: true,
    status: "Active",
  });
}

module.exports = {
  bootstrapApplicationData,
  seedDiscipleshipProgrammes,
  seedLookupData,
  seedMinistries,
  seedRoles,
  seedStrategicPlanningData,
};
