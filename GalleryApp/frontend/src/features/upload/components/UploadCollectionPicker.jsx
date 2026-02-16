export default function UploadCollectionPicker({
  isOpen,
  collections,
  selectedIds,
  onToggle,
  onClose
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <div className="collection-picker-dialog" onClick={(event) => event.stopPropagation()}>
        <p className="collection-picker-title">Select collection</p>
        {collections.error ? <p className="media-action-error">{collections.error}</p> : null}
        {collections.loading ? (
          <p className="collections-state">Loading collections...</p>
        ) : collections.entities.length === 0 ? (
          <p className="collections-state">No collections available.</p>
        ) : (
          <ul className="collection-picker-list">
            {collections.entities.map((item) => {
              const collectionId = Number(item.id);
              const isIncluded = Number.isSafeInteger(collectionId) && selectedIds.includes(collectionId);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`collection-picker-item${isIncluded ? " is-included" : ""}`}
                    onClick={() => onToggle(item.id)}
                  >
                    <span>{item.label}</span>
                    <em>{isIncluded ? "Included" : "Not included"}</em>
                    <small>{item.description || "No description"}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="media-delete-buttons">
          <button type="button" className="media-action-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
