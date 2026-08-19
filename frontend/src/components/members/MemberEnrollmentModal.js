import ModalShell from "../common/ModalShell";
import { useAppContext } from "../../context/AppContext";
import PhotoUploadCard from "./PhotoUploadCard";
import FamilyLinkManager from "./FamilyLinkManager";

const steps = ["Basic Info", "Church Info", "Groups", "Family", "Location"];
const genderOptions = ["Male", "Female"];
const maritalStatusOptions = ["Single", "Married", "Widowed", "Divorced", "Separated", "Other"];
const membershipStatusOptions = [
  "Active",
  "Inactive",
  "New Convert",
  "Transferred In",
  "Transferred Out",
  "Relocated",
  "Under Restoration",
  "Deceased",
];
const householdRelationshipOptions = ["Head", "Spouse", "Son", "Daughter", "Dependent", "Parent", "Sibling", "Other"];

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
    uploadMemberMedia,
    mediaUploadState,
  } = useAppContext();

  if (activeModal !== "member-enrolment") {
    return null;
  }

  const selectedChain = memberForm.groupChain.filter(Boolean);

  const handleNext = async () => {
    if (enrolmentStep < steps.length - 1) {
      setEnrolmentStep((current) => current + 1);
      return;
    }

    await submitMemberForm();
  };

  const handleBack = () => {
    setEnrolmentStep((current) => Math.max(current - 1, 0));
  };

  const handleMediaUpload = async (fieldName, event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const uploadedFile = await uploadMemberMedia(file, fieldName);
      setMemberForm((current) => ({
        ...current,
        [fieldName]: uploadedFile,
        ...(fieldName === "personalPhoto" ? { photoFileName: uploadedFile.label || "" } : {}),
      }));
    } finally {
      event.target.value = "";
    }
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
                Preferred Name
                <input value={memberForm.preferredName} onChange={(event) => setMemberForm((current) => ({ ...current, preferredName: event.target.value }))} />
              </label>
              <label>
                Surname
                <input value={memberForm.lastName} onChange={(event) => setMemberForm((current) => ({ ...current, lastName: event.target.value }))} />
              </label>
              <label>
                Gender
                <select value={memberForm.gender} onChange={(event) => setMemberForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="">Select gender</option>
                  {genderOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Primary Mobile
                <input value={memberForm.phone} onChange={(event) => setMemberForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                Residential Area
                <input
                  value={memberForm.residentialArea}
                  onChange={(event) => setMemberForm((current) => ({ ...current, residentialArea: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                Marital Status
                <select value={memberForm.maritalStatus} onChange={(event) => setMemberForm((current) => ({ ...current, maritalStatus: event.target.value }))}>
                  <option value="">Select marital status</option>
                  {maritalStatusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date of Birth
                <input type="date" value={memberForm.dateOfBirth} onChange={(event) => setMemberForm((current) => ({ ...current, dateOfBirth: event.target.value }))} />
              </label>
              <label>
                Photo File Name
                <input value={memberForm.photoFileName || memberForm.personalPhoto?.label || ""} readOnly />
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
                uploading={mediaUploadState.loading && mediaUploadState.fieldName === "personalPhoto"}
                onFileChange={(event) => handleMediaUpload("personalPhoto", event)}
              />
              <PhotoUploadCard
                title="ID Front"
                description="Optional - add when you have a photo of their ID card."
                value={memberForm.idFrontPhoto}
                placeholder="No ID front uploaded"
                actionLabel="Upload ID Front"
                type="id"
                uploading={mediaUploadState.loading && mediaUploadState.fieldName === "idFrontPhoto"}
                onFileChange={(event) => handleMediaUpload("idFrontPhoto", event)}
              />
              <PhotoUploadCard
                title="ID Back"
                description="Optional - add the back of the ID card when available."
                value={memberForm.idBackPhoto}
                placeholder="No ID back uploaded"
                actionLabel="Upload ID Back"
                type="id"
                uploading={mediaUploadState.loading && mediaUploadState.fieldName === "idBackPhoto"}
                onFileChange={(event) => handleMediaUpload("idBackPhoto", event)}
              />
            </div>
            {mediaUploadState.error ? <div className="form-error">{mediaUploadState.error}</div> : null}
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
                  {membershipStatusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date Joined
                <input
                  type="date"
                  value={memberForm.dateJoined || memberForm.membershipDate}
                  onChange={(event) =>
                    setMemberForm((current) => ({
                      ...current,
                      dateJoined: event.target.value,
                      membershipDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Baptism Status
                <select value={memberForm.baptismStatus} onChange={(event) => setMemberForm((current) => ({ ...current, baptismStatus: event.target.value }))}>
                  <option value="Not Baptized">Not Baptized</option>
                  <option value="Baptized">Baptized</option>
                </select>
              </label>
              <label>
                Date Baptized
                <input type="date" value={memberForm.baptismDate} onChange={(event) => setMemberForm((current) => ({ ...current, baptismDate: event.target.value }))} />
              </label>
              <label>
                Place Baptized
                <input value={memberForm.placeBaptized} onChange={(event) => setMemberForm((current) => ({ ...current, placeBaptized: event.target.value }))} />
              </label>
              <label>
                Baptized By
                <input value={memberForm.baptizedBy} onChange={(event) => setMemberForm((current) => ({ ...current, baptizedBy: event.target.value }))} />
              </label>
              <label>
                Occupation
                <input value={memberForm.occupation} onChange={(event) => setMemberForm((current) => ({ ...current, occupation: event.target.value }))} />
              </label>
              <label>
                Employer or Business
                <input
                  value={memberForm.employerOrBusiness}
                  onChange={(event) => setMemberForm((current) => ({ ...current, employerOrBusiness: event.target.value }))}
                />
              </label>
              <label className="full-width">
                Education or Skills
                <textarea
                  rows="3"
                  value={memberForm.educationOrSkills}
                  onChange={(event) => setMemberForm((current) => ({ ...current, educationOrSkills: event.target.value }))}
                />
              </label>
              <label>
                Previous Congregation
                <input
                  value={memberForm.previousCongregation}
                  onChange={(event) => setMemberForm((current) => ({ ...current, previousCongregation: event.target.value }))}
                />
              </label>
              <label className="full-width">
                Transfer Details
                <textarea
                  rows="3"
                  value={memberForm.transferDetails}
                  onChange={(event) => setMemberForm((current) => ({ ...current, transferDetails: event.target.value }))}
                />
              </label>
              <label>
                Source Record Ref
                <input
                  value={memberForm.sourceRecordRef}
                  onChange={(event) => setMemberForm((current) => ({ ...current, sourceRecordRef: event.target.value }))}
                />
              </label>
              <label>
                Data Entry Clerk
                <input value={memberForm.dataEntryClerk} readOnly />
              </label>
              <label>
                Date Captured
                <input type="date" value={memberForm.dateCaptured} readOnly />
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
                <p>Choose each parent group and the next level will keep opening as deep as your hierarchy goes.</p>
              </div>
            </div>

            <div className="group-selectors">
              <label>
                Group
                <select value={selectedChain[0] || ""} onChange={(event) => handleMemberGroupChange(0, event.target.value)}>
                  <option value="">Select group</option>
                  {topLevelGroups.map((group) => (
                    <option key={group._id || group.id} value={group._id || group.id}>
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
                      {`Next Group Level ${index + 2}`}
                    <select value={selectedChain[index + 1] || ""} onChange={(event) => handleMemberGroupChange(index + 1, event.target.value)}>
                      <option value="">Select child group</option>
                      {childGroups.map((group) => (
                        <option key={group._id || group.id} value={group._id || group.id}>
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
                              householdRole: current.householdRole || "Other",
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
                {householdRelationshipOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
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
              <label>
                GPS Latitude
                <input value={memberForm.gpsLatitude} onChange={(event) => setMemberForm((current) => ({ ...current, gpsLatitude: event.target.value }))} />
              </label>
              <label>
                GPS Longitude
                <input value={memberForm.gpsLongitude} onChange={(event) => setMemberForm((current) => ({ ...current, gpsLongitude: event.target.value }))} />
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
        <button type="button" className="primary-button" onClick={handleNext} disabled={mediaUploadState.loading}>
          {enrolmentStep === steps.length - 1 ? "Save Member" : "Next"}
        </button>
      </div>
    </ModalShell>
  );
}
