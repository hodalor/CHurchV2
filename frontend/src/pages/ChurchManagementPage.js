import { useEffect, useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
import ModalShell from "../components/common/ModalShell";
import { churchApi } from "../apis/churchApi";
import { navigationSections } from "../lib/navigation";

const initialForm = {
  name: "",
  churchId: "",
  slug: "",
  adminDisplayName: "",
  adminUsername: "",
  adminEmail: "",
  adminPin: "",
  enabledNavigation: [],
};

function slugify(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeChurchId(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export default function ChurchManagementPage() {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);

  const grantSections = useMemo(
    () =>
      navigationSections.filter(
        (section) => !section.superadminOnly && !["dashboard", "settings", "church-management"].includes(section.key)
      ),
    []
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      const payload = {
        ...form,
        churchId: normalizeChurchId(form.churchId || form.name),
        slug: slugify(form.slug || form.name),
      };
      const createdChurch = await churchApi.createChurch(payload);
      setChurches((current) => [createdChurch, ...current]);
      setForm(initialForm);
      setShowModal(false);
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Unable to create church.");
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
                <th>Database</th>
                <th>Status</th>
                <th>Default Admin</th>
                <th>Enabled Menus</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-table">Loading churches...</td>
                </tr>
              ) : churches.length ? (
                churches.map((church) => (
                  <tr key={church._id || church.churchId}>
                    <td>{church.name}</td>
                    <td>{church.churchId}</td>
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
                  <td colSpan={6} className="empty-table">No churches created yet.</td>
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
            setForm(initialForm);
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
                Slug
                <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Optional URL-safe slug" />
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
    </div>
  );
}
