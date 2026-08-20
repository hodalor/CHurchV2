import { useMemo } from "react";

export default function UserAccountFields({
  draft,
  isEditing,
  roles,
  members,
  permissionCatalog,
  onChange,
}) {
  const selectedRoleId = draft.roleIds?.[0] || "";
  const selectedRole = useMemo(
    () => roles.find((role) => (role._id || role.id || role.name) === selectedRoleId) || null,
    [roles, selectedRoleId]
  );
  const selectedPermissions = new Set(draft.permissions || []);

  return (
    <div className="modal-form">
      <div className="section-headline compact">
        <div>
          <h3>Create User Account</h3>
          <p>Select a role, preload its module access, then fine-tune permissions with the checkboxes.</p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Full Name
          <input
            value={draft.displayName || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("displayName", event.target.value)}
          />
        </label>
        <label>
          Username
          <input
            value={draft.username || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("username", event.target.value)}
          />
        </label>
        <label>
          PIN
          <input
            type="password"
            value={draft.pin || ""}
            readOnly={!isEditing}
            placeholder={draft._id ? "Leave blank to keep current PIN" : "Enter PIN"}
            onChange={(event) => onChange("pin", event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            value={draft.email || ""}
            readOnly={!isEditing}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </label>
        <label>
          Role
          <select
            value={selectedRoleId}
            disabled={!isEditing}
            onChange={(event) => {
              const nextRoleId = event.target.value;
              const nextRole = roles.find((role) => (role._id || role.id || role.name) === nextRoleId);
              onChange("roleIds", nextRoleId ? [nextRoleId] : []);
              onChange("permissions", nextRole?.permissions || []);
            }}
          >
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role._id || role.id || role.name} value={role._id || role.id || role.name}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Linked Member
          <select
            value={draft.memberId || ""}
            disabled={!isEditing}
            onChange={(event) => onChange("memberId", event.target.value)}
          >
            <option value="">Optional member link</option>
            {members.map((member) => (
              <option key={member._id || member.memberId} value={member.memberId}>
                {member.memberId} - {member.firstName} {member.lastName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={draft.status || "Pending"}
            disabled={!isEditing}
            onChange={(event) => onChange("status", event.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
        </label>
      </div>

      {selectedRole ? (
        <div className="soft-note">
          Role default: <strong>{selectedRole.name}</strong>
        </div>
      ) : null}

      <div className="permission-grid">
        {permissionCatalog.map((group) => (
          <article key={group.key} className="permission-card">
            <h4>{group.title}</h4>
            <div className="permission-list">
              {group.permissions.map((permission) => (
                <label key={permission.key} className="permission-option">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.has(permission.key)}
                    disabled={!isEditing}
                    onChange={(event) => {
                      const nextPermissions = new Set(draft.permissions || []);
                      if (event.target.checked) {
                        nextPermissions.add(permission.key);
                      } else {
                        nextPermissions.delete(permission.key);
                      }
                      onChange("permissions", [...nextPermissions]);
                    }}
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
