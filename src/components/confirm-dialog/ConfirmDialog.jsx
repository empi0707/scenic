import React, { useEffect } from "react";
import "./confirm-dialog.scss";

// Lightweight modal-style confirmation. Use instead of window.confirm()
// so the UI stays inside the app's dark glass aesthetic.
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onMouseDown={(e) => {
        // Click on backdrop (not the inner panel) cancels
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="confirm-dialog__panel">
        {title && (
          <h2 id="confirm-dialog-title" className="confirm-dialog__title">
            {title}
          </h2>
        )}
        {message && <p className="confirm-dialog__message">{message}</p>}
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog__btn confirm-dialog__btn--confirm${
              destructive ? " is-destructive" : ""
            }`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
