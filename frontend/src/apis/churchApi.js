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
  if (!text) {
    return {};
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error("The server returned an HTML page instead of API JSON. Check that the backend is running on the expected API port.");
  }

  return JSON.parse(text);
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

  async deleteGroup(groupId) {
    return request(`/groups/${groupId}`, {
      method: "DELETE",
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

  async getMemberQr(memberId) {
    return request(`/members/${memberId}/qr`);
  },

  async regenerateMemberQr(memberId) {
    return request(`/members/${memberId}/qr/regenerate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async migrateMemberQrs(limit = 0) {
    return request("/members/qr/migrate", {
      method: "POST",
      body: JSON.stringify({ limit }),
    });
  },

  async updateMember(memberId, payload) {
    return request(`/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteMember(memberId) {
    return request(`/members/${memberId}`, {
      method: "DELETE",
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

  async deleteMinistry(ministryId) {
    return request(`/ministries/${ministryId}`, {
      method: "DELETE",
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

  async deleteFamily(id) {
    return request(`/families/${id}`, {
      method: "DELETE",
    });
  },

  async getLookups() {
    return request("/lookups");
  },

  async getUsers() {
    return request("/users");
  },

  async getRoles() {
    return request("/users/roles");
  },

  async createUser(payload) {
    return request("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateUser(userId, payload) {
    return request(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getBranding() {
    return request("/setup/branding");
  },

  async updateBranding(payload) {
    return request("/setup/branding", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getAppConfig() {
    return request("/setup/app-config");
  },

  async updateAppConfig(payload) {
    return request("/setup/app-config", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
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

  async deleteAttendanceEvent(eventId) {
    return request(`/attendance/events/${eventId}`, {
      method: "DELETE",
    });
  },

  async getAttendanceEventRecords(eventId) {
    return request(`/attendance/events/${eventId}/records`);
  },

  async getAttendanceCheckInDashboard(eventId) {
    return request(`/attendance/events/${eventId}/check-in/dashboard`);
  },

  async toggleAttendanceCheckIn(eventId, isCheckInOpen) {
    return request(`/attendance/events/${eventId}/check-in/status`, {
      method: "POST",
      body: JSON.stringify({ isCheckInOpen }),
    });
  },

  async checkInMemberByQr(eventId, payload) {
    return request(`/attendance/events/${eventId}/check-in/qr`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async checkInVisitorForEvent(eventId, payload) {
    return request(`/attendance/events/${eventId}/check-in/visitor`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

  async deleteDiscipleshipProgramme(programmeId) {
    return request(`/discipleship/programmes/${programmeId}`, {
      method: "DELETE",
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

  async deleteDiscipleshipEnrollment(enrollmentId) {
    return request(`/discipleship/enrollments/${enrollmentId}`, {
      method: "DELETE",
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

  async deleteProspect(prospectId) {
    return request(`/evangelism/prospects/${prospectId}`, {
      method: "DELETE",
    });
  },

  async assignProspect(prospectId, payload) {
    return request(`/evangelism/prospects/${prospectId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
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

  async getNextBibleStudyId() {
    return request("/evangelism/bible-studies/next-id");
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

  async deleteBibleStudy(studyId) {
    return request(`/evangelism/bible-studies/${studyId}`, {
      method: "DELETE",
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

  async deleteCampaign(campaignId) {
    return request(`/evangelism/campaigns/${campaignId}`, {
      method: "DELETE",
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

  async deleteVisitor(visitorId) {
    return request(`/visitors/${visitorId}`, {
      method: "DELETE",
    });
  },

  async addVisitorChurchVisit(visitorId, payload) {
    return request(`/visitors/${visitorId}/church-visits`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async assignVisitorFollowUp(visitorId, payload) {
    return request(`/visitors/${visitorId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
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

  async getCommunicationGroups() {
    return request("/communication/groups");
  },

  async createCommunicationGroup(payload) {
    return request("/communication/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCommunicationGroup(groupId, payload) {
    return request(`/communication/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteCommunicationGroup(groupId) {
    return request(`/communication/groups/${groupId}`, {
      method: "DELETE",
    });
  },

  async freezeCommunicationGroup(groupId) {
    return request(`/communication/groups/${groupId}/freeze`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async previewCommunicationAudience(payload) {
    return request("/communication/audience/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCommunicationPreferences() {
    return request("/communication/preferences");
  },

  async saveCommunicationPreference(payload) {
    return request("/communication/preferences", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCommunicationLogs() {
    return request("/communication/logs");
  },

  async sendCommunication(payload) {
    return request("/communication/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async exportCommunicationContacts(payload) {
    return request("/communication/export", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getTriggerRules() {
    return request("/spiritual-health/trigger-rules");
  },

  async createTriggerRule(payload) {
    return request("/spiritual-health/trigger-rules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateTriggerRule(ruleId, payload) {
    return request(`/spiritual-health/trigger-rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteTriggerRule(ruleId) {
    return request(`/spiritual-health/trigger-rules/${ruleId}`, {
      method: "DELETE",
    });
  },

  async evaluateSpiritualAlerts() {
    return request("/spiritual-health/alerts/evaluate", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async getSpiritualAlerts(resolved = false) {
    return request(`/spiritual-health/alerts?resolved=${resolved ? "true" : "false"}`);
  },

  async assignSpiritualAlert(alertId, payload) {
    return request(`/spiritual-health/alerts/${alertId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resolveSpiritualAlert(alertId) {
    return request(`/spiritual-health/alerts/${alertId}/resolve`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  async getLeadershipRoles() {
    return request("/leadership/roles");
  },

  async createLeadershipRole(payload) {
    return request("/leadership/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLeadershipRole(id, payload) {
    return request(`/leadership/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteLeadershipRole(id) {
    return request(`/leadership/roles/${id}`, {
      method: "DELETE",
    });
  },

  async getLeadershipSkills() {
    return request("/leadership/skills");
  },

  async createLeadershipSkill(payload) {
    return request("/leadership/skills", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLeadershipSkill(id, payload) {
    return request(`/leadership/skills/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteLeadershipSkill(id) {
    return request(`/leadership/skills/${id}`, {
      method: "DELETE",
    });
  },

  async getEmergingLeaderFlags() {
    return request("/leadership/emerging-flags");
  },

  async createEmergingLeaderFlag(payload) {
    return request("/leadership/emerging-flags", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateEmergingLeaderFlag(id, payload) {
    return request(`/leadership/emerging-flags/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteEmergingLeaderFlag(id) {
    return request(`/leadership/emerging-flags/${id}`, {
      method: "DELETE",
    });
  },

  async getMentorAssignments() {
    return request("/leadership/mentors");
  },

  async createMentorAssignment(payload) {
    return request("/leadership/mentors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateMentorAssignment(id, payload) {
    return request(`/leadership/mentors/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteMentorAssignment(id) {
    return request(`/leadership/mentors/${id}`, {
      method: "DELETE",
    });
  },

  async getLeadershipTrainingRecords() {
    return request("/leadership/training-records");
  },

  async createLeadershipTrainingRecord(payload) {
    return request("/leadership/training-records", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateLeadershipTrainingRecord(id, payload) {
    return request(`/leadership/training-records/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteLeadershipTrainingRecord(id) {
    return request(`/leadership/training-records/${id}`, {
      method: "DELETE",
    });
  },

  async getSuccessionRequirements() {
    return request("/leadership/succession-requirements");
  },

  async createSuccessionRequirement(payload) {
    return request("/leadership/succession-requirements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSuccessionRequirement(id, payload) {
    return request(`/leadership/succession-requirements/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteSuccessionRequirement(id) {
    return request(`/leadership/succession-requirements/${id}`, {
      method: "DELETE",
    });
  },

  async getSuccessionReadiness() {
    return request("/leadership/succession-readiness");
  },

  async createSuccessionReadiness(payload) {
    return request("/leadership/succession-readiness", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSuccessionReadiness(id, payload) {
    return request(`/leadership/succession-readiness/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteSuccessionReadiness(id) {
    return request(`/leadership/succession-readiness/${id}`, {
      method: "DELETE",
    });
  },

  async getLeadershipPipelineReport() {
    return request("/leadership/reports/pipeline");
  },

  async getStrategicPlans() {
    return request("/strategic/plans");
  },

  async createStrategicPlan(payload) {
    return request("/strategic/plans", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStrategicPlan(id, payload) {
    return request(`/strategic/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteStrategicPlan(id) {
    return request(`/strategic/plans/${id}`, {
      method: "DELETE",
    });
  },

  async getStrategicPillars() {
    return request("/strategic/pillars");
  },

  async createStrategicPillar(payload) {
    return request("/strategic/pillars", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStrategicPillar(id, payload) {
    return request(`/strategic/pillars/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteStrategicPillar(id) {
    return request(`/strategic/pillars/${id}`, {
      method: "DELETE",
    });
  },

  async getStrategicObjectives() {
    return request("/strategic/objectives");
  },

  async createStrategicObjective(payload) {
    return request("/strategic/objectives", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStrategicObjective(id, payload) {
    return request(`/strategic/objectives/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteStrategicObjective(id) {
    return request(`/strategic/objectives/${id}`, {
      method: "DELETE",
    });
  },

  async getStrategicInitiatives() {
    return request("/strategic/initiatives");
  },

  async createStrategicInitiative(payload) {
    return request("/strategic/initiatives", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStrategicInitiative(id, payload) {
    return request(`/strategic/initiatives/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteStrategicInitiative(id) {
    return request(`/strategic/initiatives/${id}`, {
      method: "DELETE",
    });
  },

  async getKpis() {
    return request("/strategic/kpis");
  },

  async createKpi(payload) {
    return request("/strategic/kpis", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateKpi(id, payload) {
    return request(`/strategic/kpis/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteKpi(id) {
    return request(`/strategic/kpis/${id}`, {
      method: "DELETE",
    });
  },

  async getKpiTargets() {
    return request("/strategic/targets");
  },

  async createKpiTarget(payload) {
    return request("/strategic/targets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateKpiTarget(id, payload) {
    return request(`/strategic/targets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteKpiTarget(id) {
    return request(`/strategic/targets/${id}`, {
      method: "DELETE",
    });
  },

  async getKpiActuals() {
    return request("/strategic/actuals");
  },

  async createKpiActual(payload) {
    return request("/strategic/actuals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteKpiActual(id) {
    return request(`/strategic/actuals/${id}`, {
      method: "DELETE",
    });
  },

  async getChurchScorecard() {
    return request("/strategic/scorecards/church");
  },

  async getMinistryScorecard(ministryId) {
    return request(`/strategic/scorecards/ministry/${ministryId}`);
  },
};
