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
import { useAppContext } from "../context/AppContext";
import { churchApi } from "../apis/churchApi";

const CHART_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef476f", "#7c5cff"];

export default function EvangelismPage() {
  const location = useLocation();
  const {
    prospects,
    evangelismContacts,
    bibleStudies,
    campaigns,
    evangelismApiState,
    openRecordModal,
    syncProspectState,
    notifySuccess,
    notifyError,
    evangelismStageOptions,
  } = useAppContext();
  const sectionName = location.pathname.split("/")[2] || "pipeline";

  const stageData = useMemo(
    () => buildCountData(prospects, (item) => item.currentStage?.label || "Unassigned"),
    [prospects]
  );
  const evangelistWorkload = useMemo(
    () => buildCountData(prospects, (item) => item.assignedEvangelistId?.displayName || "Unassigned"),
    [prospects]
  );
  const sourceMix = useMemo(
    () => buildCountData(prospects, (item) => item.source?.label || "Unknown Source"),
    [prospects]
  );
  const bibleStudyStatusMix = useMemo(
    () => buildCountData(bibleStudies, (item) => item.status?.label || "In Progress"),
    [bibleStudies]
  );

  if (evangelismApiState.loading && !prospects.length && !bibleStudies.length && !campaigns.length) {
    return <div className="empty-note">Loading evangelism module...</div>;
  }

  return (
    <div className="page-grid visitor-page">
      {evangelismApiState.error ? <div className="form-error">{evangelismApiState.error}</div> : null}

      {sectionName === "pipeline" ? (
        <PipelineView
          prospects={prospects}
          stageData={stageData}
          stageOptions={evangelismStageOptions}
          onOpen={(item) => openRecordModal("prospect", item)}
          onMoveProspect={async (prospect, nextStageLabel) => {
            try {
              const matchingStage = evangelismStageOptions.find((stage) => stage?.label === nextStageLabel);
              if (!matchingStage?._id) {
                throw new Error("Selected stage was not found.");
              }
              const updated = await churchApi.moveProspectStage(prospect.prospectId, matchingStage._id);
              syncProspectState(updated);
              notifySuccess(`${prospect.firstName} ${prospect.surname} moved to ${nextStageLabel}.`);
            } catch (error) {
              notifyError(error.message || "Unable to move prospect.");
            }
          }}
        />
      ) : null}

      {sectionName === "contacts" ? (
        <ContactsView contacts={evangelismContacts} prospects={prospects} onOpen={(item) => openRecordModal("prospect", item)} />
      ) : null}

      {sectionName === "bible-study" ? (
        <BibleStudyView studies={bibleStudies} onOpen={(item) => openRecordModal("bibleStudy", item)} />
      ) : null}

      {sectionName === "campaigns" ? (
        <CampaignsView campaigns={campaigns} onOpen={(item) => openRecordModal("campaign", item)} />
      ) : null}

      {sectionName === "reports" ? (
        <ReportsView
          dashboard={evangelismApiState.dashboard}
          stageData={stageData}
          evangelistWorkload={evangelistWorkload}
          sourceMix={sourceMix}
          bibleStudyStatusMix={bibleStudyStatusMix}
        />
      ) : null}
    </div>
  );
}

