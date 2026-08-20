import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { branding, openRecordModal, settingsState } = useAppContext();
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("app-config");
  const canManageSettings = authUser?.permissions?.includes("manage_settings");

  if (!canManageSettings) {
    return (
      <section className="surface-card data-card">
        <div className="section-headline compact">
          <div>
            <h3>Settings</h3>
            <p>Only superadmin accounts can access app configuration.</p>
          </div>
        </div>
        <div className="form-error">You do not have permission to view settings.</div>
      </section>
    );
  }

  return (
    <div className="page-grid">
      {settingsState.error ? <div className="form-error">{settingsState.error}</div> : null}

      <section className="surface-card data-card">
        <div className="section-headline compact">
          <div>
            <h3>Settings</h3>
            <p>Superadmin-only controls for app shell branding and future global configuration.</p>
          </div>
          <div className="tab-row">
            <button type="button" className={`tab-button ${activeTab === "app-config" ? "active" : ""}`} onClick={() => setActiveTab("app-config")}>
              App Config
            </button>
          </div>
        </div>
      </section>

      {activeTab === "app-config" ? (
        <section className="surface-card data-card">
          <div className="section-headline compact">
            <div>
              <h3>Application Shell</h3>
              <p>Control the sidebar app name, shell logo, and shared identity elements.</p>
            </div>
            <button type="button" className="primary-button" onClick={() => openRecordModal("appConfig", branding, "edit")}>
              Edit App Config
            </button>
          </div>

          <div className="info-grid">
            <article className="info-tile">
              <span>App Name</span>
              <strong>{branding.appName || "ChurchSuite Pro"}</strong>
            </article>
            <article className="info-tile wide">
              <span>Logo URL</span>
              <strong>{branding.appLogoUrl || "Not set"}</strong>
            </article>
          </div>

          {branding.appLogoUrl ? (
            <div className="app-logo-preview large">
              <img src={branding.appLogoUrl} alt={branding.appName || "App logo"} />
            </div>
          ) : (
            <div className="empty-note">Add an app logo URL to show it in the sidebar and topbar.</div>
          )}
        </section>
      ) : null}
    </div>
  );
}
