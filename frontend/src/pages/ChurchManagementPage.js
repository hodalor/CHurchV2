import { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import ModalShell from "../components/common/ModalShell";
import { churchApi } from "../apis/churchApi";
import { navigationSections } from "../lib/navigation";
import { useAppContext } from "../context/AppContext";

const initialForm = {
  name: "",
  churchId: "",
  status: "active",
  adminDisplayName: "",
  adminUsername: "",
  adminEmail: "",
  adminPin: "",
  currencyCode: "",
  enabledNavigation: [],
};

function normalizeChurchId(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export default function ChurchManagementPage() {
  const { branding, notifyError, notifySuccess } = useAppContext();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [detailMode, setDetailMode] = useState("view");

  const grantSections = useMemo(
    () =>
      navigationSections.filter(
        (section) => !section.superadminOnly && !["dashboard", "settings", "church-management"].includes(section.key)
      ),
    []
  );
  const currencyOptions = useMemo(
    () =>
      Array.isArray(branding.currencies) && branding.currencies.length
        ? branding.currencies
        : [{ code: "GHS", name: "Ghana Cedi", symbol: "GH¢" }],
    [branding.currencies]
  );

  useEffect(() => {
    let active = true;

    async function loadChurches() {
      try {
        setLoading(true);
        const response = await churchApi.getChurches();
        if (active) {
          setChurches(Array.isArray(response) ? response : []);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load churches.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadChurches();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      currencyCode: current.currencyCode || branding.defaultCurrencyCode || currencyOptions[0]?.code || "GHS",
    }));
  }, [branding.defaultCurrencyCode, currencyOptions]);

  const toggleGrant = (key) => {
    setForm((current) => {
      const currentSet = new Set(current.enabledNavigation);
      if (currentSet.has(key)) {
        currentSet.delete(key);
      } else {
        currentSet.add(key);
      }

      return {
        ...current,
        enabledNavigation: Array.from(currentSet),
      };
    });
  };

  const toggleSection = (section) => {
    const keys = [section.key, ...(Array.isArray(section.children) ? section.children.map((child) => child.key) : [])];
    setForm((current) => {
      const currentSet = new Set(current.enabledNavigation);
      const allSelected = keys.every((key) => currentSet.has(key));

      keys.forEach((key) => {
        if (allSelected) {
          currentSet.delete(key);
        } else {
          currentSet.add(key);
        }
      });

      return {
        ...current,
        enabledNavigation: Array.from(currentSet),
      };
    });
  };

  const buildPayload = (draft) => ({
    ...draft,
    churchId: normalizeChurchId(draft.churchId || draft.name),
    currencyCode: draft.currencyCode || branding.defaultCurrencyCode || currencyOptions[0]?.code || "GHS",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      const payload = buildPayload(form);
      const createdChurch = await churchApi.createChurch(payload);
      setChurches((current) => [createdChurch, ...current]);
      setForm({
        ...initialForm,
        currencyCode: branding.defaultCurrencyCode || currencyOptions[0]?.code || "GHS",
      });
      setShowModal(false);
      setError("");
      notifySuccess(`Tenant ${createdChurch.name} created successfully.`);
    } catch (saveError) {
      setError(saveError.message || "Unable to create church.");
      notifyError(saveError.message || "Unable to create church.");
    } finally {
      setSaving(false);
    }
  };

  const openChurchModal = (church, mode = "view") => {
    setSelectedChurch({
      name: church.name || "",
      churchId: church.churchId || "",
      dbName: church.dbName || "",
      status: church.status || "active",
      adminDisplayName: church.createdAdmin?.displayName || "",
      adminUsername: church.createdAdmin?.username || "",
      adminEmail: church.createdAdmin?.email || "",
      currencyCode: church.currencyCode || branding.defaultCurrencyCode || currencyOptions[0]?.code || "GHS",
      enabledNavigation: Array.isArray(church.enabledNavigation) ? church.enabledNavigation : [],
    });
    setDetailMode(mode);
  };

  const handleChurchUpdate = async () => {
    if (!selectedChurch?.churchId) {
      return;
    }

    try {
      setSaving(true);
      const savedChurch = await churchApi.updateChurch(selectedChurch.churchId, buildPayload(selectedChurch));
      setChurches((current) =>
        current.map((church) =>
          (church.churchId || church._id) === (savedChurch.churchId || savedChurch._id) ? savedChurch : church
        )
      );
      openChurchModal(savedChurch, "view");
      notifySuccess(`Tenant ${savedChurch.name} updated successfully.`);
    } catch (saveError) {
      notifyError(saveError.message || "Unable to update church.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="surface-card data-card">
        <div className="section-headline compact">
          <div>
            <h3>Tenant Churches</h3>
            <p>Each church gets its own database on the same MongoDB cluster, with a seeded default admin and tenant-specific sidebar grants.</p>
          </div>
          <button type="button" className="primary-button" onClick={() => setShowModal(true)}>
            <FaPlus />
            Add Church
          </button>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Church</th>
                <th>Church ID</th>
                <th>Currency</th>
                <th>Database</th>
                <th>Status</th>
                <th>Default Admin</th>
                <th>Enabled Menus</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty-table">Loading churches...</td>
                </tr>
              ) : churches.length ? (
                churches.map((church) => (
                  <tr
                    key={church._id || church.churchId}
                    className="clickable-row"
                    onClick={() => openChurchModal(church)}
                  >
                    <td>{church.name}</td>
                    <td>{church.churchId}</td>
                    <td>{church.currencyCode || branding.defaultCurrencyCode || "-"}</td>
                    <td>{church.dbName}</td>
                    <td>{church.status}</td>
                    <td>
                      {church.createdAdmin?.displayName || "-"}
                      <br />
                      <span className="muted-inline">{church.createdAdmin?.username || ""}</span>
                    </td>
                    <td>{Array.isArray(church.enabledNavigation) && church.enabledNavigation.length ? church.enabledNavigation.join(", ") : "All tenant menus"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-table">No churches created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal ? (
        <ModalShell
          title="Add Church"
          subtitle="Create a tenant church, its dedicated database, default admin account, and tenant menu grants."
          onClose={() => {
            setShowModal(false);
            setForm({
              ...initialForm,
              currencyCode: branding.defaultCurrencyCode || currencyOptions[0]?.code || "GHS",
            });
          }}
        >
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Church Name
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Church ID
                <input value={form.churchId} onChange={(event) => setForm((current) => ({ ...current, churchId: event.target.value }))} placeholder="Used during login" />
              </label>
              <label>
                Currency
                <select value={form.currencyCode} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value }))}>
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Admin Display Name
                <input value={form.adminDisplayName} onChange={(event) => setForm((current) => ({ ...current, adminDisplayName: event.target.value }))} />
              </label>
              <label>
                Admin Username
                <input value={form.adminUsername} onChange={(event) => setForm((current) => ({ ...current, adminUsername: event.target.value }))} />
              </label>
              <label>
                Admin Email
                <input value={form.adminEmail} onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))} />
              </label>
              <label>
                Admin PIN
                <input type="password" value={form.adminPin} onChange={(event) => setForm((current) => ({ ...current, adminPin: event.target.value }))} />
              </label>
            </div>

            <div className="surface-subsection">
              <h3>Tenant Menu Grants</h3>
              <p>Choose the sidebar menus and submenus that this church can access. Permissions still apply inside the tenant.</p>
              <div className="simple-list">
                {grantSections.map((section) => {
                  const sectionKeys = [section.key, ...(Array.isArray(section.children) ? section.children.map((child) => child.key) : [])];
                  const allSelected = sectionKeys.every((key) => form.enabledNavigation.includes(key));

                  return (
                    <div key={section.key} className="simple-list-item">
                      <label className="checkbox-row">
                        <input type="checkbox" checked={allSelected} onChange={() => toggleSection(section)} />
                        <strong>{section.label}</strong>
                      </label>
                      {Array.isArray(section.children) ? (
                        <div className="checkbox-grid">
                          {section.children.map((child) => (
                            <label key={child.key} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={form.enabledNavigation.includes(child.key)}
                                onChange={() => toggleGrant(child.key)}
                              />
                              <span>{child.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? "Creating..." : "Create Church"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedChurch ? (
        <ModalShell
          title="Church Details"
          subtitle="Review tenant details, then switch to edit mode to update the church name, admin details, menu grants, or assigned currency."
          onClose={() => {
            setSelectedChurch(null);
            setDetailMode("view");
          }}
        >
          <div className="modal-form">
            <div className="form-grid">
              <label>
                Church Name
                <input
                  value={selectedChurch.name}
                  readOnly={detailMode !== "edit"}
                  onChange={(event) => setSelectedChurch((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Church ID
                <input value={selectedChurch.churchId} readOnly />
              </label>
              <label>
                Database
                <input value={selectedChurch.dbName} readOnly />
              </label>
              <label>
                Status
                <select
                  value={selectedChurch.status}
                  disabled={detailMode !== "edit"}
                  onChange={(event) => setSelectedChurch((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </label>
              <label>
                Currency
                <select
                  value={selectedChurch.currencyCode}
                  disabled={detailMode !== "edit"}
                  onChange={(event) => setSelectedChurch((current) => ({ ...current, currencyCode: event.target.value }))}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Admin Display Name
                <input
                  value={selectedChurch.adminDisplayName}
                  readOnly={detailMode !== "edit"}
                  onChange={(event) => setSelectedChurch((current) => ({ ...current, adminDisplayName: event.target.value }))}
                />
              </label>
              <label>
                Admin Username
                <input
                  value={selectedChurch.adminUsername}
                  readOnly={detailMode !== "edit"}
                  onChange={(event) => setSelectedChurch((current) => ({ ...current, adminUsername: event.target.value }))}
                />
              </label>
              <label>
                Admin Email
                <input
                  value={selectedChurch.adminEmail}
                  readOnly={detailMode !== "edit"}
                  onChange={(event) => setSelectedChurch((current) => ({ ...current, adminEmail: event.target.value }))}
                />
              </label>
            </div>

            <div className="surface-subsection">
              <h3>Tenant Menu Grants</h3>
              <p>Use the edit button to change the menus and submenus available in this tenant sidebar.</p>
              <div className="simple-list">
                {grantSections.map((section) => {
                  const sectionKeys = [section.key, ...(Array.isArray(section.children) ? section.children.map((child) => child.key) : [])];
                  const allSelected = sectionKeys.every((key) => selectedChurch.enabledNavigation.includes(key));

                  return (
                    <div key={section.key} className="simple-list-item">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={detailMode !== "edit"}
                          onChange={() => {
                            if (detailMode !== "edit") {
                              return;
                            }

                            const currentSet = new Set(selectedChurch.enabledNavigation);
                            if (allSelected) {
                              sectionKeys.forEach((key) => currentSet.delete(key));
                            } else {
                              sectionKeys.forEach((key) => currentSet.add(key));
                            }

                            setSelectedChurch((current) => ({ ...current, enabledNavigation: Array.from(currentSet) }));
                          }}
                        />
                        <strong>{section.label}</strong>
                      </label>
                      {Array.isArray(section.children) ? (
                        <div className="checkbox-grid">
                          {section.children.map((child) => (
                            <label key={child.key} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={selectedChurch.enabledNavigation.includes(child.key)}
                                disabled={detailMode !== "edit"}
                                onChange={() => {
                                  if (detailMode !== "edit") {
                                    return;
                                  }

                                  const currentSet = new Set(selectedChurch.enabledNavigation);
                                  if (currentSet.has(child.key)) {
                                    currentSet.delete(child.key);
                                  } else {
                                    currentSet.add(child.key);
                                  }

                                  setSelectedChurch((current) => ({ ...current, enabledNavigation: Array.from(currentSet) }));
                                }}
                              />
                              <span>{child.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setSelectedChurch(null);
                  setDetailMode("view");
                }}
              >
                Close
              </button>
              {detailMode === "edit" ? (
                <>
                  <button type="button" className="ghost-button" onClick={() => setDetailMode("view")}>
                    Cancel Edit
                  </button>
                  <button type="button" className="primary-button" disabled={saving} onClick={handleChurchUpdate}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <button type="button" className="primary-button" onClick={() => setDetailMode("edit")}>
                  Edit
                </button>
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
