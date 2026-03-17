import { getCollectionDeleteConfirmMessage } from "../../shared/utils/deleteConfirm";
import AppIcon from "../../shared/components/AppIcon";

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
            className="media-action-btn media-action-danger app-button-icon-only"
            onClick={onConfirm}
            disabled={isCollectionDeleting}
            aria-label={isCollectionDeleting ? "Deleting collection" : "Confirm delete"}
            title={isCollectionDeleting ? "Deleting collection" : "Confirm delete"}
          >
            <AppIcon name="confirm" alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={onClose}
            disabled={isCollectionDeleting}
            aria-label="Cancel delete"
            title="Cancel delete"
          >
            <AppIcon name="cancel" alt="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollectionDeleteConfirmModal;
