import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../shared/utils/mediaPredicates";
import CollectionsPage from "./CollectionsPage";

const PAGE_SIZE = 36;

const getDisplayName = (value) => {
  const fileName = String(value || "");
  if (!fileName) {
    return "Untitled";
  }

  const normalized = fileName.split(/[\\/]/).pop() || fileName;
  return normalized.replace(/\.[^./]+$/, "") || normalized;
};

export default function CollectionsContainer({ searchQuery = "" }) {
  const [collections, setCollections] = useState([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState("");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionFiles, setCollectionFiles] = useState([]);
  const [collectionFilesPage, setCollectionFilesPage] = useState(1);
  const [collectionFilesTotalPages, setCollectionFilesTotalPages] = useState(0);
  const [collectionFilesTotalCount, setCollectionFilesTotalCount] = useState(0);
  const [isCollectionFilesLoading, setIsCollectionFilesLoading] = useState(false);
  const [collectionFilesError, setCollectionFilesError] = useState("");
  const [collectionFilesPageJumpInput, setCollectionFilesPageJumpInput] = useState("1");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());

  const loadCollections = useCallback(async () => {
    setIsCollectionsLoading(true);
    setCollectionsError("");
    try {
      const response = await collectionsApi.listCollections({ search: searchQuery || undefined });
      setCollections(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      setCollections([]);
      setCollectionsError(error instanceof Error ? error.message : "Failed to load collections.");
    } finally {
      setIsCollectionsLoading(false);
    }
  }, [searchQuery]);

  const loadCollectionMedia = useCallback(async (collectionId, page = 1) => {
    if (!Number.isSafeInteger(collectionId) || collectionId <= 0) {
      return;
    }

    setIsCollectionFilesLoading(true);
    setCollectionFilesError("");
    try {
      const response = await collectionsApi.listCollectionMedia(collectionId, { page, pageSize: PAGE_SIZE });
      const items = Array.isArray(response?.items) ? response.items : [];
      setCollectionFiles(items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" })));
      setCollectionFilesPage(Number(response?.page || page));
      setCollectionFilesTotalPages(Number(response?.totalPages || 0));
      setCollectionFilesTotalCount(Number(response?.totalCount || items.length));
    } catch (error) {
      setCollectionFiles([]);
      setCollectionFilesPage(1);
      setCollectionFilesTotalPages(0);
      setCollectionFilesTotalCount(0);
      setCollectionFilesError(error instanceof Error ? error.message : "Failed to load collection files.");
    } finally {
      setIsCollectionFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadCollections();
      if (selectedCollection?.id) {
        void loadCollectionMedia(selectedCollection.id, collectionFilesPage);
      }
    };
    window.addEventListener("gallery:media-updated", handleRefresh);
    return () => window.removeEventListener("gallery:media-updated", handleRefresh);
  }, [loadCollections, loadCollectionMedia, selectedCollection, collectionFilesPage]);

  const handleOpenCollection = async (item) => {
    if (!item?.id) {
      return;
    }

    setSelectedCollection(item);
    setSelectedMedia(null);
    await loadCollectionMedia(item.id, 1);
  };

  const visibleCollectionFiles = useMemo(() => collectionFiles, [collectionFiles]);
  const selectedMediaIndex = useMemo(() => (
    selectedMedia
      ? visibleCollectionFiles.findIndex((file) => file.id === selectedMedia.id || file.relativePath === selectedMedia.relativePath)
      : -1
  ), [selectedMedia, visibleCollectionFiles]);
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && visibleCollectionFiles.length > 1;

  const handleNavigateSelectedMedia = (offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const nextIndex = (selectedMediaIndex + offset + visibleCollectionFiles.length) % visibleCollectionFiles.length;
    const nextItem = visibleCollectionFiles[nextIndex];
    if (nextItem) {
      setSelectedMedia(nextItem);
    }
  };

  useEffect(() => {
    if (!selectedCollection) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (selectedMedia) {
          setSelectedMedia(null);
        } else {
          setSelectedCollection(null);
        }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleNavigateSelectedMedia(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNavigateSelectedMedia(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCollection, selectedMedia, canNavigateSelectedMedia, selectedMediaIndex, visibleCollectionFiles]);

  const handleCollectionFilesPageChange = (nextPage) => {
    if (!selectedCollection?.id || isCollectionFilesLoading) {
      return;
    }

    if (nextPage < 1 || (collectionFilesTotalPages > 0 && nextPage > collectionFilesTotalPages) || nextPage === collectionFilesPage) {
      return;
    }

    void loadCollectionMedia(selectedCollection.id, nextPage);
  };

  useEffect(() => {
    setCollectionFilesPageJumpInput(String(collectionFilesPage));
  }, [collectionFilesPage]);

  const handleCollectionFilesPageJumpSubmit = (event) => {
    event.preventDefault();
    if (isCollectionFilesLoading || collectionFilesTotalPages <= 0 || !selectedCollection?.id) {
      return;
    }

    const parsed = Number.parseInt(collectionFilesPageJumpInput, 10);
    if (!Number.isFinite(parsed)) {
      setCollectionFilesPageJumpInput(String(collectionFilesPage));
      return;
    }

    const targetPage = Math.min(Math.max(parsed, 1), collectionFilesTotalPages);
    setCollectionFilesPageJumpInput(String(targetPage));
    handleCollectionFilesPageChange(targetPage);
  };

  const renderCollectionFilesPagination = (showLoadingState = false) => {
    if (collectionFilesTotalPages <= 1) {
      return null;
    }

    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            onClick={() => handleCollectionFilesPageChange(collectionFilesPage - 1)}
            disabled={isCollectionFilesLoading || collectionFilesPage <= 1}
          >
            Prev
          </button>
          <p>Page {collectionFilesPage} of {collectionFilesTotalPages}</p>
          <button
            type="button"
            onClick={() => handleCollectionFilesPageChange(collectionFilesPage + 1)}
            disabled={isCollectionFilesLoading || collectionFilesPage >= collectionFilesTotalPages}
          >
            Next
          </button>
          <form className="media-pagination-jump" onSubmit={handleCollectionFilesPageJumpSubmit}>
            <input
              type="number"
              min={1}
              max={Math.max(collectionFilesTotalPages, 1)}
              step={1}
              inputMode="numeric"
              value={collectionFilesPageJumpInput}
              onChange={(event) => setCollectionFilesPageJumpInput(event.target.value)}
              disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0}
              aria-label="Go to collection page"
            />
            <button type="submit" disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0}>
              Go
            </button>
          </form>
        </div>
        {showLoadingState ? (
          <p className="media-pagination-status" aria-live="polite">
            {isCollectionFilesLoading ? "Loading collection files..." : "\u00A0"}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <CollectionsPage
      openCreateCollectionModal={() => {}}
      isCollectionsLoading={isCollectionsLoading}
      collections={collections}
      handleOpenCollection={handleOpenCollection}
    >
      {collectionsError ? <p className="collections-error">{collectionsError}</p> : null}
      {selectedCollection ? (
        <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedCollection(null)}>
          <div className="collection-view-modal" onClick={(event) => event.stopPropagation()}>
            <div className="media-modal-header">
              <h2 className="upload-modal-title">{selectedCollection.label}</h2>
              <button type="button" className="media-action-btn" onClick={() => setSelectedCollection(null)}>
                Close
              </button>
            </div>
            <div className="collection-view-meta">
              <p>{selectedCollection.description || "No description."}</p>
            </div>
            <div className="collection-view-content">
              {collectionFilesError ? <p className="collections-error">{collectionFilesError}</p> : null}
              {!collectionFilesError && isCollectionFilesLoading && collectionFilesTotalCount === 0 ? (
                <p className="collections-state">Loading collection files...</p>
              ) : null}
              {!collectionFilesError && !isCollectionFilesLoading && collectionFilesTotalCount === 0 ? (
                <p className="collections-state">Collection is empty.</p>
              ) : null}
              {!collectionFilesError && collectionFilesTotalCount > 0 ? (
                <>
                  {renderCollectionFilesPagination(true)}
                  <div className="media-grid">
                    {visibleCollectionFiles.map((file) => (
                      <article
                        key={file.id || file.relativePath}
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
                              onError={() => setFailedPreviewPaths((prev) => new Set(prev).add(file.relativePath))}
                            />
                          ) : (
                            <div className="media-fallback">Preview unavailable</div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {renderCollectionFilesPagination(false)}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {selectedMedia ? (
        <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedMedia(null)}>
          <div className="media-modal" onClick={(event) => event.stopPropagation()}>
            <div className="media-modal-header">
              <h2>{getDisplayName(selectedMedia.name)}</h2>
              <button type="button" className="media-action-btn" onClick={() => setSelectedMedia(null)}>
                Close
              </button>
            </div>
            <div className="media-modal-content">
              {isVideoFile(selectedMedia) ? (
                <video
                  src={resolveOriginalMediaUrl(selectedMedia)}
                  poster={resolvePreviewMediaUrl(selectedMedia)}
                  controls
                  autoPlay
                  preload="metadata"
                />
              ) : (
                <img src={resolveOriginalMediaUrl(selectedMedia)} alt={getDisplayName(selectedMedia.name)} />
              )}
            </div>
            <div className="media-modal-meta">
              <div className="media-action-row">
                <button type="button" className="media-action-btn" disabled={!canNavigateSelectedMedia} onClick={() => handleNavigateSelectedMedia(-1)}>
                  Prev
                </button>
                <button type="button" className="media-action-btn" disabled={!canNavigateSelectedMedia} onClick={() => handleNavigateSelectedMedia(1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </CollectionsPage>
  );
}
