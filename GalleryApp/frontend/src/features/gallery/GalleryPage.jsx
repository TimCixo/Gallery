export default function GalleryPage({
  mediaError,
  isMediaLoading,
  totalFiles,
  visibleMediaFiles,
  renderPagination,
  setSelectedMedia,
  failedPreviewPaths,
  getDisplayName,
  setFailedPreviewPaths,
  children
}) {
  return (
    <>
      <section className="media-section">
      {mediaError ? <p className="media-state error">{mediaError}</p> : null}
      {!mediaError && isMediaLoading && visibleMediaFiles.length === 0 ? (
        <p className="media-state">Loading media...</p>
      ) : null}
      {!mediaError && !isMediaLoading && totalFiles === 0 ? (
        <p className="media-state">No files in backend/App_Data/Media.</p>
      ) : null}
      {!mediaError && !isMediaLoading && totalFiles > 0 && visibleMediaFiles.length === 0 ? (
        <p className="media-state">No preview images available for current files.</p>
      ) : null}

      {!mediaError && visibleMediaFiles.length > 0 ? (
        <>
          {renderPagination(true)}
          <div className="media-grid">
            {visibleMediaFiles.map((file) => (
              <article
                key={file.relativePath}
                className="media-tile"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMedia(file)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedMedia(file);
                  }
                }}
              >
                <div className="media-preview">
                  {file._tileUrl && !failedPreviewPaths.has(file.relativePath) ? (
                    <img
                      src={file._tileUrl}
                      alt={getDisplayName(file.name)}
                      loading="lazy"
                      onError={() => {
                        setFailedPreviewPaths((prev) => new Set(prev).add(file.relativePath));
                      }}
                    />
                  ) : (
                    <div className="media-fallback">Preview unavailable</div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {renderPagination(false)}
        </>
      ) : null}
      </section>
      {children}
    </>
  );
}
