import { getMediaDeleteConfirmMessage } from "../../shared/utils/deleteConfirm";

function MediaDeleteConfirmModal({ pendingMediaDelete, isDeletingMedia, onConfirm, onClose }) {
  if (!pendingMediaDelete) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <div className="media-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <p>{getMediaDeleteConfirmMessage(pendingMediaDelete)}</p>
        <div className="media-delete-buttons">
          <button
            type="button"
            className="media-action-btn media-action-danger"
            onClick={onConfirm}
            disabled={isDeletingMedia}
          >
            {isDeletingMedia ? "Deleting..." : "Yes"}
          </button>
          <button type="button" className="media-action-btn" onClick={onClose} disabled={isDeletingMedia}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

export default MediaDeleteConfirmModal;
