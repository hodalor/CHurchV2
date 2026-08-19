import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";

const VISITOR_PERMISSIONS = {
  manage: "manage_visitors",
  assign: "assign_visitor_followup",
  convert: "convert_visitor",
};

export default function VisitorActionPanel({ visitor }) {
  const {
    users,
    visitorApiState,
    recordVisitorChurchVisit,
    assignVisitorFollowUp,
    recordVisitorHomeVisit,
    convertVisitorToProspect,
    convertVisitorToMember,
  } = useAppContext();
  const { authUser } = useAuth();
  const [churchVisit, setChurchVisit] = useState({
    date: getToday(),
    notes: "",
  });
  const [homeVisit, setHomeVisit] = useState({
    date: getToday(),
    notes: "",
  });
  const [assignment, setAssignment] = useState(visitor?.assignedFollowUpUserId?._id || "");
  const [memberConversion, setMemberConversion] = useState({
    city: "",
    address: "",
    membershipStatus: "Active",
    baptismStatus: "Not Baptized",
    membershipDate: getToday(),
    baptismDate: "",
    notes: "Created from visitor conversion",
  });

  const permissionSet = useMemo(() => new Set(authUser?.permissions || []), [authUser?.permissions]);
  const canManage = permissionSet.has(VISITOR_PERMISSIONS.manage);
  const canAssign = permissionSet.has(VISITOR_PERMISSIONS.assign);
  const canConvert = permissionSet.has(VISITOR_PERMISSIONS.convert);
  const latestChurchVisit = getLatestVisit(visitor?.visitDates);
  const latestHomeVisit = getLatestVisit(visitor?.visitationHistory);
  const actionDisabled = visitorApiState.loading || !visitor?.visitorId || !visitor?._id;

  useEffect(() => {
    setAssignment(visitor?.assignedFollowUpUserId?._id || "");
  }, [visitor?.assignedFollowUpUserId?._id]);

  if (!visitor?.visitorId || !visitor?._id) {
    return null;
  }

  const handleChurchVisitSave = async () => {
    await recordVisitorChurchVisit(visitor.visitorId, churchVisit);
    setChurchVisit({ date: getToday(), notes: "" });
  };

  const handleAssign = async () => {
    if (!assignment) {
      return;
    }

    await assignVisitorFollowUp(visitor.visitorId, assignment);
  };

  const handleHomeVisitSave = async () => {
    await recordVisitorHomeVisit(visitor.visitorId, homeVisit);
    setHomeVisit({ date: getToday(), notes: "" });
  };

  const handleConvertToProspect = async () => {
    await convertVisitorToProspect(visitor.visitorId);
  };

  const handleConvertToMember = async () => {
    await convertVisitorToMember(visitor.visitorId, memberConversion);
  };

  return (
    <div className="visitor-action-stack">
      <section className="subsection-card">
        <div className="section-headline compact">
          <h3>Workflow Snapshot</h3>
        </div>
        <div className="info-grid">
          <article className="info-tile">
            <span>Current Status</span>
            <strong>{visitor.status?.label || "Pending"}</strong>
          </article>
          <article className="info-tile">
            <span>Last Church Visit</span>
            <strong>{latestChurchVisit || "Not recorded"}</strong>
          </article>
          <article className="info-tile">
            <span>Last Home Visit</span>
            <strong>{latestHomeVisit || "Not recorded"}</strong>
          </article>
          <article className="info-tile">
            <span>Conversion Path</span>
            <strong>
              {visitor.convertedToMemberId
                ? `Member ${visitor.convertedToMemberId}`
                : visitor.convertedToProspectId
                  ? `Prospect ${visitor.convertedToProspectId}`
                  : "Still in visitor pipeline"}
            </strong>
          </article>
        </div>
      </section>

      {canManage ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Record Church Visit</h3>
          </div>
          <div className="form-grid">
            <label>
              Visit Date
              <input
                type="date"
                value={churchVisit.date}
                onChange={(event) =>
                  setChurchVisit((current) => ({ ...current, date: event.target.value }))
                }
              />
            </label>
            <label className="full-width">
              Visit Notes
              <textarea
                rows="3"
                value={churchVisit.notes}
                onChange={(event) =>
                  setChurchVisit((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled}
              onClick={handleChurchVisitSave}
            >
              Save Church Visit
            </button>
          </div>
        </section>
      ) : null}

      {canAssign ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Assign Follow-Up</h3>
          </div>
          <div className="form-grid">
            <label>
              Responsible User
              <select value={assignment} onChange={(event) => setAssignment(event.target.value)}>
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </label>
            <article className="info-tile">
              <span>Current Assignee</span>
              <strong>{visitor.assignedFollowUpUserId?.displayName || "Unassigned"}</strong>
            </article>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled || !assignment}
              onClick={handleAssign}
            >
              Assign Follow-Up
            </button>
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Record Home Visit</h3>
          </div>
          <div className="form-grid">
            <label>
              Visit Date
              <input
                type="date"
                value={homeVisit.date}
                onChange={(event) => setHomeVisit((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <label className="full-width">
              Notes
              <textarea
                rows="3"
                value={homeVisit.notes}
                onChange={(event) => setHomeVisit((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled}
              onClick={handleHomeVisitSave}
            >
              Save Home Visit
            </button>
          </div>
        </section>
      ) : null}

      {canConvert ? (
        <section className="subsection-card">
          <div className="section-headline compact">
            <h3>Conversion Actions</h3>
          </div>
          <div className="form-grid">
            <article className="info-tile">
              <span>Convert To Prospect</span>
              <strong>
                {visitor.convertedToProspectId
                  ? `Already linked to ${visitor.convertedToProspectId}`
                  : "Create evangelism prospect from this visitor"}
              </strong>
            </article>
            <article className="info-tile">
              <span>Convert To Member</span>
              <strong>
                {visitor.convertedToMemberId
                  ? `Already linked to ${visitor.convertedToMemberId}`
                  : "Write directly into the existing member register"}
              </strong>
            </article>
            <label>
              City
              <input
                value={memberConversion.city}
                onChange={(event) =>
                  setMemberConversion((current) => ({ ...current, city: event.target.value }))
                }
              />
            </label>
            <label>
              Address
              <input
                value={memberConversion.address}
                onChange={(event) =>
                  setMemberConversion((current) => ({ ...current, address: event.target.value }))
                }
              />
            </label>
            <label>
              Membership Status
              <select
                value={memberConversion.membershipStatus}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    membershipStatus: event.target.value,
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="New Convert">New Convert</option>
                <option value="Transferred In">Transferred In</option>
                <option value="Transferred Out">Transferred Out</option>
                <option value="Relocated">Relocated</option>
                <option value="Under Restoration">Under Restoration</option>
                <option value="Deceased">Deceased</option>
              </select>
            </label>
            <label>
              Baptism Status
              <select
                value={memberConversion.baptismStatus}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    baptismStatus: event.target.value,
                  }))
                }
              >
                <option value="Not Baptized">Not Baptized</option>
                <option value="Baptized">Baptized</option>
              </select>
            </label>
            <label>
              Membership Date
              <input
                type="date"
                value={memberConversion.membershipDate}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    membershipDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Baptism Date
              <input
                type="date"
                value={memberConversion.baptismDate}
                onChange={(event) =>
                  setMemberConversion((current) => ({
                    ...current,
                    baptismDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="full-width">
              Member Notes
              <textarea
                rows="3"
                value={memberConversion.notes}
                onChange={(event) =>
                  setMemberConversion((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button small"
              disabled={actionDisabled || Boolean(visitor.convertedToProspectId)}
              onClick={handleConvertToProspect}
            >
              Convert To Prospect
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={actionDisabled || Boolean(visitor.convertedToMemberId)}
              onClick={handleConvertToMember}
            >
              Convert To Member
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function getLatestVisit(items = []) {
  if (!items.length) {
    return "";
  }

  const latest = [...items].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  )[0];

  return latest?.date ? formatDate(latest.date) : "";
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString();
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
