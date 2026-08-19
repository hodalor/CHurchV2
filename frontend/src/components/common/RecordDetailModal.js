import ModalShell from "./ModalShell";
import { useAppContext } from "../../context/AppContext";
import FamilyRecordFields from "../family/FamilyRecordFields";

export default function RecordDetailModal() {
  const {
    recordModal,
    closeRecordModal,
    saveRecordModal,
    setRecordModalDraft,
    setRecordModalMode,
    groups,
    members,
    roles,
  } = useAppContext();

  if (!recordModal.open || !recordModal.draft) {
    return null;
  }

  const { type, draft, mode } = recordModal;
  const isEditing = mode === "edit";
  const fields = getFields(type, groups, roles);

  return (
    <ModalShell
      title={getTitle(type)}
      subtitle="Click Edit to update details, then Save when you are done."
      onClose={closeRecordModal}
    >
      {type === "family" ? (
        <>
          <FamilyRecordFields
            draft={draft}
            isEditing={isEditing}
            members={members}
            groups={groups}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
          />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : (
        <div className="modal-form">
          <div className="form-grid">
            {fields.map((field) => (
              <label key={field.name} className={field.wide ? "full-width" : ""}>
                {field.label}
                {field.type === "select" ? (
                  <select
                    value={Array.isArray(draft[field.name]) ? draft[field.name].join(", ") : draft[field.name] ?? ""}
                    disabled={!isEditing}
                    onChange={(event) =>
                      setRecordModalDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    rows="4"
                    value={Array.isArray(draft[field.name]) ? draft[field.name].join(", ") : draft[field.name] ?? ""}
                    readOnly={!isEditing}
                    onChange={(event) =>
                      setRecordModalDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={Array.isArray(draft[field.name]) ? draft[field.name].join(", ") : draft[field.name] ?? ""}
                    readOnly={!isEditing}
                    onChange={(event) =>
                      setRecordModalDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </div>

          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            setRecordModalMode={setRecordModalMode}
          />
        </div>
      )}
    </ModalShell>
  );
}

function RecordModalActions({ isEditing, closeRecordModal, saveRecordModal, setRecordModalMode }) {
  return (
    <div className="modal-actions">
      <button type="button" className="ghost-button" onClick={closeRecordModal}>
        Close
      </button>
      <button
        type="button"
        className="ghost-button"
        onClick={() => setRecordModalMode(isEditing ? "view" : "edit")}
      >
        {isEditing ? "Cancel Edit" : "Edit"}
      </button>
      <button type="button" className="primary-button" onClick={isEditing ? saveRecordModal : () => setRecordModalMode("edit")}>
        {isEditing ? "Save" : "Edit"}
      </button>
    </div>
  );
}

function getTitle(type) {
  const titles = {
    member: "Member Details",
    visitor: "Visitor Details",
    finance: "Finance Details",
    attendance: "Attendance Details",
    user: "User Details",
    ministry: "Ministry Details",
    role: "Role Details",
    group: "Group Details",
    family: "Family Details",
    branding: "Branding Details",
  };

  return titles[type] || "Record Details";
}

function getFields(type, groups, roles) {
  if (type === "member") {
    return [
      { name: "memberId", label: "Member ID" },
      { name: "firstName", label: "First Name" },
      { name: "lastName", label: "Last Name" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email" },
      { name: "membershipStatus", label: "Membership Status", type: "select", options: ["Active", "Dormant", "Inactive", "Passed On"] },
      { name: "baptismStatus", label: "Baptism Status", type: "select", options: ["Not Baptized", "Baptized"] },
      { name: "city", label: "City" },
      { name: "familyName", label: "Household" },
      { name: "householdRole", label: "Role In Household" },
      { name: "address", label: "Address", wide: true },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
    ];
  }

  if (type === "visitor") {
    return [
      { name: "fullName", label: "Full Name" },
      { name: "phone", label: "Phone" },
      { name: "stage", label: "Stage" },
      { name: "assignedTo", label: "Assigned To" },
      { name: "nextStep", label: "Next Step", wide: true },
    ];
  }

  if (type === "finance") {
    return [
      { name: "recordNo", label: "Record No" },
      { name: "category", label: "Category" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "date", label: "Date", type: "date" },
      { name: "status", label: "Status", type: "select", options: ["Pending", "Posted"] },
      { name: "description", label: "Description", wide: true },
    ];
  }

  if (type === "attendance") {
    return [
      { name: "service", label: "Service" },
      { name: "zone", label: "Zone" },
      { name: "date", label: "Date", type: "date" },
      { name: "expected", label: "Expected", type: "number" },
      { name: "present", label: "Present", type: "number" },
    ];
  }

  if (type === "user") {
    return [
      { name: "fullName", label: "Full Name" },
      { name: "email", label: "Email" },
      { name: "role", label: "Role", type: "select", options: roles.map((role) => role.name) },
      { name: "status", label: "Status", type: "select", options: ["Pending", "Active", "Disabled"] },
    ];
  }

  if (type === "ministry") {
    return [
      { name: "name", label: "Name" },
      { name: "leader", label: "Leader" },
      { name: "color", label: "Color" },
      { name: "description", label: "Description", wide: true },
    ];
  }

  if (type === "role") {
    return [
      { name: "name", label: "Role Name" },
      { name: "description", label: "Description", wide: true },
    ];
  }

  if (type === "group") {
    return [
      { name: "name", label: "Group Name" },
      { name: "levelName", label: "Level Name" },
      { name: "code", label: "Code" },
      { name: "parentId", label: "Parent Group", type: "select", options: ["", ...groups.map((group) => group.id)] },
      { name: "description", label: "Description", wide: true },
    ];
  }

  if (type === "branding") {
    return [
      { name: "churchName", label: "Church Name" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email" },
      { name: "website", label: "Website" },
      { name: "address", label: "Address", wide: true },
    ];
  }

  if (type === "family") {
    return [];
  }

  return [];
}
