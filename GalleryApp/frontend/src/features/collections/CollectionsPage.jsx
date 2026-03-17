import AppIcon from "../shared/components/AppIcon";

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
        {isCollectionsLoading ? <p className="collections-state">Loading collections...</p> : null}
        <ul className="collections-list">
          <li className="collections-grid-item">
            <button
              type="button"
              className="collections-item collections-item-create"
              onClick={openCreateCollectionModal}
              aria-label="Create collection"
            >
              <span className="collections-item-cover collections-item-cover-create" aria-hidden="true">
                <AppIcon name="create" alt="" />
              </span>
              <span className="collections-item-title">New collection</span>
            </button>
          </li>
          {collections.map((item) => (
            <li key={item.id} className="collections-grid-item">
              <button
                type="button"
                className="collections-item collections-item-clickable"
                onClick={() => void handleOpenCollection(item)}
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
                <span className="collections-item-title">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {!isCollectionsLoading && collections.length === 0 ? (
          <p className="collections-state">No collections found.</p>
        ) : null}
      </section>
      {children}
    </>
  );
}
