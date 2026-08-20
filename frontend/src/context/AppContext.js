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
  const [groups, setGroups] = useState(initialGroups.map(hydrateGroupRecord));
  const [ministries, setMinistries] = useState(initialMinistries.map(hydrateMinistryRecord));
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
  const [mediaUploadState, setMediaUploadState] = useState({
    loading: false,
    error: "",
    fieldName: "",
  });
  const [toasts, setToasts] = useState([]);
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
      const memberMinistryId = member.ministryId || member.ministry?._id || member.ministry || "";
      const matchesMinistry =
        memberMinistryFilter === "all" || memberMinistryId === memberMinistryFilter;

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

  const dismissToast = (toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  };

  const pushToast = (type, message, title = "") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, type, message, title }]);
    window.setTimeout(() => {
      dismissToast(id);
    }, 3600);
  };

  const notifySuccess = (message, title = "Success") => {
    pushToast("success", message, title);
  };

  const notifyError = (message, title = "Error") => {
    pushToast("error", message, title);
  };

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const openRecordModal = async (type, record, mode = "view") => {
    const sourceRecord = record
      ? type === "member"
        ? hydrateMemberRecord(record)
        : type === "family"
        ? hydrateFamilyRecord(record)
        : type === "group"
          ? hydrateGroupRecord(record)
        : type === "ministry"
          ? hydrateMinistryRecord(record)
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
          authUser,
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

    if (!record && type === "bibleStudy" && authUser) {
      try {
        const payload = await churchApi.getNextBibleStudyId();
        sourceRecord.bibleStudyId = payload.bibleStudyId || sourceRecord.bibleStudyId;
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

  const deleteRecordModal = async () => {
    const { type, record, draft } = recordModal;
    const identity = record || draft;

    if (!type || !identity) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this record?");
      if (!confirmed) {
        return;
      }
    }

    try {
      if (type === "member" && identity._id) {
        await churchApi.deleteMember(identity._id);
        setMembers((current) => current.filter((item) => (item._id || item.memberId) !== (identity._id || identity.memberId)));
      } else if (type === "visitor" && identity.visitorId) {
        await churchApi.deleteVisitor(identity.visitorId);
        setVisitors((current) => current.filter((item) => item.visitorId !== identity.visitorId));
      } else if (type === "prospect" && identity.prospectId) {
        await churchApi.deleteProspect(identity.prospectId);
        setProspects((current) => current.filter((item) => item.prospectId !== identity.prospectId));
      } else if (type === "bibleStudy" && identity._id) {
        await churchApi.deleteBibleStudy(identity._id);
        setBibleStudies((current) => current.filter((item) => item._id !== identity._id));
      } else if (type === "campaign" && identity._id) {
        await churchApi.deleteCampaign(identity._id);
        setCampaigns((current) => current.filter((item) => item._id !== identity._id));
      } else if (type === "discipleshipProgramme" && identity._id) {
        await churchApi.deleteDiscipleshipProgramme(identity._id);
        setDiscipleshipProgrammes((current) => current.filter((item) => item._id !== identity._id));
      } else if (type === "discipleshipEnrollment" && identity._id) {
        await churchApi.deleteDiscipleshipEnrollment(identity._id);
        setDiscipleshipEnrollments((current) => current.filter((item) => item._id !== identity._id));
      } else if (type === "family" && identity._id) {
        await churchApi.deleteFamily(identity._id);
        setFamilies((current) => current.filter((item) => item._id !== identity._id));
      } else if (type === "attendanceEvent" && identity._id) {
        await churchApi.deleteAttendanceEvent(identity._id);
        setAttendanceSessions((current) => current.filter((item) => item._id !== identity._id));
      } else if (type === "ministry" && identity._id) {
        await churchApi.deleteMinistry(identity._id);
        setMinistries((current) => current.filter((item) => (item._id || item.id) !== identity._id));
      } else if (type === "group" && identity._id) {
        await churchApi.deleteGroup(identity._id);
        setGroups((current) => current.filter((item) => (item._id || item.id) !== identity._id));
      } else {
        throw new Error("Delete is not available for this record yet.");
      }

      closeRecordModal();
      notifySuccess("Record deleted successfully.");
    } catch (error) {
      notifyError(error.message || "Unable to delete record.");
    }
  };

  const openMemberEnrollment = () => {
    const fallbackId = generateNextMemberId(members);
    const today = new Date().toISOString().slice(0, 10);

    setMemberForm({
      ...memberFormTemplate,
      memberId: fallbackId,
      membershipDate: today,
      dateJoined: today,
      dateCaptured: today,
      dataEntryClerk: authUser?.displayName || authUser?.username || "",
    });
    setEnrolmentStep(0);
    setActiveModal("member-enrolment");

    if (authUser) {
      churchApi
        .getNextMemberId()
        .then((payload) => {
          setMemberForm((current) => ({
            ...current,
            memberId: payload.memberId || current.memberId || fallbackId,
          }));
        })
        .catch(() => {
          // Keep fallback member ID when the next-id endpoint is unavailable.
        });
    }
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
    const [prospectsResponse, contactsResponse, studiesResponse, campaignsResponse] = await Promise.all([
      churchApi.getProspects(),
      churchApi.getEvangelismContacts(),
      churchApi.getBibleStudies(),
      churchApi.getCampaigns(),
    ]);

    setProspects(Array.isArray(prospectsResponse) ? prospectsResponse.map(hydrateProspectRecord) : []);
    setEvangelismContacts(Array.isArray(contactsResponse) ? contactsResponse : []);
    setBibleStudies(Array.isArray(studiesResponse) ? studiesResponse.map(hydrateBibleStudyRecord) : []);
    setCampaigns(Array.isArray(campaignsResponse) ? campaignsResponse : []);

    return {
      prospects: prospectsResponse,
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
          setGroups(initialGroups.map(hydrateGroupRecord));
          setMinistries(initialMinistries.map(hydrateMinistryRecord));
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
          groupsResponse,
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
            churchApi.getGroups(),
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
        setGroups(
          groupsResponse.status === "fulfilled" && Array.isArray(groupsResponse.value)
            ? groupsResponse.value.map(hydrateGroupRecord)
            : initialGroups.map(hydrateGroupRecord)
        );
        setUsers(
          usersResponse.status === "fulfilled" && Array.isArray(usersResponse.value)
            ? usersResponse.value
            : []
        );
        setMinistries(
          ministriesResponse.status === "fulfilled" && Array.isArray(ministriesResponse.value)
            ? ministriesResponse.value.map(hydrateMinistryRecord)
            : []
        );
        setMembers(
          membersResponse.status === "fulfilled" && Array.isArray(membersResponse.value)
            ? membersResponse.value.map(hydrateMemberRecord)
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

  const submitMemberForm = async () => {
    const memberValidationError = getRequiredMemberError(memberForm);
    if (memberValidationError) {
      setMediaUploadState((current) => ({
        ...current,
        error: memberValidationError,
      }));
      return;
    }

    const selectedGroups = buildGroupSelections(groups, memberForm.groupChain);
    const resolvedLinks = enrichFamilyLinks(memberForm.familyLinks, members);
    const inheritedHousehold = getInheritedFamilyAssignment(memberForm, members);
    const effectiveFamilyId = memberForm.familyId || inheritedHousehold.familyId || "";
    const effectiveFamilyName = memberForm.familyName || inheritedHousehold.familyName || "";
    const effectiveHouseholdRole = memberForm.householdRole || inheritedHousehold.householdRole || "";
    const newMember = hydrateMemberRecord({
      id: `mem${Date.now()}`,
      ...memberForm,
      familyId: effectiveFamilyId,
      familyName: effectiveFamilyName,
      householdRole: effectiveHouseholdRole,
      groups: selectedGroups,
      attendanceRate: "New",
      familyLinks: resolvedLinks,
    });

    try {
      const payload = normalizeMemberDraft(newMember, authUser);
      const savedMember = await churchApi.createMember(payload);
      const hydratedMember = hydrateMemberRecord(savedMember);
      setMediaUploadState({ loading: false, error: "", fieldName: "" });

      setMembers((current) => {
        const nextMembers = [hydratedMember, ...current];

        resolvedLinks.forEach((link) => {
          const reciprocalRelationship = getReciprocalRelationship(link.relationship, hydratedMember);
          const linkedMember = nextMembers.find((item) => item.memberId === link.memberId);

          if (linkedMember) {
            const alreadyExists = (linkedMember.familyLinks || []).some(
              (item) => item.memberId === hydratedMember.memberId && item.relationship === reciprocalRelationship
            );

            if (!alreadyExists) {
              linkedMember.familyLinks = [
                ...(linkedMember.familyLinks || []),
                {
                  memberId: hydratedMember.memberId,
                  memberName: `${hydratedMember.firstName} ${hydratedMember.lastName}`,
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

            const exists = (family.householdMembers || []).some((item) => item.memberId === hydratedMember.memberId);
            const nextHouseholdMembers = exists
              ? family.householdMembers
              : [
                  ...(family.householdMembers || []),
                  {
                    memberId: hydratedMember.memberId,
                    memberName: `${hydratedMember.firstName} ${hydratedMember.lastName}`,
                    relationshipToHead: hydratedMember.householdRole || "Other",
                    status: hydratedMember.membershipStatus,
                  },
                ];

            return {
              ...family,
              householdMembers: nextHouseholdMembers,
              familyContact: family.familyContact || hydratedMember.phone,
            };
          })
        );
      }

      closeModal();
      notifySuccess(`Member ${hydratedMember.memberId || ""} created successfully.`);
    } catch (error) {
      setMediaUploadState((current) => ({
        ...current,
        error: error.message || "Unable to save member.",
      }));
      notifyError(error.message || "Unable to save member.");
    }
  };

  const saveRecordModal = async () => {
    const { type, draft, record } = recordModal;

    if (!type || !draft) {
      return;
    }

    if (type === "member") {
      try {
        const memberValidationError = getRequiredMemberError(draft);
        if (memberValidationError) {
          throw new Error(memberValidationError);
        }

        const payload = normalizeMemberDraft(draft, authUser);
        const savedMember = record?._id
          ? await churchApi.updateMember(record._id, payload)
          : await churchApi.createMember(payload);

        setMembers((current) =>
          updateOrInsert(current, hydrateMemberRecord(savedMember), getRecordIdentity(record), {
            id: savedMember.id || savedMember._id || draft.id || `mem${Date.now()}`,
            _id: savedMember._id,
          })
        );
        closeRecordModal();
        notifySuccess(`Member ${savedMember.memberId || ""} saved successfully.`);
      } catch (error) {
        setMediaUploadState((current) => ({
          ...current,
          error: error.message || "Unable to save member.",
        }));
        notifyError(error.message || "Unable to save member.");
      }
      return;
    }

    if (type === "visitor") {
      try {
        setVisitorApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedVisitor = normalizeVisitorDraft(draft, users);
        const savedVisitor = record?.visitorId
          ? await churchApi.updateVisitor(record.visitorId, normalizedVisitor)
          : await churchApi.createVisitor(normalizedVisitor);

        syncVisitorState(savedVisitor);
        await refreshVisitorMetrics();
        closeRecordModal();
        notifySuccess(`Visitor ${savedVisitor.visitorId || ""} saved successfully.`);
      } catch (error) {
        setVisitorApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save visitor.",
        }));
        notifyError(error.message || "Unable to save visitor.");
      }
      return;
    }

    if (type === "prospect") {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedProspect = normalizeProspectDraft(draft, users);
        const savedProspect = record?.prospectId
          ? await churchApi.updateProspect(record.prospectId, normalizedProspect)
          : await churchApi.createProspect(normalizedProspect);

        syncProspectState(savedProspect);
        await refreshEvangelismDashboard();
        closeRecordModal();
        notifySuccess(`Prospect ${savedProspect.prospectId || ""} saved successfully.`);
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save prospect.",
        }));
        notifyError(error.message || "Unable to save prospect.");
      }
      return;
    }

    if (type === "bibleStudy") {
      try {
        setEvangelismApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedStudy = normalizeBibleStudyDraft(draft, users);
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
        notifySuccess("Bible study saved successfully.");
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save Bible study.",
        }));
        notifyError(error.message || "Unable to save Bible study.");
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
        notifySuccess("Campaign saved successfully.");
      } catch (error) {
        setEvangelismApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save campaign.",
        }));
        notifyError(error.message || "Unable to save campaign.");
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
        notifySuccess("Programme saved successfully.");
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save discipleship programme.",
        }));
        notifyError(error.message || "Unable to save discipleship programme.");
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
        notifySuccess("Enrollment saved successfully.");
      } catch (error) {
        setDiscipleshipApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save discipleship enrollment.",
        }));
        notifyError(error.message || "Unable to save discipleship enrollment.");
      }
      return;
    }

    if (type === "family") {
      try {
        setFamilyApiState((current) => ({ ...current, loading: true, error: "" }));
        const normalizedFamily = normalizeFamilyDraft(draft, members, groups, families, authUser);
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
        notifySuccess(`Household ${savedFamily.familyId || ""} saved successfully.`);
      } catch (error) {
        setFamilyApiState({ loading: false, error: error.message || "Unable to save family." });
        notifyError(error.message || "Unable to save family.");
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
        notifySuccess("Attendance event saved successfully.");
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to save attendance event.",
        }));
        notifyError(error.message || "Unable to save attendance event.");
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
      try {
        const payload = normalizeMinistryDraft(draft);
        const savedMinistry = record?._id
          ? await churchApi.updateMinistry(record._id, payload)
          : await churchApi.createMinistry(payload);
        const refreshedMembers = await churchApi.getMembers();

        setMinistries((current) =>
          updateOrInsert(current, hydrateMinistryRecord(savedMinistry), getRecordIdentity(record), {
            id: savedMinistry.id || savedMinistry._id,
            _id: savedMinistry._id,
          })
        );
        setMembers(Array.isArray(refreshedMembers) ? refreshedMembers.map(hydrateMemberRecord) : []);
        closeRecordModal();
        notifySuccess("Ministry saved successfully.");
      } catch (error) {
        console.error(error);
        notifyError(error.message || "Unable to save ministry.");
      }
      return;
    }

    if (type === "role") {
      setRoles((current) =>
        updateOrInsert(current, draft, record?.id, {
          id: draft.id || `r${Date.now()}`,
        })
      );
    }

    if (type === "group") {
      try {
        const payload = normalizeGroupDraft(draft);
        const savedGroup = record?._id
          ? await churchApi.updateGroup(record._id, payload)
          : await churchApi.createGroup(payload);

        setGroups((current) =>
          updateOrInsert(current, hydrateGroupRecord(savedGroup), getRecordIdentity(record), {
            id: savedGroup.id || savedGroup._id || draft.id || `g${Date.now()}`,
            _id: savedGroup._id,
          })
        );
        closeRecordModal();
        notifySuccess("Group saved successfully.");
      } catch (error) {
        console.error(error);
        notifyError(error.message || "Unable to save group.");
      }
      return;
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
    mediaUploadState,
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
    deleteRecordModal,
    setRecordModalDraft,
    setRecordModalMode,
    toasts,
    dismissToast,
    notifySuccess,
    notifyError,
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
    async uploadMemberMedia(file, fieldName) {
      try {
        setMediaUploadState({
          loading: true,
          error: "",
          fieldName,
        });
        const uploadedFile = await churchApi.uploadMemberMedia(file, fieldName, "members");
        const normalizedFile = normalizeMediaField(uploadedFile);
        setMediaUploadState({
          loading: false,
          error: "",
          fieldName: "",
        });
        notifySuccess("Media uploaded successfully.");
        return normalizedFile;
      } catch (error) {
        setMediaUploadState({
          loading: false,
          error: error.message || "Unable to upload media.",
          fieldName,
        });
        notifyError(error.message || "Unable to upload media.");
        throw error;
      }
    },
    async regenerateMemberQr(memberId) {
      try {
        setMediaUploadState((current) => ({
          ...current,
          loading: true,
          error: "",
          fieldName: "memberQr",
        }));
        const updatedMember = await churchApi.regenerateMemberQr(memberId);
        const hydratedMember = hydrateMemberRecord(updatedMember);
        setMembers((current) =>
          updateOrInsert(current, hydratedMember, hydratedMember._id || hydratedMember.memberId, {
            _id: hydratedMember._id,
            id: hydratedMember.id || hydratedMember._id,
          })
        );
        setRecordModal((current) => {
          if (current.type !== "member") {
            return current;
          }

          const currentIdentity =
            current.record?._id ||
            current.record?.memberId ||
            current.draft?._id ||
            current.draft?.memberId;
          const nextIdentity = hydratedMember._id || hydratedMember.memberId;

          if (currentIdentity !== nextIdentity) {
            return current;
          }

          return {
            ...current,
            record: hydratedMember,
            draft: hydratedMember,
          };
        });
        setMediaUploadState({ loading: false, error: "", fieldName: "" });
        notifySuccess("Member QR reissued successfully.");
        return hydratedMember;
      } catch (error) {
        setMediaUploadState({
          loading: false,
          error: error.message || "Unable to regenerate member QR.",
          fieldName: "memberQr",
        });
        notifyError(error.message || "Unable to regenerate member QR.");
        throw error;
      }
    },
    async migrateMemberQrs(limit = 0) {
      return churchApi.migrateMemberQrs(limit);
    },
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
        await Promise.all([
          refreshPendingActions(),
          refreshEvangelismDashboard(),
          refreshEvangelismCollections(),
        ]);
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
    async toggleAttendanceCheckIn(eventId, isCheckInOpen) {
      try {
        setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
        const updatedEvent = await churchApi.toggleAttendanceCheckIn(eventId, isCheckInOpen);
        syncAttendanceEventState(updatedEvent);
        await refreshAttendanceCollections();
        return updatedEvent;
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to update check-in status.",
        }));
        throw error;
      }
    },
    async fetchAttendanceCheckInDashboard(eventId) {
      return churchApi.getAttendanceCheckInDashboard(eventId);
    },
    async checkInMemberByQr(eventId, payload) {
      try {
        setAttendanceApiState((current) => ({ ...current, loading: true, error: "" }));
        const result = await churchApi.checkInMemberByQr(eventId, payload);
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
        return result;
      } catch (error) {
        setAttendanceApiState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to check in member with QR.",
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

function buildNewRecord(type, { families, members, ministries, roles, users, authUser, discipleshipProgrammes }) {
  if (type === "visitor") {
    return {
      visitorId: `VS${String(Date.now()).slice(-4)}`,
      firstName: "",
      surname: "",
      gender: "",
      phone: "",
      email: "",
      residentialArea: "",
      firstVisitDate: new Date().toISOString().slice(0, 10),
      howHeard: "",
      assignedFollowUpUserId: "",
      assignedFollowUpMemberId: "",
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
      primaryContactMemberId: "",
      primaryContactNumber: "",
      headOfHousehold: null,
      spouse: null,
      children: [],
      dependants: [],
      residentialArea: "",
      physicalAddress: "",
      fellowshipZone: "",
      familyContact: "",
      visitationHistory: "",
      dateLastVisited: "",
      sourceRecordRef: "",
      dataEntryClerk: authUser?.displayName || authUser?.username || "",
      dateCaptured: new Date().toISOString().slice(0, 10),
      householdMembers: [],
    };
  }

  if (type === "prospect") {
    return {
      prospectId: `EP${String(Date.now()).slice(-4)}`,
      firstName: "",
      surname: "",
      gender: "",
      phone: "",
      email: "",
      residentialArea: "",
      source: "",
      assignedEvangelistId: "",
      assignedEvangelistMemberId: "",
      currentStage: "",
      campaignId: "",
      dateFirstContact: new Date().toISOString().slice(0, 10),
      nextFollowUpDate: "",
      baptismDate: "",
      convertedMemberId: "",
      notesSummary: "",
      dataEntryClerk: authUser?.displayName || authUser?.username || "",
      dateCaptured: new Date().toISOString().slice(0, 10),
      stageHistory: [],
      sourceVisitorId: "",
    };
  }

  if (type === "bibleStudy") {
    return {
      bibleStudyId: `B${String(Date.now()).slice(-7)}`,
      prospect: null,
      member: null,
      teacherId: null,
      teacherMemberId: "",
      studyType: "",
      startDate: new Date().toISOString().slice(0, 10),
      lastSessionDate: "",
      status: "",
      nextSessionDate: "",
      outcome: "",
      dataEntryClerk: authUser?.displayName || authUser?.username || "",
      dateCaptured: new Date().toISOString().slice(0, 10),
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
      isCheckInOpen: true,
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
      leadership: {
        elderInCharge: null,
        deaconInCharge: null,
        chairman: null,
        assistantChairman: null,
        organizer: null,
        assistantOrganizer: null,
        secretary: null,
        assistantSecretary: null,
        treasurer: null,
        assistantTreasurer: null,
      },
      members: [],
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
      otherName: "",
      preferredName: "",
      lastName: "",
      gender: "",
      maritalStatus: "",
      phone: "",
      email: "",
      residentialArea: "",
      dateOfBirth: "",
      occupation: "",
      employerOrBusiness: "",
      educationOrSkills: "",
      membershipStatus: "Active",
      membershipDate: "",
      dateJoined: "",
      baptismStatus: "Not Baptized",
      baptismDate: "",
      placeBaptized: "",
      baptizedBy: "",
      previousCongregation: "",
      transferDetails: "",
      city: "",
      address: "",
      gpsLatitude: "",
      gpsLongitude: "",
      notes: "",
      sourceRecordRef: "",
      dataEntryClerk: "",
      dateCaptured: "",
      familyLinks: [],
      groups: [],
      personalPhoto: "",
      idFrontPhoto: "",
      idBackPhoto: "",
      photoFileName: "",
      ministryId: ministries[0]?._id || ministries[0]?.id || "",
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

function hydrateMemberRecord(member) {
  if (!member) {
    return member;
  }

  return {
    ...member,
    preferredName: member.preferredName || "",
    occupation: member.occupation || "",
    employerOrBusiness: member.employerOrBusiness || "",
    educationOrSkills: member.educationOrSkills || "",
    residentialArea: member.residentialArea || "",
    dateJoined: formatDateInputValue(member.dateJoined || member.membershipDate),
    placeBaptized: member.placeBaptized || "",
    baptizedBy: member.baptizedBy || "",
    previousCongregation: member.previousCongregation || "",
    transferDetails: member.transferDetails || "",
    photoFileName: member.photoFileName || member.personalPhoto?.label || "",
    sourceRecordRef: member.sourceRecordRef || "",
    dataEntryClerk: member.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(member.dateCaptured || member.createdAt),
    qrToken: member.qrToken || "",
    qrCodeImageUrl: member.qrCodeImageUrl || "",
    qrGeneratedAt: formatDateInputValue(member.qrGeneratedAt),
    qrRegeneratedAt: formatDateInputValue(member.qrRegeneratedAt),
    qrRegeneratedBy: member.qrRegeneratedBy || null,
    qrActive: member.qrActive !== false,
    gpsLatitude: member.gpsLatitude || "",
    gpsLongitude: member.gpsLongitude || "",
    ministryId: member.ministryId || member.ministry?._id || member.ministry || "",
    personalPhoto: normalizeMediaField(member.personalPhoto),
    idFrontPhoto: normalizeMediaField(member.idFrontPhoto),
    idBackPhoto: normalizeMediaField(member.idBackPhoto),
  };
}

function normalizeMemberDraft(draft, authUser = null) {
  return {
    memberId: draft.memberId || "",
    firstName: draft.firstName || "",
    otherName: draft.otherName || "",
    lastName: draft.lastName || "",
    memberType: draft.memberType || "Adult",
    gender: draft.gender || "",
    maritalStatus: draft.maritalStatus || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    dateOfBirth: draft.dateOfBirth || null,
    preferredName: draft.preferredName || "",
    occupation: draft.occupation || "",
    employerOrBusiness: draft.employerOrBusiness || "",
    educationOrSkills: draft.educationOrSkills || "",
    membershipStatus: draft.membershipStatus || "Active",
    membershipDate: draft.membershipDate || draft.dateJoined || null,
    dateJoined: draft.dateJoined || draft.membershipDate || null,
    baptismStatus: draft.baptismStatus || "Not Baptized",
    baptismDate: draft.baptismDate || null,
    placeBaptized: draft.placeBaptized || "",
    baptizedBy: draft.baptizedBy || "",
    previousCongregation: draft.previousCongregation || "",
    transferDetails: draft.transferDetails || "",
    ministryId: draft.ministryId?._id || draft.ministryId || null,
    address: draft.address || "",
    city: draft.city || "",
    country: draft.country || "",
    gpsLatitude: draft.gpsLatitude || "",
    gpsLongitude: draft.gpsLongitude || "",
    notes: draft.notes || "",
    familyId: draft.familyId || "",
    familyName: draft.familyName || "",
    householdRole: draft.householdRole || "",
    photoFileName: draft.photoFileName || normalizeMediaField(draft.personalPhoto)?.label || "",
    sourceRecordRef: draft.sourceRecordRef || "",
    dataEntryClerk: draft.dataEntryClerk || authUser?.displayName || authUser?.username || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
    qrToken: draft.qrToken || "",
    qrCodeImageUrl: draft.qrCodeImageUrl || "",
    qrGeneratedAt: draft.qrGeneratedAt || null,
    qrRegeneratedAt: draft.qrRegeneratedAt || null,
    qrRegeneratedBy: draft.qrRegeneratedBy || null,
    qrActive: draft.qrActive !== false,
    groups: Array.isArray(draft.groups) ? draft.groups : [],
    familyLinks: Array.isArray(draft.familyLinks) ? draft.familyLinks : [],
    personalPhoto: normalizeMediaField(draft.personalPhoto),
    idFrontPhoto: normalizeMediaField(draft.idFrontPhoto),
    idBackPhoto: normalizeMediaField(draft.idBackPhoto),
  };
}

function normalizeMediaField(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.startsWith("http")
      ? {
          url: value,
          label: extractMediaLabel(value),
        }
      : "";
  }

  if (typeof value === "object" && value.url) {
    return {
      url: value.url,
      label: value.label || extractMediaLabel(value.url),
      contentType: value.contentType || "",
      objectName: value.objectName || "",
    };
  }

  return "";
}

function extractMediaLabel(value = "") {
  const cleanValue = String(value).split("?")[0];
  const parts = cleanValue.split("/");
  return parts[parts.length - 1] || "upload";
}

function formatDateInputValue(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

function findUserIdByMemberId(users = [], memberId = "") {
  if (!memberId) {
    return "";
  }

  return users.find((user) => user.memberId === memberId)?._id || "";
}

function getRequiredMemberError(member = {}) {
  const requiredPairs = [
    ["firstName", "First name"],
    ["lastName", "Surname"],
    ["gender", "Gender"],
    ["phone", "Primary mobile"],
    ["residentialArea", "Residential area"],
    ["membershipStatus", "Membership status"],
  ];

  const missing = requiredPairs.find(([fieldName]) => !String(member[fieldName] || "").trim());
  return missing ? `${missing[1]} is required.` : "";
}

function hydrateVisitorRecord(visitor) {
  if (!visitor) {
    return visitor;
  }

  return {
    ...visitor,
    gender: visitor.gender || "",
    howHeard: visitor.howHeard || "",
    status: visitor.status || "",
    assignedFollowUpUserId: visitor.assignedFollowUpUserId || "",
    assignedFollowUpMemberId: visitor.assignedFollowUpMemberId || "",
  };
}

function normalizeVisitorDraft(draft, users = []) {
  const assignedMemberId =
    draft.assignedFollowUpMemberId?.memberId ||
    draft.assignedFollowUpMemberId ||
    draft.assignedFollowUpUserId?.memberId ||
    "";
  const assignedUserId =
    draft.assignedFollowUpUserId?._id ||
    draft.assignedFollowUpUserId ||
    findUserIdByMemberId(users, assignedMemberId) ||
    null;

  return {
    visitorId: draft.visitorId,
    firstName: draft.firstName || "",
    surname: draft.surname || "",
    gender: draft.gender || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    firstVisitDate: draft.firstVisitDate || new Date().toISOString().slice(0, 10),
    howHeard: draft.howHeard?._id || draft.howHeard || null,
    assignedFollowUpUserId: assignedUserId,
    assignedFollowUpMemberId: assignedMemberId || "",
  };
}

function hydrateProspectRecord(prospect) {
  if (!prospect) {
    return prospect;
  }

  return {
    ...prospect,
    gender: prospect.gender || "",
    source: prospect.source || "",
    assignedEvangelistId: prospect.assignedEvangelistId || "",
    assignedEvangelistMemberId: prospect.assignedEvangelistMemberId || "",
    currentStage: prospect.currentStage || "",
    campaignId: prospect.campaignId || "",
    sourceVisitorId: prospect.sourceVisitorId || "",
    dateFirstContact: formatDateInputValue(prospect.dateFirstContact),
    nextFollowUpDate: formatDateInputValue(prospect.nextFollowUpDate),
    baptismDate: formatDateInputValue(prospect.baptismDate),
    convertedMemberId: prospect.convertedMemberId || "",
    notesSummary: prospect.notesSummary || "",
    dataEntryClerk: prospect.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(prospect.dateCaptured || prospect.createdAt),
    stageHistory: Array.isArray(prospect.stageHistory) ? prospect.stageHistory : [],
  };
}

function normalizeProspectDraft(draft, users = []) {
  const assignedMemberId =
    draft.assignedEvangelistMemberId?.memberId ||
    draft.assignedEvangelistMemberId ||
    draft.assignedEvangelistId?.memberId ||
    "";
  const assignedUserId =
    draft.assignedEvangelistId?._id ||
    draft.assignedEvangelistId ||
    findUserIdByMemberId(users, assignedMemberId) ||
    null;

  return {
    prospectId: draft.prospectId,
    firstName: draft.firstName || "",
    surname: draft.surname || "",
    gender: draft.gender || "",
    phone: draft.phone || "",
    email: draft.email || "",
    residentialArea: draft.residentialArea || "",
    source: draft.source?._id || draft.source || null,
    assignedEvangelistId: assignedUserId,
    assignedEvangelistMemberId: assignedMemberId || "",
    currentStage: draft.currentStage?._id || draft.currentStage || null,
    campaignId: draft.campaignId?._id || draft.campaignId || null,
    sourceVisitorId: draft.sourceVisitorId || "",
    dateFirstContact: draft.dateFirstContact || null,
    nextFollowUpDate: draft.nextFollowUpDate || null,
    baptismDate: draft.baptismDate || null,
    convertedMemberId: draft.convertedMemberId || "",
    notesSummary: draft.notesSummary || "",
    dataEntryClerk: draft.dataEntryClerk || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
  };
}

function hydrateBibleStudyRecord(study) {
  if (!study) {
    return study;
  }

  return {
    ...study,
    bibleStudyId: study.bibleStudyId || "",
    prospect: study.prospect || null,
    member: study.member || null,
    teacherId: study.teacherId || null,
    teacherMemberId: study.teacherMemberId || "",
    studyType: study.studyType || "",
    startDate: formatDateInputValue(study.startDate),
    lastSessionDate: formatDateInputValue(study.lastSessionDate),
    status: study.status || "",
    nextSessionDate: formatDateInputValue(study.nextSessionDate),
    outcome: study.outcome || "",
    dataEntryClerk: study.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(study.dateCaptured || study.createdAt),
    lessonsCompleted: Array.isArray(study.lessonsCompleted) ? study.lessonsCompleted : [],
  };
}

function normalizeBibleStudyDraft(draft, users = []) {
  const teacherMemberId =
    draft.teacherMemberId?.memberId ||
    draft.teacherMemberId ||
    draft.teacherId?.memberId ||
    "";
  const teacherUserId =
    draft.teacherId?._id ||
    draft.teacherId ||
    findUserIdByMemberId(users, teacherMemberId) ||
    null;

  return {
    bibleStudyId: draft.bibleStudyId || "",
    prospect: draft.prospect?._id || draft.prospect || null,
    member: draft.member?._id || draft.member || null,
    teacherId: teacherUserId,
    teacherMemberId: teacherMemberId || "",
    studyType: draft.studyType || "",
    startDate: draft.startDate || new Date().toISOString().slice(0, 10),
    lastSessionDate: draft.lastSessionDate || null,
    status: draft.status?._id || draft.status || null,
    nextSessionDate: draft.nextSessionDate || null,
    outcome: draft.outcome || "",
    dataEntryClerk: draft.dataEntryClerk || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
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

function hydrateMinistryRecord(ministry) {
  if (!ministry) {
    return ministry;
  }

  return {
    ...ministry,
    id: ministry.id || ministry._id,
    leadership: {
      elderInCharge: ministry.leadership?.elderInCharge || null,
      deaconInCharge: ministry.leadership?.deaconInCharge || null,
      chairman: ministry.leadership?.chairman || null,
      assistantChairman: ministry.leadership?.assistantChairman || null,
      organizer: ministry.leadership?.organizer || null,
      assistantOrganizer: ministry.leadership?.assistantOrganizer || null,
      secretary: ministry.leadership?.secretary || null,
      assistantSecretary: ministry.leadership?.assistantSecretary || null,
      treasurer: ministry.leadership?.treasurer || null,
      assistantTreasurer: ministry.leadership?.assistantTreasurer || null,
    },
    members: Array.isArray(ministry.members) ? ministry.members : [],
  };
}

function normalizeMinistryDraft(draft) {
  return {
    name: draft.name || "",
    leadership: normalizeMinistryLeadership(draft.leadership),
    members: normalizeMinistrySelectionArray(draft.members),
    color: draft.color || "#4f46e5",
    description: draft.description || "",
  };
}

function normalizeMinistryLeadership(leadership = {}) {
  return {
    elderInCharge: normalizeMinistrySelection(leadership.elderInCharge),
    deaconInCharge: normalizeMinistrySelection(leadership.deaconInCharge),
    chairman: normalizeMinistrySelection(leadership.chairman),
    assistantChairman: normalizeMinistrySelection(leadership.assistantChairman),
    organizer: normalizeMinistrySelection(leadership.organizer),
    assistantOrganizer: normalizeMinistrySelection(leadership.assistantOrganizer),
    secretary: normalizeMinistrySelection(leadership.secretary),
    assistantSecretary: normalizeMinistrySelection(leadership.assistantSecretary),
    treasurer: normalizeMinistrySelection(leadership.treasurer),
    assistantTreasurer: normalizeMinistrySelection(leadership.assistantTreasurer),
  };
}

function normalizeMinistrySelectionArray(items = []) {
  return items
    .map((item) => normalizeMinistrySelection(item))
    .filter(Boolean)
    .reduce((accumulator, item) => {
      if (accumulator.some((entry) => entry.memberId === item.memberId)) {
        return accumulator;
      }

      return [...accumulator, item];
    }, []);
}

function normalizeMinistrySelection(item) {
  if (!item?.memberId) {
    return null;
  }

  return {
    memberId: item.memberId,
    memberName: item.memberName || item.memberId,
  };
}

function hydrateGroupRecord(group) {
  if (!group) {
    return group;
  }

  return {
    ...group,
    id: group.id || group._id,
    parentId: group.parentId || group.parent?._id || group.parent || "",
    parentName: group.parentName || group.parent?.name || "",
  };
}

function normalizeGroupDraft(draft) {
  return {
    name: draft.name || "",
    parentId: draft.parentId || null,
    description: draft.description || "",
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
    isCheckInOpen: event.isCheckInOpen !== false,
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
    isCheckInOpen: draft.isCheckInOpen !== false,
  };
}

function hydrateFamilyRecord(family) {
  if (!family) {
    return family;
  }

  return {
    ...family,
    primaryContactMemberId: family.primaryContactMemberId || "",
    primaryContactNumber: family.primaryContactNumber || "",
    dateLastVisited: formatDateInputValue(family.dateLastVisited),
    sourceRecordRef: family.sourceRecordRef || "",
    dataEntryClerk: family.dataEntryClerk || "",
    dateCaptured: formatDateInputValue(family.dateCaptured || family.createdAt),
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

function normalizeFamilyDraft(draft, members, groups, families, authUser = null) {
  const normalized = {
    ...draft,
    familyId: draft.familyId || generateNextFamilyId(families),
    primaryContactMemberId: draft.primaryContactMemberId || "",
    primaryContactNumber: draft.primaryContactNumber || "",
    headOfHousehold: ensureMemberSelection(draft.headOfHousehold),
    spouse: ensureMemberSelection(draft.spouse),
    children: ensureMemberSelectionArray(draft.children),
    dependants: ensureMemberSelectionArray(draft.dependants),
    dateLastVisited: draft.dateLastVisited || null,
    sourceRecordRef: draft.sourceRecordRef || "",
    dataEntryClerk: draft.dataEntryClerk || authUser?.displayName || authUser?.username || "",
    dateCaptured: draft.dateCaptured || new Date().toISOString().slice(0, 10),
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
  normalized.primaryContactMemberId =
    normalized.primaryContactMemberId ||
    normalized.headOfHousehold?.memberId ||
    normalized.spouse?.memberId ||
    "";
  normalized.primaryContactNumber =
    normalized.primaryContactNumber ||
    members.find((member) => member.memberId === normalized.primaryContactMemberId)?.phone ||
    normalized.familyContact ||
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
    ...(family.dependants || []).map((item) => ({ item, role: "Dependent" })),
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
    return "Spouse";
  }

  if (baseRole === "Child") {
    return linkedMember?.gender === "Female" ? "Daughter" : "Son";
  }

  return baseRole;
}
