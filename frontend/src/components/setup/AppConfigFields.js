export default function AppConfigFields({ draft, isEditing, onChange }) {
  return (
    <div className="modal-form">
      <div className="section-headline compact">
        <div>
          <h3>App Configuration</h3>
          <p>Update the app name and sidebar logo shown across the shell.</p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          App Name
          <input
            value={draft.appName || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("appName", event.target.value)}
          />
        </label>
        <label className="full-width">
          App Logo URL
          <input
            value={draft.appLogoUrl || ""}
            readOnly={!isEditing}
            placeholder="https://..."
            onChange={(event) => onChange("appLogoUrl", event.target.value)}
          />
        </label>
        <label>
          Default Currency
          <input
            value={draft.defaultCurrencyCode || ""}
            readOnly
          />
        </label>
        <label className="full-width">
          Available Currencies
          <input
            value={(draft.currencies || []).map((item) => `${item.code} (${item.symbol || item.code})`).join(", ")}
            readOnly
          />
        </label>
      </div>

      {draft.appLogoUrl ? (
        <div className="app-logo-preview">
          <img src={draft.appLogoUrl} alt={draft.appName || "App logo"} />
        </div>
      ) : null}
    </div>
  );
}