function PipelineView({ prospects, stageData, stageOptions, onOpen, onMoveProspect }) {
  const [viewMode, setViewMode] = useState("table");
  const stageLabels = [
    ...new Set(
      [
        ...(stageOptions || []).map((item) => item?.label).filter(Boolean),
        ...stageData.map((entry) => entry.name).filter(Boolean),
        "Unassigned",
      ]
    ),
  ];
  const boardColumns = stageLabels.map((label, index) => ({
    key: `${label}-${index}`,
    label,
    items: prospects.filter((prospect) => (prospect.currentStage?.label || "Unassigned") === label),
  }));

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Prospects" value={prospects.length} />
        <StatCard color="pink" label="Assigned" value={prospects.filter((item) => item.assignedEvangelistId?._id).length} />
        <StatCard color="blue" label="Bible Study Stage" value={prospects.filter((item) => item.currentStage?.key === "bible_study").length} />
        <StatCard color="orange" label="From Visitors" value={prospects.filter((item) => item.sourceVisitorId).length} />
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
            <ChartCard title="Prospect Funnel">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stageData}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {stageData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Stage Mix">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stageData} dataKey="value" nameKey="name" outerRadius={104}>
                    {stageData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <section className="surface-card data-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prospect ID</th>
                    <th>Name</th>
                    <th>Source</th>
                    <th>Current Stage</th>
                    <th>Assigned Evangelist</th>
                    <th>Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.length ? (
                    prospects.map((prospect) => (
                      <tr
                        key={prospect._id || prospect.prospectId}
                        className="clickable-row"
                        onClick={() => onOpen(prospect)}
                      >
                        <td>{prospect.prospectId}</td>
                        <td>{prospect.firstName} {prospect.surname}</td>
                        <td>{prospect.source?.label || "-"}</td>
                        <td>{prospect.currentStage?.label || "-"}</td>
                        <td>
                          {prospect.assignedEvangelistMemberId ||
                            prospect.assignedEvangelistId?.displayName ||
                            "Unassigned"}
                        </td>
                        <td>{prospect.campaignId?.name || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTable columns={6} message="No prospects recorded yet." />
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <ProspectBoard columns={boardColumns} onOpen={onOpen} onDropItem={onMoveProspect} />
      )}
    </>
  );
}

function ContactsView({ contacts, prospects, onOpen }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Contacts Logged" value={contacts.length} />
        <StatCard color="pink" label="Prospects In Motion" value={prospects.filter((item) => item.stageHistory?.length > 1).length} />
        <StatCard color="blue" label="Next Follow-Ups" value={contacts.filter((item) => item.nextFollowUpDate).length} />
        <StatCard color="orange" label="Today Contacts" value={contacts.filter((item) => isToday(item.date)).length} />
      </section>

      <section className="surface-card data-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Prospect</th>
                <th>Contacted By</th>
                <th>Next Follow-Up</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length ? (
                contacts.map((contact) => (
                  <tr
                    key={contact._id}
                    className="clickable-row"
                    onClick={() => onOpen(prospects.find((item) => item._id === contact.prospect?._id) || contact.prospect)}
                  >
                    <td>{formatDate(contact.date)}</td>
                    <td>{contact.prospect?.prospectId} - {contact.prospect?.firstName} {contact.prospect?.surname}</td>
                    <td>{contact.contactedBy?.displayName || "-"}</td>
                    <td>{formatDate(contact.nextFollowUpDate) || "-"}</td>
                    <td>{contact.notes || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No evangelism contacts logged yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BibleStudyView({ studies, onOpen }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Bible Studies" value={studies.length} />
        <StatCard color="pink" label="Active" value={studies.filter((item) => item.status?.key !== "completed").length} />
        <StatCard color="blue" label="Completed" value={studies.filter((item) => item.status?.key === "completed").length} />
        <StatCard color="orange" label="Lessons Logged" value={studies.reduce((sum, item) => sum + (item.lessonsCompleted?.length || 0), 0)} />
      </section>

      <section className="surface-card data-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bible Study ID</th>
                <th>Participant</th>
                <th>Teacher</th>
                <th>Study Type</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>Lessons</th>
              </tr>
            </thead>
            <tbody>
              {studies.length ? (
                studies.map((study) => (
                  <tr key={study._id} className="clickable-row" onClick={() => onOpen(study)}>
                    <td>{study.bibleStudyId || "-"}</td>
                    <td>
                      {study.prospect
                        ? `${study.prospect.prospectId} - ${study.prospect.firstName} ${study.prospect.surname}`
                        : study.member
                          ? `${study.member.memberId} - ${study.member.firstName} ${study.member.lastName}`
                          : "-"}
                    </td>
                    <td>{study.teacherMemberId || study.teacherId?.displayName || "-"}</td>
                    <td>{study.studyType || "-"}</td>
                    <td>{formatDate(study.startDate)}</td>
                    <td>{study.status?.label || "-"}</td>
                    <td>{study.lessonsCompleted?.length || 0}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={7} message="No Bible study records yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function CampaignsView({ campaigns, onOpen }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Campaigns" value={campaigns.length} />
        <StatCard color="pink" label="Linked Prospects" value={campaigns.reduce((sum, item) => sum + (item.linkedProspects || 0), 0)} />
        <StatCard color="blue" label="Active Campaigns" value={campaigns.filter((item) => !item.endDate || new Date(item.endDate) >= new Date()).length} />
        <StatCard color="orange" label="Closed Campaigns" value={campaigns.filter((item) => item.endDate && new Date(item.endDate) < new Date()).length} />
      </section>

      <section className="surface-card data-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Linked Prospects</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length ? (
                campaigns.map((campaign) => (
                  <tr key={campaign._id} className="clickable-row" onClick={() => onOpen(campaign)}>
                    <td>{campaign.name}</td>
                    <td>{formatDate(campaign.startDate)}</td>
                    <td>{formatDate(campaign.endDate) || "-"}</td>
                    <td>{campaign.linkedProspects || 0}</td>
                    <td>{campaign.summaryNotes || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No campaigns recorded yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ReportsView({ dashboard, stageData, evangelistWorkload, sourceMix, bibleStudyStatusMix }) {
  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Total Prospects" value={dashboard?.totalProspects || 0} />
        <StatCard color="pink" label="Total Contacts" value={dashboard?.totalContacts || 0} />
        <StatCard color="blue" label="Active Bible Studies" value={dashboard?.activeBibleStudies || 0} />
        <StatCard color="orange" label="Campaigns" value={dashboard?.totalCampaigns || 0} />
      </section>

      <section className="family-chart-grid">
        <ChartCard title="Stage Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stageData} dataKey="value" nameKey="name" outerRadius={104}>
                {stageData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evangelist Workload">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evangelistWorkload}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {evangelistWorkload.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="family-chart-grid">
        <ChartCard title="Source Mix">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceMix}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bible Study Status">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bibleStudyStatusMix}>
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

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString();
}

function isToday(value) {
  if (!value) {
    return false;
  }

  return new Date(value).toDateString() === new Date().toDateString();
}

function ProspectBoard({ columns, onOpen, onDropItem }) {
  const [draggedItem, setDraggedItem] = useState(null);

  return (
    <section className="pipeline-board-grid">
      {columns.map((column) => (
        <article
          key={column.key}
          className="pipeline-column"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggedItem && (draggedItem.currentStage?.label || "Unassigned") !== column.label) {
              onDropItem(draggedItem, column.label);
            }
            setDraggedItem(null);
          }}
        >
          <div className="pipeline-column-head">
            <div>
              <h3>{column.label}</h3>
              <p>{column.items.length} prospects</p>
            </div>
            <span className="family-badge-soft">{column.items.length}</span>
          </div>
          <div className="pipeline-column-list">
            {column.items.length ? (
              column.items.map((item) => (
                <button
                  key={item._id || item.prospectId}
                  type="button"
                  draggable
                  className="pipeline-card"
                  onDragStart={() => setDraggedItem(item)}
                  onClick={() => onOpen(item)}
                >
                  <strong>{item.firstName} {item.surname}</strong>
                  <p>{item.assignedEvangelistId?.displayName || "Unassigned"}</p>
                  <span>{item.prospectId}</span>
                </button>
              ))
            ) : columns.some((entry) => entry.items.length) ? (
              <div className="empty-note">Drop prospects here.</div>
            ) : (
              <div className="empty-note">No prospects in this stage yet.</div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
