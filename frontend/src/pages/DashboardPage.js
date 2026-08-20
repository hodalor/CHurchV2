import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppContext } from "../context/AppContext";

export default function DashboardPage() {
  const {
    dashboardStats,
    attendanceTrend,
    memberDistribution,
    memberGenderBreakdown,
    dashboardAudienceBreakdown,
    memberStatusBreakdown,
    members,
    financeRecords,
    formatCurrency,
  } = useAppContext();

  return (
    <div className="page-grid">
      <section className="compact-stats-grid">
        {dashboardStats.map((stat) => (
          <article key={stat.label} className={`compact-stat-card ${stat.accent}`}>
            <div className="compact-stat-label">{stat.label}</div>
            <div className="compact-stat-value">{stat.value}</div>
          </article>
        ))}
      </section>

      <section className="content-layout">
        <article className="surface-card">
          <div className="section-headline">
            <div>
              <h3>Attendance and Giving</h3>
              <p>Quick church performance trend across the last six months.</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c5cff" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#7c5cff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="givingColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.38} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="attendance" stroke="#7c5cff" fill="url(#attendanceColor)" />
              <Area type="monotone" dataKey="giving" stroke="#0ea5e9" fill="url(#givingColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="surface-card side-panel">
          <div className="section-headline">
            <div>
              <h3>Member Mix</h3>
              <p>Adult and children balance.</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={memberDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86}>
                {memberDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="legend-row">
            {memberDistribution.map((entry) => (
              <span key={entry.name}>
                <i style={{ background: entry.color }} />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="content-layout">
        <article className="surface-card">
          <div className="section-headline">
            <div>
              <h3>People Overview</h3>
              <p>Male, female, children, youth, visitors, and prospects at a glance.</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardAudienceBreakdown} barSize={34}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {dashboardAudienceBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="surface-card side-panel">
          <div className="section-headline">
            <div>
              <h3>Gender Split</h3>
              <p>Current male and female member counts.</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={memberGenderBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={82}>
                {memberGenderBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="legend-row">
            {memberGenderBreakdown.map((entry) => (
              <span key={entry.name}>
                <i style={{ background: entry.color }} />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="content-layout">
        <article className="surface-card">
          <div className="section-headline">
            <div>
              <h3>Membership Status</h3>
              <p>See how the church body is currently distributed by status.</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={memberStatusBreakdown} layout="vertical" margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Members" radius={[0, 10, 10, 0]}>
                {memberStatusBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="surface-card side-panel">
          <div className="section-headline">
            <div>
              <h3>Quick Ratios</h3>
              <p>Helpful summary of the current people mix.</p>
            </div>
          </div>

          <div className="simple-list">
            {dashboardAudienceBreakdown.map((entry) => (
              <div className="simple-list-item" key={entry.name}>
                <div>
                  <strong>{entry.name}</strong>
                  <p>Current recorded count</p>
                </div>
                <span className="status-pill info">{entry.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="surface-card">
        <div className="section-headline">
          <div>
            <h3>Recent Activity Snapshot</h3>
            <p>Latest members and finance records.</p>
          </div>
        </div>

        <div className="mini-grid">
          <div className="simple-list">
            {members.slice(0, 4).map((member) => (
              <div className="simple-list-item" key={member.memberId}>
                <div className="avatar-badge">{member.firstName[0]}{member.lastName[0]}</div>
                <div>
                  <strong>{member.firstName} {member.lastName}</strong>
                  <p>{member.memberId}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="simple-list">
            {financeRecords.slice(0, 4).map((record) => (
              <div className="simple-list-item" key={record.id}>
                <div>
                  <strong>{record.category}</strong>
                  <p>{record.recordNo} - {formatCurrency(record.amount)}</p>
                </div>
                <span className={`status-pill ${record.status.toLowerCase()}`}>{record.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
