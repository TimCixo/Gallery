import AppIcon from "../../shared/components/AppIcon";

export default function BulkMediaActionBar({
  selectedCount,
  onClearSelection,
  onDeleteSelection,
  onEditSelection
}) {
  if (!Number.isInteger(selectedCount) || selectedCount <= 0) {
    return null;
  }

  return (
    <div className="media-pagination-wrap" role="region" aria-label="Bulk media actions">
      <div className="media-pagination media-bulk-actionbar">
        <p className="media-bulk-selection-count">{selectedCount} selected</p>
        <button
          type="button"
          className="media-action-btn app-button-icon-only"
          onClick={onClearSelection}
          aria-label="Cancel selection"
          title="Cancel selection"
        >
          <AppIcon name="cancel" alt="" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="media-action-btn media-action-danger app-button-icon-only"
          onClick={onDeleteSelection}
          aria-label="Delete selected media"
          title="Delete selected media"
        >
          <AppIcon name="delete" alt="" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="media-action-btn media-action-primary app-button-icon-only"
          onClick={onEditSelection}
          aria-label="Edit selected media"
          title="Edit selected media"
        >
          <AppIcon name="edit" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
