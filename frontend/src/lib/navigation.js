import {
  FaBuilding,
  FaCalendarCheck,
  FaChurch,
  FaCoins,
  FaHandHoldingHeart,
  FaHome,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

export const navigationSections = [
  { label: "Dashboard", path: "/dashboard", icon: FaBuilding },
  { label: "Church Setup", path: "/setup", icon: FaChurch },
  { label: "Members", path: "/members", icon: FaUsers },
  { label: "Visitors", path: "/visitors", icon: FaUsers, children: [
    { label: "RegisterList", path: "/visitors/register-list" },
    { label: "Pipeline", path: "/visitors/pipeline" },
    { label: "Follow-ups", path: "/visitors/follow-ups" },
    { label: "Workflow", path: "/visitors/workflow" },
    { label: "Reports", path: "/visitors/reports" },
  ] },
  { label: "Family", path: "/family", icon: FaHome, children: [
    { label: "Overview", path: "/family/overview" },
    { label: "Households", path: "/family/households" },
  ] },
  { label: "Ministries", path: "/ministries", icon: FaHandHoldingHeart },
  { label: "Finance", path: "/finance", icon: FaCoins, children: [
    { label: "Overview", path: "/finance/overview" },
    { label: "Transactions", path: "/finance/transactions" },
    { label: "Pledges", path: "/finance/pledges" },
    { label: "Expenses", path: "/finance/expenses" },
    { label: "Budgets", path: "/finance/budgets" },
    { label: "Reports", path: "/finance/reports" },
  ] },
  { label: "Attendance", path: "/attendance", icon: FaCalendarCheck, children: [
    { label: "Services", path: "/attendance/services" },
    { label: "Reports", path: "/attendance/reports" },
    { label: "Absentees", path: "/attendance/absentees" },
  ] },
  { label: "Users", path: "/users", icon: FaUserShield },
];
