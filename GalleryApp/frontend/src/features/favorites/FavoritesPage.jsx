import GalleryMediaTile from "../gallery/GalleryMediaTile";

export default function FavoritesPage({
  favoritesError,
  isFavoritesLoading,
  favoritesTotalFiles,
  visibleFavoriteFiles,
  renderFavoritesPagination,
  setSelectedMedia,
  mediaSelection,
  failedPreviewPaths,
  getDisplayName,
  setFailedPreviewPaths,
  bulkActionBar,
  children
}) {
  return (
    <>
      <section className="favorites-page">
      {favoritesError ? <p className="media-state error">{favoritesError}</p> : null}
      {!favoritesError && isFavoritesLoading && favoritesTotalFiles === 0 ? (
        <p className="media-state">Loading favorites...</p>
      ) : null}
      {!favoritesError && !isFavoritesLoading && favoritesTotalFiles === 0 ? (
        <p className="media-state">No favorite media yet.</p>
      ) : null}
      {!favoritesError && favoritesTotalFiles > 0 ? (
        <>
          <div className="media-pagination-toolbar">
            {renderFavoritesPagination()}
            {bulkActionBar}
          </div>
          <div className="media-grid">
            {visibleFavoriteFiles.map((file) => (
              <GalleryMediaTile
                key={file.relativePath}
                file={file}
                alt={getDisplayName(file.name)}
                hasPreviewError={failedPreviewPaths.has(file.relativePath)}
                onSelect={setSelectedMedia}
                onStartSelection={mediaSelection?.startSelection}
                onToggleSelection={mediaSelection?.toggleSelection}
                isSelected={mediaSelection?.isSelected(file)}
                selectionIndex={mediaSelection?.getSelectionIndex(file)}
                isSelectionMode={mediaSelection?.isSelectionMode}
                onPreviewError={(relativePath) => {
                  setFailedPreviewPaths((prev) => new Set(prev).add(relativePath));
                }}
              />
            ))}
          </div>
          {renderFavoritesPagination()}
        </>
      ) : null}
      </section>
      {children}
    </>
  );
}
