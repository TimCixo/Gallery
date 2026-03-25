import GalleryMediaTile from "../gallery/GalleryMediaTile";

export default function FavoritesPage({
  favoritesError,
  isFavoritesLoading,
  favoritesTotalFiles,
  visibleFavoriteFiles,
  renderFavoritesPagination,
  setSelectedMedia,
  onTileSelect,
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
        <div className="media-pagination-toolbar">
          {renderFavoritesPagination()}
          {bulkActionBar}
        </div>
      ) : null}
      {!favoritesError && favoritesTotalFiles > 0 ? (
        <>
          <div className="media-grid">
            {visibleFavoriteFiles.map((file) => (
              <GalleryMediaTile
                key={file.relativePath}
                file={file}
                alt={getDisplayName(file.name)}
                hasPreviewError={failedPreviewPaths.has(file.relativePath)}
                onSelect={onTileSelect || setSelectedMedia}
                onStartSelection={onTileSelect ? undefined : mediaSelection?.startSelection}
                onToggleSelection={onTileSelect ? undefined : mediaSelection?.toggleSelection}
                isSelected={mediaSelection?.isSelected(file)}
                selectionIndex={mediaSelection?.getSelectionIndex(file)}
                isSelectionMode={onTileSelect ? false : mediaSelection?.isSelectionMode}
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
