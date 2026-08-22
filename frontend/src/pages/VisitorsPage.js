import { useMemo, useState } from "react";
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
import { churchApi } from "../apis/churchApi";

const STATUS_COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b", "#ef476f", "#14b8a6"];
const WORKLOAD_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef476f", "#7c5cff"];
const VISITOR_PIPELINE_STAGES = [
  { statusKey: "first_time", label: "First-Time", summaryLabel: "First-Time" },
  { statusKey: "repeat_staying", label: "Repeat", summaryLabel: "Repeat" },
  { statusKey: "lapsed", label: "Lapsed", summaryLabel: "Lapsed" },
  { statusKey: "converted_to_prospect", label: "Prospects", summaryLabel: "Prospects" },
  { statusKey: "converted_to_member", label: "Members", summaryLabel: "Members" },
];

export default function VisitorsPage({ section = "register-list" }) {
  const { visitors, openRecordModal, visitorApiState, pendingActionState, syncVisitorState, notifySuccess, notifyError, visitorStatusOptions } = useAppContext();
  const sectionName = section;

  const visitorRows = useMemo(
    () =>
      visitors.map((visitor) => ({
        ...visitor,
        fullName: `${visitor.firstName || ""} ${visitor.surname || ""}`.trim(),
        statusLabel: visitor.status?.label || "Pending",
        statusKey: visitor.status?.key || slugifyStatusKey(visitor.status?.label || "pending"),
        lastChurchVisit: getLatestEntryDate(visitor.visitDates),
        lastHomeVisit: getLatestEntryDate(visitor.visitationHistory),
        assigneeName: visitor.assignedFollowUpUserId?.displayName || "Unassigned",
      })),
    [visitors]
  );

  const pendingVisitorActions = useMemo(
    () =>
      (pendingActionState.items || []).filter(
        (item) => item.subjectType === "Visitor" || item.sourceModule === "Visitor Management"
      ),
    [pendingActionState.items]
  );

  const statusCounts = VISITOR_PIPELINE_STAGES.map((stage) => ({
    name: stage.summaryLabel,
    label: stage.label,
    statusKey: stage.statusKey,
    value: countVisitorsByStatus(visitorRows, stage.statusKey),
  }));

  const sourceMix = buildCountData(visitorRows, (visitor) => visitor.howHeard?.label || "Unknown Source");
  const assigneeWorkload = buildCountData(visitorRows, (visitor) => visitor.assigneeName);
  const repeatVisitors = visitorRows.filter((item) => item.visitCount > 1).length;
  const unassignedVisitors = visitorRows.filter((item) => !item.assignedFollowUpUserId).length;
  const followUpOpenCount = pendingVisitorActions.filter((item) => item.status !== "Closed").length;
  const recentVisitTrend = buildRecentVisitTrend(visitorRows);

  const openVisitorById = (visitorId) => {
    const visitor = visitors.find((item) => item.visitorId === visitorId);
    if (visitor) {
      openRecordModal("visitor", visitor);
    }
  };

  if (visitorApiState.loading && !visitors.length) {
    return <div className="empty-note">Loading visitors...</div>;
  }

  return (
    <div className="page-grid visitor-page">
      {visitorApiState.error ? <div className="form-error">{visitorApiState.error}</div> : null}
      {pendingActionState.error && sectionName === "follow-ups" ? (
        <div className="form-error">{pendingActionState.error}</div>
      ) : null}

      {sectionName === "register-list" ? (
        <RegisterListView
          visitors={visitorRows}
          repeatVisitors={repeatVisitors}
          retentionRate={visitorApiState.metrics?.retentionRate || 0}
          onOpenVisitor={openVisitorById}
        />
      ) : null}

      {sectionName === "pipeline" ? (
        <PipelineView
          visitors={visitorRows}
          statusCounts={statusCounts}
          onOpenVisitor={openVisitorById}
          onMoveVisitor={async (visitor, nextStatusKey) => {
            try {
              const nextStatus = visitorStatusOptions.find((item) => item.key === nextStatusKey);
              if (!nextStatus) {
                throw new Error("Selected visitor status was not found.");
              }
              const savedVisitor = await churchApi.updateVisitor(visitor.visitorId, {
                status: nextStatus._id,
              });
              syncVisitorState(savedVisitor);
              notifySuccess(`${visitor.fullName} moved to ${nextStatus.label}.`);
            } catch (error) {
              notifyError(error.message || "Unable to move visitor.");
            }
          }}
        />
      ) : null}

      {sectionName === "follow-ups" ? (
        <FollowUpsView
          pendingActions={pendingVisitorActions}
          visitors={visitorRows}
          followUpOpenCount={followUpOpenCount}
          unassignedVisitors={unassignedVisitors}
          onOpenVisitor={openVisitorById}
        />
      ) : null}

      {sectionName === "workflow" ? (
        <WorkflowView
          visitors={visitorRows}
          pendingActions={pendingVisitorActions}
          onOpenVisitor={openVisitorById}
        />
      ) : null}

      {sectionName === "reports" ? (
        <ReportsView
          visitors={visitorRows}
          statusCounts={statusCounts}
          sourceMix={sourceMix}
          assigneeWorkload={assigneeWorkload}
          recentVisitTrend={recentVisitTrend}
          retentionMetrics={visitorApiState.metrics}
        />
      ) : null}
    </div>
  );
}

