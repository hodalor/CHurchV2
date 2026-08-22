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
import AiAssistPage from "../../pages/AiAssistPage";
import PastoralCarePage from "../../pages/PastoralCarePage";
import SpiritualHealthPage from "../../pages/SpiritualHealthPage";
import LeadershipDevelopmentPage from "../../pages/LeadershipDevelopmentPage";
import StrategicPlanningPage from "../../pages/StrategicPlanningPage";
import SettingsPage from "../../pages/SettingsPage";
import UsersPage from "../../pages/UsersPage";
import MemberEnrollmentModal from "../members/MemberEnrollmentModal";
import ConfirmDialog from "../common/ConfirmDialog";
import RecordDetailModal from "../common/RecordDetailModal";
import ToastViewport from "../common/ToastViewport";
import { useAppContext } from "../../context/AppContext";

export default function AppLayout() {
  const location = useLocation();
  const {
    authUser,
    openMemberEnrollment,
    openRecordModal,
    activeSetupTab,
    branding,
    toasts,
    dismissToast,
    confirmDialog,
    closeConfirmDialog,
    resolveConfirmDialog,
  } = useAppContext();
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
              <Routes location={location}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/ministries" element={<MinistriesPage />} />
                <Route path="/evangelism" element={<Navigate to="/evangelism/pipeline" replace />} />
                <Route path="/evangelism/pipeline" element={<EvangelismPage section="pipeline" key="evangelism-pipeline" />} />
                <Route path="/evangelism/contacts" element={<EvangelismPage section="contacts" key="evangelism-contacts" />} />
                <Route path="/evangelism/bible-study" element={<EvangelismPage section="bible-study" key="evangelism-bible-study" />} />
                <Route path="/evangelism/campaigns" element={<EvangelismPage section="campaigns" key="evangelism-campaigns" />} />
                <Route path="/evangelism/reports" element={<EvangelismPage section="reports" key="evangelism-reports" />} />
                <Route path="/discipleship" element={<Navigate to="/discipleship/programmes" replace />} />
                <Route path="/discipleship/programmes" element={<DiscipleshipPage section="programmes" key="discipleship-programmes" />} />
                <Route path="/discipleship/enrollments" element={<DiscipleshipPage section="enrollments" key="discipleship-enrollments" />} />
                <Route path="/discipleship/follow-ups" element={<DiscipleshipPage section="follow-ups" key="discipleship-follow-ups" />} />
                <Route path="/discipleship/reports" element={<DiscipleshipPage section="reports" key="discipleship-reports" />} />
                <Route path="/visitors" element={<Navigate to="/visitors/register-list" replace />} />
                <Route path="/visitors/register-list" element={<VisitorsPage section="register-list" key="visitors-register-list" />} />
                <Route path="/visitors/pipeline" element={<VisitorsPage section="pipeline" key="visitors-pipeline" />} />
                <Route path="/visitors/follow-ups" element={<VisitorsPage section="follow-ups" key="visitors-follow-ups" />} />
                <Route path="/visitors/workflow" element={<VisitorsPage section="workflow" key="visitors-workflow" />} />
                <Route path="/visitors/reports" element={<VisitorsPage section="reports" key="visitors-reports" />} />
                <Route path="/family" element={<Navigate to="/family/overview" replace />} />
                <Route path="/family/overview" element={<FamilyOverviewPage />} />
                <Route path="/family/households" element={<FamilyHouseholdsPage />} />
                <Route path="/finance" element={<Navigate to="/finance/overview" replace />} />
                <Route path="/finance/overview" element={<FinancePage section="overview" key="finance-overview" />} />
                <Route path="/finance/transactions" element={<FinancePage section="transactions" key="finance-transactions" />} />
                <Route path="/finance/pledges" element={<FinancePage section="pledges" key="finance-pledges" />} />
                <Route path="/finance/expenses" element={<FinancePage section="expenses" key="finance-expenses" />} />
                <Route path="/finance/budgets" element={<FinancePage section="budgets" key="finance-budgets" />} />
                <Route path="/finance/reports" element={<FinancePage section="reports" key="finance-reports" />} />
                <Route path="/care" element={<Navigate to="/care/notes" replace />} />
                <Route path="/care/notes" element={<PastoralCarePage section="notes" key="care-notes" />} />
                <Route path="/care/cases" element={<PastoralCarePage section="cases" key="care-cases" />} />
                <Route path="/care/counseling" element={<PastoralCarePage section="counseling" key="care-counseling" />} />
                <Route path="/care/visitations" element={<PastoralCarePage section="visitations" key="care-visitations" />} />
                <Route path="/attendance" element={<Navigate to="/attendance/services" replace />} />
                <Route path="/attendance/services" element={<AttendancePage section="services" key="attendance-services" />} />
                <Route path="/attendance/reports" element={<AttendancePage section="reports" key="attendance-reports" />} />
                <Route path="/attendance/absentees" element={<AttendancePage section="absentees" key="attendance-absentees" />} />
                <Route path="/communication" element={<Navigate to="/communication/groups" replace />} />
                <Route path="/communication/groups" element={<CommunicationPage section="groups" key="communication-groups" />} />
                <Route path="/communication/preferences" element={<CommunicationPage section="preferences" key="communication-preferences" />} />
                <Route path="/communication/logs" element={<CommunicationPage section="logs" key="communication-logs" />} />
                <Route path="/spiritual-health" element={<Navigate to="/spiritual-health/dashboard" replace />} />
                <Route path="/spiritual-health/dashboard" element={<SpiritualHealthPage section="dashboard" key="spiritual-health-dashboard" />} />
                <Route path="/spiritual-health/alerts" element={<SpiritualHealthPage section="alerts" key="spiritual-health-alerts" />} />
                <Route path="/spiritual-health/rules" element={<SpiritualHealthPage section="rules" key="spiritual-health-rules" />} />
                <Route path="/leadership" element={<Navigate to="/leadership/roles" replace />} />
                <Route path="/leadership/roles" element={<LeadershipDevelopmentPage section="roles" key="leadership-roles" />} />
                <Route path="/leadership/talent" element={<LeadershipDevelopmentPage section="talent" key="leadership-talent" />} />
                <Route path="/leadership/succession" element={<LeadershipDevelopmentPage section="succession" key="leadership-succession" />} />
                <Route path="/leadership/reports" element={<LeadershipDevelopmentPage section="reports" key="leadership-reports" />} />
                <Route path="/strategic" element={<Navigate to="/strategic/plans" replace />} />
                <Route path="/strategic/plans" element={<StrategicPlanningPage section="plans" key="strategic-plans" />} />
                <Route path="/strategic/kpis" element={<StrategicPlanningPage section="kpis" key="strategic-kpis" />} />
                <Route path="/strategic/scorecards" element={<StrategicPlanningPage section="scorecards" key="strategic-scorecards" />} />
                <Route path="/ai-assist" element={<Navigate to="/ai-assist/duplicates" replace />} />
                <Route path="/ai-assist/duplicates" element={authUser?.permissions?.includes("view_ai_assist") ? <AiAssistPage section="duplicates" key="ai-assist-duplicates" /> : <Navigate to="/dashboard" replace />} />
                <Route path="/ai-assist/suggestions" element={authUser?.permissions?.includes("view_ai_assist") ? <AiAssistPage section="suggestions" key="ai-assist-suggestions" /> : <Navigate to="/dashboard" replace />} />
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
      <ConfirmDialog dialog={confirmDialog} onCancel={closeConfirmDialog} onConfirm={() => resolveConfirmDialog(true)} />
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
      subtitle: "Transactions, pledges, expenses, budgets, reports, and giving intelligence now share one finance workflow.",
      action: null,
    };
  }

  if (pathname.startsWith("/care")) {
    return {
      title: "Pastoral Care",
      subtitle: "Capture care notes, counseling sessions, visitations, and confidential follow-up in one place.",
      action: null,
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

  if (pathname.startsWith("/ai-assist")) {
    return {
      title: "AI Assist",
      subtitle: "Review duplicate candidates and advisory drafts before any human action is taken.",
      action: null,
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
