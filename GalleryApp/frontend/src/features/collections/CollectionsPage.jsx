export default function CollectionsPage({
  openCreateCollectionModal,
  isCollectionsLoading,
  collections,
  handleOpenCollection,
  children
}) {
  return (
    <>
      <section className="collections-page">
        <div className="collections-toolbar">
          <button
            type="button"
            className="collections-btn collections-btn-primary"
            onClick={openCreateCollectionModal}
          >
            New collection
          </button>
        </div>

        {isCollectionsLoading ? <p className="collections-state">Loading collections...</p> : null}
        {!isCollectionsLoading && collections.length === 0 ? (
          <p className="collections-state">No collections found.</p>
        ) : null}
        {!isCollectionsLoading && collections.length > 0 ? (
          <ul className="collections-list">
            {collections.map((item) => (
              <li
                key={item.id}
                className="collections-item collections-item-clickable"
                role="button"
                tabIndex={0}
                onClick={() => void handleOpenCollection(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void handleOpenCollection(item);
                  }
                }}
              >
                <div className="collections-item-cover">
                  {item.coverMedia?.tileUrl ? (
                    <img
                      src={item.coverMedia.tileUrl}
                      alt={String(item.label || "Collection cover")}
                      loading="lazy"
                    />
                  ) : (
                    <div className="collections-item-cover-fallback">No cover</div>
                  )}
                </div>
                <div className="collections-item-body">
                  <h3>{item.label}</h3>
                  <p>{item.description || "No description."}</p>
                  <p className="collections-meta">
                    Cover: {item.cover ? `#${item.cover}` : "not set"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {children}
    </>
  );
}
