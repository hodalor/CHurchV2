# AI Assist

This project uses an advisory-only AI assist layer. No AI output is allowed to auto-send, auto-merge, auto-delete, auto-import, or auto-change record status without human review.

## Implemented Flows

### Membership / Household / Visitor Duplicates
- Deterministic logic in code:
  name similarity, phone/email match, DOB match, household overlap, address and area checks.
- Claude usage:
  optional plain-language explanation only for borderline duplicate pairs.
- Data sent for explanation:
  record type, display labels, deterministic match reasons.

### Data Migration Field Mapping
- Deterministic logic in code:
  header normalization and synonym matching.
- Claude usage:
  optional explanation of proposed mapping and unmatched columns.
- Data sent for explanation:
  import entity, uploaded header names, deterministic matches, unmatched headers.

### Visitor Follow-Up Drafts
- Deterministic logic in code:
  single-visit visitors beyond the configured follow-up window.
- Claude usage:
  drafts the follow-up wording only.
- Data sent for drafting:
  first name, surname, how-heard label, residential area, first-visit age in days, first visit note.

### Evangelism Follow-Up / Campaign Digests
- Deterministic logic in code:
  no recent contact, long time in current stage, campaign counts.
- Claude usage:
  drafts the next-contact wording or short campaign digest.
- Data sent for drafting:
  prospect name, source, current stage, campaign name, days since contact, days in stage, notes summary, campaign counts.

### Discipleship Mentor Match
- Deterministic logic in code:
  shared ministry, area overlap, skill overlap, and current mentoring load.
- Claude usage:
  explains the top ranked mentor options only.
- Data sent for phrasing:
  enrollee name, programme name, ranked mentor candidate names, scores, and deterministic reasons.

### Attendance / Ministry Anomalies
- Deterministic logic in code:
  recent absence shift, ministry attendance drop, leader vacancy, missing recent ministry activity.
- Claude usage:
  short narrative summary only.
- Data sent for phrasing:
  member or ministry label, recent counts, comparison counts, issue summary, event titles where applicable.

### Communication Drafting / Audience Suggestions
- Deterministic logic in code:
  permission-filtered audience preview and basic request parsing.
- Claude usage:
  drafts message wording or explains the proposed audience filter.
- Data sent for drafting:
  sender prompt, saved group name if present, audience counts, matched ministry and detected status filters.

### Strategic Commentary / Cross-Pillar Insight
- Deterministic logic in code:
  KPI variance, target comparison, RAG status, church-wide scorecard counts.
- Claude usage:
  first-pass commentary phrasing only.
- Data sent for drafting:
  KPI name, period, target, actual, variance, RAG label, pillar name, and scorecard RAG counts.

### Leadership Gap Summaries
- Deterministic logic in code:
  key roles with no readiness records in Ready or Developing categories.
- Claude usage:
  administrative leadership-gap summary wording only.
- Data sent for phrasing:
  role label, total readiness records, viable readiness count.

## Shared Persistence

- `DuplicateCandidate`
  stores duplicate review candidates across Membership, Household, Visitor, and Imports.
- `AiSuggestion`
  stores advisory drafts and summaries across modules.
- `AuditLog`
  records creation and review updates for stored AI outputs.

## Current Limits

- `ANTHROPIC_API_KEY` is not set in `backend/.env`, so current behavior falls back to deterministic text instead of live Claude output.
- A concrete `CareCase` module was not found in this workspace during this pass, so the metadata-only care AI flow is documented as pending integration rather than implemented against a missing base record.
- The AI Assist page currently generates suggestions on demand from the review workspace. Additional in-module entry points can be layered on top of the same API without changing the shared storage pattern.
