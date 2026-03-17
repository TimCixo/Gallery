import { getCollectionDeleteConfirmMessage } from "../../shared/utils/deleteConfirm";

function CollectionDeleteConfirmModal({ pendingCollectionDelete, isCollectionDeleting, onConfirm, onClose }) {
  if (!pendingCollectionDelete) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <div className="media-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <p>{getCollectionDeleteConfirmMessage(pendingCollectionDelete)}</p>
        <div className="media-delete-buttons">
          <button
            type="button"
            className="media-action-btn media-action-danger"
            onClick={onConfirm}
            disabled={isCollectionDeleting}
          >
            {isCollectionDeleting ? "Deleting..." : "Yes"}
          </button>
          <button type="button" className="media-action-btn" onClick={onClose} disabled={isCollectionDeleting}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollectionDeleteConfirmModal;
