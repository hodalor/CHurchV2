import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageHeader from "./PageHeader";
import DashboardPage from "../../pages/DashboardPage";
import SetupPage from "../../pages/SetupPage";
import MembersPage from "../../pages/MembersPage";
import MinistriesPage from "../../pages/MinistriesPage";
import VisitorsPage from "../../pages/VisitorsPage";
import FamilyOverviewPage from "../../pages/FamilyOverviewPage";
import FamilyHouseholdsPage from "../../pages/FamilyHouseholdsPage";
import FinancePage from "../../pages/FinancePage";
import AttendancePage from "../../pages/AttendancePage";
import UsersPage from "../../pages/UsersPage";
import MemberEnrollmentModal from "../members/MemberEnrollmentModal";
import RecordDetailModal from "../common/RecordDetailModal";
import { useAppContext } from "../../context/AppContext";

export default function AppLayout() {
  const location = useLocation();
  const { openMemberEnrollment, openRecordModal, activeSetupTab, branding } = useAppContext();
  const pageMeta = getPageMeta(location.pathname);
  const pageAction = getPageAction(pageMeta.action, activeSetupTab, { openMemberEnrollment, openRecordModal, branding });

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
                <Route path="/visitors/register-list" element={<VisitorsPage />} />
                <Route path="/visitors/pipeline" element={<VisitorsPage />} />
                <Route path="/visitors/follow-ups" element={<VisitorsPage />} />
                <Route path="/visitors/workflow" element={<VisitorsPage />} />
                <Route path="/visitors/reports" element={<VisitorsPage />} />
                <Route path="/family/overview" element={<FamilyOverviewPage />} />
                <Route path="/family/households" element={<FamilyHouseholdsPage />} />
                <Route path="/finance/overview" element={<FinancePage />} />
                <Route path="/finance/transactions" element={<FinancePage />} />
                <Route path="/finance/pledges" element={<FinancePage />} />
                <Route path="/finance/expenses" element={<FinancePage />} />
                <Route path="/finance/budgets" element={<FinancePage />} />
                <Route path="/finance/reports" element={<FinancePage />} />
                <Route path="/attendance/services" element={<AttendancePage />} />
                <Route path="/attendance/reports" element={<AttendancePage />} />
                <Route path="/attendance/absentees" element={<AttendancePage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </section>
        </main>
      </div>

      <MemberEnrollmentModal />
      <RecordDetailModal />
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

function getPageAction(action, activeSetupTab, handlers) {
  if (!action) {
    return null;
  }

  if (action === "member") {
    return (
      <button type="button" className="primary-button large-action" onClick={handlers.openMemberEnrollment}>
        <FaPlus />
        Add Member
      </button>
    );
  }

  if (action === "setup") {
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
    family: "Add Family",
    finance: "Add Finance",
    attendance: "Add Attendance",
    user: "Add User",
    ministry: "Add Ministry",
  };

  if (!labels[action]) {
    return null;
  }

  return (
    <button type="button" className="primary-button large-action" onClick={() => handlers.openRecordModal(action, null, "edit")}>
      <FaPlus />
      {labels[action]}
    </button>
  );
}
