import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  attendanceFormTemplate,
  attendanceTrend,
  financeFormTemplate,
  familyFormTemplate,
  groupFormTemplate,
  initialAttendanceSessions,
  initialBranding,
  initialFamilies,
  initialFinanceRecords,
  initialGroups,
  initialMembers,
  initialMinistries,
  initialRoles,
  initialUsers,
  initialVisitors,
  memberFormTemplate,
  ministryFormTemplate,
  roleFormTemplate,
  userFormTemplate,
} from "../data/mockData";
import { churchApi } from "../apis/churchApi";
import { useAuth } from "./AuthContext";
import {
  buildGroupSelections,
  enrichFamilyLinks,
  generateNextFamilyId,
  generateNextMemberId,
  getReciprocalRelationship,
} from "../utils/memberUtils";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { authUser } = useAuth();
  const [branding, setBranding] = useState(initialBranding);
  const [groups, setGroups] = useState(initialGroups);
  const [ministries, setMinistries] = useState(initialMinistries);
  const [members, setMembers] = useState(initialMembers);
  const [roles, setRoles] = useState(initialRoles);
  const [users, setUsers] = useState(initialUsers);
  const [visitors, setVisitors] = useState(initialVisitors);
  const [prospects, setProspects] = useState([]);
  const [evangelismContacts, setEvangelismContacts] = useState([]);
  const [bibleStudies, setBibleStudies] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [discipleshipProgrammes, setDiscipleshipProgrammes] = useState([]);
  const [discipleshipEnrollments, setDiscipleshipEnrollments] = useState([]);
  const [discipleshipOverdue, setDiscipleshipOverdue] = useState([]);
  const [families, setFamilies] = useState(initialFamilies);
  const [financeRecords, setFinanceRecords] = useState(initialFinanceRecords);
  const [attendanceSessions, setAttendanceSessions] = useState(initialAttendanceSessions);
  const [attendanceAbsentees, setAttendanceAbsentees] = useState([]);
  const [familyApiState, setFamilyApiState] = useState({ loading: false, error: "" });
  const [visitorApiState, setVisitorApiState] = useState({ loading: false, error: "", metrics: null });
  const [evangelismApiState, setEvangelismApiState] = useState({ loading: false, error: "", dashboard: null });
  const [discipleshipApiState, setDiscipleshipApiState] = useState({ loading: false, error: "", dashboard: null });
  const [attendanceApiState, setAttendanceApiState] = useState({
    loading: false,
    error: "",
    report: null,
    recordsByEvent: {},
  });
  const [lookupState, setLookupState] = useState({ loading: false, error: "", values: [] });
  const [pendingActionState, setPendingActionState] = useState({ loading: false, error: "", items: [] });
  const [memberSearch, setMemberSearch] = useState("");
  const [memberMinistryFilter, setMemberMinistryFilter] = useState("all");
  const [activeSetupTab, setActiveSetupTab] = useState("groups");
  const [activeModal, setActiveModal] = useState(null);
  const [enrolmentStep, setEnrolmentStep] = useState(0);
  const [memberForm, setMemberForm] = useState(memberFormTemplate);
  const [groupForm, setGroupForm] = useState(groupFormTemplate);
  const [ministryForm, setMinistryForm] = useState(ministryFormTemplate);
  const [financeForm, setFinanceForm] = useState(financeFormTemplate);
  const [attendanceForm, setAttendanceForm] = useState(attendanceFormTemplate);
  const [userForm, setUserForm] = useState(userFormTemplate);
  const [roleForm, setRoleForm] = useState(roleFormTemplate);
  const [familyForm, setFamilyForm] = useState(familyFormTemplate);
  const [recordModal, setRecordModal] = useState({
    open: false,
    type: null,
    mode: "view",
    record: null,
    draft: null,
  });

  const groupsByParent = useMemo(() => {
    return groups.reduce((accumulator, group) => {
      const key = group.parentId || "root";
      accumulator[key] = accumulator[key] || [];
      accumulator[key].push(group);
      return accumulator;
    }, {});
  }, [groups]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const haystack = `${member.firstName} ${member.otherName} ${member.lastName} ${member.memberId}`.toLowerCase();
      const matchesSearch = haystack.includes(memberSearch.toLowerCase());
      const matchesMinistry =
        memberMinistryFilter === "all" || member.ministryId === memberMinistryFilter;

      return matchesSearch && matchesMinistry;
    });
  }, [memberMinistryFilter, memberSearch, members]);

  const dashboardStats = useMemo(
    () => [
      { label: "Members", value: members.length, accent: "purple" },
      { label: "Visitors", value: visitors.length, accent: "pink" },
      { label: "Families", value: families.length, accent: "pink" },
      { label: "Finance Entries", value: financeRecords.length, accent: "orange" },
      { label: "Attendance Logs", value: attendanceSessions.length, accent: "blue" },
    ],
    [attendanceSessions.length, families.length, financeRecords.length, members.length, visitors.length]
  );

  const memberDistribution = useMemo(() => {
    const adultCount = members.filter((member) => member.memberType === "Adult").length;
    const childCount = members.filter((member) => member.memberType === "Child").length;
    return [
      { name: "Adults", value: adultCount, color: "#7c5cff" },
      { name: "Children", value: childCount, color: "#ff9800" },
    ];
  }, [members]);

  const visitorHowHeardOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "visitor_how_heard"),
    [lookupState.values]
  );

  const visitorStatusOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "visitor_status"),
    [lookupState.values]
  );

  const evangelismSourceOptions = useMemo(
    () =>
      lookupState.values.filter((item) =>
        ["evangelism_source", "visitor_how_heard"].includes(item.type?.key)
      ),
    [lookupState.values]
  );

  const evangelismStageOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "evangelism_pipeline_stage"),
    [lookupState.values]
  );

  const bibleStudyStatusOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "bible_study_status"),
    [lookupState.values]
  );

  const discipleshipStatusOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "discipleship_enrollment_status"),
    [lookupState.values]
  );

  const attendanceEventTypeOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "attendance_event_type"),
    [lookupState.values]
  );

  const attendanceCaptureModeOptions = useMemo(
    () => lookupState.values.filter((item) => item.type?.key === "attendance_capture_mode"),
    [lookupState.values]
  );

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const openRecordModal = async (type, record, mode = "view") => {
    const sourceRecord = record
      ? type === "family"
        ? hydrateFamilyRecord(record)
        : type === "visitor"
          ? hydrateVisitorRecord(record)
          : type === "prospect"
            ? hydrateProspectRecord(record)
            : type === "bibleStudy"
              ? hydrateBibleStudyRecord(record)
              : type === "attendanceEvent"
                ? hydrateAttendanceEventRecord(record)
              : type === "discipleshipProgramme"
                ? hydrateDiscipleshipProgrammeRecord(record)
              : type === "discipleshipEnrollment"
                ? hydrateDiscipleshipEnrollmentRecord(record)
              : record
      : buildNewRecord(type, {
          families,
          members,
          ministries,
          roles,
          prospects,
          users,
          discipleshipProgrammes,
          attendanceEventTypeOptions,
          attendanceCaptureModeOptions,
        });

    if (!record && type === "family") {
      try {
        const payload = await churchApi.getNextFamilyId();
        sourceRecord.familyId = payload.familyId || sourceRecord.familyId;
      } catch (error) {
        // Fall back to local generated ID if the next-id request fails.
      }
    }

    if (!record && type === "visitor" && authUser) {
      try {
        const payload = await churchApi.getNextVisitorId();
        sourceRecord.visitorId = payload.visitorId || sourceRecord.visitorId;
      } catch (error) {
        // Fall back to local generated ID if the next-id request fails.
      }
    }

    if (!record && type === "prospect" && authUser) {
      try {
        const payload = await churchApi.getNextProspectId();
        sourceRecord.prospectId = payload.prospectId || sourceRecord.prospectId;
      } catch (error) {
        // Fall back to local generated ID if the next-id request fails.
      }
    }

    if (record && type === "attendanceEvent" && record._id && authUser) {
      try {
        const records = await churchApi.getAttendanceEventRecords(record._id);
        sourceRecord.attendanceRecords = Array.isArray(records) ? records : [];
      } catch (error) {
        sourceRecord.attendanceRecords = [];
      }
    }

    setRecordModal({
      open: true,
      type,
      mode,
      record: sourceRecord,
      draft: { ...sourceRecord },
    });
  };

  const closeRecordModal = () => {
    setRecordModal({
      open: false,
      type: null,
      mode: "view",
      record: null,
      draft: null,
    });
  };

  const setRecordModalDraft = (updater) => {
    setRecordModal((current) => ({
      ...current,
      draft: typeof updater === "function" ? updater(current.draft) : updater,
    }));
  };

  const setRecordModalMode = (mode) => {
    setRecordModal((current) => ({ ...current, mode }));
  };

  const openMemberEnrollment = () => {
    setMemberForm({
      ...memberFormTemplate,
      memberId: generateNextMemberId(members),
      membershipDate: new Date().toISOString().slice(0, 10),
    });
    setEnrolmentStep(0);
    setActiveModal("member-enrolment");
  };

  const syncVisitorState = (incomingVisitor) => {
    if (!incomingVisitor) {
      return null;
    }

    const hydratedVisitor = hydrateVisitorRecord(incomingVisitor);
    const visitorIdentity = hydratedVisitor.visitorId || hydratedVisitor._id || hydratedVisitor.id;

    setVisitors((current) =>
      updateOrInsert(current, hydratedVisitor, visitorIdentity, {
        id: hydratedVisitor.id || `v${Date.now()}`,
        _id: hydratedVisitor._id,
      })
    );

    setRecordModal((current) => {
      if (current.type !== "visitor") {
        return current;
      }

      const currentIdentity =
        current.record?.visitorId ||
        current.record?._id ||
        current.record?.id ||
        current.draft?.visitorId ||
        current.draft?._id ||
        current.draft?.id;

      if (currentIdentity !== visitorIdentity) {
        return current;
      }

      return {
        ...current,
        record: hydratedVisitor,
        draft: hydratedVisitor,
      };
    });

    return hydratedVisitor;
  };

  const refreshVisitorMetrics = async () => {
    const metrics = await churchApi.getVisitorRetentionMetrics(30);
    setVisitorApiState((current) => ({
      ...current,
      loading: false,
      error: "",
      metrics,
    }));
    return metrics;
  };

  const refreshPendingActions = async () => {
    try {
      const pendingActions = await churchApi.getPendingActions();
      setPendingActionState({
        loading: false,
        error: "",
        items: Array.isArray(pendingActions) ? pendingActions : [],
      });
      return pendingActions;
    } catch (error) {
      setPendingActionState({
        loading: false,
        error: error.message || "Unable to load follow-up actions.",
        items: [],
      });
      return [];
    }
  };

  const syncProspectState = (incomingProspect) => {
    if (!incomingProspect) {
      return null;
    }

    const hydratedProspect = hydrateProspectRecord(incomingProspect);
    const prospectIdentity = hydratedProspect.prospectId || hydratedProspect._id || hydratedProspect.id;

    setProspects((current) =>
      updateOrInsert(current, hydratedProspect, prospectIdentity, {
        id: hydratedProspect.id || `p${Date.now()}`,
        _id: hydratedProspect._id,
      })
    );

    setRecordModal((current) => {
      if (current.type !== "prospect") {
        return current;
      }

      const currentIdentity =
        current.record?.prospectId ||
        current.record?._id ||
        current.record?.id ||
        current.draft?.prospectId ||
        current.draft?._id ||
        current.draft?.id;

      if (currentIdentity !== prospectIdentity) {
        return current;
      }

      return {
        ...current,
        record: hydratedProspect,
        draft: hydratedProspect,
      };
    });

    return hydratedProspect;
  };

  const refreshEvangelismDashboard = async () => {
    const dashboard = await churchApi.getEvangelismDashboard();
    setEvangelismApiState((current) => ({
      ...current,
      loading: false,
      error: "",
      dashboard,
    }));
    return dashboard;
  };

  const refreshEvangelismCollections = async () => {
    const [contactsResponse, studiesResponse, campaignsResponse] = await Promise.all([
      churchApi.getEvangelismContacts(),
      churchApi.getBibleStudies(),
      churchApi.getCampaigns(),
    ]);

    setEvangelismContacts(Array.isArray(contactsResponse) ? contactsResponse : []);
    setBibleStudies(Array.isArray(studiesResponse) ? studiesResponse.map(hydrateBibleStudyRecord) : []);
    setCampaigns(Array.isArray(campaignsResponse) ? campaignsResponse : []);

    return {
      contacts: contactsResponse,
      bibleStudies: studiesResponse,
      campaigns: campaignsResponse,
    };
  };

  const syncDiscipleshipEnrollmentState = (incomingEnrollment) => {
    if (!incomingEnrollment) {
      return null;
    }

    const hydratedEnrollment = hydrateDiscipleshipEnrollmentRecord(incomingEnrollment);
    const enrollmentIdentity = hydratedEnrollment._id || hydratedEnrollment.id;

    setDiscipleshipEnrollments((current) =>
      updateOrInsert(current, hydratedEnrollment, enrollmentIdentity, {
        id: hydratedEnrollment.id || `de${Date.now()}`,
        _id: hydratedEnrollment._id,
      })
    );

    setRecordModal((current) => {
      if (current.type !== "discipleshipEnrollment") {
        return current;
      }

      const currentIdentity =
        current.record?._id ||
        current.record?.id ||
        current.draft?._id ||
        current.draft?.id;

      if (currentIdentity !== enrollmentIdentity) {
        return current;
      }

      return {
        ...current,
        record: hydratedEnrollment,
        draft: hydratedEnrollment,
      };
    });

    return hydratedEnrollment;
  };

  const refreshDiscipleshipDashboard = async () => {
    const dashboard = await churchApi.getDiscipleshipDashboard();
    setDiscipleshipApiState((current) => ({
      ...current,
      loading: false,
      error: "",
      dashboard,
    }));
    return dashboard;
  };

  const refreshDiscipleshipCollections = async () => {
    const [programmesResponse, enrollmentsResponse, overdueResponse] = await Promise.all([
      churchApi.getDiscipleshipProgrammes(),
      churchApi.getDiscipleshipEnrollments(),
      churchApi.getOverdueDiscipleshipEnrollments(14),
    ]);

    setDiscipleshipProgrammes(Array.isArray(programmesResponse) ? programmesResponse : []);
    setDiscipleshipEnrollments(
      Array.isArray(enrollmentsResponse)
        ? enrollmentsResponse.map(hydrateDiscipleshipEnrollmentRecord)
        : []
    );
    setDiscipleshipOverdue(
      Array.isArray(overdueResponse)
        ? overdueResponse.map(hydrateDiscipleshipEnrollmentRecord)
        : []
    );

    return {
      programmes: programmesResponse,
      enrollments: enrollmentsResponse,
      overdue: overdueResponse,
    };
  };

  const syncAttendanceEventState = (incomingEvent) => {
    if (!incomingEvent) {
      return null;
    }

    const hydratedEvent = hydrateAttendanceEventRecord(incomingEvent);
    const eventIdentity = hydratedEvent._id || hydratedEvent.id;

    setAttendanceSessions((current) =>
      updateOrInsert(current, hydratedEvent, eventIdentity, {
        id: hydratedEvent.id || `ae${Date.now()}`,
        _id: hydratedEvent._id,
      })
    );

    setRecordModal((current) => {
      if (current.type !== "attendanceEvent") {
        return current;
      }

      const currentIdentity =
        current.record?._id ||
        current.record?.id ||
        current.draft?._id ||
        current.draft?.id;

      if (currentIdentity !== eventIdentity) {
        return current;
      }

      return {
        ...current,
        record: hydratedEvent,
        draft: hydratedEvent,
      };
    });

    return hydratedEvent;
  };

  const refreshAttendanceReport = async () => {
    const report = await churchApi.getAttendanceReport(90);
    setAttendanceApiState((current) => ({
      ...current,
      loading: false,
      error: "",
      report,
    }));
    return report;
  };

  const refreshAttendanceCollections = async () => {
    const [eventsResponse, absenteesResponse] = await Promise.all([
      churchApi.getAttendanceEvents(),
      churchApi.getAttendanceAbsentees(28),
    ]);

    setAttendanceSessions(
      Array.isArray(eventsResponse) ? eventsResponse.map(hydrateAttendanceEventRecord) : []
    );
    setAttendanceAbsentees(Array.isArray(absenteesResponse) ? absenteesResponse : []);

    return {
      events: eventsResponse,
      absentees: absenteesResponse,
    };
  };

  useEffect(() => {
    let active = true;

    async function loadFamilies() {
      setFamilyApiState({ loading: true, error: "" });

      try {
        const remoteFamilies = await churchApi.getFamilies();
        if (active) {
          setFamilies(Array.isArray(remoteFamilies) ? remoteFamilies.map(hydrateFamilyRecord) : []);
          setFamilyApiState({ loading: false, error: "" });
        }
      } catch (error) {
        if (active) {
          setFamilyApiState({ loading: false, error: error.message || "Unable to load families." });
        }
      }
    }

    loadFamilies();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProtectedData() {
      if (!authUser) {
        if (active) {
          setMinistries(initialMinistries);
          setVisitors(initialVisitors);
          setMembers(initialMembers);
          setProspects([]);
          setEvangelismContacts([]);
          setBibleStudies([]);
          setCampaigns([]);
          setDiscipleshipProgrammes([]);
          setDiscipleshipEnrollments([]);
          setDiscipleshipOverdue([]);
          setAttendanceSessions(initialAttendanceSessions);
          setAttendanceAbsentees([]);
          setUsers(initialUsers);
          setLookupState({ loading: false, error: "", values: [] });
          setVisitorApiState({ loading: false, error: "", metrics: null });
          setEvangelismApiState({ loading: false, error: "", dashboard: null });
          setDiscipleshipApiState({ loading: false, error: "", dashboard: null });
          setAttendanceApiState({ loading: false, error: "", report: null, recordsByEvent: {} });
          setPendingActionState({ loading: false, error: "", items: [] });
        }
        return;
      }

      setLookupState((current) => ({ ...current, loading: true, error: "" }));
      setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
      setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
      setDiscipleshipApiState((current) => ({ ...current, loading: true, error: "" }));
      setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
      setPendingActionState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const [
          lookupsResponse,
          usersResponse,
          ministriesResponse,
          membersResponse,
          visitorsResponse,
          retentionMetrics,
          pendingActionsResponse,
          prospectsResponse,
          contactsResponse,
          bibleStudiesResponse,
          campaignsResponse,
          evangelismDashboardResponse,
          discipleshipProgrammesResponse,
          discipleshipEnrollmentsResponse,
          discipleshipOverdueResponse,
          discipleshipDashboardResponse,
          attendanceEventsResponse,
          attendanceReportResponse,
          attendanceAbsenteesResponse,
        ] =
          await Promise.allSettled([
            churchApi.getLookups(),
            churchApi.getUsers(),
            churchApi.getMinistries(),
            churchApi.getMembers(),
            churchApi.getVisitors(),
            churchApi.getVisitorRetentionMetrics(30),
            churchApi.getPendingActions(),
            churchApi.getProspects(),
            churchApi.getEvangelismContacts(),
            churchApi.getBibleStudies(),
            churchApi.getCampaigns(),
            churchApi.getEvangelismDashboard(),
            churchApi.getDiscipleshipProgrammes(),
            churchApi.getDiscipleshipEnrollments(),
            churchApi.getOverdueDiscipleshipEnrollments(14),
            churchApi.getDiscipleshipDashboard(),
            churchApi.getAttendanceEvents(),
            churchApi.getAttendanceReport(90),
            churchApi.getAttendanceAbsentees(28),
          ]);

        if (!active) {
          return;
        }

        setLookupState({
          loading: false,
          error:
            lookupsResponse.status === "rejected"
              ? lookupsResponse.reason?.message || "Unable to load lookups."
              : "",
          values:
            lookupsResponse.status === "fulfilled" && Array.isArray(lookupsResponse.value.values)
              ? lookupsResponse.value.values
              : [],
        });
        setUsers(
          usersResponse.status === "fulfilled" && Array.isArray(usersResponse.value)
            ? usersResponse.value
            : []
        );
        setMinistries(
          ministriesResponse.status === "fulfilled" && Array.isArray(ministriesResponse.value)
            ? ministriesResponse.value
            : []
        );
        setMembers(
          membersResponse.status === "fulfilled" && Array.isArray(membersResponse.value)
            ? membersResponse.value
            : []
        );
        setVisitors(
          visitorsResponse.status === "fulfilled" && Array.isArray(visitorsResponse.value)
            ? visitorsResponse.value.map(hydrateVisitorRecord)
            : []
        );
        setProspects(
          prospectsResponse.status === "fulfilled" && Array.isArray(prospectsResponse.value)
            ? prospectsResponse.value.map(hydrateProspectRecord)
            : []
        );
        setEvangelismContacts(
          contactsResponse.status === "fulfilled" && Array.isArray(contactsResponse.value)
            ? contactsResponse.value
            : []
        );
        setBibleStudies(
          bibleStudiesResponse.status === "fulfilled" && Array.isArray(bibleStudiesResponse.value)
            ? bibleStudiesResponse.value.map(hydrateBibleStudyRecord)
            : []
        );
        setCampaigns(
          campaignsResponse.status === "fulfilled" && Array.isArray(campaignsResponse.value)
            ? campaignsResponse.value
            : []
        );
        setDiscipleshipProgrammes(
          discipleshipProgrammesResponse.status === "fulfilled" &&
            Array.isArray(discipleshipProgrammesResponse.value)
            ? discipleshipProgrammesResponse.value
            : []
        );
        setDiscipleshipEnrollments(
          discipleshipEnrollmentsResponse.status === "fulfilled" &&
            Array.isArray(discipleshipEnrollmentsResponse.value)
            ? discipleshipEnrollmentsResponse.value.map(hydrateDiscipleshipEnrollmentRecord)
            : []
        );
        setDiscipleshipOverdue(
          discipleshipOverdueResponse.status === "fulfilled" &&
            Array.isArray(discipleshipOverdueResponse.value)
            ? discipleshipOverdueResponse.value.map(hydrateDiscipleshipEnrollmentRecord)
            : []
        );
        setAttendanceSessions(
          attendanceEventsResponse.status === "fulfilled" && Array.isArray(attendanceEventsResponse.value)
            ? attendanceEventsResponse.value.map(hydrateAttendanceEventRecord)
            : []
        );
        setAttendanceAbsentees(
          attendanceAbsenteesResponse.status === "fulfilled" && Array.isArray(attendanceAbsenteesResponse.value)
            ? attendanceAbsenteesResponse.value
            : []
        );
        setVisitorApiState({
          loading: false,
          error:
            visitorsResponse.status === "rejected"
              ? visitorsResponse.reason?.message || "Unable to load visitors."
              : retentionMetrics.status === "rejected"
                ? retentionMetrics.reason?.message || "Unable to load visitor metrics."
                : "",
          metrics: retentionMetrics.status === "fulfilled" ? retentionMetrics.value : null,
        });
        setEvangelismApiState({
          loading: false,
          error:
            prospectsResponse.status === "rejected"
              ? prospectsResponse.reason?.message || "Unable to load prospects."
              : evangelismDashboardResponse.status === "rejected"
                ? evangelismDashboardResponse.reason?.message || "Unable to load evangelism dashboard."
                : "",
          dashboard:
            evangelismDashboardResponse.status === "fulfilled"
              ? evangelismDashboardResponse.value
              : null,
        });
        setDiscipleshipApiState({
          loading: false,
          error:
            discipleshipEnrollmentsResponse.status === "rejected"
              ? discipleshipEnrollmentsResponse.reason?.message || "Unable to load discipleship enrollments."
              : discipleshipDashboardResponse.status === "rejected"
                ? discipleshipDashboardResponse.reason?.message || "Unable to load discipleship dashboard."
                : "",
          dashboard:
            discipleshipDashboardResponse.status === "fulfilled"
              ? discipleshipDashboardResponse.value
              : null,
        });
        setAttendanceApiState({
          loading: false,
          error:
            attendanceEventsResponse.status === "rejected"
              ? attendanceEventsResponse.reason?.message || "Unable to load attendance events."
              : attendanceReportResponse.status === "rejected"
                ? attendanceReportResponse.reason?.message || "Unable to load attendance report."
                : "",
          report:
            attendanceReportResponse.status === "fulfilled"
              ? attendanceReportResponse.value
              : null,
          recordsByEvent: {},
        });
        setPendingActionState({
          loading: false,
          error:
            pendingActionsResponse.status === "rejected"
              ? pendingActionsResponse.reason?.message || "Unable to load follow-up actions."
              : "",
          items:
            pendingActionsResponse.status === "fulfilled" && Array.isArray(pendingActionsResponse.value)
              ? pendingActionsResponse.value
              : [],
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setLookupState({ loading: false, error: error.message || "Unable to load lookups.", values: [] });
        setVisitorApiState({ loading: false, error: error.message || "Unable to load visitors.", metrics: null });
        setEvangelismApiState({ loading: false, error: error.message || "Unable to load evangelism data.", dashboard: null });
        setDiscipleshipApiState({ loading: false, error: error.message || "Unable to load discipleship data.", dashboard: null });
        setAttendanceApiState({ loading: false, error: error.message || "Unable to load attendance data.", report: null, recordsByEvent: {} });
        setPendingActionState({ loading: false, error: error.message || "Unable to load follow-up actions.", items: [] });
      }
    }

    loadProtectedData();

    return () => {
      active = false;
    };
  }, [authUser]);

  const handleMemberGroupChange = (depth, value) => {
    setMemberForm((current) => {
      const nextChain = current.groupChain.slice(0, depth);
      nextChain[depth] = value;
      return { ...current, groupChain: nextChain };
    });
  };

  const addFamilyLink = (relation) => {
    setMemberForm((current) => {
      const relatedMember = members.find((member) => member.memberId === relation.memberId);
      const householdPatch =
        !current.familyId && relatedMember?.familyId
          ? {
              familyId: relatedMember.familyId,
              familyName: relatedMember.familyName,
              householdRole: current.householdRole || relation.relationship,
            }
          : {};

      return {
        ...current,
        ...householdPatch,
        familyLinks: [...current.familyLinks, relation],
      };
    });
  };

  const removeFamilyLink = (memberId) => {
    setMemberForm((current) => ({
      ...current,
      familyLinks: current.familyLinks.filter((item) => item.memberId !== memberId),
    }));
  };

  const submitMemberForm = () => {
    const selectedGroups = buildGroupSelections(groups, memberForm.groupChain);
    const resolvedLinks = enrichFamilyLinks(memberForm.familyLinks, members);
    const inheritedHousehold = getInheritedFamilyAssignment(memberForm, members);
    const effectiveFamilyId = memberForm.familyId || inheritedHousehold.familyId || "";
    const effectiveFamilyName = memberForm.familyName || inheritedHousehold.familyName || "";
    const effectiveHouseholdRole = memberForm.householdRole || inheritedHousehold.householdRole || "";
    const newMember = {
      id: `mem${Date.now()}`,
      ...memberForm,
      familyId: effectiveFamilyId,
      familyName: effectiveFamilyName,
      householdRole: effectiveHouseholdRole,
      groups: selectedGroups,
      attendanceRate: "New",
      familyLinks: resolvedLinks,
    };

    setMembers((current) => {
      const nextMembers = [newMember, ...current];

      resolvedLinks.forEach((link) => {
        const reciprocalRelationship = getReciprocalRelationship(link.relationship);
        const linkedMember = nextMembers.find((item) => item.memberId === link.memberId);

        if (linkedMember) {
          const alreadyExists = (linkedMember.familyLinks || []).some(
            (item) => item.memberId === newMember.memberId && item.relationship === reciprocalRelationship
          );

          if (!alreadyExists) {
            linkedMember.familyLinks = [
              ...(linkedMember.familyLinks || []),
              {
                memberId: newMember.memberId,
                memberName: `${newMember.firstName} ${newMember.lastName}`,
                relationship: reciprocalRelationship,
              },
            ];
          }
        }
      });

      return [...nextMembers];
    });

    if (effectiveFamilyId) {
      setFamilies((current) =>
        current.map((family) => {
          if (family.familyId !== effectiveFamilyId) {
            return family;
          }

          const exists = (family.householdMembers || []).some((item) => item.memberId === newMember.memberId);
          const nextHouseholdMembers = exists
            ? family.householdMembers
            : [
                ...(family.householdMembers || []),
                {
                  memberId: newMember.memberId,
                  memberName: `${newMember.firstName} ${newMember.lastName}`,
                relationshipToHead: newMember.householdRole || "Member",
                  status: newMember.membershipStatus,
                },
              ];

          return {
            ...family,
            householdMembers: nextHouseholdMembers,
            familyContact: family.familyContact || newMember.phone,
          };
        })
      );
    }

    closeModal();
  };

  const saveRecordModal = async () => {
    const { type, draft, record } = recordModal;

    if (!type || !draft) {
      return;
    }

    if (type === "member") {
      setMembers((current) =>
        updateOrInsert(current, draft, record?.id, {
          id: draft.id || `mem${Date.now()}`,
        })
      );
    }

    if (type === "visitor") {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedVisitor = normalizeVisitorDraft(draft);
        const savedVisitor = record?.visitorId
          ? await churchApi.updateVisitor(record.visitorId, normalizedVisitor)
          : await churchApi.createVisitor(normalizedVisitor);

        syncVisitorState(savedVisitor);
        await refreshVisitorMetrics();
        closeRecordModal();
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save visitor.",
        }));
      }
      return;
    }

    if (type === "prospect") {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedProspect = normalizeProspectDraft(draft);
        const savedProspect = record?.prospectId
          ? await churchApi.updateProspect(record.prospectId, normalizedProspect)
          : await churchApi.createProspect(normalizedProspect);

        syncProspectState(savedProspect);
        await refreshEvangelismDashboard();
        closeRecordModal();
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save prospect.",
        }));
      }
      return;
    }

    if (type === "bibleStudy") {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedStudy = normalizeBibleStudyDraft(draft);
        const savedStudy = record?._id
          ? await churchApi.updateBibleStudy(record._id, normalizedStudy)
          : await churchApi.createBibleStudy(normalizedStudy);

        setBibleStudies((current) =>
          updateOrInsert(current, hydrateBibleStudyRecord(savedStudy), record?._id || record?.id, {
            id: savedStudy.id || `bs${Date.now()}`,
            _id: savedStudy._id,
          })
        );

        await refreshEvangelismDashboard();
        closeRecordModal();
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save Bible study.",
        }));
      }
      return;
    }

    if (type === "campaign") {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const payload = {
          name: draft.name || "",
          startDate: draft.startDate || new Date().toISOString().slice(0, 10),
          endDate: draft.endDate || null,
          summaryNotes: draft.summaryNotes || "",
        };
        const savedCampaign = record?._id
          ? await churchApi.updateCampaign(record._id, payload)
          : await churchApi.createCampaign(payload);

        setCampaigns((current) =>
          updateOrInsert(current, savedCampaign, record?._id || record?.id, {
            id: savedCampaign.id || `camp${Date.now()}`,
            _id: savedCampaign._id,
          })
        );

        await refreshEvangelismDashboard();
        closeRecordModal();
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save campaign.",
        }));
      }
      return;
    }

    if (type === "discipleshipProgramme") {
      try {
        setDiscipleshipApiState((current) => ({ ...current, loading: true, error: "" }));
        const payload = normalizeDiscipleshipProgrammeDraft(draft);
        const savedProgramme = record?._id
          ? await churchApi.updateDiscipleshipProgramme(record._id, payload)
          : await churchApi.createDiscipleshipProgramme(payload);

        setDiscipleshipProgrammes((current) =>
          updateOrInsert(current, savedProgramme, record?._id || record?.id, {
            id: savedProgramme.id || `dp${Date.now()}`,
            _id: savedProgramme._id,
          })
        );

        await refreshDiscipleshipDashboard();
        closeRecordModal();
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save discipleship programme.",
        }));
      }
      return;
    }

    if (type === "discipleshipEnrollment") {
      try {
        setDiscipleshipApiState((current) => ({ ...current, loading: true, error: "" }));
        const payload = normalizeDiscipleshipEnrollmentDraft(draft);
        const savedEnrollment = record?._id
          ? await churchApi.updateDiscipleshipEnrollment(record._id, payload)
          : await churchApi.createDiscipleshipEnrollment(payload);

        syncDiscipleshipEnrollmentState(savedEnrollment);
        await Promise.all([refreshDiscipleshipDashboard(), refreshDiscipleshipCollections()]);
        closeRecordModal();
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save discipleship enrollment.",
        }));
      }
      return;
    }

    if (type === "family") {
      try {
        setFamilyApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedFamily = normalizeFamilyDraft(draft, members, groups, families);
        const savedFamily = record?._id
          ? await churchApi.updateFamily(record._id, normalizedFamily)
          : await churchApi.createFamily(normalizedFamily);

        setFamilies((current) =>
          updateOrInsert(
            current,
            hydrateFamilyRecord(savedFamily),
            record?._id || record?.id,
            {
              id: savedFamily.id || draft.id || `fam${Date.now()}`,
              _id: savedFamily._id,
            }
          )
        );

        setMembers((current) => syncMembersToFamily(current, hydrateFamilyRecord(savedFamily)));
        setFamilyApiState({ loading: false, error: "" });
        closeRecordModal();
      } catch (error) {
        setFamilyApiState({ loading: false, error: error.message || "Unable to save family." });
      }
      return;
    }

    if (type === "finance") {
      setFinanceRecords((current) =>
        updateOrInsert(current, { ...draft, amount: Number(draft.amount || 0) }, record?.id, {
          id: draft.id || `f${Date.now()}`,
        })
      );
    }

    if (type === "attendanceEvent") {
      try {
        setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
        const payload = normalizeAttendanceEventDraft(draft);
        const savedEvent = record?._id
          ? await churchApi.updateAttendanceEvent(record._id, payload)
          : await churchApi.createAttendanceEvent(payload);

        syncAttendanceEventState(savedEvent);
        await Promise.all([refreshAttendanceCollections(), refreshAttendanceReport()]);
        closeRecordModal();
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save attendance event.",
        }));
      }
      return;
    }

    if (type === "user") {
      setUsers((current) =>
        updateOrInsert(current, draft, record?.id, {
          id: draft.id || `u${Date.now()}`,
        })
      );
    }

    if (type === "ministry") {
      setMinistries((current) =>
        updateOrInsert(current, draft, record?.id, {
          id: draft.id || `m${Date.now()}`,
        })
      );
    }

    if (type === "role") {
      setRoles((current) =>
        updateOrInsert(current, draft, record?.id, {
          id: draft.id || `r${Date.now()}`,
        })
      );
    }

    if (type === "group") {
      setGroups((current) =>
        updateOrInsert(
          current,
          { ...draft, parentId: draft.parentId || null },
          record?.id,
          { id: draft.id || `g${Date.now()}` }
        )
      );
    }

    if (type === "branding") {
      setBranding(draft);
    }

    closeRecordModal();
  };

  const value = {
    authUser,
    branding,
    setBranding,
    groups,
    groupsByParent,
    ministries,
    members,
    filteredMembers,
    visitors,
    setVisitors,
    prospects,
    evangelismContacts,
    bibleStudies,
    campaigns,
    discipleshipProgrammes,
    discipleshipEnrollments,
    discipleshipOverdue,
    roles,
    users,
    families,
    financeRecords,
    attendanceSessions,
    attendanceAbsentees,
    familyApiState,
    visitorApiState,
    evangelismApiState,
    discipleshipApiState,
    attendanceApiState,
    lookupState,
    pendingActionState,
    visitorHowHeardOptions,
    visitorStatusOptions,
    evangelismSourceOptions,
    evangelismStageOptions,
    bibleStudyStatusOptions,
    discipleshipStatusOptions,
    attendanceEventTypeOptions,
    attendanceCaptureModeOptions,
    attendanceTrend,
    dashboardStats,
    memberDistribution,
    memberSearch,
    setMemberSearch,
    memberMinistryFilter,
    setMemberMinistryFilter,
    activeSetupTab,
    setActiveSetupTab,
    activeModal,
    openModal,
    closeModal,
    recordModal,
    openRecordModal,
    closeRecordModal,
    saveRecordModal,
    setRecordModalDraft,
    setRecordModalMode,
    refreshPendingActions,
    syncVisitorState,
    syncProspectState,
    refreshEvangelismCollections,
    syncDiscipleshipEnrollmentState,
    refreshDiscipleshipCollections,
    syncAttendanceEventState,
    refreshAttendanceCollections,
    openMemberEnrollment,
    enrolmentStep,
    setEnrolmentStep,
    memberForm,
    setMemberForm,
    groupForm,
    setGroupForm,
    ministryForm,
    setMinistryForm,
    financeForm,
    setFinanceForm,
    attendanceForm,
    setAttendanceForm,
    userForm,
    setUserForm,
    roleForm,
    setRoleForm,
    familyForm,
    setFamilyForm,
    handleMemberGroupChange,
    addFamilyLink,
    removeFamilyLink,
    submitMemberForm,
    topLevelGroups: groupsByParent.root || [],
    setGroups,
    setMinistries,
    setRoles,
    setUsers,
    setFinanceRecords,
    setAttendanceSessions,
    setFamilies,
    setCampaigns,
    setDiscipleshipProgrammes,
    setAttendanceAbsentees,
    async recordVisitorChurchVisit(visitorId, payload) {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedVisitor = await churchApi.addVisitorChurchVisit(visitorId, payload);
        syncVisitorState(updatedVisitor);
        await refreshVisitorMetrics();
        return updatedVisitor;
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to record church visit.",
        }));
        throw error;
      }
    },
    async assignVisitorFollowUp(visitorId, assignedUserId) {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        setPendingActionState((current) => ({ ...current, loading: true, error: "" }));
        const updatedVisitor = await churchApi.assignVisitorFollowUp(visitorId, assignedUserId);
        syncVisitorState(updatedVisitor);
        await Promise.all([refreshVisitorMetrics(), refreshPendingActions()]);
        return updatedVisitor;
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to assign visitor follow-up.",
        }));
        setPendingActionState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to load follow-up actions.",
        }));
        throw error;
      }
    },
    async recordVisitorHomeVisit(visitorId, payload) {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedVisitor = await churchApi.addVisitorHomeVisit(visitorId, payload);
        syncVisitorState(updatedVisitor);
        setVisitorApiState((current) => ({ ...current, loading: false, error: "" }));
        return updatedVisitor;
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save home visit.",
        }));
        throw error;
      }
    },
    async convertVisitorToProspect(visitorId) {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        const result = await churchApi.convertVisitorToProspect(visitorId);
        syncVisitorState(result.visitor);
        syncProspectState(result.prospect);
        await Promise.all([refreshVisitorMetrics(), refreshEvangelismDashboard()]);
        return result;
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to convert visitor to prospect.",
        }));
        throw error;
      }
    },
    async convertVisitorToMember(visitorId, payload) {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        const result = await churchApi.convertVisitorToMember(visitorId, payload);
        syncVisitorState(result.visitor);
        await refreshVisitorMetrics();
        return result;
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to convert visitor to member.",
        }));
        throw error;
      }
    },
    async assignProspect(prospectId, assignedUserId) {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        setPendingActionState((current) => ({ ...current, loading: true, error: "" }));
        const updatedProspect = await churchApi.assignProspect(prospectId, assignedUserId);
        syncProspectState(updatedProspect);
        await Promise.all([refreshEvangelismDashboard(), refreshPendingActions()]);
        return updatedProspect;
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to assign prospect.",
        }));
        throw error;
      }
    },
    async moveProspectStage(prospectId, stageId) {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedProspect = await churchApi.moveProspectStage(prospectId, stageId);
        syncProspectState(updatedProspect);
        await refreshEvangelismDashboard();
        return updatedProspect;
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to update prospect stage.",
        }));
        throw error;
      }
    },
    async logProspectContact(prospectId, payload) {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        setPendingActionState((current) => ({ ...current, loading: true, error: "" }));
        const contact = await churchApi.addProspectContact(prospectId, payload);
        setEvangelismContacts((current) => [contact, ...current]);
        await Promise.all([refreshPendingActions(), refreshEvangelismDashboard()]);
        return contact;
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to log evangelism contact.",
        }));
        throw error;
      }
    },
    async convertProspectToMember(prospectId, payload) {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const result = await churchApi.convertProspectToMember(prospectId, payload);
        syncProspectState(result.prospect);
        await Promise.all([
          refreshEvangelismDashboard(),
          refreshDiscipleshipDashboard(),
          refreshDiscipleshipCollections(),
        ]);
        return result;
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to convert prospect to member.",
        }));
        throw error;
      }
    },
    async addBibleStudyLesson(studyId, payload) {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedStudy = await churchApi.addBibleStudyLesson(studyId, payload);
        setBibleStudies((current) =>
          updateOrInsert(current, hydrateBibleStudyRecord(updatedStudy), studyId, {
            _id: updatedStudy._id,
          })
        );
        await refreshEvangelismDashboard();
        return updatedStudy;
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save Bible study lesson.",
        }));
        throw error;
      }
    },
    async assignDiscipleshipMentor(enrollmentId, mentorId) {
      try {
        setDiscipleshipApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedEnrollment = await churchApi.assignDiscipleshipMentor(enrollmentId, mentorId);
        syncDiscipleshipEnrollmentState(updatedEnrollment);
        await refreshDiscipleshipDashboard();
        return updatedEnrollment;
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to assign discipleship mentor.",
        }));
        throw error;
      }
    },
    async addDiscipleshipSession(enrollmentId, payload) {
      try {
        setDiscipleshipApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedEnrollment = await churchApi.addDiscipleshipSession(enrollmentId, payload);
        syncDiscipleshipEnrollmentState(updatedEnrollment);
        await Promise.all([refreshDiscipleshipDashboard(), refreshDiscipleshipCollections()]);
        return updatedEnrollment;
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save discipleship session.",
        }));
        throw error;
      }
    },
    async completeDiscipleshipEnrollment(enrollmentId, payload) {
      try {
        setDiscipleshipApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedEnrollment = await churchApi.completeDiscipleshipEnrollment(enrollmentId, payload);
        syncDiscipleshipEnrollmentState(updatedEnrollment);
        await Promise.all([refreshDiscipleshipDashboard(), refreshDiscipleshipCollections()]);
        return updatedEnrollment;
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to complete discipleship enrollment.",
        }));
        throw error;
      }
    },
    async captureAttendanceRecord(eventId, payload) {
      try {
        setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
        const savedRecord = await churchApi.captureAttendanceRecord(eventId, payload);
        const refreshedRecords = await churchApi.getAttendanceEventRecords(eventId);
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: "",
          recordsByEvent: {
            ...current.recordsByEvent,
            [eventId]: refreshedRecords,
          },
        }));
        setRecordModal((current) => {
          if (current.type !== "attendanceEvent" || current.record?._id !== eventId) {
            return current;
          }

          const nextDraft = {
            ...current.draft,
            attendanceRecords: refreshedRecords,
          };

          return {
            ...current,
            record: nextDraft,
            draft: nextDraft,
          };
        });
        await Promise.all([refreshAttendanceCollections(), refreshAttendanceReport()]);
        return savedRecord;
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to capture attendance.",
        }));
        throw error;
      }
    },
    async captureBulkAttendance(eventId, payload) {
      try {
        setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
        const savedRecords = await churchApi.captureBulkAttendance(eventId, payload);
        const refreshedRecords = await churchApi.getAttendanceEventRecords(eventId);
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: "",
          recordsByEvent: {
            ...current.recordsByEvent,
            [eventId]: refreshedRecords,
          },
        }));
        setRecordModal((current) => {
          if (current.type !== "attendanceEvent" || current.record?._id !== eventId) {
            return current;
          }

          const nextDraft = {
            ...current.draft,
            attendanceRecords: refreshedRecords,
          };

          return {
            ...current,
            record: nextDraft,
            draft: nextDraft,
          };
        });
        await Promise.all([refreshAttendanceCollections(), refreshAttendanceReport()]);
        return savedRecords;
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to capture bulk attendance.",
        }));
        throw error;
      }
    },
    async correctAttendanceRecord(recordId, payload, eventId) {
      try {
        setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedRecord = await churchApi.updateAttendanceRecord(recordId, payload);
        const refreshedRecords = await churchApi.getAttendanceEventRecords(eventId);
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: "",
          recordsByEvent: {
            ...current.recordsByEvent,
            [eventId]: refreshedRecords,
          },
        }));
        setRecordModal((current) => {
          if (current.type !== "attendanceEvent" || current.record?._id !== eventId) {
            return current;
          }

          const nextDraft = {
            ...current.draft,
            attendanceRecords: refreshedRecords,
          };

          return {
            ...current,
            record: nextDraft,
            draft: nextDraft,
          };
        });
        await Promise.all([refreshAttendanceCollections(), refreshAttendanceReport()]);
        return updatedRecord;
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to correct attendance record.",
        }));
        throw error;
      }
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function updateOrInsert(items, draft, originalId, fallbacks = {}) {
  const nextItem = { ...fallbacks, ...draft };
  const existingIndex = items.findIndex((item) => getRecordIdentity(item) === originalId);

  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  return items.map((item) => (getRecordIdentity(item) === originalId ? nextItem : item));
}

