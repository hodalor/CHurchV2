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

const CHART_COLORS = ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef476f", "#7c5cff"];

export default function EvangelismPage({ section = "pipeline" }) {
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
  const sectionName = section;

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
          onMoveProspect={async (prospect, nextStageId, nextStageLabel) => {
            try {
              if (!nextStageId) {
                throw new Error("Selected stage was not found.");
              }
              const matchingStage = evangelismStageOptions.find((stage) => stage?._id === nextStageId);
              const updated = await churchApi.moveProspectStage(prospect.prospectId, nextStageId);
              syncProspectState(updated);
              notifySuccess(
                `${prospect.firstName} ${prospect.surname} moved to ${nextStageLabel || matchingStage?.label || "the new stage"}.`
              );
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
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [evangelistFilter, setEvangelistFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("name_asc");
  const stageFilterOptions = useMemo(
    () =>
      [...new Set(prospects.map((prospect) => prospect.currentStage?.label).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [prospects]
  );
  const evangelistOptions = useMemo(
    () =>
      [...new Set(prospects.map((prospect) => prospect.assignedEvangelistId?.displayName).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [prospects]
  );
  const sourceOptions = useMemo(
    () =>
      [...new Set(prospects.map((prospect) => prospect.source?.label).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [prospects]
  );
  const filteredProspects = useMemo(() => {
    return [...prospects]
      .filter((prospect) => {
        const haystack = [
          prospect.prospectId,
          prospect.firstName,
          prospect.surname,
          prospect.source?.label,
          prospect.currentStage?.label,
          prospect.assignedEvangelistId?.displayName,
          prospect.campaignId?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesStage = stageFilter === "all" || prospect.currentStage?.label === stageFilter;
        const matchesEvangelist =
          evangelistFilter === "all" || prospect.assignedEvangelistId?.displayName === evangelistFilter;
        const matchesSource = sourceFilter === "all" || prospect.source?.label === sourceFilter;

        return matchesSearch && matchesStage && matchesEvangelist && matchesSource;
      })
      .sort((left, right) => sortProspects(left, right, sortOrder));
  }, [evangelistFilter, prospects, search, sortOrder, sourceFilter, stageFilter]);
  const boardColumns = [
    ...(stageOptions || []).map((stage, index) => ({
      key: stage?._id || stage?.key || `${stage?.label || "stage"}-${index}`,
      stageId: stage?._id || null,
      stageKey: stage?.key || "",
      label: stage?.label || `Stage ${index + 1}`,
      items: filteredProspects.filter(
        (prospect) =>
          (stage?._id && prospect.currentStage?._id === stage._id) ||
          (!stage?._id && prospect.currentStage?.label === stage?.label)
      ),
    })),
    {
      key: "unassigned",
      stageId: null,
      stageKey: "unassigned",
      label: "Unassigned",
      items: filteredProspects.filter((prospect) => !prospect.currentStage?._id && !prospect.currentStage?.label),
    },
  ];

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Prospects" value={prospects.length} />
        <StatCard color="pink" label="Assigned" value={prospects.filter((item) => item.assignedEvangelistId?._id).length} />
        <StatCard color="blue" label="Bible Study Stage" value={prospects.filter((item) => item.currentStage?.key === "bible_study").length} />
        <StatCard color="orange" label="From Visitors" value={prospects.filter((item) => item.sourceVisitorId).length} />
      </section>

      <AiAssistGeneratorCard
        title="AI Evangelism Suggestions"
        description="Generate stalled-prospect follow-up drafts and current campaign digests for human review."
        moduleKey="evangelism"
        buttonLabel="Generate Evangelism Suggestions"
      />

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
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search prospect, source, evangelist, or campaign" />
          </div>
          <select className="filter-select" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
            <option value="all">All stages</option>
            {stageFilterOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          <select className="filter-select" value={evangelistFilter} onChange={(event) => setEvangelistFilter(event.target.value)}>
            <option value="all">All evangelists</option>
            {evangelistOptions.map((evangelist) => (
              <option key={evangelist} value={evangelist}>
                {evangelist}
              </option>
            ))}
          </select>
          <select className="filter-select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="stage_asc">Sort: Stage A-Z</option>
            <option value="source_asc">Sort: Source A-Z</option>
            <option value="prospect_id">Sort: Prospect ID</option>
          </select>
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
                  {filteredProspects.length ? (
                    filteredProspects.map((prospect) => (
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
                    <EmptyTable columns={6} message="No prospects match the current filter." />
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
  const [search, setSearch] = useState("");
  const [contactedByFilter, setContactedByFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const contactedByOptions = useMemo(
    () =>
      [...new Set(contacts.map((contact) => contact.contactedBy?.displayName).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [contacts]
  );
  const filteredContacts = useMemo(() => {
    return [...contacts]
      .filter((contact) => {
        const haystack = [
          contact.prospect?.prospectId,
          contact.prospect?.firstName,
          contact.prospect?.surname,
          contact.contactedBy?.displayName,
          contact.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesContactedBy =
          contactedByFilter === "all" || contact.contactedBy?.displayName === contactedByFilter;
        const matchesFollowUp =
          followUpFilter === "all" ||
          (followUpFilter === "scheduled" ? Boolean(contact.nextFollowUpDate) : !contact.nextFollowUpDate);

        return matchesSearch && matchesContactedBy && matchesFollowUp;
      })
      .sort((left, right) => sortContacts(left, right, sortOrder));
  }, [contacts, contactedByFilter, followUpFilter, search, sortOrder]);

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Contacts Logged" value={contacts.length} />
        <StatCard color="pink" label="Prospects In Motion" value={prospects.filter((item) => item.stageHistory?.length > 1).length} />
        <StatCard color="blue" label="Next Follow-Ups" value={contacts.filter((item) => item.nextFollowUpDate).length} />
        <StatCard color="orange" label="Today Contacts" value={contacts.filter((item) => isToday(item.date)).length} />
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search prospect, contacted by, or notes" />
          </div>
          <select className="filter-select" value={contactedByFilter} onChange={(event) => setContactedByFilter(event.target.value)}>
            <option value="all">All contact owners</option>
            {contactedByOptions.map((contactedBy) => (
              <option key={contactedBy} value={contactedBy}>
                {contactedBy}
              </option>
            ))}
          </select>
          <select className="filter-select" value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
            <option value="all">All follow-up states</option>
            <option value="scheduled">Has next follow-up</option>
            <option value="unscheduled">No next follow-up</option>
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="date_desc">Sort: Latest Contact</option>
            <option value="date_asc">Sort: Oldest Contact</option>
            <option value="name_asc">Sort: Prospect A-Z</option>
          </select>
        </div>
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
              {filteredContacts.length ? (
                filteredContacts.map((contact) => (
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
                <EmptyTable columns={5} message="No evangelism contacts match the current filter." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BibleStudyView({ studies, onOpen }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [studyTypeFilter, setStudyTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const statusOptions = useMemo(
    () =>
      [...new Set(studies.map((study) => study.status?.label).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [studies]
  );
  const studyTypeOptions = useMemo(
    () =>
      [...new Set(studies.map((study) => study.studyType).filter(Boolean))].sort((left, right) =>
        compareText(left, right)
      ),
    [studies]
  );
  const filteredStudies = useMemo(() => {
    return [...studies]
      .filter((study) => {
        const participantName = study.prospect
          ? `${study.prospect.prospectId || ""} ${study.prospect.firstName || ""} ${study.prospect.surname || ""}`.trim()
          : study.member
            ? `${study.member.memberId || ""} ${study.member.firstName || ""} ${study.member.lastName || ""}`.trim()
            : "";
        const haystack = [
          study.bibleStudyId,
          participantName,
          study.teacherMemberId,
          study.teacherId?.displayName,
          study.studyType,
          study.status?.label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || study.status?.label === statusFilter;
        const matchesType = studyTypeFilter === "all" || study.studyType === studyTypeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((left, right) => sortBibleStudies(left, right, sortOrder));
  }, [search, sortOrder, statusFilter, studies, studyTypeFilter]);

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Bible Studies" value={studies.length} />
        <StatCard color="pink" label="Active" value={studies.filter((item) => item.status?.key !== "completed").length} />
        <StatCard color="blue" label="Completed" value={studies.filter((item) => item.status?.key === "completed").length} />
        <StatCard color="orange" label="Lessons Logged" value={studies.reduce((sum, item) => sum + (item.lessonsCompleted?.length || 0), 0)} />
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search participant, teacher, study type, or study ID" />
          </div>
          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select className="filter-select" value={studyTypeFilter} onChange={(event) => setStudyTypeFilter(event.target.value)}>
            <option value="all">All study types</option>
            {studyTypeOptions.map((studyType) => (
              <option key={studyType} value={studyType}>
                {studyType}
              </option>
            ))}
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="date_desc">Sort: Latest Start Date</option>
            <option value="date_asc">Sort: Oldest Start Date</option>
            <option value="participant_asc">Sort: Participant A-Z</option>
            <option value="lessons_desc">Sort: Most Lessons</option>
          </select>
        </div>
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
              {filteredStudies.length ? (
                filteredStudies.map((study) => (
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
                <EmptyTable columns={7} message="No Bible study records match the current filter." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function CampaignsView({ campaigns, onOpen }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("start_desc");
  const filteredCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((campaign) => {
        const haystack = [
          campaign.name,
          campaign.summaryNotes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const isActive = !campaign.endDate || new Date(campaign.endDate) >= new Date();
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesActive =
          activeFilter === "all" ||
          (activeFilter === "active" ? isActive : !isActive);

        return matchesSearch && matchesActive;
      })
      .sort((left, right) => sortCampaigns(left, right, sortOrder));
  }, [activeFilter, campaigns, search, sortOrder]);

  return (
    <>
      <section className="compact-stats-grid">
        <StatCard color="purple" label="Campaigns" value={campaigns.length} />
        <StatCard color="pink" label="Linked Prospects" value={campaigns.reduce((sum, item) => sum + (item.linkedProspects || 0), 0)} />
        <StatCard color="blue" label="Active Campaigns" value={campaigns.filter((item) => !item.endDate || new Date(item.endDate) >= new Date()).length} />
        <StatCard color="orange" label="Closed Campaigns" value={campaigns.filter((item) => item.endDate && new Date(item.endDate) < new Date()).length} />
      </section>

      <section className="surface-card data-card">
        <div className="toolbar-row inline-toolbar">
          <div className="search-field">
            <FaSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaign name or summary" />
          </div>
          <select className="filter-select" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
            <option value="all">All campaign states</option>
            <option value="active">Active campaigns</option>
            <option value="closed">Closed campaigns</option>
          </select>
          <select className="filter-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
            <option value="start_desc">Sort: Latest Start Date</option>
            <option value="start_asc">Sort: Oldest Start Date</option>
            <option value="linked_desc">Sort: Most Prospects</option>
            <option value="name_asc">Sort: Name A-Z</option>
          </select>
        </div>
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
              {filteredCampaigns.length ? (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign._id} className="clickable-row" onClick={() => onOpen(campaign)}>
                    <td>{campaign.name}</td>
                    <td>{formatDate(campaign.startDate)}</td>
                    <td>{formatDate(campaign.endDate) || "-"}</td>
                    <td>{campaign.linkedProspects || 0}</td>
                    <td>{campaign.summaryNotes || "-"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable columns={5} message="No campaigns match the current filter." />
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

function sortProspects(left, right, sortOrder) {
  switch (sortOrder) {
    case "stage_asc":
      return compareText(left.currentStage?.label, right.currentStage?.label) || compareText(left.prospectId, right.prospectId);
    case "source_asc":
      return compareText(left.source?.label, right.source?.label) || compareText(left.prospectId, right.prospectId);
    case "prospect_id":
      return compareText(left.prospectId, right.prospectId);
    case "name_asc":
    default:
      return compareText(`${left.firstName || ""} ${left.surname || ""}`, `${right.firstName || ""} ${right.surname || ""}`);
  }
}

function sortContacts(left, right, sortOrder) {
  switch (sortOrder) {
    case "date_asc":
      return getDateValue(left.date) - getDateValue(right.date);
    case "name_asc":
      return compareText(
        `${left.prospect?.firstName || ""} ${left.prospect?.surname || ""}`,
        `${right.prospect?.firstName || ""} ${right.prospect?.surname || ""}`
      );
    case "date_desc":
    default:
      return getDateValue(right.date) - getDateValue(left.date);
  }
}

function sortBibleStudies(left, right, sortOrder) {
  switch (sortOrder) {
    case "date_asc":
      return getDateValue(left.startDate) - getDateValue(right.startDate);
    case "participant_asc":
      return compareText(getStudyParticipantLabel(left), getStudyParticipantLabel(right));
    case "lessons_desc":
      return Number(right.lessonsCompleted?.length || 0) - Number(left.lessonsCompleted?.length || 0);
    case "date_desc":
    default:
      return getDateValue(right.startDate) - getDateValue(left.startDate);
  }
}

function sortCampaigns(left, right, sortOrder) {
  switch (sortOrder) {
    case "start_asc":
      return getDateValue(left.startDate) - getDateValue(right.startDate);
    case "linked_desc":
      return Number(right.linkedProspects || 0) - Number(left.linkedProspects || 0);
    case "name_asc":
      return compareText(left.name, right.name);
    case "start_desc":
    default:
      return getDateValue(right.startDate) - getDateValue(left.startDate);
  }
}

function getStudyParticipantLabel(study) {
  if (study.prospect) {
    return `${study.prospect.firstName || ""} ${study.prospect.surname || ""}`.trim();
  }

  if (study.member) {
    return `${study.member.firstName || ""} ${study.member.lastName || ""}`.trim();
  }

  return "";
}

function getDateValue(value) {
  return new Date(value || 0).getTime();
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
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
            if (draggedItem && column.stageId && draggedItem.currentStage?._id !== column.stageId) {
              onDropItem(draggedItem, column.stageId, column.label);
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
              <div className="empty-note">{column.stageId ? "Drop prospects here." : "No assigned stage yet."}</div>
            ) : (
              <div className="empty-note">No prospects in this stage yet.</div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
