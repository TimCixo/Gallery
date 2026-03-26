import { getMediaDeleteConfirmMessage } from "../../shared/utils/deleteConfirm";
import AppIcon from "../../shared/components/AppIcon";

function MediaDeleteConfirmModal({
  pendingMediaDelete,
  isDeletingMedia,
  onConfirm,
  onClose,
  message,
  confirmLabel,
  confirmTitle,
  cancelLabel,
  cancelTitle,
  confirmButtonClassName = "media-action-btn media-action-danger app-button-icon-only"
}) {
  if (!pendingMediaDelete) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <div className="media-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <p>{message || getMediaDeleteConfirmMessage(pendingMediaDelete)}</p>
        <div className="media-delete-buttons">
          <button
            type="button"
            className={confirmButtonClassName}
            onClick={onConfirm}
            disabled={isDeletingMedia}
            aria-label={isDeletingMedia ? (confirmLabel || "Deleting media") : (confirmTitle || confirmLabel || "Confirm delete")}
            title={isDeletingMedia ? (confirmLabel || "Deleting media") : (confirmTitle || confirmLabel || "Confirm delete")}
          >
            <AppIcon name="confirm" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={onClose}
            disabled={isDeletingMedia}
            aria-label={cancelTitle || cancelLabel || "Cancel delete"}
            title={cancelTitle || cancelLabel || "Cancel delete"}
          >
            <AppIcon name="cancel" alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MediaDeleteConfirmModal;
