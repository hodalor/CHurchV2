import ModalShell from "../common/ModalShell";
import { useAppContext } from "../../context/AppContext";
import PhotoUploadCard from "./PhotoUploadCard";
import FamilyLinkManager from "./FamilyLinkManager";

const steps = ["Basic Info", "Church Info", "Groups", "Family", "Location"];

export default function MemberEnrollmentModal() {
  const {
    activeModal,
    closeModal,
    memberForm,
    setMemberForm,
    enrolmentStep,
    setEnrolmentStep,
    topLevelGroups,
    groupsByParent,
    families,
    handleMemberGroupChange,
    submitMemberForm,
  } = useAppContext();

  if (activeModal !== "member-enrolment") {
    return null;
  }

  const selectedChain = memberForm.groupChain.filter(Boolean);

  const handleNext = () => {
    if (enrolmentStep < steps.length - 1) {
      setEnrolmentStep((current) => current + 1);
      return;
    }

    submitMemberForm();
  };

  const handleBack = () => {
    setEnrolmentStep((current) => Math.max(current - 1, 0));
  };

  return (
    <ModalShell
      title="Membership Enrolment"
      subtitle="Capture the member in guided sections so the user is not overwhelmed."
      onClose={closeModal}
    >
      <div className="wizard-steps">
        {steps.map((step, index) => (
          <div key={step} className={index === enrolmentStep ? "wizard-step active" : "wizard-step"}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>

      <div className="modal-form">
        {enrolmentStep === 0 ? (
          <>
            <div className="member-type-switch">
              <button
                type="button"
                className={memberForm.memberType === "Adult" ? "member-type-card active" : "member-type-card"}
                onClick={() => setMemberForm((current) => ({ ...current, memberType: "Adult" }))}
              >
                <strong>Adult</strong>
                <p>Adult members should include national ID images.</p>
              </button>
              <button
                type="button"
                className={memberForm.memberType === "Child" ? "member-type-card active" : "member-type-card"}
                onClick={() => setMemberForm((current) => ({ ...current, memberType: "Child" }))}
              >
                <strong>Child</strong>
                <p>Children can be registered without ID card images.</p>
              </button>
            </div>

            <div className="form-grid">
              <label>
                Member ID
                <input value={memberForm.memberId} readOnly />
              </label>
              <label>
                First Name
                <input value={memberForm.firstName} onChange={(event) => setMemberForm((current) => ({ ...current, firstName: event.target.value }))} />
              </label>
              <label>
                Other Name
                <input value={memberForm.otherName} onChange={(event) => setMemberForm((current) => ({ ...current, otherName: event.target.value }))} />
              </label>
              <label>
                Last Name
                <input value={memberForm.lastName} onChange={(event) => setMemberForm((current) => ({ ...current, lastName: event.target.value }))} />
              </label>
              <label>
                Gender
                <select value={memberForm.gender} onChange={(event) => setMemberForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Child">Child</option>
                </select>
              </label>
              <label>
                Phone
                <input value={memberForm.phone} onChange={(event) => setMemberForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                Email
                <input value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                Marital Status
                <select value={memberForm.maritalStatus} onChange={(event) => setMemberForm((current) => ({ ...current, maritalStatus: event.target.value }))}>
                  <option value="">Select marital status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </label>
              <label>
                Date of Birth
                <input type="date" value={memberForm.dateOfBirth} onChange={(event) => setMemberForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
              </label>
            </div>

            <div className="upload-grid">
              <PhotoUploadCard
                title="Member Photo"
                description="Take a photo or attach a saved image."
                value={memberForm.personalPhoto}
                placeholder="No member photo"
                actionLabel="Upload Photo"
                round
                onChange={(event) => setMemberForm((current) => ({ ...current, personalPhoto: event.target.value }))}
              />
              <PhotoUploadCard
                title="ID Front"
                description="Optional - add when you have a photo of their ID card."
                value={memberForm.idFrontPhoto}
                placeholder="No ID front uploaded"
                actionLabel="Upload ID Front"
                type="id"
                onChange={(event) => setMemberForm((current) => ({ ...current, idFrontPhoto: event.target.value }))}
              />
              <PhotoUploadCard
                title="ID Back"
                description="Optional - add the back of the ID card when available."
                value={memberForm.idBackPhoto}
                placeholder="No ID back uploaded"
                actionLabel="Upload ID Back"
                type="id"
                onChange={(event) => setMemberForm((current) => ({ ...current, idBackPhoto: event.target.value }))}
              />
            </div>
          </>
        ) : null}

        {enrolmentStep === 1 ? (
          <div className="subsection-card">
            <div className="section-headline">
              <div>
                <p className="section-label">Section 4</p>
                <h3>Church Information</h3>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Membership Status
                <select value={memberForm.membershipStatus} onChange={(event) => setMemberForm((current) => ({ ...current, membershipStatus: event.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Dormant">Dormant</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Passed On">Passed On</option>
                </select>
              </label>
              <label>
                Membership Date
                <input type="date" value={memberForm.membershipDate} onChange={(event) => setMemberForm((current) => ({ ...current, membershipDate: event.target.value }))} />
              </label>
              <label>
                Baptism Status
                <select value={memberForm.baptismStatus} onChange={(event) => setMemberForm((current) => ({ ...current, baptismStatus: event.target.value }))}>
                  <option value="Not Baptized">Not Baptized</option>
                  <option value="Baptized">Baptized</option>
                </select>
              </label>
              <label>
                Baptism Date
                <input type="date" value={memberForm.baptismDate} onChange={(event) => setMemberForm((current) => ({ ...current, baptismDate: event.target.value }))} />
              </label>
            </div>
          </div>
        ) : null}

        {enrolmentStep === 2 ? (
          <div className="subsection-card">
            <div className="section-headline">
              <div>
                <p className="section-label">Section 3</p>
                <h3>Group Path</h3>
                <p>Choose the parent structure before moving deeper.</p>
              </div>
            </div>

            <div className="group-selectors">
              <label>
                Zone
                <select value={selectedChain[0] || ""} onChange={(event) => handleMemberGroupChange(0, event.target.value)}>
                  <option value="">Select zone</option>
                  {topLevelGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedChain.map((groupId, index) => {
                const childGroups = groupsByParent[groupId] || [];
                if (!childGroups.length) {
                  return null;
                }

                return (
                  <label key={groupId}>
                    {childGroups[0].levelName}
                    <select value={selectedChain[index + 1] || ""} onChange={(event) => handleMemberGroupChange(index + 1, event.target.value)}>
                      <option value="">Select {childGroups[0].levelName}</option>
                      {childGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {enrolmentStep === 3 ? <FamilyLinkManager /> : null}
        {enrolmentStep === 3 ? (
          <div className="subsection-card">
            <div className="section-headline">
              <div>
                <p className="section-label">Section 5A</p>
                <h3>Household Link</h3>
                <p>Search an existing family or household and connect this member to it.</p>
              </div>
            </div>

            <div className="family-link-toolbar">
              <div className="live-search-wrap">
                <input
                  value={memberForm.familyName}
                  onChange={(event) => {
                    const search = event.target.value;
                    setMemberForm((current) => ({
                      ...current,
                      familyName: search,
                      familyId: "",
                    }));
                  }}
                  placeholder="Search household name"
                />
                {memberForm.familyName ? (
                  <div className="live-search-results">
                    {families
                      .filter((family) =>
                        `${family.familyId} ${family.familyName} ${family.headOfHousehold?.memberName || ""}`
                          .toLowerCase()
                          .includes(memberForm.familyName.toLowerCase())
                      )
                      .slice(0, 6)
                      .map((family) => (
                        <button
                          key={family.familyId}
                          type="button"
                          className={memberForm.familyId === family.familyId ? "live-result active" : "live-result"}
                          onClick={() =>
                            setMemberForm((current) => ({
                              ...current,
                              familyId: family.familyId,
                              familyName: family.familyName,
                              householdRole: current.householdRole || "Member",
                            }))
                          }
                        >
                          {family.familyId} - {family.familyName}
                        </button>
                      ))}
                  </div>
                ) : null}
              </div>

              <select
                value={memberForm.householdRole}
                onChange={(event) => setMemberForm((current) => ({ ...current, householdRole: event.target.value }))}
              >
                <option value="">Relationship to head</option>
                <option value="Head">Head</option>
                <option value="Wife">Wife</option>
                <option value="Husband">Husband</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Dependant">Dependant</option>
              </select>
            </div>
          </div>
        ) : null}

        {enrolmentStep === 4 ? (
          <div className="subsection-card">
            <div className="section-headline">
              <div>
                <p className="section-label">Section 6</p>
                <h3>Location & Notes</h3>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Address
                <input value={memberForm.address} onChange={(event) => setMemberForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
              <label>
                City
                <input value={memberForm.city} onChange={(event) => setMemberForm((current) => ({ ...current, city: event.target.value }))} />
              </label>
              <label>
                Country
                <input value={memberForm.country} onChange={(event) => setMemberForm((current) => ({ ...current, country: event.target.value }))} />
              </label>
              <label className="full-width">
                Notes
                <textarea value={memberForm.notes} onChange={(event) => setMemberForm((current) => ({ ...current, notes: event.target.value }))} rows="5" />
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="modal-actions">
        <button type="button" className="ghost-button" onClick={closeModal}>
          Cancel
        </button>
        <button type="button" className="ghost-button" onClick={handleBack} disabled={enrolmentStep === 0}>
          Back
        </button>
        <button type="button" className="primary-button" onClick={handleNext}>
          {enrolmentStep === steps.length - 1 ? "Save Member" : "Next"}
        </button>
      </div>
    </ModalShell>
  );
}
