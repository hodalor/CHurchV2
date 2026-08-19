const express = require("express");
const BibleStudy = require("../models/BibleStudy");
const Campaign = require("../models/Campaign");
const EvangelismProspect = require("../models/EvangelismProspect");
const authenticate = require("../middleware/authenticate");
const { authorizePermissions } = require("../middleware/authorize");
const { logAudit } = require("../services/auditService");
const {
  addBibleStudyLesson,
  assignProspect,
  createBibleStudy,
  createCampaign,
  createProspect,
  convertProspectToMember,
  generateNextBibleStudyId,
  generateNextProspectId,
  getDashboardMetrics,
  logProspectContact,
  moveProspectStage,
  populateBibleStudiesQuery,
  populateCampaignQuery,
  populateContactsQuery,
  populateProspectQuery,
  updateBibleStudy,
  updateCampaign,
  updateProspect,
} = require("../services/evangelismService");
const { PERMISSIONS } = require("../utils/permissions");

const router = express.Router();

router.use(authenticate);

router.get(
  "/prospects/next-id",
  authorizePermissions(PERMISSIONS.VIEW_EVANGELISM),
  async (req, res) => {
    const prospectId = await generateNextProspectId();
    res.json({ prospectId });
  }
);

router.get(
  "/bible-studies/next-id",
  authorizePermissions(PERMISSIONS.VIEW_EVANGELISM),
  async (req, res) => {
    const bibleStudyId = await generateNextBibleStudyId();
    res.json({ bibleStudyId });
  }
);

router.get("/prospects", authorizePermissions(PERMISSIONS.VIEW_EVANGELISM), async (req, res) => {
  const prospects = await populateProspectQuery();
  res.json(prospects);
});

