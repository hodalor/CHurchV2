import {
  FaBuilding,
  FaBullhorn,
  FaCalendarCheck,
  FaChartLine,
  FaChurch,
  FaComments,
  FaCoins,
  FaCog,
  FaRobot,
  FaGraduationCap,
  FaHandHoldingHeart,
  FaHeartbeat,
  FaHome,
  FaSitemap,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";

export const navigationSections = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: FaBuilding, permission: "view_dashboard" },
  { key: "setup", label: "Church Setup", path: "/setup", icon: FaChurch, permission: "view_setup" },
  { key: "members", label: "Members", path: "/members", icon: FaUsers, permission: "view_members" },
  { key: "visitors", label: "Visitors", path: "/visitors", icon: FaUsers, children: [
    { key: "visitors.register-list", label: "RegisterList", path: "/visitors/register-list" },
    { key: "visitors.pipeline", label: "Pipeline", path: "/visitors/pipeline" },
    { key: "visitors.follow-ups", label: "Follow-ups", path: "/visitors/follow-ups" },
    { key: "visitors.workflow", label: "Workflow", path: "/visitors/workflow" },
    { key: "visitors.reports", label: "Reports", path: "/visitors/reports" },
  ], permission: "view_visitors" },
  { key: "evangelism", label: "Evangelism", path: "/evangelism", icon: FaBullhorn, children: [
    { key: "evangelism.pipeline", label: "Pipeline", path: "/evangelism/pipeline" },
    { key: "evangelism.contacts", label: "Contacts", path: "/evangelism/contacts" },
    { key: "evangelism.bible-study", label: "Bible Study", path: "/evangelism/bible-study" },
    { key: "evangelism.campaigns", label: "Campaigns", path: "/evangelism/campaigns" },
    { key: "evangelism.reports", label: "Reports", path: "/evangelism/reports" },
  ], permission: "view_evangelism" },
  { key: "discipleship", label: "Discipleship", path: "/discipleship", icon: FaGraduationCap, children: [
    { key: "discipleship.programmes", label: "Programmes", path: "/discipleship/programmes" },
    { key: "discipleship.enrollments", label: "Enrollments", path: "/discipleship/enrollments" },
    { key: "discipleship.follow-ups", label: "Follow-ups", path: "/discipleship/follow-ups" },
    { key: "discipleship.reports", label: "Reports", path: "/discipleship/reports" },
  ], permission: "view_discipleship" },
  { key: "family", label: "Family", path: "/family", icon: FaHome, children: [
    { key: "family.overview", label: "Overview", path: "/family/overview" },
    { key: "family.households", label: "Households", path: "/family/households" },
  ], permission: "view_households" },
  { key: "ministries", label: "Ministries", path: "/ministries", icon: FaHandHoldingHeart, permission: "view_ministries" },
  { key: "finance", label: "Finance", path: "/finance", icon: FaCoins, children: [
    { key: "finance.overview", label: "Overview", path: "/finance/overview" },
    { key: "finance.transactions", label: "Transactions", path: "/finance/transactions" },
    { key: "finance.pledges", label: "Pledges", path: "/finance/pledges" },
    { key: "finance.expenses", label: "Expenses", path: "/finance/expenses" },
    { key: "finance.budgets", label: "Budgets", path: "/finance/budgets" },
    { key: "finance.reports", label: "Reports", path: "/finance/reports" },
  ], permission: "view_finance" },
  { key: "care", label: "Pastoral Care", path: "/care", icon: FaHeartbeat, children: [
    { key: "care.notes", label: "Notes", path: "/care/notes" },
    { key: "care.cases", label: "Cases", path: "/care/cases" },
    { key: "care.counseling", label: "Counseling", path: "/care/counseling" },
    { key: "care.visitations", label: "Visitations", path: "/care/visitations" },
  ], permission: "view_pastoral_care" },
  { key: "attendance", label: "Attendance", path: "/attendance", icon: FaCalendarCheck, children: [
    { key: "attendance.services", label: "Services", path: "/attendance/services" },
    { key: "attendance.reports", label: "Reports", path: "/attendance/reports" },
    { key: "attendance.absentees", label: "Absentees", path: "/attendance/absentees" },
  ], permission: "view_attendance" },
  { key: "communication", label: "Communication", path: "/communication", icon: FaComments, children: [
    { key: "communication.groups", label: "Groups", path: "/communication/groups" },
    { key: "communication.preferences", label: "Preferences", path: "/communication/preferences" },
    { key: "communication.logs", label: "Logs", path: "/communication/logs" },
  ], permission: "view_communication" },
  { key: "spiritual-health", label: "Spiritual Health", path: "/spiritual-health", icon: FaHeartbeat, children: [
    { key: "spiritual-health.dashboard", label: "Dashboard", path: "/spiritual-health/dashboard" },
    { key: "spiritual-health.alerts", label: "Alerts", path: "/spiritual-health/alerts" },
    { key: "spiritual-health.rules", label: "Rules", path: "/spiritual-health/rules" },
  ], permission: "view_spiritual_health" },
  { key: "leadership", label: "Leadership", path: "/leadership", icon: FaSitemap, children: [
    { key: "leadership.roles", label: "Roles", path: "/leadership/roles" },
    { key: "leadership.talent", label: "Talent", path: "/leadership/talent" },
    { key: "leadership.succession", label: "Succession", path: "/leadership/succession" },
    { key: "leadership.reports", label: "Reports", path: "/leadership/reports" },
  ], permission: "view_leadership" },
  { key: "strategic", label: "Strategic", path: "/strategic", icon: FaChartLine, children: [
    { key: "strategic.plans", label: "Plans", path: "/strategic/plans" },
    { key: "strategic.kpis", label: "KPIs", path: "/strategic/kpis" },
    { key: "strategic.scorecards", label: "Scorecards", path: "/strategic/scorecards" },
  ], permission: "view_strategic_planning" },
  { key: "ai-assist", label: "AI Assist", path: "/ai-assist", icon: FaRobot, children: [
    { key: "ai-assist.duplicates", label: "Duplicates", path: "/ai-assist/duplicates" },
    { key: "ai-assist.suggestions", label: "Suggestions", path: "/ai-assist/suggestions" },
  ], permission: "view_ai_assist" },
  { key: "users", label: "Users", path: "/users", icon: FaUserShield, permission: "manage_users" },
  { key: "church-management", label: "Church Management", path: "/church-management", icon: FaChurch, superadminOnly: true },
  { key: "settings", label: "Settings", path: "/settings", icon: FaCog, children: [
    { key: "settings.app-config", label: "App Config", path: "/settings/app-config" },
  ], permission: "manage_settings" },
];

export function flattenNavigationKeys(sections = navigationSections) {
  return sections.flatMap((section) => [
    section.key || section.path,
    ...(Array.isArray(section.children) ? section.children.map((child) => child.key || child.path) : []),
  ]);
}