function RegisterListView({ visitors, repeatVisitors, retentionRate, onOpenVisitor }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState("last_visit_desc");
  const statusOptions = useMemo(
    () =>
      [...new Set(visitors.map((visitor) => visitor.statusLabel).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [visitors]
  );
  const assigneeOptions = useMemo(
    () =>
      [...new Set(visitors.map((visitor) => visitor.assigneeName).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [visitors]
  );
  const filteredVisitors = useMemo(() => {
    return [...visitors]
      .filter((visitor) => {
        const haystack = [
          visitor.visitorId,
          visitor.fullName,
          visitor.phone,
          visitor.statusLabel,
          visitor.howHeard?.label,
          visitor.assigneeName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const lastVisitDate = visitor.lastChurchVisit ? new Date(visitor.lastChurchVisit) : null;
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || visitor.statusLabel === statusFilter;
        const matchesAssignee = assigneeFilter === "all" || visitor.assigneeName === assigneeFilter;
        const matchesFrom = !dateFrom || isSameOrAfter(lastVisitDate, dateFrom);
        const matchesTo = !dateTo || isSameOrBefore(lastVisitDate, dateTo);

        return matchesSearch && matchesStatus && matchesAssignee && matchesFrom && matchesTo;
      })
      .sort((left, right) => sortVisitors(left, right, sortOrder));
  }, [assigneeFilter, dateFrom, dateTo, search, sortOrder, statusFilter, visitors]);

  return (
    <>
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Visitors</div>
          <div className="compact-stat-value">{visitors.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Repeat Visitors</div>
          <div className="compact-stat-value">{repeatVisitors}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Retention 30 Days</div>
          <div className="compact-stat-value">{retentionRate}%</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Unassigned</div>
          <div className="compact-stat-value">
            {visitors.filter((visitor) => visitor.assigneeName === "Unassigned").length}
          </div>
        </article>
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitor, phone, assignee, or source" />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="filter-select" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="all">All assignees</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
          <input className="toolbar-date-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className="toolbar-date-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="last_visit_desc">Sort: Latest Visit</option>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="visits_desc">Sort: Most Visits</option>
          </select>
        </div>
        <div className="table-accent-bar" />
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Visitor ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>How Heard</th>
                <th>Assigned To</th>
                <th>Visits</th>
                <th>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.length ? (
                filteredVisitors.map((visitor) => (
                  <tr
                    key={visitor._id || visitor.visitorId}
                    className="clickable-row"
                    onClick={() => onOpenVisitor(visitor.visitorId)}
                  >
                    <td>{visitor.visitorId}</td>
                    <td>{visitor.fullName}</td>
                    <td>{visitor.phone || "-"}</td>
                    <td>{visitor.statusLabel}</td>
                    <td>{visitor.howHeard?.label || "-"}</td>
                    <td>{visitor.assigneeName}</td>
                    <td>{visitor.visitCount || 0}</td>
                    <td>{visitor.lastChurchVisit || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable message="No visitors recorded yet." columns={8} />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PipelineView({ visitors, statusCounts, onOpenVisitor, onMoveVisitor }) {
  const [viewMode, setViewMode] = useState("table");
  const pipelineRows = visitors.map((visitor) => ({
    ...visitor,
    nextStep: getPipelineNextStep(visitor),
  }));
  const boardColumns = statusCounts
    .filter((item) => item.name)
    .map((item, index) => ({
      key: `${item.statusKey}_${index}`,
      statusKey: item.statusKey,
      label: item.label || item.name,
      items: pipelineRows.filter((visitor) => visitor.statusKey === item.statusKey),
    }));

  return (
    <>
      <section className="compact-stats-grid">
        {statusCounts.slice(0, 4).map((item, index) => (
          <article
            key={item.name}
            className={`compact-stat-card ${["purple", "pink", "blue", "orange"][index]}`}
          >
            <div className="compact-stat-label">{item.name}</div>
            <div className="compact-stat-value">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="surface-card data-card">
        <div className="section-headline compact">
          <h3>Pipeline View</h3>
          <div className="tab-row">
            <button type="button" className={`tab-button ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode("table")}>
              Table View
            </button>
            <button type="button" className={`tab-button ${viewMode === "board" ? "active" : ""}`} onClick={() => setViewMode("board")}>
              Board View
            </button>
          </div>
        </div>
      </section>

      {viewMode === "table" ? (
        <>
          <section className="family-chart-grid">
            <article className="surface-card chart-card">
              <div className="section-headline compact">
                <h3>Visitor Funnel</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusCounts}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {statusCounts.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="surface-card chart-card">
              <div className="section-headline compact">
                <h3>Status Mix</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius={70} outerRadius={102}>
                    {statusCounts.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend-grid">
                {statusCounts.map((entry, index) => (
                  <span key={`${entry.name}-${index}`}>
                    <i style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                    {entry.name} {entry.value}
                  </span>
                ))}
              </div>
            </article>
          </section>

          <section className="surface-card data-card">
            <div className="section-headline compact">
              <h3>Pipeline Register</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Status</th>
                    <th>Visits</th>
                    <th>Assigned To</th>
                    <th>Last Visit</th>
                    <th>Next Step</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineRows.length ? (
                    pipelineRows.map((visitor) => (
                      <tr
                        key={visitor._id || visitor.visitorId}
                        className="clickable-row"
                        onClick={() => onOpenVisitor(visitor.visitorId)}
                      >
                        <td>{visitor.fullName}</td>
                        <td>{visitor.statusLabel}</td>
                        <td>{visitor.visitCount || 0}</td>
                        <td>{visitor.assigneeName}</td>
                        <td>{visitor.lastChurchVisit || "-"}</td>
                        <td>{visitor.nextStep}</td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTable message="No visitor pipeline records yet." columns={6} />
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <PipelineBoard
          columns={boardColumns}
          onOpen={(visitor) => onOpenVisitor(visitor.visitorId)}
          onDropItem={onMoveVisitor}
        />
      )}
    </>
  );
}

function FollowUpsView({ pendingActions, visitors, followUpOpenCount, unassignedVisitors, onOpenVisitor }) {
  const visitorsNeedingOwner = visitors.filter((visitor) => visitor.assigneeName === "Unassigned");

  return (
    <>
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Open Follow-Ups</div>
          <div className="compact-stat-value">{followUpOpenCount}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Pending Actions</div>
          <div className="compact-stat-value">{pendingActions.length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Unassigned Visitors</div>
          <div className="compact-stat-value">{unassignedVisitors}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Assigned Visitors</div>
          <div className="compact-stat-value">{visitors.length - unassignedVisitors}</div>
        </article>
      </section>

      <AiAssistGeneratorCard
        title="AI Visitor Follow-Up Drafts"
        description="Generate warm, review-only follow-up drafts for visitors who have not returned within the configured window."
        moduleKey="visitor"
        buttonLabel="Generate Visitor Drafts"
      />

      <section className="content-layout">
        <article className="surface-card data-card">
          <div className="section-headline compact">
            <h3>Follow-Up Queue</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Visitor ID</th>
                  <th>Reason</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingActions.length ? (
                  pendingActions.map((action) => (
                    <tr
                      key={action._id}
                      className="clickable-row"
                      onClick={() => onOpenVisitor(action.subjectId || action.sourceRecordId)}
                    >
                      <td>{action.subjectId || action.sourceRecordId}</td>
                      <td>{action.reason}</td>
                      <td>{action.assignedUser?.displayName || "-"}</td>
                      <td>{formatDate(action.dueDate) || "-"}</td>
                      <td>{action.status}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTable message="No visitor follow-up actions yet." columns={5} />
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="surface-card side-panel">
          <div className="section-headline compact">
            <h3>Needs Assignment</h3>
          </div>
          <div className="simple-list">
            {visitorsNeedingOwner.length ? (
              visitorsNeedingOwner.slice(0, 8).map((visitor) => (
                <button
                  type="button"
                  key={visitor.visitorId}
                  className="simple-list-item clickable-card visitor-plain-button"
                  onClick={() => onOpenVisitor(visitor.visitorId)}
                >
                  <div>
                    <strong>{visitor.fullName}</strong>
                    <p>{visitor.visitorId}</p>
                  </div>
                  <span className="family-badge-soft">Assign</span>
                </button>
              ))
            ) : (
              <div className="empty-note">Every current visitor has an assigned owner.</div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}

function WorkflowView({ visitors, pendingActions, onOpenVisitor }) {
  const activityRows = visitors
    .flatMap((visitor) => [
      ...(visitor.visitDates || []).map((entry) => ({
        type: "Church Visit",
        date: entry.date,
        note: entry.notes || "Attendance recorded",
        visitorId: visitor.visitorId,
        visitorName: visitor.fullName,
      })),
      ...(visitor.visitationHistory || []).map((entry) => ({
        type: "Home Visit",
        date: entry.date,
        note: entry.notes || "Home follow-up recorded",
        visitorId: visitor.visitorId,
        visitorName: visitor.fullName,
      })),
    ])
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 10);

  const readyForConversion = visitors.filter(
    (visitor) =>
      visitor.visitCount > 1 &&
      visitor.assigneeName !== "Unassigned" &&
      !visitor.convertedToProspectId &&
      !visitor.convertedToMemberId
  );

  return (
    <>
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Recent Activities</div>
          <div className="compact-stat-value">{activityRows.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">Ready For Next Step</div>
          <div className="compact-stat-value">{readyForConversion.length}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Follow-Up Queue</div>
          <div className="compact-stat-value">{pendingActions.length}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Converted</div>
          <div className="compact-stat-value">
            {visitors.filter((visitor) => visitor.convertedToProspectId || visitor.convertedToMemberId).length}
          </div>
        </article>
      </section>

      <section className="content-layout">
        <article className="surface-card data-card">
          <div className="section-headline compact">
            <h3>Recent Workflow Activity</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Visitor</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.length ? (
                  activityRows.map((activity, index) => (
                    <tr
                      key={`${activity.visitorId}-${activity.type}-${index}`}
                      className="clickable-row"
                      onClick={() => onOpenVisitor(activity.visitorId)}
                    >
                      <td>{formatDate(activity.date)}</td>
                      <td>{activity.type}</td>
                      <td>{activity.visitorName}</td>
                      <td>{activity.note}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTable message="No workflow activity has been recorded yet." columns={4} />
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="surface-card side-panel">
          <div className="section-headline compact">
            <h3>Next Step Candidates</h3>
          </div>
          <div className="simple-list">
            {readyForConversion.length ? (
              readyForConversion.slice(0, 8).map((visitor) => (
                <button
                  type="button"
                  key={visitor.visitorId}
                  className="simple-list-item clickable-card visitor-plain-button"
                  onClick={() => onOpenVisitor(visitor.visitorId)}
                >
                  <div>
                    <strong>{visitor.fullName}</strong>
                    <p>{visitor.assigneeName}</p>
                  </div>
                  <span className="family-badge-soft">{visitor.visitCount} visits</span>
                </button>
              ))
            ) : (
              <div className="empty-note">No visitors are currently flagged as conversion-ready.</div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}

function ReportsView({
  visitors,
  statusCounts,
  sourceMix,
  assigneeWorkload,
  recentVisitTrend,
  retentionMetrics,
}) {
  return (
    <>
      <section className="compact-stats-grid">
        <article className="compact-stat-card purple">
          <div className="compact-stat-label">Visitors In Report</div>
          <div className="compact-stat-value">{visitors.length}</div>
        </article>
        <article className="compact-stat-card pink">
          <div className="compact-stat-label">First-Time Base</div>
          <div className="compact-stat-value">{retentionMetrics?.firstTimeVisitors || 0}</div>
        </article>
        <article className="compact-stat-card blue">
          <div className="compact-stat-label">Returning Visitors</div>
          <div className="compact-stat-value">{retentionMetrics?.returningVisitors || 0}</div>
        </article>
        <article className="compact-stat-card orange">
          <div className="compact-stat-label">Retention Window</div>
          <div className="compact-stat-value">{retentionMetrics?.windowDays || 30}d</div>
        </article>
      </section>

      <section className="family-chart-grid">
        <ChartCard title="Status Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={104}>
                {statusCounts.map((entry, index) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="How Visitors Heard">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceMix}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="family-chart-grid">
        <ChartCard title="Follow-Up Workload">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={assigneeWorkload}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {assigneeWorkload.map((entry, index) => (
                  <Cell key={entry.name} fill={WORKLOAD_COLORS[index % WORKLOAD_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recent Church Visits">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={recentVisitTrend}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
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

function EmptyTable({ message, columns }) {
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

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function buildRecentVisitTrend(visitors) {
  const groupedVisits = visitors
    .flatMap((visitor) => visitor.visitDates || [])
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .reduce((accumulator, entry) => {
      const label = formatShortDate(entry.date);
      accumulator.set(label, (accumulator.get(label) || 0) + 1);
      return accumulator;
    }, new Map());

  return [...groupedVisits.entries()]
    .map(([name, value]) => ({ name, value }))
    .slice(-6);
}

function countVisitorsByStatus(visitors, statusKey) {
  return visitors.filter((visitor) => visitor.statusKey === statusKey).length;
}

function slugifyStatusKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function getPipelineNextStep(visitor) {
  if (visitor.convertedToMemberId) {
    return "Already linked to member register";
  }

  if (visitor.convertedToProspectId) {
    return "Continue in evangelism pipeline";
  }

  if (visitor.assigneeName === "Unassigned") {
    return "Assign follow-up owner";
  }

  if ((visitor.visitCount || 0) <= 1) {
    return "Track second visit";
  }

  return "Review for prospect conversion";
}

function getLatestEntryDate(items = []) {
  if (!items.length) {
    return "";
  }

  const latest = [...items].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  )[0];

  return formatDate(latest?.date);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString();
}

function formatShortDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function sortVisitors(left, right, sortOrder) {
  switch (sortOrder) {
    case "name_asc":
      return compareText(left.fullName, right.fullName);
    case "visits_desc":
      return Number(right.visitCount || 0) - Number(left.visitCount || 0);
    case "last_visit_desc":
    default:
      return getDateValue(right.lastChurchVisit) - getDateValue(left.lastChurchVisit);
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

function PipelineBoard({ columns, onOpen, onDropItem }) {
  const [draggedItem, setDraggedItem] = useState(null);

  return (
    <section className="pipeline-board-grid">
      {columns.map((column) => (
        <article
          key={column.key}
          className="pipeline-column"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggedItem && draggedItem.statusKey !== column.statusKey) {
              onDropItem(draggedItem, column.statusKey);
            }
            setDraggedItem(null);
          }}
        >
          <div className="pipeline-column-head">
            <div>
              <h3>{column.label}</h3>
              <p>{column.items.length} visitors</p>
            </div>
            <span className="family-badge-soft">{column.items.length}</span>
          </div>
          <div className="pipeline-column-list">
            {column.items.length ? (
              column.items.map((item) => (
                <button
                  key={item._id || item.visitorId}
                  type="button"
                  draggable
                  className="pipeline-card"
                  onDragStart={() => setDraggedItem(item)}
                  onClick={() => onOpen(item)}
                >
                  <strong>{item.fullName}</strong>
                  <p>{item.assigneeName}</p>
                  <span>{item.visitCount || 0} visits</span>
                </button>
              ))
            ) : (
              <div className="empty-note">Drop visitors here.</div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
