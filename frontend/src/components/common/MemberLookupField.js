import { useMemo, useState } from "react";

function formatMember(member) {
  return `${member.memberId} - ${member.firstName} ${member.lastName}`;
}

export default function MemberLookupField({
  label,
  placeholder,
  members,
  selected,
  onSelect,
  multiple = false,
  onRemove,
  excludeIds = [],
  disabled = false,
}) {
  const [query, setQuery] = useState("");

  const selectedList = multiple ? selected || [] : selected ? [selected] : [];
  const selectedIds = selectedList.map((item) => item.memberId);

  const results = useMemo(() => {
    const haystack = query.toLowerCase().trim();
    if (!haystack) {
      return [];
    }

    return members.filter((member) => {
      if (excludeIds.includes(member.memberId) || selectedIds.includes(member.memberId)) {
        return false;
      }

      return formatMember(member).toLowerCase().includes(haystack);
    });
  }, [excludeIds, members, query, selectedIds]);

  return (
    <div className="lookup-field">
      <label className="lookup-label">
        {label}
        <div className="live-search-wrap">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
          {query && !disabled ? (
            <div className="live-search-results">
              {results.length ? (
                results.slice(0, 6).map((member) => (
                  <button
                    key={member.memberId}
                    type="button"
                    className="live-result"
                    onClick={() => {
                      onSelect({ memberId: member.memberId, memberName: `${member.firstName} ${member.lastName}` });
                      setQuery("");
                    }}
                  >
                    {formatMember(member)}
                  </button>
                ))
              ) : (
                <div className="live-result empty">No matching member found.</div>
              )}
            </div>
          ) : null}
        </div>
      </label>

      <div className="lookup-chip-list">
        {selectedList.length ? (
          selectedList.map((item) => (
            <span key={item.memberId} className="lookup-chip">
              {item.memberName}
              {onRemove ? (
                <button type="button" onClick={() => onRemove(item.memberId)} disabled={disabled}>
                  x
                </button>
              ) : null}
            </span>
          ))
        ) : (
          <div className="empty-note">No member selected yet.</div>
        )}
      </div>
    </div>
  );
}
