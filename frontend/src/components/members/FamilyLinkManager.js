import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";

const relationshipOptions = ["Spouse", "Son", "Daughter", "Parent", "Sibling", "Dependent", "Other"];

export default function FamilyLinkManager() {
  const { members, memberForm, addFamilyLink, removeFamilyLink } = useAppContext();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [relationship, setRelationship] = useState("Spouse");

  const availableMembers = useMemo(() => {
    return members.filter((member) => {
      if (member.memberId === memberForm.memberId) {
        return false;
      }

      const haystack = `${member.memberId} ${member.firstName} ${member.lastName}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [memberForm.memberId, members, searchTerm]);

  const handleAdd = () => {
    if (!selectedMemberId) {
      return;
    }

    addFamilyLink({ memberId: selectedMemberId, relationship });
    setSelectedMemberId("");
    setSearchTerm("");
    setRelationship("Spouse");
  };

  return (
    <div className="subsection-card">
      <div className="section-headline">
        <div>
          <p className="section-label">Section 5</p>
          <h3>Family Relationships</h3>
          <p>Add a household link so the connected member also reflects the relationship.</p>
        </div>
      </div>

      <div className="family-link-toolbar">
        <div className="live-search-wrap">
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setSelectedMemberId("");
            }}
            placeholder="Live search registered member"
          />
          {searchTerm ? (
            <div className="live-search-results">
              {availableMembers.length ? (
                availableMembers.slice(0, 6).map((member) => (
                  <button
                    key={member.memberId}
                    type="button"
                    className={selectedMemberId === member.memberId ? "live-result active" : "live-result"}
                    onClick={() => {
                      setSelectedMemberId(member.memberId);
                      setSearchTerm(`${member.memberId} - ${member.firstName} ${member.lastName}`);
                    }}
                  >
                    {member.memberId} - {member.firstName} {member.lastName}
                  </button>
                ))
              ) : (
                <div className="live-result empty">No matching member found.</div>
              )}
            </div>
          ) : null}
        </div>

        <select value={relationship} onChange={(event) => setRelationship(event.target.value)}>
          {relationshipOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button type="button" className="ghost-button" onClick={handleAdd}>
          Add Family Link
        </button>
      </div>

      <div className="simple-list">
        {memberForm.familyLinks.length ? (
          memberForm.familyLinks.map((link) => (
            <div className="simple-list-item" key={`${link.memberId}-${link.relationship}`}>
              <div>
                <strong>{link.memberId}</strong>
                <p>{link.relationship}</p>
              </div>
              <button type="button" className="ghost-button small" onClick={() => removeFamilyLink(link.memberId)}>
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="empty-note">No family links added yet.</div>
        )}
      </div>
    </div>
  );
}
