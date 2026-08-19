import { useMemo, useState } from "react";

function formatMember(member) {
  return `${member.memberId} - ${member.firstName} ${member.lastName}`;
}

function getMemberName(item) {
  return item.memberName || `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.memberId || "Unknown Member";
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
  compact = false,
  addLabel = "",
  roleLabel = "",
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

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
      <div className="section-headline compact">
        <h3>{label}</h3>
        {compact && !disabled ? (
          <button type="button" className="ghost-button small" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Hide" : addLabel || `Add ${label}`}
          </button>
        ) : null}
      </div>

      {!compact || expanded ? (
        <label className="lookup-label">
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
                        onSelect({
                          memberId: member.memberId,
                          memberName: `${member.firstName} ${member.lastName}`,
                          gender: member.gender || "",
                          phone: member.phone || "",
                        });
                        setQuery("");
                        if (compact && !multiple) {
                          setExpanded(false);
                        }
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
      ) : null}

      <div className={compact ? "simple-list" : "lookup-chip-list"}>
        {selectedList.length ? (
          selectedList.map((item) => (
            compact ? (
              <div key={item.memberId} className="simple-list-item">
                <div>
                  <strong>{getMemberName(item)}</strong>
                  <p>{item.memberId || "-"}</p>
                  <p>{item.gender || "-"} {item.phone ? `| ${item.phone}` : ""}</p>
                  <p>{typeof roleLabel === "function" ? roleLabel(item) : roleLabel || "-"}</p>
                </div>
                {onRemove ? (
                  <button type="button" className="ghost-button small" onClick={() => onRemove(item.memberId)} disabled={disabled}>
                    Remove
                  </button>
                ) : null}
              </div>
            ) : (
              <span key={item.memberId} className="lookup-chip">
                {getMemberName(item)}
                {onRemove ? (
                  <button type="button" onClick={() => onRemove(item.memberId)} disabled={disabled}>
                    x
                  </button>
                ) : null}
              </span>
            )
          ))
        ) : (
          <div className="empty-note">No member selected yet.</div>
        )}
      </div>
    </div>
  );
}
