export default function DetailGrid({ items = [] }) {
  const visibleItems = items.filter((item) => item && item.label);

  if (!visibleItems.length) {
    return <div className="empty-note">No detail values available.</div>;
  }

  return (
    <div className="detail-grid">
      {visibleItems.map((item) => (
        <article key={`${item.label}-${String(item.value)}`} className={`detail-card ${item.wide ? "wide" : ""}`}>
          <div className="detail-card-label">{item.label}</div>
          <div className="detail-card-value">{renderValue(item.value)}</div>
        </article>
      ))}
    </div>
  );
}

function renderValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}
