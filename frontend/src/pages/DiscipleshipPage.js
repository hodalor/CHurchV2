import { useMemo } from "react";
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

export default function DiscipleshipPage({ section = "programmes" }) {
  const {
    discipleshipProgrammes,
    discipleshipEnrollments,
    discipleshipOverdue,
    discipleshipApiState,
    openRecordModal,
  } = useAppContext();
  const sectionName = section;

  const statusData = useMemo(
    () => buildCountData(discipleshipEnrollments, (item) => item.status?.label || "Unknown"),
    [discipleshipEnrollments]
  );
  const programmeData = useMemo(
    () => buildCountData(discipleshipEnrollments, (item) => item.programmeId?.name || "Unassigned"),
    [discipleshipEnrollments]
  );
  const mentorLoad = useMemo(
    () => buildCountData(discipleshipEnrollments, (item) => item.mentorId?.displayName || "Unassigned"),
    [discipleshipEnrollments]
  );

  if (discipleshipApiState.loading && !discipleshipProgrammes.length && !discipleshipEnrollments.length) {
    return <div className="empty-note">Loading discipleship module...</div>;
  }

  return (
    <div className="page-grid visitor-page">
      {discipleshipApiState.error ? <div className="form-error">{discipleshipApiState.error}</div> : null}

      {sectionName === "programmes" ? (
        <ProgrammesView programmes={discipleshipProgrammes} onOpen={(item) => openRecordModal("discipleshipProgramme", item)} />
      ) : null}

      {sectionName === "enrollments" ? (
        <EnrollmentsView enrollments={discipleshipEnrollments} onOpen={(item) => openRecordModal("discipleshipEnrollment", item)} />
      ) : null}

      {sectionName === "follow-ups" ? (
        <FollowUpsView overdue={discipleshipOverdue} onOpen={(item) => openRecordModal("discipleshipEnrollment", item)} />
      ) : null}

      {sectionName === "reports" ? (
        <ReportsView
          dashboard={discipleshipApiState.dashboard}
          statusData={statusData}
          programmeData={programmeData}
          mentorLoad={mentorLoad}
        />
      ) : null}
    </div>
  );
}

function ProgrammesView({ programmes, onOpen }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Programmes" value={programmes.length} />
        <StatCard color="pink" label="Active" value={programmes.filter((item) => item.isActive).length} />
        <StatCard color="blue" label="Inactive" value={programmes.filter((item) => !item.isActive).length} />
        <StatCard color="orange" label="Modules Total" value={programmes.reduce((sum, item) => sum + (item.modules?.length || 0), 0)} />
      </section>

      <section className="surface-card data-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Duration</th>
                <th>Modules</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {programmes.length ? (
                programmes.map((programme) => (
                  <tr key={programme._id} className="clickable-row" onClick={() => onOpen(programme)}>
                    <td>{programme.name}</td>
                    <td>{programme.expectedDurationDays} days</td>
                    <td>{programme.modules?.length || 0}</td>
                    <td>{programme.isActive ? "Active" : "Inactive"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={4} message="No discipleship programmes created yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function EnrollmentsView({ enrollments, onOpen }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Enrollments" value={enrollments.length} />
        <StatCard color="pink" label="Mentored" value={enrollments.filter((item) => item.mentorId?._id).length} />
        <StatCard color="blue" label="Completed Sessions" value={enrollments.reduce((sum, item) => sum + (item.sessionsCompleted?.length || 0), 0)} />
        <StatCard color="orange" label="Completed" value={enrollments.filter((item) => item.status?.key === "completed").length} />
      </section>

      <section className="surface-card data-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Programme</th>
                <th>Mentor</th>
                <th>Status</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length ? (
                enrollments.map((enrollment) => (
                  <tr key={enrollment._id} className="clickable-row" onClick={() => onOpen(enrollment)}>
                    <td>{enrollment.memberId?.memberId} - {enrollment.memberId?.firstName} {enrollment.memberId?.lastName}</td>
                    <td>{enrollment.programmeId?.name || "-"}</td>
                    <td>{enrollment.mentorId?.displayName || "Unassigned"}</td>
                    <td>{enrollment.status?.label || "-"}</td>
                    <td>{enrollment.sessionsCompleted?.length || 0}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No discipleship enrollments yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FollowUpsView({ overdue, onOpen }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Overdue" value={overdue.length} />
        <StatCard color="pink" label="With Mentor" value={overdue.filter((item) => item.mentorId?._id).length} />
        <StatCard color="blue" label="Without Mentor" value={overdue.filter((item) => !item.mentorId?._id).length} />
        <StatCard color="orange" label="High Priority" value={overdue.length} />
      </section>

      <AiAssistGeneratorCard
        title="AI Mentor-Match Suggestions"
        description="Generate ranked mentor suggestions for enrollments that still need mentor assignment."
        moduleKey="discipleship"
        buttonLabel="Generate Mentor Suggestions"
      />

      <section className="surface-card data-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Programme</th>
                <th>Mentor</th>
                <th>Last Session Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {overdue.length ? (
                overdue.map((enrollment) => (
                  <tr key={enrollment._id} className="clickable-row" onClick={() => onOpen(enrollment)}>
                    <td>{enrollment.memberId?.memberId} - {enrollment.memberId?.firstName} {enrollment.memberId?.lastName}</td>
                    <td>{enrollment.programmeId?.name || "-"}</td>
                    <td>{enrollment.mentorId?.displayName || "Unassigned"}</td>
                    <td>{enrollment.sessionsCompleted?.length || 0}</td>
                    <td>{enrollment.status?.label || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No overdue discipleship follow-ups right now." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ReportsView({ dashboard, statusData, programmeData, mentorLoad }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Programmes" value={dashboard?.totalProgrammes || 0} />
        <StatCard color="pink" label="Enrollments" value={dashboard?.totalEnrollments || 0} />
        <StatCard color="blue" label="Overdue" value={dashboard?.overdueEnrollments || 0} />
        <StatCard color="orange" label="Mentor Coverage" value={`${dashboard?.mentorCoverageRate || 0}%`} />
      </section>

      <section className="family-chart-grid">
        <ChartCard title="Enrollment Status">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={104}>
                {statusData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Programme Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={programmeData}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {programmeData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="surface-card chart-card">
        <div className="section-headline compact">
          <h3>Mentor Workload</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={mentorLoad}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#14b8a6" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
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

function StatCard({ color, label, value }) {
  return (
    <article className={`compact-stat-card ${color}`}>
      <div className="compact-stat-label">{label}</div>
      <div className="compact-stat-value">{value}</div>
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