function buildNewRecord(type, { families, members, ministries, roles, prospects, users, discipleshipProgrammes }) {
  if (type === "visitor") {
    return {
      visitorId: `VS${String(Date.now()).slice(-4)}`,
      firstName: "",
      surname: "",
      phone: "",
      email: "",
      residentialArea: "",
      firstVisitDate: new Date().toISOString().slice(0, 10),
      howHeard: "",
      assignedFollowUpUserId: "",
      visitCount: 1,
      visitDates: [],
      status: "",
      visitationHistory: [],
    };
  }

  if (type === "family") {
    return {
      familyId: generateNextFamilyId(families),
      familyName: "",
      headOfHousehold: null,
      spouse: null,
      children: [],
      dependants: [],
      residentialArea: "",
      physicalAddress: "",
      fellowshipZone: "",
      familyContact: "",
      visitationHistory: "",
      householdMembers: [],
    };
  }

  if (type === "prospect") {
    return {
      prospectId: `EP${String(Date.now()).slice(-4)}`,
      firstName: "",
      surname: "",
      phone: "",
      email: "",
      residentialArea: "",
      source: "",
      assignedEvangelistId: "",
      currentStage: "",
      campaignId: "",
      stageHistory: [],
      sourceVisitorId: "",
    };
  }

  if (type === "bibleStudy") {
    return {
      prospect: prospects[0] || null,
      member: null,
      teacherId: users[0] || null,
      startDate: new Date().toISOString().slice(0, 10),
      status: "",
      lessonsCompleted: [],
    };
  }

  if (type === "campaign") {
    return {
      name: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      summaryNotes: "",
      linkedProspects: 0,
    };
  }

  if (type === "discipleshipProgramme") {
    return {
      name: "",
      expectedDurationDays: 90,
      modules: "Salvation Assurance, Prayer And Devotion, Bible Foundations, Church Fellowship, Ministry Integration",
      isActive: true,
    };
  }

  if (type === "discipleshipEnrollment") {
    return {
      memberId: members[0] || null,
      programmeId: discipleshipProgrammes[0] || null,
      mentorId: users[0] || null,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      status: "",
      completionDate: "",
      sessionsCompleted: [],
      sourceProspectId: "",
    };
  }

  if (type === "finance") {
    return {
      recordNo: `FIN-${String(Date.now()).slice(-3)}`,
      category: "Offering",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      status: "Pending",
    };
  }

  if (type === "attendanceEvent") {
    return {
      title: "",
      eventTypeId: "",
      date: new Date().toISOString().slice(0, 10),
      location: "",
      ministryId: "",
      qrToken: "",
      attendanceRecords: [],
    };
  }

  if (type === "user") {
    return {
      fullName: "",
      email: "",
      role: roles[0]?.name || "Administrator",
      status: "Pending",
    };
  }

  if (type === "ministry") {
    return {
      name: "",
      leader: "",
      description: "",
      color: "#4f46e5",
    };
  }

  if (type === "role") {
    return {
      name: "",
      description: "",
    };
  }

  if (type === "group") {
    return {
      name: "",
      levelName: "",
      code: "",
      parentId: "",
      description: "",
    };
  }

  if (type === "member") {
    return {
      id: `mem${Date.now()}`,
      memberId: generateNextMemberId(members),
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      membershipStatus: "Active",
      baptismStatus: "Not Baptized",
      city: "",
      address: "",
      notes: "",
      familyLinks: [],
      groups: [],
      personalPhoto: "",
      idFrontPhoto: "",
      idBackPhoto: "",
      ministryId: ministries[0]?.id || "",
    };
  }

  if (type === "branding") {
    return {
      churchName: "",
      address: "",
      phone: "",
      email: "",
      website: "",
    };
  }

  return {};
}

