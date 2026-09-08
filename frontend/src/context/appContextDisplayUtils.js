export function formatCurrencyValue(value, currency) {
  const amount = Number(value || 0);
  const currencyCode = currency?.code || "GHS";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    const symbol = currency?.symbol || currencyCode;
    return `${symbol}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

export function getPersonAge(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDifference = today.getMonth() - parsed.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function buildDashboardAttendanceTrend(attendanceSessions = [], financeRecords = []) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const months = [];
  const today = new Date();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      month: formatter.format(date),
      attendance: 0,
      giving: 0,
    });
  }

  const attendanceByMonth = attendanceSessions.reduce((accumulator, session) => {
    const eventDate = session?.date ? new Date(session.date) : null;
    if (!eventDate || Number.isNaN(eventDate.getTime())) {
      return accumulator;
    }

    const key = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;
    accumulator[key] = (accumulator[key] || 0) + Number(session.presentCount || 0);
    return accumulator;
  }, {});

  const givingByMonth = financeRecords.reduce((accumulator, record) => {
    const recordDate = record?.date ? new Date(record.date) : null;
    if (!recordDate || Number.isNaN(recordDate.getTime())) {
      return accumulator;
    }

    const key = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, "0")}`;
    accumulator[key] = (accumulator[key] || 0) + Number(record.amount || 0);
    return accumulator;
  }, {});

  return months.map((entry) => ({
    month: entry.month,
    attendance: attendanceByMonth[entry.key] || 0,
    giving: givingByMonth[entry.key] || 0,
  }));
}

export function buildPermissionCatalog() {
  return [
    {
      key: "core",
      title: "Core Access",
      permissions: [
        { key: "view_dashboard", label: "Dashboard" },
        { key: "view_setup", label: "Church Setup" },
        { key: "manage_system", label: "System Configuration" },
        { key: "manage_settings", label: "Superadmin Settings" },
        { key: "manage_lookups", label: "Lookup Tables" },
        { key: "manage_users", label: "User Administration" },
        { key: "view_audit_logs", label: "Audit Administration" },
      ],
    },
    {
      key: "membership",
      title: "Membership And Households",
      permissions: [
        { key: "view_members", label: "Members" },
        { key: "manage_members", label: "Manage Members" },
        { key: "view_households", label: "Households" },
        { key: "manage_households", label: "Manage Households" },
        { key: "view_groups", label: "Groups" },
        { key: "manage_groups", label: "Manage Groups" },
      ],
    },
    {
      key: "visitors",
      title: "Visitors And Evangelism",
      permissions: [
        { key: "view_visitors", label: "Visitors" },
        { key: "manage_visitors", label: "Manage Visitors" },
        { key: "assign_visitor_followup", label: "Assign Visitor Follow-Up" },
        { key: "convert_visitor", label: "Convert Visitor" },
        { key: "view_evangelism", label: "Evangelism" },
        { key: "manage_evangelism", label: "Manage Evangelism" },
        { key: "convert_prospect", label: "Convert Prospect" },
      ],
    },
    {
      key: "ministry_flow",
      title: "Discipleship, Attendance, Ministries",
      permissions: [
        { key: "view_discipleship", label: "Discipleship" },
        { key: "manage_discipleship", label: "Manage Discipleship" },
        { key: "view_attendance", label: "Attendance" },
        { key: "manage_attendance", label: "Manage Attendance" },
        { key: "view_ministries", label: "Ministries" },
        { key: "manage_ministries", label: "Manage Ministries" },
        { key: "view_finance", label: "Finance" },
        { key: "manage_finance", label: "Manage Finance" },
        { key: "view_finance_confidential", label: "Finance Confidential" },
        { key: "void_finance", label: "Void Finance" },
        { key: "approve_finance_expenses", label: "Approve Expenses" },
        { key: "approve_finance_high_value_expenses", label: "Approve High-Value Expenses" },
        { key: "approve_finance_reconciliations", label: "Approve Reconciliations" },
      ],
    },
    {
      key: "care_admin",
      title: "Communication, Care, Leadership",
      permissions: [
        { key: "view_pending_actions", label: "Follow-Up Lists" },
        { key: "view_communication", label: "Communication" },
        { key: "manage_communication", label: "Manage Communication" },
        { key: "export_contacts", label: "Export Contacts" },
        { key: "view_pastoral_care", label: "Pastoral Care" },
        { key: "manage_pastoral_care", label: "Manage Pastoral Care" },
        { key: "view_restricted_care", label: "Restricted Care" },
        { key: "view_elders_only_care", label: "Elders-Only Care" },
        { key: "view_spiritual_health", label: "Spiritual Health" },
        { key: "manage_spiritual_health", label: "Manage Spiritual Health" },
        { key: "view_leadership", label: "Leadership" },
        { key: "manage_leadership", label: "Manage Leadership" },
        { key: "view_succession_sensitive", label: "Succession Sensitive Records" },
        { key: "view_strategic_planning", label: "Strategic Planning" },
        { key: "manage_strategic_planning", label: "Manage Strategic Planning" },
      ],
    },
  ];
}
