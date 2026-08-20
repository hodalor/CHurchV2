import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageHeader from "./PageHeader";
import DashboardPage from "../../pages/DashboardPage";
import SetupPage from "../../pages/SetupPage";
import MembersPage from "../../pages/MembersPage";
import MinistriesPage from "../../pages/MinistriesPage";
import EvangelismPage from "../../pages/EvangelismPage";
import DiscipleshipPage from "../../pages/DiscipleshipPage";
import VisitorsPage from "../../pages/VisitorsPage";
import FamilyOverviewPage from "../../pages/FamilyOverviewPage";
import FamilyHouseholdsPage from "../../pages/FamilyHouseholdsPage";
import FinancePage from "../../pages/FinancePage";
import AttendancePage from "../../pages/AttendancePage";
import CommunicationPage from "../../pages/CommunicationPage";
import SpiritualHealthPage from "../../pages/SpiritualHealthPage";
import LeadershipDevelopmentPage from "../../pages/LeadershipDevelopmentPage";
import StrategicPlanningPage from "../../pages/StrategicPlanningPage";
import SettingsPage from "../../pages/SettingsPage";
import UsersPage from "../../pages/UsersPage";
import MemberEnrollmentModal from "../members/MemberEnrollmentModal";
import RecordDetailModal from "../common/RecordDetailModal";
import ToastViewport from "../common/ToastViewport";
import { useAppContext } from "../../context/AppContext";

