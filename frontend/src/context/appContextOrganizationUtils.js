export function hydrateMinistryRecord(ministry) {
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

export function normalizeMinistryDraft(draft) {
  return {
    name: draft.name || "",
    leadership: normalizeMinistryLeadership(draft.leadership),
    members: normalizeMinistrySelectionArray(draft.members),
    color: draft.color || "#4f46e5",
    description: draft.description || "",
  };
}

export function normalizeMinistryLeadership(leadership = {}) {
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

export function normalizeMinistrySelectionArray(items = []) {
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

export function normalizeMinistrySelection(item) {
  if (!item?.memberId) {
    return null;
  }

  return {
    memberId: item.memberId,
    memberName: item.memberName || item.memberId,
  };
}

export function hydrateGroupRecord(group) {
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

export function normalizeGroupDraft(draft) {
  return {
    name: draft.name || "",
    parentId: draft.parentId || null,
    description: draft.description || "",
  };
}

export function hydrateAttendanceEventRecord(event) {
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

export function normalizeAttendanceEventDraft(draft) {
  return {
    eventTypeId: draft.eventTypeId?._id || draft.eventTypeId || null,
    date: draft.date || new Date().toISOString().slice(0, 10),
    title: draft.title || "",
    ministryId: draft.ministryId?._id || draft.ministryId || null,
    location: draft.location || "",
    isCheckInOpen: draft.isCheckInOpen !== false,
  };
}
