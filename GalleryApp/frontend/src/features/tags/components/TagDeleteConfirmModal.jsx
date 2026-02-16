function TagDeleteConfirmModal({ pendingTagDelete, isDeletingTagEntity, onConfirm, onClose }) {
  if (!pendingTagDelete) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <div className="media-confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <p>
          Are you sure you want to delete {pendingTagDelete.kind === "tagType" ? "TagType" : "Tag"} "{pendingTagDelete.name}"?
        </p>
        <div className="media-delete-buttons">
          <button
            type="button"
            className="media-action-btn media-action-danger"
            onClick={onConfirm}
            disabled={isDeletingTagEntity}
          >
            {isDeletingTagEntity ? "Deleting..." : "Yes"}
          </button>
          <button type="button" className="media-action-btn" onClick={onClose} disabled={isDeletingTagEntity}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

export default TagDeleteConfirmModal;
