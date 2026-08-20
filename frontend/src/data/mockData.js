export const APP_NAME = "ChurchSuite Pro";

export const initialBranding = {
  appName: "ChurchSuite Pro",
  appLogoUrl: "",
  churchName: "ChurchFlow Central",
  address: "123 Church Street, Accra",
  phone: "+233 20 700 8899",
  email: "hello@churchflow.org",
  website: "www.churchflow.org",
};

export const initialGroups = [
  { id: "g1", name: "Central Zone", levelName: "Zone", parentId: null, code: "ZONE-001" },
  { id: "g2", name: "North Zone", levelName: "Zone", parentId: null, code: "ZONE-002" },
  { id: "g3", name: "Faith Sub-Zone", levelName: "Sub-Zone", parentId: "g1", code: "SUB-001" },
  { id: "g4", name: "Glory Cell", levelName: "Cell", parentId: "g3", code: "CELL-001" },
  { id: "g5", name: "Hope Cell", levelName: "Cell", parentId: "g3", code: "CELL-002" },
  { id: "g6", name: "Victory Sub-Zone", levelName: "Sub-Zone", parentId: "g2", code: "SUB-002" },
];

export const initialMinistries = [
  { id: "m1", name: "Choir", leader: "Grace Mensah", description: "Worship and music team", color: "#7c5cff" },
  { id: "m2", name: "Ushering", leader: "Peter Cole", description: "Guest reception and seating", color: "#ef476f" },
  { id: "m3", name: "Children", leader: "Martha Daniel", description: "Children church coordination", color: "#ff9800" },
  { id: "m4", name: "Media", leader: "John Kwarteng", description: "Sound and projection support", color: "#14b8a6" },
];

export const initialRoles = [
  { id: "r1", name: "Superadmin", description: "Highest access with full godmode control" },
  { id: "r2", name: "System Administrator", description: "Full access to setup, users, and system administration" },
  { id: "r3", name: "Church Administrator", description: "Operational access to membership, households, visitors, attendance, and ministries" },
  { id: "r4", name: "Elders", description: "Leadership dashboards, care, strategic, and leadership visibility" },
  { id: "r5", name: "Deacons", description: "Assigned operational visibility for ministries and reports" },
  { id: "r6", name: "Finance Manager", description: "Finance oversight and reporting access" },
  { id: "r7", name: "Church Accountant", description: "Finance processing and accounting access" },
  { id: "r8", name: "Ministry Leaders", description: "Ministry members, attendance, performance, and reports" },
  { id: "r9", name: "Evangelism Team", description: "Visitors, prospects, Bible studies, and pipeline follow-up" },
  { id: "r10", name: "Data Entry Clerks", description: "Controlled data capture without confidential admin access" },
];

export const initialUsers = [
  { id: "u1", displayName: "Paul Admin", username: "admin", email: "admin@churchflow.org", roles: ["System Administrator"], permissions: [], status: "Active" },
  { id: "u2", displayName: "Grace Finance", username: "grace.finance", email: "finance@churchflow.org", roles: ["Church Administrator"], permissions: [], status: "Active" },
  { id: "u3", displayName: "Martha Kids", username: "martha.kids", email: "kids@churchflow.org", roles: ["Ministry Leaders"], permissions: [], status: "Pending" },
];

export const initialVisitors = [
  { id: "v1", fullName: "Sarah Agyeman", phone: "+233 24 111 2200", stage: "First Timer", assignedTo: "Follow-up Team", nextStep: "Call by Tuesday" },
  { id: "v2", fullName: "Michael Tetteh", phone: "+233 54 333 1200", stage: "Pipeline", assignedTo: "Evangelism Team", nextStep: "Invite to cell meeting" },
  { id: "v3", fullName: "Deborah Mensah", phone: "+233 20 999 3100", stage: "Follow-up", assignedTo: "Pastoral Care", nextStep: "Home visit" },
];

