import { memo, useRef } from "react";

const LONG_PRESS_DELAY_MS = 450;

function GalleryMediaTile({
  file,
  alt,
  hasPreviewError,
  groupCount = 1,
  isSelected = false,
  selectionIndex = null,
  isSelectionMode = false,
  onSelect,
  onStartSelection,
  onToggleSelection,
  onPreviewError
}) {
  const longPressTimeoutRef = useRef(null);
  const suppressClickRef = useRef(false);

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleStartSelection = ({ suppressClick = false } = {}) => {
    onStartSelection?.(file);
    suppressClickRef.current = suppressClick;
  };

  return (
    <article
      className={`media-tile${isSelected ? " is-selected" : ""}${isSelectionMode ? " is-selection-mode" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={isSelectionMode ? isSelected : undefined}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }

        if (isSelectionMode) {
          onToggleSelection?.(file);
          return;
        }

        onSelect(file);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        handleStartSelection();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (isSelectionMode) {
            onToggleSelection?.(file);
            return;
          }

          onSelect(file);
        }
      }}
      onTouchStart={() => {
        clearLongPressTimeout();
        longPressTimeoutRef.current = window.setTimeout(() => {
          handleStartSelection({ suppressClick: true });
        }, LONG_PRESS_DELAY_MS);
      }}
      onTouchEnd={clearLongPressTimeout}
      onTouchCancel={clearLongPressTimeout}
      onTouchMove={clearLongPressTimeout}
    >
      <div className="media-preview">
        {file._tileUrl && !hasPreviewError ? (
          <img
            src={file._tileUrl}
            alt={alt}
            loading="lazy"
            onError={() => onPreviewError(file.relativePath)}
          />
        ) : (
          <div className="media-fallback">Preview unavailable</div>
        )}
      </div>
      {groupCount > 1 ? (
        <span className="media-group-indicator" aria-label={`Grouped media count: ${groupCount}`}>
          {groupCount}
        </span>
      ) : null}
      {isSelectionMode ? (
        <span className={`media-selection-indicator${isSelected ? " is-selected" : ""}`} aria-hidden="true">
          {isSelected && Number.isInteger(selectionIndex) ? selectionIndex : null}
        </span>
      ) : null}
    </article>
  );
}

export default memo(GalleryMediaTile);
