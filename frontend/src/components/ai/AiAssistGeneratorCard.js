import { useEffect, useState } from "react";
import { churchApi } from "../../apis/churchApi";
import { useAppContext } from "../../context/AppContext";

export default function AiAssistGeneratorCard({
  title,
  description,
  moduleKey,
  buttonLabel = "Generate",
  fields = [],
  initialValues = {},
  buildPayload,
}) {
  const { notifySuccess, notifyError } = useAppContext();
  const [formValues, setFormValues] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState("");

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const payload = typeof buildPayload === "function" ? buildPayload(formValues) : formValues;
      const response = await churchApi.generateAiSuggestions(moduleKey, payload || {});
      const generatedCount = Number(response?.generatedCount || 0);
      const message = generatedCount
        ? `${generatedCount} AI suggestion${generatedCount === 1 ? "" : "s"} generated and sent to the review queue.`
        : "No new AI suggestions were generated from the current data.";
      setLastResult(message);
      notifySuccess(message);
    } catch (error) {
      const message = error.message || "Unable to generate AI suggestions.";
      setLastResult(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="surface-card data-card">
      <div className="section-headline compact">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {fields.length ? (
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.name} className={field.wide ? "full-width" : ""}>
              {field.label}
              {field.type === "textarea" ? (
                <textarea
                  rows={field.rows || 3}
                  value={formValues[field.name] || ""}
                  placeholder={field.placeholder || ""}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              ) : field.type === "select" ? (
                <select
                  value={formValues[field.name] || ""}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                >
                  <option value="">{field.placeholder || "Select option"}</option>
                  {(field.options || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  value={formValues[field.name] || ""}
                  placeholder={field.placeholder || ""}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              )}
            </label>
          ))}
        </div>
      ) : null}

      {lastResult ? <div className="soft-note">{lastResult}</div> : null}

      <div className="modal-actions">
        <button type="button" className="primary-button" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : buttonLabel}
        </button>
      </div>
    </section>
  );
}
