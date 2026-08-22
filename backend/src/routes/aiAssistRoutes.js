const express = require("express");
const AiSuggestion = require("../models/AiSuggestion");
const DuplicateCandidate = require("../models/DuplicateCandidate");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { reviewAiSuggestion, reviewDuplicateCandidate } = require("../services/aiService");
const {
  generateAttendanceAnomalySuggestions,
  generateCommunicationAudienceSuggestion,
  generateCommunicationDraftSuggestion,
  generateEvangelismSuggestions,
  generateGivingFollowUpSuggestions,
  generateImportFieldMappingSuggestion,
  generateLeadershipGapSuggestions,
  generateMentorMatchSuggestions,
  generateMinistryEngagementSuggestions,
  generateStrategicCommentarySuggestions,
  generateVisitorFollowUpSuggestions,
} = require("../services/aiSuggestionGeneratorService");
const { canViewIndividualGiving } = require("../services/financePolicyService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();
router.use(authenticate);

router.get("/duplicates", authorizePermissions(PERMISSIONS.VIEW_AI_ASSIST), async (req, res) => {
  const status = req.query.status || "";
  const query = status ? { status } : {};
  const items = await DuplicateCandidate.find(query)
    .populate("reviewedBy", "displayName username")
    .sort({ updatedAt: -1, createdAt: -1 });
  res.json(items);
});

router.post("/duplicates/:candidateId/review", authorizePermissions(PERMISSIONS.REVIEW_AI_ASSIST), async (req, res) => {
  try {
    const item = await reviewDuplicateCandidate({
      candidateId: req.params.candidateId,
      status: req.body.status || "confirmed-distinct",
      reviewer: req.user,
      reviewNotes: req.body.reviewNotes || "",
      ipAddress: req.ip,
    });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/suggestions", authorizePermissions(PERMISSIONS.VIEW_AI_ASSIST), async (req, res) => {
  const status = req.query.status || "";
  const query = status ? { status } : {};
  const items = await AiSuggestion.find(query)
    .populate("generatedForUser", "displayName username")
    .populate("reviewer", "displayName username")
    .sort({ updatedAt: -1, createdAt: -1 });
  res.json(items);
});

router.post("/suggestions/:suggestionId/review", authorizePermissions(PERMISSIONS.REVIEW_AI_ASSIST), async (req, res) => {
  try {
    const item = await reviewAiSuggestion({
      suggestionId: req.params.suggestionId,
      status: req.body.status || "dismissed",
      reviewer: req.user,
      reviewNotes: req.body.reviewNotes || "",
      ipAddress: req.ip,
    });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/suggestions/generate/:moduleKey", authorizePermissions(PERMISSIONS.REVIEW_AI_ASSIST), async (req, res) => {
  try {
    const moduleKey = String(req.params.moduleKey || "").toLowerCase();
    let items = [];

    if (moduleKey === "visitor") {
      items = await generateVisitorFollowUpSuggestions({
        user: req.user,
        windowDays: Number(req.body.windowDays || 30),
        limit: Number(req.body.limit || 20),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "evangelism") {
      items = await generateEvangelismSuggestions({
        user: req.user,
        contactWindowDays: Number(req.body.contactWindowDays || 14),
        stageWindowDays: Number(req.body.stageWindowDays || 21),
        limit: Number(req.body.limit || 20),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "discipleship") {
      items = await generateMentorMatchSuggestions({
        user: req.user,
        limit: Number(req.body.limit || 15),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "attendance") {
      items = await generateAttendanceAnomalySuggestions({
        user: req.user,
        eventCount: Number(req.body.eventCount || 8),
        recentMinistryWindowDays: Number(req.body.recentMinistryWindowDays || 30),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "ministry") {
      items = await generateMinistryEngagementSuggestions({
        user: req.user,
        windowDays: Number(req.body.windowDays || 60),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "communication-draft") {
      items = [
        await generateCommunicationDraftSuggestion({
          user: req.user,
          promptText: req.body.promptText || "",
          groupId: req.body.groupId || "",
          channelId: req.body.channelId || "",
          filterCriteria: req.body.filterCriteria || {},
          ipAddress: req.ip,
        }),
      ];
    } else if (moduleKey === "communication-audience") {
      items = [
        await generateCommunicationAudienceSuggestion({
          user: req.user,
          requestText: req.body.requestText || "",
          ipAddress: req.ip,
        }),
      ];
    } else if (moduleKey === "strategic") {
      items = await generateStrategicCommentarySuggestions({
        user: req.user,
        actualId: req.body.actualId || "",
        limit: Number(req.body.limit || 20),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "leadership") {
      items = await generateLeadershipGapSuggestions({
        user: req.user,
        ipAddress: req.ip,
      });
    } else if (moduleKey === "finance") {
      if (!canViewIndividualGiving(req.user)) {
        return res.status(403).json({ message: "You are not allowed to generate giving intelligence suggestions." });
      }
      items = await generateGivingFollowUpSuggestions({
        user: req.user,
        limit: Number(req.body.limit || 20),
        recentWindowDays: Number(req.body.recentWindowDays || 60),
        lapsedWindowDays: Number(req.body.lapsedWindowDays || 90),
        ipAddress: req.ip,
      });
    } else if (moduleKey === "import-mapping") {
      items = [
        await generateImportFieldMappingSuggestion({
          user: req.user,
          entity: req.body.entity || "",
          headers: Array.isArray(req.body.headers) ? req.body.headers : [],
          ipAddress: req.ip,
        }),
      ];
    } else {
      return res.status(404).json({ message: "AI generation flow not found for this module." });
    }

    return res.status(201).json({
      generatedCount: items.length,
      items,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
