export const APP_NAME = "ChurchSuite Pro";

export const initialBranding = {
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
  { id: "r1", name: "Administrator", description: "Full access to setup and records" },
  { id: "r2", name: "Finance Officer", description: "Can manage finance and reports" },
  { id: "r3", name: "Ministry Leader", description: "Can oversee ministry teams" },
];

export const initialUsers = [
  { id: "u1", fullName: "Paul Admin", email: "admin@churchflow.org", role: "Administrator", status: "Active" },
  { id: "u2", fullName: "Grace Finance", email: "finance@churchflow.org", role: "Finance Officer", status: "Active" },
  { id: "u3", fullName: "Martha Kids", email: "kids@churchflow.org", role: "Ministry Leader", status: "Pending" },
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
    familyId: "FH0001",
    familyName: "Owusu Household",
    headOfHousehold: { memberId: "MB0001", memberName: "Daniel Owusu" },
    spouse: { memberId: "MB0002", memberName: "Ruth Asante" },
    children: [{ memberId: "MB0003", memberName: "Ethan Owusu" }],
    dependants: [],
    residentialArea: "Airport Residential",
    physicalAddress: "12 Palm Street, Accra",
    fellowshipZone: "g1",
    familyContact: "+233 24 555 1001",
    visitationHistory: "Visited in July 2026 for family prayer and counselling.",
    householdMembers: [
      { memberId: "MB0001", memberName: "Daniel Owusu", relationshipToHead: "Head", status: "Active" },
      { memberId: "MB0002", memberName: "Ruth Asante", relationshipToHead: "Wife", status: "Active" },
      { memberId: "MB0003", memberName: "Ethan Owusu", relationshipToHead: "Son", status: "Active" },
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
    memberId: "MB0001",
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
    familyId: "FH0001",
    familyName: "Owusu Household",
    householdRole: "Head",
    familyLinks: [{ memberId: "MB0002", memberName: "Ruth Asante", relationship: "Wife" }],
  },
  {
    id: "mem2",
    memberId: "MB0002",
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
    familyId: "FH0001",
    familyName: "Owusu Household",
    householdRole: "Wife",
    familyLinks: [{ memberId: "MB0001", memberName: "Daniel Owusu", relationship: "Husband" }],
  },
  {
    id: "mem3",
    memberId: "MB0003",
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
    familyId: "FH0001",
    familyName: "Owusu Household",
    householdRole: "Son",
    familyLinks: [
      { memberId: "MB0001", memberName: "Daniel Owusu", relationship: "Father" },
      { memberId: "MB0002", memberName: "Ruth Asante", relationship: "Mother" },
    ],
  },
];

export const groupFormTemplate = {
  name: "",
  levelName: "",
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
  fullName: "",
  email: "",
  role: "Administrator",
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
  lastName: "",
  memberType: "Adult",
  gender: "",
  maritalStatus: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  ministryId: "",
  membershipStatus: "Active",
  membershipDate: "",
  baptismStatus: "Not Baptized",
  baptismDate: "",
  address: "",
  city: "",
  country: "Ghana",
  notes: "",
  personalPhoto: "",
  idFrontPhoto: "",
  idBackPhoto: "",
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
