export default function FavoritesPage({
  favoritesError,
  isFavoritesLoading,
  favoritesTotalFiles,
  visibleFavoriteFiles,
  renderFavoritesPagination,
  setSelectedMedia,
  failedPreviewPaths,
  getDisplayName,
  setFailedPreviewPaths,
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
          {renderFavoritesPagination()}
          <div className="media-grid">
            {visibleFavoriteFiles.map((file) => (
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
          {renderFavoritesPagination()}
        </>
      ) : null}
      </section>
      {children}
    </>
  );
}
