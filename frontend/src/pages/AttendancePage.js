import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const latestRate = events[0]?.attendanceRate ? `${events[0].attendanceRate}%` : "0%";
  const openCheckInCount = events.filter((event) => event.isCheckInOpen !== false).length;
  const [serviceTab, setServiceTab] = useState("upcoming");
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

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Events" value={events.length} />
        <StatCard color="blue" label="Upcoming" value={upcomingEvents.length} />
        <StatCard color="pink" label="Open Check-In" value={openCheckInCount} />
        <StatCard color="orange" label="Expected Pool" value={members.length} />
      </section>

      <section className="compact-stats-grid">
        <StatCard color="purple" label="Past Events" value={pastEvents.length} />
        <StatCard color="blue" label="Latest Rate" value={latestRate} />
        <StatCard color="orange" label="Present Count" value={events.reduce((sum, item) => sum + (item.presentCount || 0), 0)} />
        <StatCard
          color="pink"
          label="Expected Pool"
          value={members.length}
        />
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
        events={activeTab.events}
        emptyMessage={activeTab.emptyMessage}
        onOpen={onOpen}
      />
    </>
  );
}

function ServiceTableCard({ title, subtitle, events, emptyMessage, onOpen }) {
  return (
    <section className="surface-card data-card">
      <div className="section-headline compact">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
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
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Absentees" value={absentees.length} />
        <StatCard color="pink" label="Window" value={`${absentees[0]?.absenteeWindowDays || 28} days`} />
        <StatCard color="blue" label="Event Type" value={absentees[0]?.eventType || "Sunday Worship"} />
        <StatCard color="orange" label="Follow-Up Needed" value={absentees.length} />
      </section>

      <section className="surface-card data-card">
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
              {absentees.length ? (
                absentees.map((member) => (
                  <tr key={member._id || member.memberId} className="clickable-row" onClick={() => onOpenMember(member)}>
                    <td>{member.memberId}</td>
                    <td>{member.firstName} {member.lastName}</td>
                    <td>{member.phone || "-"}</td>
                    <td>{member.email || "-"}</td>
                    <td>{member.membershipStatus || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No attendance absentees right now." />
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

function isUpcomingEvent(event) {
  const eventDate = new Date(event?.date || Date.now());
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return eventDate.getTime() >= startOfToday.getTime();
}
