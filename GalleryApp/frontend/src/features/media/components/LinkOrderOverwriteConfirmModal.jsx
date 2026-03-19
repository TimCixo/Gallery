import AppIcon from "../../shared/components/AppIcon";

export default function LinkOrderOverwriteConfirmModal({ isOpen, isSaving, onConfirm, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <div className="media-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <p>Current parent and child links will be overwritten by the new link order. Continue?</p>
        <div className="media-delete-buttons">
          <button
            type="button"
            className="media-action-btn media-action-danger app-button-icon-only"
            onClick={onConfirm}
            disabled={isSaving}
            aria-label={isSaving ? "Applying link order" : "Confirm link order overwrite"}
            title={isSaving ? "Applying link order" : "Confirm link order overwrite"}
          >
            <AppIcon name="confirm" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cancel link order overwrite"
            title="Cancel link order overwrite"
          >
            <AppIcon name="cancel" alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
