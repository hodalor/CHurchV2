import { useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import ModalShell from "../components/common/ModalShell";
import { churchApi } from "../apis/churchApi";
import { useAppContext } from "../context/AppContext";

function InfoTile({ label, value, wide }) {
  return (
    <div className={wide ? "info-tile wide" : "info-tile"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GroupNode({ group, groupsByParent, depth }) {
  const children = groupsByParent[group.id] || [];

  return (
    <div className="tree-node" style={{ marginLeft: depth * 18 }}>
      <div className="tree-label">
        <strong>{group.name}</strong>
      </div>
      {children.map((child) => (
        <GroupNode key={child.id} group={child} groupsByParent={groupsByParent} depth={depth + 1} />
      ))}
    </div>
  );
}

const emptyAccountForm = {
  name: "",
  accountNumber: "",
  provider: "",
  type: "bank",
  active: true,
};

export default function SetupPage() {
  const { activeSetupTab, setActiveSetupTab, groups, groupsByParent, branding, roles, openRecordModal, notifyError, notifySuccess, setBranding, authUser } =
    useAppContext();
  const [activeModal, setActiveModal] = useState("");
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [savingAccount, setSavingAccount] = useState(false);
  const depositAccounts = Array.isArray(branding.depositAccounts) ? branding.depositAccounts : [];
  const canManageSettings = authUser?.permissions?.includes("manage_settings");

  useEffect(() => {
    if (!["groups", "branding", "users", "accounts"].includes(activeSetupTab)) {
      setActiveSetupTab("groups");
    }
  }, [activeSetupTab, setActiveSetupTab]);

  async function handleSaveAccount(event) {
    event.preventDefault();
    try {
      setSavingAccount(true);
      const nextAccounts = await churchApi.createDepositAccount(accountForm);
      setBranding((current) => ({ ...current, depositAccounts: nextAccounts }));
      setAccountForm(emptyAccountForm);
      setActiveModal("");
      notifySuccess("Deposit account saved.");
    } catch (error) {
      notifyError(error.message || "Unable to save deposit account.");
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="tab-row">
        {["groups", "branding", "users", "accounts"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeSetupTab === tab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveSetupTab(tab)}
          >
            {tab === "users" ? "User Roles" : tab === "accounts" ? "Deposit Accounts" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeSetupTab === "groups" ? (
        <div className="content-layout">
          <section className="surface-card">
            <div className="section-headline">
              <div>
                <h3>Hierarchy Preview</h3>
                <p>Preview of parent and child groups.</p>
              </div>
            </div>
            <div className="tree-view">
              {(groupsByParent.root || []).map((group) => (
                <GroupNode key={group.id} group={group} groupsByParent={groupsByParent} depth={0} />
              ))}
            </div>
          </section>

          <section className="surface-card side-panel">
            <div className="section-headline">
              <div>
                <h3>All Groups</h3>
                <p>Every created group with its parent and generated code.</p>
              </div>
            </div>
            <div className="simple-list">
              {groups.map((group) => (
                <div className="simple-list-item clickable-card" key={group.id} onClick={() => openRecordModal("group", group)}>
                  <div>
                    <strong>{group.name}</strong>
                    <p>
                      {group.parentName ? `Parent: ${group.parentName}` : "Top level group"}
                      {group.code ? ` - ${group.code}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeSetupTab === "branding" ? (
        <section className="surface-card">
          <div className="info-grid">
            <InfoTile label="Church Name" value={branding.churchName} />
            <InfoTile label="Phone" value={branding.phone} />
            <InfoTile label="Email" value={branding.email} />
            <InfoTile label="Website" value={branding.website} />
            <InfoTile label="Address" value={branding.address} wide />
          </div>
        </section>
      ) : null}

      {activeSetupTab === "users" ? (
        <section className="surface-card">
          <div className="simple-list">
            {roles.map((role) => (
              <div className="simple-list-item clickable-card" key={role._id || role.id || role.name} onClick={() => openRecordModal("role", role)}>
                <div>
                  <strong>{role.name}</strong>
                  <p>{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeSetupTab === "accounts" ? (
        <section className="surface-card data-card">
          <div className="section-headline compact">
            <div>
              <h3>Deposit Accounts</h3>
              <p>Create the church accounts where reconciled collections are deposited and expenses are deducted.</p>
            </div>
            {canManageSettings ? (
              <button type="button" className="primary-button" onClick={() => setActiveModal("account")}>
                <FaPlus />
                Add Account
              </button>
            ) : null}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th>Account No</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {depositAccounts.length ? (
                  depositAccounts.map((account) => (
                    <tr key={account._id || account.name}>
                      <td>{account.name}</td>
                      <td>{account.type}</td>
                      <td>{account.provider || "-"}</td>
                      <td>{account.accountNumber || "-"}</td>
                      <td>{account.active !== false ? "Active" : "Inactive"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table">No deposit accounts configured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeModal === "account" ? (
        <ModalShell
          title="Deposit Account"
          subtitle="Create the account that will receive reconciled collections or fund expenses."
          onClose={() => setActiveModal("")}
        >
          <form className="modal-form" onSubmit={handleSaveAccount}>
            <div className="form-grid">
              <label>
                Account Name
                <input value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Type
                <select value={accountForm.type} onChange={(event) => setAccountForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="bank">Bank</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Provider / Bank
                <input value={accountForm.provider} onChange={(event) => setAccountForm((current) => ({ ...current, provider: event.target.value }))} />
              </label>
              <label>
                Account Number
                <input value={accountForm.accountNumber} onChange={(event) => setAccountForm((current) => ({ ...current, accountNumber: event.target.value }))} />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveModal("")}>Cancel</button>
              <button type="submit" className="primary-button" disabled={savingAccount}>
                {savingAccount ? "Saving..." : "Save Account"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