export const initialFinanceRecords = [
  { id: "f1", recordNo: "FIN-001", category: "Offering", description: "Sunday first service", amount: 1200, date: "2026-08-03", status: "Posted" },
  { id: "f2", recordNo: "FIN-002", category: "Tithe", description: "Weekly tithe collection", amount: 2200, date: "2026-08-10", status: "Posted" },
  { id: "f3", recordNo: "FIN-003", category: "Project", description: "Building support", amount: 850, date: "2026-08-17", status: "Pending" },
];

export const initialAttendanceSessions = [
  { id: "a1", service: "Sunday Worship", zone: "Central Zone", date: "2026-08-03", expected: 210, present: 184, rate: "88%" },
  { id: "a2", service: "Midweek Service", zone: "North Zone", date: "2026-08-06", expected: 150, present: 121, rate: "81%" },
  { id: "a3", service: "Youth Encounter", zone: "Central Zone", date: "2026-08-09", expected: 90, present: 76, rate: "84%" },
];

export const initialFamilies = [
  {
    id: "fam1",
    familyId: "HH000001",
    familyName: "Owusu Household",
    headOfHousehold: { memberId: "M000001", memberName: "Daniel Owusu" },
    spouse: { memberId: "M000002", memberName: "Ruth Asante" },
    children: [{ memberId: "M000003", memberName: "Ethan Owusu" }],
    dependants: [],
    residentialArea: "Airport Residential",
    physicalAddress: "12 Palm Street, Accra",
    fellowshipZone: "g1",
    familyContact: "+233 24 555 1001",
    visitationHistory: "Visited in July 2026 for family prayer and counselling.",
    householdMembers: [
      { memberId: "M000001", memberName: "Daniel Owusu", relationshipToHead: "Head", status: "Active" },
      { memberId: "M000002", memberName: "Ruth Asante", relationshipToHead: "Spouse", status: "Active" },
      { memberId: "M000003", memberName: "Ethan Owusu", relationshipToHead: "Son", status: "Active" },
    ],
  },
];

export const attendanceTrend = [
  { month: "Jan", attendance: 180, giving: 6400 },
  { month: "Feb", attendance: 210, giving: 7200 },
  { month: "Mar", attendance: 235, giving: 8000 },
  { month: "Apr", attendance: 260, giving: 8500 },
  { month: "May", attendance: 248, giving: 9100 },
  { month: "Jun", attendance: 295, giving: 9800 },
];