function getRecordIdentity(item) {
  return item?.id || item?._id || item?.visitorId || item?.prospectId || item?.familyId || item?.memberId;
}

function hydrateVisitorRecord(visitor) {
  if (!visitor) {
    return visitor;
  }

  return {
    ...visitor,
    howHeard: visitor.howHeard || "",
    status: visitor.status || "",
    assignedFollowUpUserId: visitor.assignedFollowUpUserId || "",
  };
}

function normalizeVisitorDraft(draft) {
  return {
    visitorId: draft.visitorId,
    firstName: draft.firstName || "",
    surname: draft.surname || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    firstVisitDate: draft.firstVisitDate || new Date().toISOString().slice(0, 10),
    howHeard: draft.howHeard?._id || draft.howHeard || null,
    assignedFollowUpUserId: draft.assignedFollowUpUserId?._id || draft.assignedFollowUpUserId || null,
  };
}

function hydrateProspectRecord(prospect) {
  if (!prospect) {
    return prospect;
  }

  return {
    ...prospect,
    source: prospect.source || "",
    assignedEvangelistId: prospect.assignedEvangelistId || "",
    currentStage: prospect.currentStage || "",
    campaignId: prospect.campaignId || "",
    stageHistory: Array.isArray(prospect.stageHistory) ? prospect.stageHistory : [],
  };
}

