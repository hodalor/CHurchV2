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
import {
  buildGroupSelections,
  enrichFamilyLinks,
  generateNextFamilyId,
  generateNextMemberId,
  getReciprocalRelationship,
} from "../utils/memberUtils";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [branding, setBranding] = useState(initialBranding);
  const [groups, setGroups] = useState(initialGroups);
  const [ministries, setMinistries] = useState(initialMinistries);
  const [members, setMembers] = useState(initialMembers);
  const [roles, setRoles] = useState(initialRoles);
  const [users, setUsers] = useState(initialUsers);
  const [visitors, setVisitors] = useState(initialVisitors);
  const [families, setFamilies] = useState(initialFamilies);
  const [financeRecords, setFinanceRecords] = useState(initialFinanceRecords);
  const [attendanceSessions, setAttendanceSessions] = useState(initialAttendanceSessions);
  const [familyApiState, setFamilyApiState] = useState({ loading: false, error: "" });
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

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const openRecordModal = async (type, record, mode = "view") => {
    const sourceRecord = record
      ? type === "family"
        ? hydrateFamilyRecord(record)
        : record
      : buildNewRecord(type, {
      families,
      members,
      ministries,
      roles,
    });

    if (!record && type === "family") {
      try {
        const payload = await churchApi.getNextFamilyId();
        sourceRecord.familyId = payload.familyId || sourceRecord.familyId;
      } catch (error) {
        // Fall back to local generated ID if the next-id request fails.
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
      setVisitors((current) =>
        updateOrInsert(current, draft, record?.id, {
          id: draft.id || `v${Date.now()}`,
        })
      );
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

    if (type === "attendance") {
      setAttendanceSessions((current) => {
        const expected = Number(draft.expected || 0);
        const present = Number(draft.present || 0);
        const rate = expected ? `${Math.round((present / expected) * 100)}%` : "0%";

        return updateOrInsert(
          current,
          { ...draft, expected, present, rate },
          record?.id,
          { id: draft.id || `a${Date.now()}` }
        );
      });
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
    branding,
    setBranding,
    groups,
    groupsByParent,
    ministries,
    members,
    filteredMembers,
    visitors,
    setVisitors,
    roles,
    users,
    families,
    financeRecords,
    attendanceSessions,
    familyApiState,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function updateOrInsert(items, draft, originalId, fallbacks = {}) {
  const nextItem = { ...fallbacks, ...draft };
  const existingIndex = items.findIndex((item) => item.id === originalId);

  if (existingIndex === -1) {
    return [nextItem, ...items];
  }

  return items.map((item) => (item.id === originalId ? nextItem : item));
}

function buildNewRecord(type, { families, members, ministries, roles }) {
  if (type === "visitor") {
    return {
      fullName: "",
      phone: "",
      stage: "First Timer",
      assignedTo: "Follow-up Team",
      nextStep: "",
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

  if (type === "attendance") {
    return {
      service: "",
      zone: "",
      date: new Date().toISOString().slice(0, 10),
      expected: members.length,
      present: "",
      rate: "0%",
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