export const initialMembers = [
  {
    id: "mem1",
    memberId: "M000001",
    firstName: "Daniel",
    otherName: "Kwame",
    lastName: "Owusu",
    memberType: "Adult",
    gender: "Male",
    maritalStatus: "Married",
    phone: "+233 24 555 1001",
    email: "daniel@churchflow.org",
    city: "Accra",
    country: "Ghana",
    address: "12 Palm Street",
    notes: "Zone coordinator",
    membershipStatus: "Active",
    membershipDate: "2026-01-08",
    baptismStatus: "Baptized",
    baptismDate: "2024-04-21",
    ministryId: "m2",
    attendanceRate: "92%",
    groups: [
      { groupId: "g1", levelName: "Zone", groupName: "Central Zone" },
      { groupId: "g3", levelName: "Sub-Zone", groupName: "Faith Sub-Zone" },
      { groupId: "g4", levelName: "Cell", groupName: "Glory Cell" },
    ],
    personalPhoto: "Uploaded",
    idFrontPhoto: "Uploaded",
    idBackPhoto: "Uploaded",
    familyId: "HH000001",
    familyName: "Owusu Household",
    householdRole: "Head",
    familyLinks: [{ memberId: "M000002", memberName: "Ruth Asante", relationship: "Spouse" }],
  },
  {
    id: "mem2",
    memberId: "M000002",
    firstName: "Ruth",
    otherName: "Ama",
    lastName: "Asante",
    memberType: "Adult",
    gender: "Female",
    maritalStatus: "Married",
    phone: "+233 54 222 4400",
    email: "ruth@churchflow.org",
    city: "Accra",
    country: "Ghana",
    address: "12 Palm Street",
    notes: "",
    membershipStatus: "Active",
    membershipDate: "2026-02-14",
    baptismStatus: "Baptized",
    baptismDate: "2024-07-15",
    ministryId: "m1",
    attendanceRate: "88%",
    groups: [
      { groupId: "g2", levelName: "Zone", groupName: "North Zone" },
      { groupId: "g6", levelName: "Sub-Zone", groupName: "Victory Sub-Zone" },
    ],
    personalPhoto: "Uploaded",
    idFrontPhoto: "Uploaded",
    idBackPhoto: "Uploaded",
    familyId: "HH000001",
    familyName: "Owusu Household",
    householdRole: "Spouse",
    familyLinks: [{ memberId: "M000001", memberName: "Daniel Owusu", relationship: "Spouse" }],
  },
  {
    id: "mem3",
    memberId: "M000003",
    firstName: "Ethan",
    otherName: "",
    lastName: "Owusu",
    memberType: "Child",
    gender: "Child",
    maritalStatus: "Single",
    phone: "Parent contact on file",
    email: "",
    city: "Accra",
    country: "Ghana",
    address: "12 Palm Street",
    notes: "Children church",
    membershipStatus: "Active",
    membershipDate: "2026-03-03",
    baptismStatus: "Not Baptized",
    baptismDate: "",
    ministryId: "m3",
    attendanceRate: "95%",
    groups: [
      { groupId: "g1", levelName: "Zone", groupName: "Central Zone" },
      { groupId: "g3", levelName: "Sub-Zone", groupName: "Faith Sub-Zone" },
      { groupId: "g5", levelName: "Cell", groupName: "Hope Cell" },
    ],
    personalPhoto: "Pending",
    idFrontPhoto: "Birth record",
    idBackPhoto: "Guardian ID",
    familyId: "HH000001",
    familyName: "Owusu Household",
    householdRole: "Son",
    familyLinks: [
      { memberId: "M000001", memberName: "Daniel Owusu", relationship: "Father" },
      { memberId: "M000002", memberName: "Ruth Asante", relationship: "Mother" },
    ],
  },
];

export const groupFormTemplate = {
  name: "",
  parentId: "",
  code: "",
  description: "",
};

export const ministryFormTemplate = {
  name: "",
  leader: "",
  color: "#4f46e5",
  description: "",
};

export const financeFormTemplate = {
  recordNo: "",
  category: "Offering",
  description: "",
  amount: "",
  date: "",
  status: "Pending",
};

export const attendanceFormTemplate = {
  service: "",
  zone: "",
  date: "",
  expected: "",
  present: "",
};

export const userFormTemplate = {
  displayName: "",
  username: "",
  email: "",
  pin: "",
  roleIds: [],
  permissions: [],
  status: "Pending",
};

export const roleFormTemplate = {
  name: "",
  description: "",
};

export const memberFormTemplate = {
  memberId: "",
  firstName: "",
  otherName: "",
  preferredName: "",
  lastName: "",
  memberType: "Adult",
  gender: "",
  maritalStatus: "",
  phone: "",
  email: "",
  residentialArea: "",
  dateOfBirth: "",
  occupation: "",
  employerOrBusiness: "",
  educationOrSkills: "",
  ministryId: "",
  membershipStatus: "Active",
  membershipDate: "",
  dateJoined: "",
  baptismStatus: "Not Baptized",
  baptismDate: "",
  placeBaptized: "",
  baptizedBy: "",
  previousCongregation: "",
  transferDetails: "",
  address: "",
  city: "",
  country: "Ghana",
  gpsLatitude: "",
  gpsLongitude: "",
  notes: "",
  personalPhoto: "",
  idFrontPhoto: "",
  idBackPhoto: "",
  photoFileName: "",
  sourceRecordRef: "",
  dataEntryClerk: "",
  dateCaptured: "",
  familyId: "",
  familyName: "",
  householdRole: "",
  groupChain: [],
  familyLinks: [],
};

export const familyFormTemplate = {
  familyId: "",
  familyName: "",
  headOfHousehold: null,
  spouse: null,
  children: [],
  dependants: [],
  residentialArea: "",
  physicalAddress: "",
  fellowshipZone: "",
  familyContact: "",
  visitationHistory: "",
  householdMembers: [],
};