export default function AppLayout() {
  const location = useLocation();
  const { authUser, openMemberEnrollment, openRecordModal, activeSetupTab, branding, toasts, dismissToast } = useAppContext();
  const pageMeta = getPageMeta(location.pathname);
  const pageAction = getPageAction(pageMeta.action, activeSetupTab, { openMemberEnrollment, openRecordModal, branding, authUser }, location.pathname);

  return (
    <>
      <div className="app-shell">
        <Sidebar />

        <main className="main-shell">
          <Topbar />

          <section className="workspace-shell">
            <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} action={pageAction} />

            <div className="page-scroll-area">
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/ministries" element={<MinistriesPage />} />
                <Route path="/evangelism" element={<Navigate to="/evangelism/pipeline" replace />} />
                <Route path="/evangelism/pipeline" element={<EvangelismPage />} />
                <Route path="/evangelism/contacts" element={<EvangelismPage />} />
                <Route path="/evangelism/bible-study" element={<EvangelismPage />} />
                <Route path="/evangelism/campaigns" element={<EvangelismPage />} />
                <Route path="/evangelism/reports" element={<EvangelismPage />} />
                <Route path="/discipleship" element={<Navigate to="/discipleship/programmes" replace />} />
                <Route path="/discipleship/programmes" element={<DiscipleshipPage />} />
                <Route path="/discipleship/enrollments" element={<DiscipleshipPage />} />
                <Route path="/discipleship/follow-ups" element={<DiscipleshipPage />} />
                <Route path="/discipleship/reports" element={<DiscipleshipPage />} />
                <Route path="/visitors" element={<Navigate to="/visitors/register-list" replace />} />
                <Route path="/visitors/register-list" element={<VisitorsPage />} />
                <Route path="/visitors/pipeline" element={<VisitorsPage />} />
                <Route path="/visitors/follow-ups" element={<VisitorsPage />} />
                <Route path="/visitors/workflow" element={<VisitorsPage />} />
                <Route path="/visitors/reports" element={<VisitorsPage />} />
                <Route path="/family" element={<Navigate to="/family/overview" replace />} />
                <Route path="/family/overview" element={<FamilyOverviewPage />} />
                <Route path="/family/households" element={<FamilyHouseholdsPage />} />
                <Route path="/finance" element={<Navigate to="/finance/overview" replace />} />
                <Route path="/finance/overview" element={<FinancePage />} />
                <Route path="/finance/transactions" element={<FinancePage />} />
                <Route path="/finance/pledges" element={<FinancePage />} />
                <Route path="/finance/expenses" element={<FinancePage />} />
                <Route path="/finance/budgets" element={<FinancePage />} />
                <Route path="/finance/reports" element={<FinancePage />} />
                <Route path="/attendance" element={<Navigate to="/attendance/services" replace />} />
                <Route path="/attendance/services" element={<AttendancePage />} />
                <Route path="/attendance/reports" element={<AttendancePage />} />
                <Route path="/attendance/absentees" element={<AttendancePage />} />
                <Route path="/communication" element={<Navigate to="/communication/groups" replace />} />
                <Route path="/communication/groups" element={<CommunicationPage />} />
                <Route path="/communication/preferences" element={<CommunicationPage />} />
                <Route path="/communication/logs" element={<CommunicationPage />} />
                <Route path="/spiritual-health" element={<Navigate to="/spiritual-health/dashboard" replace />} />
                <Route path="/spiritual-health/dashboard" element={<SpiritualHealthPage />} />
                <Route path="/spiritual-health/alerts" element={<SpiritualHealthPage />} />
                <Route path="/spiritual-health/rules" element={<SpiritualHealthPage />} />
                <Route path="/leadership" element={<Navigate to="/leadership/roles" replace />} />
                <Route path="/leadership/roles" element={<LeadershipDevelopmentPage />} />
                <Route path="/leadership/talent" element={<LeadershipDevelopmentPage />} />
                <Route path="/leadership/succession" element={<LeadershipDevelopmentPage />} />
                <Route path="/leadership/reports" element={<LeadershipDevelopmentPage />} />
                <Route path="/strategic" element={<Navigate to="/strategic/plans" replace />} />
                <Route path="/strategic/plans" element={<StrategicPlanningPage />} />
                <Route path="/strategic/kpis" element={<StrategicPlanningPage />} />
                <Route path="/strategic/scorecards" element={<StrategicPlanningPage />} />
                <Route path="/users" element={authUser?.permissions?.includes("manage_users") ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
                <Route path="/settings" element={<Navigate to="/settings/app-config" replace />} />
                <Route path="/settings/app-config" element={authUser?.permissions?.includes("manage_settings") ? <SettingsPage /> : <Navigate to="/dashboard" replace />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </section>
        </main>
      </div>

      <MemberEnrollmentModal />
      <RecordDetailModal />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

function getPageMeta(pathname) {
  if (pathname.startsWith("/members")) {
    return {
      title: "Members",
      subtitle: "Auto-generated IDs, guided enrolment, and family linking.",
      action: "member",
    };
  }

  if (pathname.startsWith("/visitors")) {
    return {
      title: "Visitors",
      subtitle: "Register visitors separately and manage their follow-up journey.",
      action: "visitor",
    };
  }

  if (pathname.startsWith("/evangelism")) {
    return {
      title: "Evangelism",
      subtitle: "Track prospects from first contact through Bible study and integration.",
      action: "evangelism",
    };
  }

  if (pathname.startsWith("/discipleship")) {
    return {
      title: "Discipleship",
      subtitle: "Manage programmes, mentoring, session progress, and overdue follow-up.",
      action: "discipleship",
    };
  }

  if (pathname.startsWith("/family")) {
    return {
      title: "Family Ministry",
      subtitle: "See household composition, identify at-risk families, and support family-level care.",
      action: "family",
    };
  }

  if (pathname.startsWith("/finance")) {
    return {
      title: "Finance",
      subtitle: "Finance is structured for gradual rollout with submenus and cleaner screens.",
      action: "finance",
    };
  }

  if (pathname.startsWith("/attendance")) {
    return {
      title: "Attendance",
      subtitle: "Services, reports, and absentees are grouped into focused submenus.",
      action: "attendance",
    };
  }

  if (pathname.startsWith("/users")) {
    return {
      title: "Users",
      subtitle: "User accounts and roles stay separate from church membership records.",
      action: "user",
    };
  }

  if (pathname.startsWith("/settings")) {
    return {
      title: "Settings",
      subtitle: "Superadmin controls for application-wide shell and security configuration.",
      action: "settings",
    };
  }

  if (pathname.startsWith("/communication")) {
    return {
      title: "Communication",
      subtitle: "Build filtered audiences, respect preferences, and keep a clean communication history.",
    };
  }

  if (pathname.startsWith("/spiritual-health")) {
    return {
      title: "Spiritual Health",
      subtitle: "Surface administrative follow-up signals from existing ministry activity without duplicating records.",
    };
  }

  if (pathname.startsWith("/leadership")) {
    return {
      title: "Leadership Development",
      subtitle: "Track service history, mentoring, talent, and succession records with restricted visibility where needed.",
    };
  }

  if (pathname.startsWith("/strategic")) {
    return {
      title: "Strategic Planning",
      subtitle: "Manage plans, KPI tracking, and scorecards for ministries and the whole church.",
    };
  }

  if (pathname.startsWith("/ministries")) {
    return {
      title: "Ministries",
      subtitle: "Ministry records remain clean and easy to extend later.",
      action: "ministry",
    };
  }

  if (pathname.startsWith("/setup")) {
    return {
      title: "Church Setup",
      subtitle: "Church branding, groups, and role definitions live in one setup area.",
      action: "setup",
    };
  }

  return {
    title: "Dashboard",
    subtitle: "A cleaner dashboard shell with fixed headers and structured navigation.",
  };
}

function getPageAction(action, activeSetupTab, handlers, pathname) {
  if (!action) {
    return null;
  }

  const permissionSet = new Set(handlers.authUser?.permissions || []);

  if (action === "member") {
    if (!permissionSet.has("manage_members")) {
      return null;
    }
    return (
      <button type="button" className="primary-button large-action" onClick={handlers.openMemberEnrollment}>
        <FaPlus />
        Add Member
      </button>
    );
  }

  if (action === "setup") {
    const allowedForTab =
      activeSetupTab === "groups"
        ? permissionSet.has("manage_groups")
        : activeSetupTab === "users"
          ? permissionSet.has("manage_users")
          : permissionSet.has("manage_system");

    if (!allowedForTab) {
      return null;
    }

    const setupType =
      activeSetupTab === "groups"
        ? "group"
        : activeSetupTab === "users"
          ? "role"
          : "branding";

    const label =
      setupType === "group"
        ? "Add Group"
        : setupType === "role"
          ? "Add Role"
          : "Edit Branding";

    const payload = setupType === "branding" ? handlers.branding : null;

    return (
      <button type="button" className="primary-button large-action" onClick={() => handlers.openRecordModal(setupType, payload, "edit")}>
        <FaPlus />
        {label}
      </button>
    );
  }

  const labels = {
    visitor: "Add Visitor",
    evangelism: pathname?.startsWith("/evangelism/campaigns")
      ? "Add Campaign"
      : pathname?.startsWith("/evangelism/bible-study")
        ? "Add Bible Study"
        : "Add Prospect",
    discipleship: pathname?.startsWith("/discipleship/programmes")
      ? "Add Programme"
      : "Enroll Member",
    family: "Add Family",
    finance: "Add Finance",
    attendance: "Add Event",
    user: "Add User",
    ministry: "Add Ministry",
    settings: "Edit App Config",
  };

  if (!labels[action]) {
    return null;
  }

  const actionPermissionMap = {
    visitor: "manage_visitors",
    evangelism: "manage_evangelism",
    discipleship: "manage_discipleship",
    family: "manage_households",
    finance: "manage_finance",
    attendance: "manage_attendance",
    user: "manage_users",
    ministry: "manage_ministries",
    settings: "manage_settings",
  };

  if (actionPermissionMap[action] && !permissionSet.has(actionPermissionMap[action])) {
    return null;
  }

  return (
    <button
      type="button"
      className="primary-button large-action"
      onClick={() =>
        handlers.openRecordModal(
          action === "evangelism"
            ? pathname?.startsWith("/evangelism/campaigns")
              ? "campaign"
              : pathname?.startsWith("/evangelism/bible-study")
                ? "bibleStudy"
                : "prospect"
            : action === "discipleship"
              ? pathname?.startsWith("/discipleship/programmes")
                ? "discipleshipProgramme"
                : "discipleshipEnrollment"
            : action === "attendance"
              ? "attendanceEvent"
            : action === "settings"
              ? "appConfig"
            : action,
          null,
          "edit"
        )
      }
    >
      <FaPlus />
      {labels[action]}
    </button>
  );
}
