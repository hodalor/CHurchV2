import ModalShell from "./ModalShell";

export default function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  if (!dialog?.open) {
    return null;
  }

  return (
    <ModalShell title={dialog.title || "Confirm Action"} subtitle="" onClose={onCancel}>
      <div className="modal-form">
        <p>{dialog.message || "Are you sure you want to continue?"}</p>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={dialog.tone === "danger" ? "ghost-button delete-button" : "primary-button"}
            onClick={onConfirm}
          >
            {dialog.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
