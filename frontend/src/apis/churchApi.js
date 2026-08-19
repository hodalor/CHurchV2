const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5100/api";
const SESSION_STORAGE_KEY = "churchflow.session";

function getStoredSession() {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function storeSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function request(path, options = {}, retryOnUnauthorized = true) {
  const session = getStoredSession();
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormDataBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retryOnUnauthorized && session?.refreshToken) {
    try {
      const refreshed = await refreshSession(session.refreshToken);
      storeSession(refreshed);
      return request(path, options, false);
    } catch (error) {
      clearStoredSession();
      throw error;
    }
  }

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Request failed.");
  }

  return safeJson(response);
}

async function safeJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function refreshSession(refreshToken) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Unable to refresh session.");
  }

  return safeJson(response);
}

export const churchApi = {
  getStoredSession,
  clearStoredSession,
  storeSession,

  async login(username, pin) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, pin }),
    });

    const payload = await safeJson(response);
    if (!response.ok) {
      throw new Error(payload.message || "Login failed.");
    }

    storeSession(payload);
    return payload;
  },

  async logout() {
    const session = getStoredSession();
    if (session?.refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
    }

    clearStoredSession();
  },

  async getCurrentUser() {
    return request("/auth/me");
  },

  async getHealth() {
    return request("/health");
  },

  async getFamilies() {
    return request("/families");
  },

  async getGroups() {
    return request("/groups");
  },

  async createGroup(payload) {
    return request("/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateGroup(groupId, payload) {
    return request(`/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getMembers() {
    return request("/members");
  },

  async getNextMemberId() {
    return request("/members/next-id");
  },

  async createMember(payload) {
    return request("/members", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateMember(memberId, payload) {
    return request(`/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async uploadMemberMedia(file, fieldName = "file", folder = "members") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fieldName", fieldName);
    formData.append("folder", folder);

    return request("/media/upload", {
      method: "POST",
      body: formData,
    });
  },

  async getMinistries() {
    return request("/ministries");
  },

  async createMinistry(payload) {
    return request("/ministries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateMinistry(ministryId, payload) {
    return request(`/ministries/${ministryId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getNextFamilyId() {
    return request("/families/next-id");
  },

  async createFamily(payload) {
    return request("/families", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateFamily(id, payload) {
    return request(`/families/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getLookups() {
    return request("/lookups");
  },

  async getUsers() {
    return request("/users");
  },

  async getPendingActions(status) {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/pending-actions${suffix}`);
  },

  async getAttendanceEvents() {
    return request("/attendance/events");
  },

  async createAttendanceEvent(payload) {
    return request("/attendance/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateAttendanceEvent(eventId, payload) {
    return request(`/attendance/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getAttendanceEventRecords(eventId) {
    return request(`/attendance/events/${eventId}/records`);
  },

  async captureAttendanceRecord(eventId, payload) {
    return request(`/attendance/events/${eventId}/records`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async captureBulkAttendance(eventId, payload) {
    return request(`/attendance/events/${eventId}/records/bulk`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateAttendanceRecord(recordId, payload) {
    return request(`/attendance/records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getAttendanceReport(days = 90, eventTypeId = "", ministryId = "") {
    const params = new URLSearchParams({
      days: String(days),
      ...(eventTypeId ? { eventTypeId } : {}),
      ...(ministryId ? { ministryId } : {}),
    });
    return request(`/attendance/reports/summary?${params.toString()}`);
  },

  async getAttendanceAbsentees(windowDays = 28, eventTypeKey = "sunday_worship") {
    const params = new URLSearchParams({
      windowDays: String(windowDays),
      eventTypeKey,
    });
    return request(`/attendance/reports/absentees?${params.toString()}`);
  },

  async getDiscipleshipProgrammes() {
    return request("/discipleship/programmes");
  },

  async createDiscipleshipProgramme(payload) {
    return request("/discipleship/programmes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateDiscipleshipProgramme(programmeId, payload) {
    return request(`/discipleship/programmes/${programmeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getDiscipleshipEnrollments() {
    return request("/discipleship/enrollments");
  },

  async createDiscipleshipEnrollment(payload) {
    return request("/discipleship/enrollments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateDiscipleshipEnrollment(enrollmentId, payload) {
    return request(`/discipleship/enrollments/${enrollmentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async assignDiscipleshipMentor(enrollmentId, mentorId) {
    return request(`/discipleship/enrollments/${enrollmentId}/mentor`, {
      method: "POST",
      body: JSON.stringify({ mentorId }),
    });
  },

  async addDiscipleshipSession(enrollmentId, payload) {
    return request(`/discipleship/enrollments/${enrollmentId}/sessions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async completeDiscipleshipEnrollment(enrollmentId, payload) {
    return request(`/discipleship/enrollments/${enrollmentId}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getOverdueDiscipleshipEnrollments(windowDays = 14) {
    return request(`/discipleship/overdue?windowDays=${windowDays}`);
  },

  async getDiscipleshipDashboard(mentorWindowDays = 7, overdueWindowDays = 14) {
    return request(
      `/discipleship/dashboard?mentorWindowDays=${mentorWindowDays}&overdueWindowDays=${overdueWindowDays}`
    );
  },

  async getProspects() {
    return request("/evangelism/prospects");
  },

  async getNextProspectId() {
    return request("/evangelism/prospects/next-id");
  },

  async createProspect(payload) {
    return request("/evangelism/prospects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateProspect(prospectId, payload) {
    return request(`/evangelism/prospects/${prospectId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async assignProspect(prospectId, assignedUserId) {
    return request(`/evangelism/prospects/${prospectId}/assign`, {
      method: "POST",
      body: JSON.stringify({ assignedUserId }),
    });
  },

  async moveProspectStage(prospectId, stageId) {
    return request(`/evangelism/prospects/${prospectId}/stage`, {
      method: "POST",
      body: JSON.stringify({ stageId }),
    });
  },

  async addProspectContact(prospectId, payload) {
    return request(`/evangelism/prospects/${prospectId}/contacts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async convertProspectToMember(prospectId, payload) {
    return request(`/evangelism/prospects/${prospectId}/convert-to-member`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getEvangelismContacts() {
    return request("/evangelism/contacts");
  },

  async getBibleStudies() {
    return request("/evangelism/bible-studies");
  },

  async createBibleStudy(payload) {
    return request("/evangelism/bible-studies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateBibleStudy(studyId, payload) {
    return request(`/evangelism/bible-studies/${studyId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async addBibleStudyLesson(studyId, payload) {
    return request(`/evangelism/bible-studies/${studyId}/lessons`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCampaigns() {
    return request("/evangelism/campaigns");
  },

  async createCampaign(payload) {
    return request("/evangelism/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCampaign(campaignId, payload) {
    return request(`/evangelism/campaigns/${campaignId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getEvangelismDashboard() {
    return request("/evangelism/dashboard");
  },

  async getVisitors() {
    return request("/visitors");
  },

  async getNextVisitorId() {
    return request("/visitors/next-id");
  },

  async createVisitor(payload) {
    return request("/visitors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateVisitor(visitorId, payload) {
    return request(`/visitors/${visitorId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async addVisitorChurchVisit(visitorId, payload) {
    return request(`/visitors/${visitorId}/church-visits`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async assignVisitorFollowUp(visitorId, assignedUserId) {
    return request(`/visitors/${visitorId}/assign`, {
      method: "POST",
      body: JSON.stringify({ assignedUserId }),
    });
  },

  async addVisitorHomeVisit(visitorId, payload) {
    return request(`/visitors/${visitorId}/home-visits`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async convertVisitorToProspect(visitorId) {
    return request(`/visitors/${visitorId}/convert-to-prospect`, {
      method: "POST",
    });
  },

  async convertVisitorToMember(visitorId, payload) {
    return request(`/visitors/${visitorId}/convert-to-member`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getVisitorRetentionMetrics(windowDays = 30) {
    return request(`/visitors/retention-metrics?windowDays=${windowDays}`);
  },
};
