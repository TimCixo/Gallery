import AppIcon from "../../shared/components/AppIcon";

export default function MediaQuickTaggingAction({
  isSelectionMode = false,
  onOpenConfig
}) {
  if (isSelectionMode) {
    return null;
  }

  return (
    <div className="media-pagination-wrap" role="region" aria-label="Tag actions">
      <div className="media-pagination">
        <button
          type="button"
          className="media-action-btn app-button-icon-only media-pagination-icon-btn"
          onClick={onOpenConfig}
          aria-label="Open quick tagging"
          title="Open quick tagging"
        >
          <AppIcon name="tag" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
