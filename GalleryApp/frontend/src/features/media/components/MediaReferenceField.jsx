import AppIcon from "../../shared/components/AppIcon";
import { resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";

const DEFAULT_PREVIEW = {
  item: null,
  isLoading: false,
  error: ""
};

export default function MediaReferenceField({
  label,
  value,
  previewState = DEFAULT_PREVIEW,
  onOpenPicker,
  onClear,
  disabled = false,
  emptyLabel = "Untitled media"
}) {
  const normalizedValue = String(value || "").trim();
  const hasSelection = normalizedValue !== "";
  const relationItem = previewState?.item || null;
  const previewUrl = relationItem ? resolvePreviewMediaUrl(relationItem) : "";
  const relationLabel = relationItem?.title || relationItem?.relativePath || emptyLabel;

  return (
    <div className="media-linked-editor">
      <div className="media-linked-editor-controls">
        <button
          type="button"
          className={`media-linked-editor-trigger${hasSelection ? "" : " is-empty"}`}
          onClick={onOpenPicker}
          disabled={disabled}
          aria-label={hasSelection ? `Change ${label}` : `Select ${label}`}
          title={hasSelection ? `Change ${label}` : `Select ${label}`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={relationLabel}
              className="media-relation-picker-thumb"
              loading="lazy"
            />
          ) : (
            <span className="media-linked-editor-placeholder" aria-hidden="true">
              <AppIcon name="create" alt="" aria-hidden="true" />
            </span>
          )}
        </button>
        <button
          type="button"
          className="media-action-btn app-button-icon-only"
          onClick={onClear}
          disabled={disabled || !hasSelection}
          title={`Clear ${label}`}
          aria-label={`Clear ${label}`}
        >
          <AppIcon name="delete" alt="" aria-hidden="true" />
        </button>
      </div>

      <div className="media-linked-editor-preview">
        {hasSelection ? (
          relationItem ? (
            <small>#{relationItem.id} {relationItem.title || relationItem.relativePath || ""}</small>
          ) : previewState?.isLoading ? (
            <small>Resolving...</small>
          ) : previewState?.error ? (
            <small className="media-action-error">{previewState.error}</small>
          ) : (
            <small>Media not found.</small>
          )
        ) : null}
      </div>
    </div>
  );
}
