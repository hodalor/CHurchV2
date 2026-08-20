const AiSuggestion = require("../models/AiSuggestion");
const DuplicateCandidate = require("../models/DuplicateCandidate");
const { logAudit } = require("./auditService");
const { generateClaudeText, hasClaudeConfig } = require("./claudeService");

async function createAiSuggestion({
  suggestionType,
  subjectType,
  subjectId,
  subjectLabel = "",
  sourceModule,
  generatedForUser = null,
  title = "",
  generatedText = "",
  basedOnRefs = [],
  promptContextSummary = "",
  metadata = {},
  requestedBy = null,
  ipAddress = "",
}) {
  const suggestion = await AiSuggestion.create({
    suggestionType,
    subjectType,
    subjectId,
    subjectLabel,
    sourceModule,
    generatedForUser,
    title,
    generatedText,
    basedOnRefs,
    promptContextSummary,
    metadata,
  });

  await logAudit({
    action: "create",
    module: sourceModule || "AI Assist",
    recordType: "AiSuggestion",
    recordId: suggestion._id.toString(),
    newValue: suggestion.toObject(),
    user: requestedBy,
    ipAddress,
  });

  return suggestion;
}

async function upsertAiSuggestion({
  suggestionType,
  subjectType,
  subjectId,
  subjectLabel = "",
  sourceModule,
  generatedForUser = null,
  title = "",
  generatedText = "",
  basedOnRefs = [],
  promptContextSummary = "",
  metadata = {},
  requestedBy = null,
  ipAddress = "",
}) {
  const fingerprint = metadata?.fingerprint || "";
  const query = {
    suggestionType,
    subjectType,
    subjectId,
    sourceModule,
    status: "pending",
    ...(fingerprint ? { "metadata.fingerprint": fingerprint } : {}),
  };

  const existing = await AiSuggestion.findOne(query);
  if (!existing) {
    return createAiSuggestion({
      suggestionType,
      subjectType,
      subjectId,
      subjectLabel,
      sourceModule,
      generatedForUser,
      title,
      generatedText,
      basedOnRefs,
      promptContextSummary,
      metadata,
      requestedBy,
      ipAddress,
    });
  }

  const previousValue = existing.toObject();
  existing.subjectLabel = subjectLabel;
  existing.generatedForUser = generatedForUser;
  existing.title = title;
  existing.generatedText = generatedText;
  existing.basedOnRefs = basedOnRefs;
  existing.promptContextSummary = promptContextSummary;
  existing.metadata = metadata;
  await existing.save();

  await logAudit({
    action: "update",
    module: sourceModule || "AI Assist",
    recordType: "AiSuggestion",
    recordId: existing._id.toString(),
    previousValue,
    newValue: existing.toObject(),
    user: requestedBy,
    ipAddress,
  });

  return existing;
}

async function reviewAiSuggestion({ suggestionId, status, reviewer, reviewNotes = "", ipAddress = "" }) {
  const suggestion = await AiSuggestion.findById(suggestionId);
  if (!suggestion) {
    throw new Error("AI suggestion not found.");
  }

  const previousValue = suggestion.toObject();
  suggestion.status = status;
  suggestion.reviewer = reviewer?._id || null;
  suggestion.reviewedAt = new Date();
  suggestion.reviewNotes = reviewNotes;
  await suggestion.save();

  await logAudit({
    action: "update",
    module: "AI Assist",
    recordType: "AiSuggestion",
    recordId: suggestion._id.toString(),
    previousValue,
    newValue: suggestion.toObject(),
    user: reviewer,
    ipAddress,
  });

  return suggestion;
}

async function reviewDuplicateCandidate({ candidateId, status, reviewer, reviewNotes = "", ipAddress = "" }) {
  const candidate = await DuplicateCandidate.findById(candidateId);
  if (!candidate) {
    throw new Error("Duplicate candidate not found.");
  }

  const previousValue = candidate.toObject();
  candidate.status = status;
  candidate.reviewedBy = reviewer?._id || null;
  candidate.reviewedAt = new Date();
  candidate.metadata = {
    ...(candidate.metadata || {}),
    reviewNotes,
  };
  await candidate.save();

  await logAudit({
    action: "update",
    module: "AI Assist",
    recordType: "DuplicateCandidate",
    recordId: candidate._id.toString(),
    previousValue,
    newValue: candidate.toObject(),
    user: reviewer,
    ipAddress,
  });

  return candidate;
}

async function generateDuplicateExplanation({ recordType, incomingLabel, candidateLabel, reasons = [] }) {
  if (!hasClaudeConfig()) {
    return {
      text: reasons.join(". "),
      enabled: false,
    };
  }

  const response = await generateClaudeText({
    systemPrompt:
      "You explain why two church records may refer to the same person or household. Be brief, factual, and never decide whether they are duplicates.",
    userPrompt: [
      `Record type: ${recordType}`,
      `Incoming record: ${incomingLabel}`,
      `Possible duplicate: ${candidateLabel}`,
      `Deterministic signals: ${reasons.join("; ")}`,
      "Write a short plain-language explanation for a human reviewer.",
    ].join("\n"),
    maxTokens: 160,
  });

  return {
    text: response.text || reasons.join(". "),
    enabled: response.enabled,
  };
}

module.exports = {
  createAiSuggestion,
  generateDuplicateExplanation,
  reviewAiSuggestion,
  reviewDuplicateCandidate,
  upsertAiSuggestion,
};
