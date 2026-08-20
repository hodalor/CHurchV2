export default function ToastViewport({ toasts = [], onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card ${toast.type || "info"}`}>
          <div>
            <strong>{toast.title || (toast.type === "error" ? "Error" : "Success")}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)}>
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
