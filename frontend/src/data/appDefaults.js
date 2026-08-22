export const initialBranding = {
  appName: "ChurchSuite Pro",
  appLogoUrl: "",
  currencies: [{ code: "GHS", name: "Ghana Cedi", symbol: "GH¢" }],
  defaultCurrencyCode: "GHS",
  churchName: "ChurchFlow Central",
  address: "123 Church Street, Accra",
  phone: "+233 20 700 8899",
  email: "hello@churchflow.org",
  website: "www.churchflow.org",
};

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