function normalizeProspectDraft(draft) {
  return {
    prospectId: draft.prospectId,
    firstName: draft.firstName || "",
    surname: draft.surname || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    source: draft.source?._id || draft.source || null,
    assignedEvangelistId: draft.assignedEvangelistId?._id || draft.assignedEvangelistId || null,
    currentStage: draft.currentStage?._id || draft.currentStage || null,
    campaignId: draft.campaignId?._id || draft.campaignId || null,
  };
}

function hydrateBibleStudyRecord(study) {
  if (!study) {
    return study;
  }

  return {
    ...study,
    prospect: study.prospect || null,
    member: study.member || null,
    teacherId: study.teacherId || null,
    status: study.status || "",
    lessonsCompleted: Array.isArray(study.lessonsCompleted) ? study.lessonsCompleted : [],
  };
}

function normalizeBibleStudyDraft(draft) {
  return {
    prospect: draft.prospect?._id || draft.prospect || null,
    member: draft.member?._id || draft.member || null,
    teacherId: draft.teacherId?._id || draft.teacherId || null,
    startDate: draft.startDate || new Date().toISOString().slice(0, 10),
    status: draft.status?._id || draft.status || null,
  };
}

function hydrateDiscipleshipProgrammeRecord(programme) {
  if (!programme) {
    return programme;
  }

  return {
    ...programme,
    modules: Array.isArray(programme.modules)
      ? programme.modules.map((item) => item.title).join(", ")
      : programme.modules || "",
  };
}

