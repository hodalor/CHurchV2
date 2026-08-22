import { useEffect, useMemo, useState } from "react";
import { churchApi } from "../apis/churchApi";
import { useAppContext } from "../context/AppContext";

export default function AiAssistPage({ section = "duplicates" }) {
  const { notifyError, notifySuccess } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState("");
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [generatorForm, setGeneratorForm] = useState({
    moduleKey: "visitor",
    promptText: "",
    requestText: "",
    entity: "member",
    headers: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (section === "duplicates") {
          const response = await churchApi.getDuplicateCandidates("pending");
          if (active) {
            setDuplicates(Array.isArray(response) ? response : []);
          }
        } else {
          const response = await churchApi.getAiSuggestions("pending");
          if (active) {
            setSuggestions(Array.isArray(response) ? response : []);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load AI assist records.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [section]);

  const duplicateSummary = useMemo(
    () => ({
      total: duplicates.length,
      high: duplicates.filter((item) => item.matchScore >= 85).length,
      review: duplicates.filter((item) => item.matchScore < 85).length,
    }),
    [duplicates]
  );

  const suggestionSummary = useMemo(
    () => ({
      total: suggestions.length,
      visitor: suggestions.filter((item) => item.sourceModule === "Visitor Management").length,
      strategic: suggestions.filter((item) => item.sourceModule === "Strategic").length,
    }),
    [suggestions]
  );

  const handleDuplicateReview = async (candidateId, status) => {
    try {
      const updated = await churchApi.reviewDuplicateCandidate(candidateId, { status });
      setDuplicates((current) => current.filter((item) => item._id !== updated._id));
      notifySuccess("Duplicate review saved.");
    } catch (reviewError) {
      notifyError(reviewError.message || "Unable to save duplicate review.");
    }
  };

  const handleSuggestionReview = async (suggestionId, status) => {
    try {
      const updated = await churchApi.reviewAiSuggestion(suggestionId, { status });
      setSuggestions((current) => current.filter((item) => item._id !== updated._id));
      notifySuccess("Suggestion review saved.");
    } catch (reviewError) {
      notifyError(reviewError.message || "Unable to save suggestion review.");
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      setGenerating(generatorForm.moduleKey);
      const payload = buildGeneratorPayload(generatorForm);
      const response = await churchApi.generateAiSuggestions(generatorForm.moduleKey, payload);
      const generatedItems = Array.isArray(response?.items) ? response.items : [];
      if (generatedItems.length) {
        setSuggestions((current) => mergeSuggestions(generatedItems, current));
      } else {
        await refreshSuggestions();
      }
      notifySuccess(
        generatedItems.length
          ? `${generatedItems.length} AI suggestion${generatedItems.length === 1 ? "" : "s"} generated.`
          : "No new AI suggestions were generated from that request."
      );
    } catch (generationError) {
      notifyError(generationError.message || "Unable to generate AI suggestions.");
    } finally {
      setGenerating("");
    }
  };

  const refreshSuggestions = async () => {
    const response = await churchApi.getAiSuggestions("pending");
    setSuggestions(Array.isArray(response) ? response : []);
  };

  if (loading) {
    return <div className="empty-note">Loading AI assist workspace...</div>;
  }

  return (
    <div className="page-grid">
      {error ? <div className="form-error">{error}</div> : null}

      {section === "duplicates" ? (
        <>
          <section className="compact-stats-grid">
            <article className="compact-stat-card purple">
              <div className="compact-stat-label">Pending Pairs</div>
              <div className="compact-stat-value">{duplicateSummary.total}</div>
            </article>
            <article className="compact-stat-card pink">
              <div className="compact-stat-label">High Confidence</div>
              <div className="compact-stat-value">{duplicateSummary.high}</div>
            </article>
            <article className="compact-stat-card blue">
              <div className="compact-stat-label">Needs Review</div>
              <div className="compact-stat-value">{duplicateSummary.review}</div>
            </article>
          </section>

          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Duplicate Review</h3>
                <p>These are suggestions only. Nothing is merged automatically.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Record A</th>
                    <th>Record B</th>
                    <th>Score</th>
                    <th>Reasons</th>
                    <th>AI Explanation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.length ? (
                    duplicates.map((item) => (
                      <tr key={item._id}>
                        <td>{item.recordType}</td>
                        <td>{item.recordIdA}</td>
                        <td>{item.recordIdB}</td>
                        <td>{item.matchScore}</td>
                        <td>{(item.matchReasons || []).join(" | ") || "-"}</td>
                        <td>{item.aiExplanation || "-"}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="ghost-button small" onClick={() => handleDuplicateReview(item._id, "confirmed-duplicate")}>
                              Mark Duplicate
                            </button>
                            <button type="button" className="ghost-button small" onClick={() => handleDuplicateReview(item._id, "confirmed-distinct")}>
                              Mark Distinct
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="empty-table">
                        No pending duplicate candidates right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="compact-stats-grid">
            <article className="compact-stat-card purple">
              <div className="compact-stat-label">Pending Suggestions</div>
              <div className="compact-stat-value">{suggestionSummary.total}</div>
            </article>
            <article className="compact-stat-card pink">
              <div className="compact-stat-label">Visitor</div>
              <div className="compact-stat-value">{suggestionSummary.visitor}</div>
            </article>
            <article className="compact-stat-card blue">
              <div className="compact-stat-label">Strategic</div>
              <div className="compact-stat-value">{suggestionSummary.strategic}</div>
            </article>
          </section>

          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>Generate Suggestions</h3>
                <p>Create advisory drafts on demand, then review them below before anyone uses them.</p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Module
                <select
                  value={generatorForm.moduleKey}
                  onChange={(event) =>
                    setGeneratorForm((current) => ({ ...current, moduleKey: event.target.value }))
                  }
                >
                  <option value="visitor">Visitor Follow-Up</option>
                  <option value="evangelism">Evangelism Follow-Up</option>
                  <option value="discipleship">Discipleship Mentor Match</option>
                  <option value="attendance">Attendance Anomalies</option>
                  <option value="ministry">Ministry Engagement</option>
                  <option value="communication-draft">Communication Draft</option>
                  <option value="communication-audience">Audience Suggestion</option>
                  <option value="strategic">Strategic Commentary</option>
                  <option value="leadership">Leadership Gaps</option>
                  <option value="import-mapping">Import Field Mapping</option>
                </select>
              </label>

              {generatorForm.moduleKey === "communication-draft" ? (
                <label className="full-width">
                  Prompt
                  <textarea
                    rows="3"
                    value={generatorForm.promptText}
                    onChange={(event) =>
                      setGeneratorForm((current) => ({ ...current, promptText: event.target.value }))
                    }
                    placeholder="Reminder for Sunday's youth event"
                  />
                </label>
              ) : null}

              {generatorForm.moduleKey === "communication-audience" ? (
                <label className="full-width">
                  Audience Request
                  <textarea
                    rows="3"
                    value={generatorForm.requestText}
                    onChange={(event) =>
                      setGeneratorForm((current) => ({ ...current, requestText: event.target.value }))
                    }
                    placeholder="everyone in youth ministry who hasn't been contacted this month"
                  />
                </label>
              ) : null}

              {generatorForm.moduleKey === "import-mapping" ? (
                <>
                  <label>
                    Entity
                    <select
                      value={generatorForm.entity}
                      onChange={(event) =>
                        setGeneratorForm((current) => ({ ...current, entity: event.target.value }))
                      }
                    >
                      <option value="member">Members</option>
                      <option value="household">Households</option>
                      <option value="ministrymembers">Ministry Members</option>
                    </select>
                  </label>
                  <label className="full-width">
                    CSV Headers
                    <textarea
                      rows="3"
                      value={generatorForm.headers}
                      onChange={(event) =>
                        setGeneratorForm((current) => ({ ...current, headers: event.target.value }))
                      }
                      placeholder="Surname, Mobile Number, Residential Area"
                    />
                  </label>
                </>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={refreshSuggestions}>
                Refresh Queue
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateSuggestions}
                disabled={Boolean(generating)}
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </section>

          <section className="surface-card data-card">
            <div className="section-headline compact">
              <div>
                <h3>AI Suggestions</h3>
                <p>Review, accept, or dismiss drafted suggestions before anyone uses them.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Draft</th>
                    <th>Sources</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.length ? (
                    suggestions.map((item) => (
                      <tr key={item._id}>
                        <td>{item.sourceModule}</td>
                        <td>{item.suggestionType}</td>
                        <td>{item.subjectLabel || item.subjectId}</td>
                        <td>{item.generatedText || "-"}</td>
                        <td>{(item.basedOnRefs || []).map((ref) => `${ref.recordType}: ${ref.recordId}`).join(" | ") || "-"}</td>
                        <td>
                          <div className="table-actions">
                            <button type="button" className="ghost-button small" onClick={() => handleSuggestionReview(item._id, "accepted")}>
                              Accept
                            </button>
                            <button type="button" className="ghost-button small" onClick={() => handleSuggestionReview(item._id, "dismissed")}>
                              Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty-table">
                        No pending AI suggestions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function buildGeneratorPayload(form) {
  if (form.moduleKey === "communication-draft") {
    return {
      promptText: form.promptText,
    };
  }

  if (form.moduleKey === "communication-audience") {
    return {
      requestText: form.requestText,
    };
  }

  if (form.moduleKey === "import-mapping") {
    return {
      entity: form.entity,
      headers: String(form.headers || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  return {};
}

function mergeSuggestions(incoming, current) {
  const nextMap = new Map(current.map((item) => [item._id, item]));
  incoming.forEach((item) => {
    nextMap.set(item._id, item);
  });
  return [...nextMap.values()].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}
