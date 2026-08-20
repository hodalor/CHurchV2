import ModalShell from "./ModalShell";
import { useAppContext } from "../../context/AppContext";
import AttendanceEventActionPanel from "../attendance/AttendanceEventActionPanel";
import AttendanceEventRecordFields from "../attendance/AttendanceEventRecordFields";
import DiscipleshipEnrollmentActionPanel from "../discipleship/DiscipleshipEnrollmentActionPanel";
import DiscipleshipEnrollmentRecordFields from "../discipleship/DiscipleshipEnrollmentRecordFields";
import BibleStudyRecordFields from "../evangelism/BibleStudyRecordFields";
import ProspectActionPanel from "../evangelism/ProspectActionPanel";
import ProspectRecordFields from "../evangelism/ProspectRecordFields";
import FamilyRecordFields from "../family/FamilyRecordFields";
import MinistryRecordFields from "../ministries/MinistryRecordFields";
import GroupRecordFields from "../setup/GroupRecordFields";
import AppConfigFields from "../setup/AppConfigFields";
import UserAccountFields from "../users/UserAccountFields";
import VisitorActionPanel from "../visitors/VisitorActionPanel";
import VisitorRecordFields from "../visitors/VisitorRecordFields";

export default function RecordDetailModal() {
  const {
    recordModal,
    closeRecordModal,
    saveRecordModal,
    deleteRecordModal,
    setRecordModalDraft,
    setRecordModalMode,
    openMemberEnrollment,
    groups,
    members,
    roles,
    users,
    permissionCatalog,
    visitorHowHeardOptions,
    evangelismSourceOptions,
    evangelismStageOptions,
    bibleStudyStatusOptions,
    discipleshipStatusOptions,
    attendanceEventTypeOptions,
    campaigns,
    prospects,
    discipleshipProgrammes,
    ministries,
    regenerateMemberQr,
    mediaUploadState,
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
      {type === "member" ? (
        <div className="modal-form">
          <div className="section-headline compact">
            <div>
              <h3>Member QR</h3>
              <p>Staff can view, print, or reissue the member check-in QR here.</p>
            </div>
            <div className="modal-actions">
              {draft.qrCodeImageUrl ? (
                <div className="qr-preview-card">
                  <img src={draft.qrCodeImageUrl} alt={`${draft.firstName || "Member"} QR code`} className="qr-preview-image" />
                </div>
              ) : null}
              {draft.qrCodeImageUrl ? (
                <a className="ghost-button small" href={draft.qrCodeImageUrl} target="_blank" rel="noreferrer">
                  View / Print QR
                </a>
              ) : null}
              {draft._id ? (
                <button
                  type="button"
                  className="ghost-button small"
                  disabled={mediaUploadState.loading}
                  onClick={() => regenerateMemberQr(draft._id)}
                >
                  Reissue QR
                </button>
              ) : null}
            </div>
          </div>

          <div className="form-grid">
            {fields.map((field) => (
              <label key={field.name} className={field.wide ? "full-width" : ""}>
                {field.label}
                {field.type === "select" ? (
                  <select
                    value={getFieldValue(field, draft)}
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
                    value={getFieldValue(field, draft)}
                    readOnly={!isEditing}
                    onChange={(event) =>
                      setRecordModalDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={getFieldValue(field, draft)}
                    readOnly={!isEditing}
                    onChange={(event) =>
                      setRecordModalDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                )}
              </label>
            ))}
            <label>
              QR Active
              <input value={draft.qrActive !== false ? "Yes" : "No"} readOnly />
            </label>
            <label>
              QR Generated
              <input value={draft.qrGeneratedAt || ""} readOnly />
            </label>
            <label className="full-width">
              QR Token
              <input value={draft.qrToken || ""} readOnly />
            </label>
          </div>

          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
            onEdit={() => openMemberEnrollment(draft)}
            editLabel="Edit In Steps"
          />
        </div>
      ) : type === "family" ? (
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
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "visitor" ? (
        <>
          <VisitorRecordFields
            draft={draft}
            isEditing={isEditing}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
            howHeardOptions={visitorHowHeardOptions}
            members={members}
            users={users}
          />
          <VisitorActionPanel visitor={draft} />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft.visitorId)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "prospect" ? (
        <>
          <ProspectRecordFields
            draft={draft}
            isEditing={isEditing}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
            sourceOptions={evangelismSourceOptions}
            stageOptions={evangelismStageOptions}
            campaignOptions={campaigns}
            members={members}
            users={users}
          />
          <ProspectActionPanel prospect={draft} />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft.prospectId)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "bibleStudy" ? (
        <>
          <BibleStudyRecordFields
            draft={draft}
            isEditing={isEditing}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
            prospects={prospects}
            members={members}
            users={users}
            statusOptions={bibleStudyStatusOptions}
          />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "discipleshipEnrollment" ? (
        <>
          <DiscipleshipEnrollmentRecordFields
            draft={draft}
            isEditing={isEditing}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
            members={members}
            programmes={discipleshipProgrammes}
            users={users}
            statusOptions={discipleshipStatusOptions}
          />
          <DiscipleshipEnrollmentActionPanel enrollment={draft} />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "attendanceEvent" ? (
        <>
          <AttendanceEventRecordFields
            draft={draft}
            isEditing={isEditing}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
            eventTypeOptions={attendanceEventTypeOptions}
            ministries={ministries}
          />
          <AttendanceEventActionPanel event={draft} />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "ministry" ? (
        <>
          <MinistryRecordFields
            draft={draft}
            isEditing={isEditing}
            members={members}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
          />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "group" ? (
        <>
          <GroupRecordFields
            draft={draft}
            isEditing={isEditing}
            groups={groups}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
          />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "user" ? (
        <>
          <UserAccountFields
            draft={draft}
            isEditing={isEditing}
            roles={roles}
            members={members}
            permissionCatalog={permissionCatalog}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
          />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={false}
            setRecordModalMode={setRecordModalMode}
          />
        </>
      ) : type === "appConfig" ? (
        <>
          <AppConfigFields
            draft={draft}
            isEditing={isEditing}
            onChange={(field, value) =>
              setRecordModalDraft((current) => ({ ...current, [field]: value }))
            }
          />
          <RecordModalActions
            isEditing={isEditing}
            closeRecordModal={closeRecordModal}
            saveRecordModal={saveRecordModal}
            deleteRecordModal={deleteRecordModal}
            canDelete={false}
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
                    value={getFieldValue(field, draft)}
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
                    value={getFieldValue(field, draft)}
                    readOnly={!isEditing}
                    onChange={(event) =>
                      setRecordModalDraft((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={getFieldValue(field, draft)}
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
            deleteRecordModal={deleteRecordModal}
            canDelete={Boolean(draft._id)}
            setRecordModalMode={setRecordModalMode}
          />
        </div>
      )}
    </ModalShell>
  );
}

function RecordModalActions({
  isEditing,
  closeRecordModal,
  saveRecordModal,
  deleteRecordModal,
  canDelete,
  setRecordModalMode,
  onEdit = null,
  editLabel = "Edit",
}) {
  return (
    <div className="modal-actions">
      <button type="button" className="ghost-button" onClick={closeRecordModal}>
        Close
      </button>
      {canDelete ? (
        <button type="button" className="ghost-button delete-button" onClick={deleteRecordModal}>
          Delete
        </button>
      ) : null}
      {isEditing ? (
        <>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setRecordModalMode("view")}
          >
            Cancel Edit
          </button>
          <button type="button" className="primary-button" onClick={saveRecordModal}>
            Save
          </button>
        </>
      ) : (
        <button
          type="button"
          className="primary-button"
          onClick={onEdit || (() => setRecordModalMode("edit"))}
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

function getTitle(type) {
  const titles = {
    member: "Member Details",
    visitor: "Visitor Details",
    prospect: "Prospect Details",
    bibleStudy: "Bible Study Details",
    campaign: "Campaign Details",
    discipleshipProgramme: "Discipleship Programme Details",
    discipleshipEnrollment: "Discipleship Enrollment Details",
    finance: "Finance Details",
    attendance: "Attendance Details",
    attendanceEvent: "Attendance Event Details",
    user: "User Details",
    appConfig: "App Configuration",
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
      {
        name: "membershipStatus",
        label: "Membership Status",
        type: "select",
        options: ["Active", "Inactive", "New Convert", "Transferred In", "Transferred Out", "Relocated", "Under Restoration", "Deceased"],
      },
      { name: "baptismStatus", label: "Baptism Status", type: "select", options: ["Not Baptized", "Baptized"] },
      { name: "city", label: "City" },
      { name: "familyName", label: "Household" },
      { name: "householdRole", label: "Role In Household" },
      { name: "address", label: "Address", wide: true },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
    ];
  }

  if (type === "visitor") {
    return [];
  }

  if (type === "prospect" || type === "bibleStudy" || type === "discipleshipEnrollment" || type === "attendanceEvent") {
    return [];
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

  if (type === "role") {
    return [
      { name: "name", label: "Role Name" },
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

  if (type === "campaign") {
    return [
      { name: "name", label: "Campaign Name" },
      { name: "startDate", label: "Start Date", type: "date" },
      { name: "endDate", label: "End Date", type: "date" },
      { name: "summaryNotes", label: "Summary Notes", type: "textarea", wide: true },
    ];
  }

  if (type === "discipleshipProgramme") {
    return [
      { name: "name", label: "Programme Name" },
      { name: "expectedDurationDays", label: "Expected Duration (Days)", type: "number" },
      { name: "isActive", label: "Active", type: "select", options: ["true", "false"] },
      { name: "modules", label: "Programme Modules", type: "textarea", wide: true },
    ];
  }

  if (type === "family") {
    return [];
  }

  return [];
}

function getFieldValue(field, draft) {
  const value = draft[field.name];

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (field.type === "select" && typeof value === "boolean") {
    return String(value);
  }

  if (field.type === "date" && value) {
    return String(value).slice(0, 10);
  }

  return value ?? "";
}
