import { memo } from "react";

function GalleryMediaTile({
  file,
  alt,
  hasPreviewError,
  onSelect,
  onPreviewError
}) {
  return (
    <article
      className="media-tile"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(file)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(file);
        }
      }}
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
    </article>
  );
}

export default memo(GalleryMediaTile);
