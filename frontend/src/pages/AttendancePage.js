import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AiAssistGeneratorCard from "../components/ai/AiAssistGeneratorCard";
import { useAppContext } from "../context/AppContext";

const CHART_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef476f", "#7c5cff"];

export default function AttendancePage() {
  const location = useLocation();
  const {
    attendanceSessions,
    attendanceAbsentees,
    attendanceApiState,
    members,
    openRecordModal,
  } = useAppContext();
  const activeSection = location.pathname.split("/")[2] || "services";

  const eventTypeData = useMemo(
    () => buildCountData(attendanceSessions, (event) => event.eventTypeId?.label || "Unknown"),
    [attendanceSessions]
  );

  if (attendanceApiState.loading && !attendanceSessions.length) {
    return <div className="empty-note">Loading attendance module...</div>;
  }

  return (
    <div className="page-grid visitor-page">
      {attendanceApiState.error ? <div className="form-error">{attendanceApiState.error}</div> : null}

      {activeSection === "services" ? (
        <ServicesView
          events={attendanceSessions}
          members={members}
          onOpen={(event) => openRecordModal("attendanceEvent", event)}
        />
      ) : null}

      {activeSection === "reports" ? (
        <ReportsView
          report={attendanceApiState.report}
          eventTypeData={eventTypeData}
        />
      ) : null}

      {activeSection === "absentees" ? (
        <AbsenteesView
          absentees={attendanceAbsentees}
          onOpenMember={(member) =>
            openRecordModal("member", {
              ...member,
              id: member._id || member.id,
              lastName: member.lastName || "",
            })
          }
        />
      ) : null}
    </div>
  );
}