router.post("/prospects", authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM), async (req, res) => {
  try {
    const prospect = await createProspect(req.body, req.user);
    await logAudit({
      action: "create",
      module: "Evangelism",
      recordType: "EvangelismProspect",
      recordId: prospect.prospectId,
      newValue: prospect.toObject(),
      user: req.user,
      ipAddress: req.ip,
    });
    res.status(201).json(prospect);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put(
  "/prospects/:prospectId",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const prospect = await EvangelismProspect.findOne({ prospectId: req.params.prospectId });
    if (!prospect) {
      return res.status(404).json({ message: "Prospect not found." });
    }

    const previousValue = prospect.toObject();

    try {
      const updatedProspect = await updateProspect(prospect, req.body);
      await logAudit({
        action: "update",
        module: "Evangelism",
        recordType: "EvangelismProspect",
        recordId: updatedProspect.prospectId,
        previousValue,
        newValue: updatedProspect.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json(updatedProspect);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/prospects/:prospectId/assign",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const prospect = await EvangelismProspect.findOne({ prospectId: req.params.prospectId });
    if (!prospect) {
      return res.status(404).json({ message: "Prospect not found." });
    }

    const previousValue = prospect.toObject();

    try {
      if (!req.body.assignedUserId && !req.body.assignedMemberId) {
        return res.status(400).json({ message: "Assigned evangelist member or user is required." });
      }

      const updatedProspect = await assignProspect(
        prospect,
        req.body.assignedUserId,
        req.body.assignedMemberId || ""
      );
      await logAudit({
        action: "update",
        module: "Evangelism",
        recordType: "EvangelismProspect",
        recordId: updatedProspect.prospectId,
        previousValue,
        newValue: updatedProspect.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json(updatedProspect);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/prospects/:prospectId/stage",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const prospect = await EvangelismProspect.findOne({ prospectId: req.params.prospectId });
    if (!prospect) {
      return res.status(404).json({ message: "Prospect not found." });
    }

    const previousValue = prospect.toObject();

    try {
      const updatedProspect = await moveProspectStage(prospect, req.body.stageId, req.user);
      await logAudit({
        action: "status-change",
        module: "Evangelism",
        recordType: "EvangelismProspect",
        recordId: updatedProspect.prospectId,
        previousValue,
        newValue: updatedProspect.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json(updatedProspect);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/prospects/:prospectId/contacts",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const prospect = await EvangelismProspect.findOne({ prospectId: req.params.prospectId });
    if (!prospect) {
      return res.status(404).json({ message: "Prospect not found." });
    }

    try {
      const contact = await logProspectContact(prospect, req.body, req.user);
      await logAudit({
        action: "create",
        module: "Evangelism",
        recordType: "EvangelismContact",
        recordId: contact._id.toString(),
        newValue: contact.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.status(201).json(contact);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/prospects/:prospectId/convert-to-member",
  authorizePermissions(PERMISSIONS.CONVERT_PROSPECT),
  async (req, res) => {
    const prospect = await EvangelismProspect.findOne({ prospectId: req.params.prospectId });
    if (!prospect) {
      return res.status(404).json({ message: "Prospect not found." });
    }

    const previousValue = prospect.toObject();

    try {
      const member = await convertProspectToMember(prospect, req.body, req.user);
      const refreshedProspect = await populateProspectQuery({ _id: prospect._id });
      await logAudit({
        action: "status-change",
        module: "Evangelism",
        recordType: "EvangelismProspect",
        recordId: prospect.prospectId,
        previousValue,
        newValue: refreshedProspect[0] || previousValue,
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json({
        prospect: refreshedProspect[0] || null,
        member,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.get("/contacts", authorizePermissions(PERMISSIONS.VIEW_EVANGELISM), async (req, res) => {
  const contacts = await populateContactsQuery();
  res.json(contacts);
});

router.get(
  "/bible-studies",
  authorizePermissions(PERMISSIONS.VIEW_EVANGELISM),
  async (req, res) => {
    const studies = await populateBibleStudiesQuery();
    res.json(studies);
  }
);

router.post(
  "/bible-studies",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    try {
      const study = await createBibleStudy(req.body);
      await logAudit({
        action: "create",
        module: "Evangelism",
        recordType: "BibleStudy",
        recordId: study._id.toString(),
        newValue: study.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.status(201).json(study);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/bible-studies/:studyId",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const study = await BibleStudy.findById(req.params.studyId);
    if (!study) {
      return res.status(404).json({ message: "Bible study not found." });
    }

    const previousValue = study.toObject();

    try {
      const updatedStudy = await updateBibleStudy(study, req.body);
      await logAudit({
        action: "update",
        module: "Evangelism",
        recordType: "BibleStudy",
        recordId: updatedStudy._id.toString(),
        previousValue,
        newValue: updatedStudy.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json(updatedStudy);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/bible-studies/:studyId/lessons",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const study = await BibleStudy.findById(req.params.studyId);
    if (!study) {
      return res.status(404).json({ message: "Bible study not found." });
    }

    const previousValue = study.toObject();

    try {
      const updatedStudy = await addBibleStudyLesson(study, req.body);
      await logAudit({
        action: "update",
        module: "Evangelism",
        recordType: "BibleStudy",
        recordId: updatedStudy._id.toString(),
        previousValue,
        newValue: updatedStudy.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json(updatedStudy);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.get("/campaigns", authorizePermissions(PERMISSIONS.VIEW_EVANGELISM), async (req, res) => {
  const campaigns = await populateCampaignQuery();
  res.json(campaigns);
});

router.post(
  "/campaigns",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    try {
      const campaign = await createCampaign(req.body);
      await logAudit({
        action: "create",
        module: "Evangelism",
        recordType: "Campaign",
        recordId: campaign._id.toString(),
        newValue: campaign.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.status(201).json(campaign);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/campaigns/:campaignId",
  authorizePermissions(PERMISSIONS.MANAGE_EVANGELISM),
  async (req, res) => {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found." });
    }

    const previousValue = campaign.toObject();

    try {
      const updatedCampaign = await updateCampaign(campaign, req.body);
      await logAudit({
        action: "update",
        module: "Evangelism",
        recordType: "Campaign",
        recordId: updatedCampaign._id.toString(),
        previousValue,
        newValue: updatedCampaign.toObject(),
        user: req.user,
        ipAddress: req.ip,
      });
      return res.json(updatedCampaign);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.get("/dashboard", authorizePermissions(PERMISSIONS.VIEW_EVANGELISM), async (req, res) => {
  const metrics = await getDashboardMetrics();
  res.json(metrics);
});

module.exports = router;
