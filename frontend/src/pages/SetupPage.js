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

export default function SetupPage() {
  const { activeSetupTab, setActiveSetupTab, groups, groupsByParent, branding, roles, openRecordModal } = useAppContext();

  return (
    <div className="page-grid">
      <div className="tab-row">
        {["groups", "branding", "users"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeSetupTab === tab ? "tab-button active" : "tab-button"}
            onClick={() => setActiveSetupTab(tab)}
          >
            {tab === "users" ? "User Roles" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
    </div>
  );
}