function ServicesView({ events, members, onOpen }) {
  const { upcomingEvents, pastEvents } = splitAttendanceEvents(events);
  const openCheckInCount = events.filter((event) => event.isCheckInOpen !== false).length;
  const [serviceTab, setServiceTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [ministryFilter, setMinistryFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const serviceTabs = [
    {
      key: "upcoming",
      title: "Upcoming Services",
      subtitle: "Events ahead of today, ready for check-in and prep.",
      events: upcomingEvents,
      emptyMessage: "No upcoming services yet.",
    },
    {
      key: "past",
      title: "Past Services",
      subtitle: "Completed services with captured attendance and review history.",
      events: pastEvents,
      emptyMessage: "No past services recorded yet.",
    },
    {
      key: "all",
      title: "All Services",
      subtitle: "A full register of every service and attendance event.",
      events,
      emptyMessage: "No attendance events recorded yet.",
    },
  ];
  const activeTab = serviceTabs.find((item) => item.key === serviceTab) || serviceTabs[0];
  const activeTabAverageRate = getAverageAttendanceRate(activeTab.events);
  const ministryOptions = useMemo(
    () =>
      [...new Map(
        events
          .filter((event) => event.ministryId?._id || event.ministryId?.id || event.ministryId?.name)
          .map((event) => [
            event.ministryId?._id || event.ministryId?.id || event.ministryId?.name,
            event.ministryId?.name || "Unknown ministry",
          ])
      ).entries()].sort((left, right) => compareText(left[1], right[1])),
    [events]
  );
  const eventTypeOptions = useMemo(
    () =>
      [...new Set(events.map((event) => event.eventTypeId?.label).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [events]
  );
  const filteredEvents = useMemo(() => {
    return [...activeTab.events]
      .filter((event) => {
        const haystack = [
          event.title,
          event.location,
          event.eventTypeId?.label,
          event.ministryId?.name,
          event.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const eventDate = event?.date ? new Date(event.date) : null;
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesMinistry =
          ministryFilter === "all" ||
          (event.ministryId?._id || event.ministryId?.id || event.ministryId?.name) === ministryFilter;
        const matchesType = eventTypeFilter === "all" || event.eventTypeId?.label === eventTypeFilter;
        const matchesFrom = !dateFrom || isSameOrAfter(eventDate, dateFrom);
        const matchesTo = !dateTo || isSameOrBefore(eventDate, dateTo);

        return matchesSearch && matchesMinistry && matchesType && matchesFrom && matchesTo;
      })
      .sort((left, right) => sortAttendanceEvents(left, right, sortOrder));
  }, [activeTab.events, dateFrom, dateTo, eventTypeFilter, ministryFilter, search, sortOrder]);

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Incoming" value={upcomingEvents.length} />
        <StatCard color="blue" label="Past Events" value={pastEvents.length} />
        <StatCard
          color="pink"
          label={activeTab.key === "past" ? "Average Rate" : "Open Check-In"}
          value={activeTab.key === "past" ? `${activeTabAverageRate}%` : openCheckInCount}
        />
        <StatCard color="orange" label="Expected Pool" value={members.length} />
      </section>

      <section className="surface-card data-card">
        <div className="tab-row service-filter-tabs">
          {serviceTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab-button ${serviceTab === tab.key ? "active" : ""}`}
              onClick={() => setServiceTab(tab.key)}
            >
              {tab.key === "all" ? "All" : tab.title.replace(" Services", "")}
            </button>
          ))}
        </div>
      </section>

      <ServiceTableCard
        title={activeTab.title}
        subtitle={activeTab.subtitle}
        events={filteredEvents}
        search={search}
        setSearch={setSearch}
        ministryFilter={ministryFilter}
        setMinistryFilter={setMinistryFilter}
        ministryOptions={ministryOptions}
        eventTypeFilter={eventTypeFilter}
        setEventTypeFilter={setEventTypeFilter}
        eventTypeOptions={eventTypeOptions}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        emptyMessage={activeTab.emptyMessage}
        onOpen={onOpen}
      />
    </>
  );
}

function ServiceTableCard({
  title,
  subtitle,
  events,
  search,
  setSearch,
  ministryFilter,
  setMinistryFilter,
  ministryOptions,
  eventTypeFilter,
  setEventTypeFilter,
  eventTypeOptions,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  sortOrder,
  setSortOrder,
  emptyMessage,
  onOpen,
}) {
  return (
    <section className="surface-card data-card">
      <div className="section-headline compact">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="toolbar-row inline-toolbar">
        <div className="search-field">
          <FaSearch />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event, type, location, or ministry" />
        </div>
        <select className="filter-select" value={ministryFilter} onChange={(event) => setMinistryFilter(event.target.value)}>
          <option value="all">All ministries</option>
          {ministryOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className="filter-select" value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value)}>
          <option value="all">All event types</option>
          {eventTypeOptions.map((eventType) => (
            <option key={eventType} value={eventType}>
              {eventType}
            </option>
          ))}
        </select>
        <input className="toolbar-date-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="toolbar-date-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="date_desc">Sort: Newest</option>
          <option value="date_asc">Sort: Oldest</option>
          <option value="attendance_desc">Sort: Highest Attendance</option>
          <option value="title_asc">Sort: Title A-Z</option>
        </select>
      </div>
      <div className="table-accent-bar" />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
              <th>Check-In</th>
              <th>Location</th>
              <th>Expected</th>
              <th>Present</th>
              <th>Rate</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.length ? (
              events.map((event) => (
                <tr key={event._id || event.id} className="clickable-row" onClick={() => onOpen(event)}>
                  <td>
                    <strong>{event.title}</strong>
                    <p>{event.ministryId?.name || "General church event"}</p>
                  </td>
                  <td>{event.eventTypeId?.label || "-"}</td>
                  <td>{formatDate(event.date)}</td>
                  <td>
                    <span className={`status-pill ${isUpcomingEvent(event) ? "active" : "disabled"}`}>
                      {isUpcomingEvent(event) ? "Upcoming" : "Past"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${event.isCheckInOpen !== false ? "active" : "disabled"}`}>
                      {event.isCheckInOpen !== false ? "Open" : "Closed"}
                    </span>
                  </td>
                  <td>{event.location || "-"}</td>
                  <td>{event.expectedCount || 0}</td>
                  <td>{event.presentCount || 0}</td>
                  <td>{event.attendanceRate || 0}%</td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button small"
                      onClick={(actionEvent) => {
                        actionEvent.stopPropagation();
                        onOpen(event);
                      }}
                    >
                      Record
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyTable columns={10} message={emptyMessage} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportsView({ report, eventTypeData }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Total Events" value={report?.totalEvents || 0} />
        <StatCard color="pink" label="Total Present" value={report?.totalPresent || 0} />
        <StatCard color="blue" label="Average Rate" value={`${report?.averageAttendanceRate || 0}%`} />
        <StatCard color="orange" label="Tracked Types" value={eventTypeData.length} />
      </section>

      <AiAssistGeneratorCard
        title="AI Attendance Anomalies"
        description="Generate advisory notes for unusual attendance changes and ministry attendance drops."
        moduleKey="attendance"
        buttonLabel="Generate Attendance Notes"
      />

      <section className="family-chart-grid">
        <ChartCard title="Attendance Trend">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report?.trend || []}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="present" radius={[10, 10, 0, 0]} fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance By Event Type">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={report?.byType || eventTypeData} dataKey="value" nameKey="name" outerRadius={104}>
                {(report?.byType || eventTypeData).map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </>
  );
}

function AbsenteesView({ absentees, onOpenMember }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("name_asc");
  const statusOptions = useMemo(
    () =>
      [...new Set(absentees.map((member) => member.membershipStatus).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [absentees]
  );
  const genderOptions = useMemo(
    () =>
      [...new Set(absentees.map((member) => member.gender).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [absentees]
  );
  const filteredAbsentees = useMemo(() => {
    return [...absentees]
      .filter((member) => {
        const haystack = [
          member.memberId,
          member.firstName,
          member.lastName,
          member.phone,
          member.email,
          member.membershipStatus,
          member.gender,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || member.membershipStatus === statusFilter;
        const matchesGender = genderFilter === "all" || member.gender === genderFilter;

        return matchesSearch && matchesStatus && matchesGender;
      })
      .sort((left, right) => sortAbsentees(left, right, sortOrder));
  }, [absentees, genderFilter, search, sortOrder, statusFilter]);
  const absenteeWindowDays = absentees[0]?.absenteeWindowDays;
  const eventType = absentees[0]?.eventType || "";

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Absentees" value={absentees.length} />
        <StatCard color="pink" label="Window" value={absenteeWindowDays ? `${absenteeWindowDays} days` : "-"} />
        <StatCard color="blue" label="Event Type" value={eventType || "-"} />
        <StatCard color="orange" label="Follow-Up Needed" value={absentees.length} />
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search absentee, phone, email, or member ID" />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="filter-select" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}>
            <option value="all">All genders</option>
            {genderOptions.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="name_desc">Sort: Name Z-A</option>
            <option value="member_id">Sort: Member ID</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAbsentees.length ? (
                filteredAbsentees.map((member) => (
                  <tr key={member._id || member.memberId} className="clickable-row" onClick={() => onOpenMember(member)}>
                    <td>{member.memberId}</td>
                    <td>{member.firstName} {member.lastName}</td>
                    <td>{member.phone || "-"}</td>
                    <td>{member.email || "-"}</td>
                    <td>{member.membershipStatus || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No attendance absentees match the current filter." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function StatCard({ color, label, value }) {
  return (
    <article className={`compact-stat-card ${color}`}>
      <div className="compact-stat-label">{label}</div>
      <div className="compact-stat-value">{value}</div>
    </article>
  );
}

function ChartCard({ title, children }) {
  return (
    <article className="surface-card chart-card">
      <div className="section-headline compact">
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  );
}

function EmptyTable({ columns, message }) {
  return (
    <tr>
      <td colSpan={columns} className="empty-table">
        {message}
      </td>
    </tr>
  );
}

function buildCountData(items, getLabel) {
  const counts = items.reduce((accumulator, item) => {
    const label = getLabel(item);
    accumulator.set(label, (accumulator.get(label) || 0) + 1);
    return accumulator;
  }, new Map());

  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString();
}

function splitAttendanceEvents(events = []) {
  return events.reduce(
    (accumulator, event) => {
      if (isUpcomingEvent(event)) {
        accumulator.upcomingEvents.push(event);
      } else {
        accumulator.pastEvents.push(event);
      }

      return accumulator;
    },
    {
      upcomingEvents: [],
      pastEvents: [],
    }
  );
}

function getAverageAttendanceRate(events = []) {
  if (!events.length) {
    return 0;
  }

  const total = events.reduce((sum, item) => sum + Number(item.attendanceRate || 0), 0);
  return Math.round(total / events.length);
}

function isUpcomingEvent(event) {
  const eventDate = new Date(event?.date || Date.now());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return eventDate.getTime() >= startOfToday.getTime();
}

function sortAttendanceEvents(left, right, sortOrder) {
  switch (sortOrder) {
    case "date_asc":
      return getDateValue(left.date) - getDateValue(right.date);
    case "attendance_desc":
      return Number(right.presentCount || 0) - Number(left.presentCount || 0);
    case "title_asc":
      return compareText(left.title, right.title);
    case "date_desc":
    default:
      return getDateValue(right.date) - getDateValue(left.date);
  }
}

function isSameOrAfter(date, boundary) {
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() >= getDateValue(boundary);
}

function isSameOrBefore(date, boundary) {
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() <= getDateValue(`${boundary}T23:59:59`);
}

function getDateValue(value) {
  return new Date(value || 0).getTime();
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
}

function sortAbsentees(left, right, sortOrder) {
  switch (sortOrder) {
    case "name_desc":
      return compareText(`${right.firstName || ""} ${right.lastName || ""}`, `${left.firstName || ""} ${left.lastName || ""}`);
    case "member_id":
      return compareText(left.memberId, right.memberId);
    case "status":
      return compareText(left.membershipStatus, right.membershipStatus) || compareText(left.memberId, right.memberId);
    case "name_asc":
    default:
      return compareText(`${left.firstName || ""} ${left.lastName || ""}`, `${right.firstName || ""} ${right.lastName || ""}`);
  }
}
