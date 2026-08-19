import { useMemo, useState } from "react";

export default function AttendanceParticipantLookupField({
  label,
  placeholder,
  items,
  selected,
  onSelect,
  onClear,
  getKey,
  getLabel,
  disabled = false,
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const search = query.toLowerCase().trim();
    if (!search) {
      return [];
    }

    return items.filter((item) => getLabel(item).toLowerCase().includes(search)).slice(0, 8);
  }, [getLabel, items, query]);

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
                results.map((item) => (
                  <button
                    key={getKey(item)}
                    type="button"
                    className="live-result"
                    onClick={() => {
                      onSelect(item);
                      setQuery("");
                    }}
                  >
                    {getLabel(item)}
                  </button>
                ))
              ) : (
                <div className="live-result empty">No match found.</div>
              )}
            </div>
          ) : null}
        </div>
      </label>

      <div className="lookup-chip-list">
        {selected ? (
          <span className="lookup-chip">
            {getLabel(selected)}
            {onClear ? (
              <button type="button" onClick={onClear} disabled={disabled}>
                x
              </button>
            ) : null}
          </span>
        ) : (
          <div className="empty-note">No selection yet.</div>
        )}
      </div>
    </div>
  );
}