function hydrateDiscipleshipEnrollmentRecord(enrollment) {
  if (!enrollment) {
    return enrollment;
  }

  return {
    ...enrollment,
    memberId: enrollment.memberId || null,
    programmeId: enrollment.programmeId || null,
    mentorId: enrollment.mentorId || null,
    status: enrollment.status || "",
    sessionsCompleted: Array.isArray(enrollment.sessionsCompleted) ? enrollment.sessionsCompleted : [],
  };
}

function normalizeDiscipleshipProgrammeDraft(draft) {
  return {
    name: draft.name || "",
    expectedDurationDays: Number(draft.expectedDurationDays || 90),
    modules: String(draft.modules || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((title, index) => ({ title, order: index + 1 })),
    isActive: draft.isActive !== false && draft.isActive !== "false",
  };
}

function normalizeDiscipleshipEnrollmentDraft(draft) {
  return {
    memberId: draft.memberId?._id || draft.memberId || null,
    programmeId: draft.programmeId?._id || draft.programmeId || null,
    mentorId: draft.mentorId?._id || draft.mentorId || null,
    enrollmentDate: draft.enrollmentDate || new Date().toISOString().slice(0, 10),
    status: draft.status?._id || draft.status || null,
    completionDate: draft.completionDate || null,
    sourceProspectId: draft.sourceProspectId || "",
  };
}

function hydrateAttendanceEventRecord(event) {
  if (!event) {
    return event;
  }

  return {
    ...event,
    eventTypeId: event.eventTypeId || "",
    ministryId: event.ministryId || "",
    attendanceRecords: Array.isArray(event.attendanceRecords) ? event.attendanceRecords : [],
  };
}

function normalizeAttendanceEventDraft(draft) {
  return {
    eventTypeId: draft.eventTypeId?._id || draft.eventTypeId || null,
    date: draft.date || new Date().toISOString().slice(0, 10),
    title: draft.title || "",
    ministryId: draft.ministryId?._id || draft.ministryId || null,
    location: draft.location || "",
  };
}

function hydrateFamilyRecord(family) {
  if (!family) {
    return family;
  }

  return {
    ...family,
    headOfHousehold: normalizeLegacyLookup(family.headOfHousehold),
    spouse: normalizeLegacyLookup(family.spouse),
    children: normalizeLegacyLookupArray(family.children),
    dependants: normalizeLegacyLookupArray(family.dependants),
  };
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}

function getInheritedFamilyAssignment(memberForm, members) {
  const linkedHousehold = (memberForm.familyLinks || [])
    .map((link) => {
      const relatedMember = members.find((member) => member.memberId === link.memberId);
      if (!relatedMember?.familyId) {
        return null;
      }

      return {
        familyId: relatedMember.familyId,
        familyName: relatedMember.familyName,
        householdRole: link.relationship,
      };
    })
    .find(Boolean);

  return linkedHousehold || {};
}

function normalizeFamilyDraft(draft, members, groups, families) {
  const normalized = {
    ...draft,
    familyId: draft.familyId || generateNextFamilyId(families),
    headOfHousehold: ensureMemberSelection(draft.headOfHousehold),
    spouse: ensureMemberSelection(draft.spouse),
    children: ensureMemberSelectionArray(draft.children),
    dependants: ensureMemberSelectionArray(draft.dependants),
  };

  const zoneMatch = groups.find(
    (group) => group.id === normalized.fellowshipZone || group.name === normalized.fellowshipZone
  );
  normalized.fellowshipZone = zoneMatch ? zoneMatch.id : normalized.fellowshipZone;
  normalized.householdMembers = buildHouseholdMembers(normalized, members);
  normalized.familyContact =
    normalized.familyContact ||
    members.find((member) => member.memberId === normalized.headOfHousehold?.memberId)?.phone ||
    members.find((member) => member.memberId === normalized.spouse?.memberId)?.phone ||
    "";

  return normalized;
}

function normalizeLegacyLookup(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return {
      memberId: "",
      memberName: value,
    };
  }

  return value;
}

function normalizeLegacyLookupArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeLegacyLookup(item)).filter(Boolean);
}

function ensureMemberSelection(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && value.memberId) {
    return value;
  }

  return null;
}

function ensureMemberSelectionArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item?.memberId);
  }

  return [];
}

function buildHouseholdMembers(family, members) {
  const roleBuckets = [
    { item: family.headOfHousehold, role: "Head" },
    { item: family.spouse, role: "Spouse" },
    ...(family.children || []).map((item) => ({ item, role: "Child" })),
    ...(family.dependants || []).map((item) => ({ item, role: "Dependant" })),
  ];

  return roleBuckets
    .filter(({ item }) => item?.memberId)
    .reduce((accumulator, { item, role }) => {
      if (accumulator.some((entry) => entry.memberId === item.memberId)) {
        return accumulator;
      }

      const linkedMember = members.find((member) => member.memberId === item.memberId);

      return [
        ...accumulator,
        {
          memberId: item.memberId,
          memberName: item.memberName,
          relationshipToHead: getHouseholdRoleLabel(role, linkedMember),
          status: linkedMember?.membershipStatus || "Active",
        },
      ];
    }, []);
}

function syncMembersToFamily(members, family) {
  const memberRoleMap = new Map(
    (family.householdMembers || []).map((item) => [item.memberId, item.relationshipToHead])
  );

  return members.map((member) => {
    if (!memberRoleMap.has(member.memberId)) {
      return member;
    }

    return {
      ...member,
      familyId: family.familyId,
      familyName: family.familyName,
      householdRole: memberRoleMap.get(member.memberId),
    };
  });
}

function getHouseholdRoleLabel(baseRole, linkedMember) {
  if (baseRole === "Spouse") {
    return linkedMember?.gender === "Male" ? "Husband" : "Wife";
  }

  if (baseRole === "Child") {
    return linkedMember?.gender === "Female" ? "Daughter" : "Son";
  }

  return baseRole;
}
