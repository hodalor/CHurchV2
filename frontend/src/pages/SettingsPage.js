import { useEffect, useState } from "react";
import { churchApi } from "../apis/churchApi";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { branding, openRecordModal, settingsState, setBranding, notifySuccess, notifyError } = useAppContext();
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("app-config");
  const [currencies, setCurrencies] = useState([]);
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState("");
  const [currencyForm, setCurrencyForm] = useState({ code: "", name: "", symbol: "" });
  const [savingCurrencies, setSavingCurrencies] = useState(false);
  const canManageSettings = authUser?.permissions?.includes("manage_settings");

  useEffect(() => {
    setCurrencies(Array.isArray(branding.currencies) ? branding.currencies : []);
    setDefaultCurrencyCode(branding.defaultCurrencyCode || branding.currencies?.[0]?.code || "");
  }, [branding]);

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
            <button type="button" className={`tab-button ${activeTab === "currencies" ? "active" : ""}`} onClick={() => setActiveTab("currencies")}>
              Currencies
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

      {activeTab === "currencies" ? (
        <section className="surface-card data-card">
          <div className="section-headline compact">
            <div>
              <h3>System Currencies</h3>
              <p>Create the currencies available to this church and choose the one used across finance screens.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Currency Code
              <input
                value={currencyForm.code}
                placeholder="GHS"
                maxLength={3}
                onChange={(event) =>
                  setCurrencyForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                }
              />
            </label>
            <label>
              Currency Name
              <input
                value={currencyForm.name}
                placeholder="Ghana Cedi"
                onChange={(event) =>
                  setCurrencyForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              Symbol
              <input
                value={currencyForm.symbol}
                placeholder="GH¢"
                onChange={(event) =>
                  setCurrencyForm((current) => ({ ...current, symbol: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                const nextCurrency = {
                  code: currencyForm.code.trim().toUpperCase(),
                  name: currencyForm.name.trim(),
                  symbol: currencyForm.symbol.trim(),
                };

                if (!nextCurrency.code || !nextCurrency.name) {
                  notifyError("Currency code and currency name are required.");
                  return;
                }

                if (currencies.some((item) => item.code === nextCurrency.code)) {
                  notifyError("That currency code already exists.");
                  return;
                }

                setCurrencies((current) => [...current, nextCurrency]);
                setDefaultCurrencyCode((current) => current || nextCurrency.code);
                setCurrencyForm({ code: "", name: "", symbol: "" });
                notifySuccess(`${nextCurrency.code} added to the system currencies.`);
              }}
            >
              Add Currency
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={savingCurrencies}
              onClick={async () => {
                try {
                  if (!currencies.length) {
                    throw new Error("Add at least one currency before saving.");
                  }

                  setSavingCurrencies(true);
                  const payload = {
                    appName: branding.appName,
                    appLogoUrl: branding.appLogoUrl,
                    currencies,
                    defaultCurrencyCode,
                  };
                  const savedConfig = await churchApi.updateAppConfig(payload);
                  const refreshedConfig = await churchApi.getAppConfig().catch(() => null);
                  const resolvedConfig = {
                    ...payload,
                    ...(savedConfig || {}),
                    ...(refreshedConfig || {}),
                    currencies:
                      Array.isArray(refreshedConfig?.currencies) && refreshedConfig.currencies.length
                        ? refreshedConfig.currencies
                        : Array.isArray(savedConfig?.currencies) && savedConfig.currencies.length
                          ? savedConfig.currencies
                          : payload.currencies,
                    defaultCurrencyCode:
                      refreshedConfig?.defaultCurrencyCode ||
                      savedConfig?.defaultCurrencyCode ||
                      payload.defaultCurrencyCode,
                  };
                  setBranding((current) => ({ ...current, ...resolvedConfig }));
                  notifySuccess("System currencies saved successfully.");
                } catch (error) {
                  notifyError(error.message || "Unable to save currencies.");
                } finally {
                  setSavingCurrencies(false);
                }
              }}
            >
              {savingCurrencies ? "Saving..." : "Save Currency Settings"}
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Default</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Symbol</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currencies.length ? (
                  currencies.map((currency) => (
                    <tr key={currency.code}>
                      <td>
                        <input
                          type="radio"
                          name="defaultCurrency"
                          checked={defaultCurrencyCode === currency.code}
                          onChange={() => setDefaultCurrencyCode(currency.code)}
                        />
                      </td>
                      <td>{currency.code}</td>
                      <td>{currency.name}</td>
                      <td>{currency.symbol || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost-button small delete-button"
                          onClick={() => {
                            const nextCurrencies = currencies.filter((item) => item.code !== currency.code);
                            setCurrencies(nextCurrencies);
                            if (defaultCurrencyCode === currency.code) {
                              setDefaultCurrencyCode(nextCurrencies[0]?.code || "");
                            }
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table">
                      No currencies configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
