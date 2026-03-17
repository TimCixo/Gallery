import GalleryMediaTile from "./GalleryMediaTile";

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
          {renderPagination()}
          <div className="media-grid">
            {visibleMediaFiles.map((file) => (
              <GalleryMediaTile
                key={file.relativePath}
                file={file}
                alt={getDisplayName(file.name)}
                hasPreviewError={failedPreviewPaths.has(file.relativePath)}
                onSelect={setSelectedMedia}
                onPreviewError={(relativePath) => {
                  setFailedPreviewPaths((prev) => new Set(prev).add(relativePath));
                }}
              />
            ))}
          </div>
          {renderPagination()}
        </>
      ) : null}
      </section>
      {children}
    </>
  );
}
