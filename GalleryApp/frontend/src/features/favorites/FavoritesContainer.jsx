import { useCallback, useEffect, useMemo, useState } from "react";
import { mediaApi } from "../../api/mediaApi";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../shared/utils/mediaPredicates";
import FavoritesPage from "./FavoritesPage";

const PAGE_SIZE = 36;

const getDisplayName = (value) => {
  const fileName = String(value || "");
  if (!fileName) {
    return "Untitled";
  }

  const normalized = fileName.split(/[\\/]/).pop() || fileName;
  return normalized.replace(/\.[^./]+$/, "") || normalized;
};

export default function FavoritesContainer() {
  const [favoritesFiles, setFavoritesFiles] = useState([]);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesTotalPages, setFavoritesTotalPages] = useState(0);
  const [favoritesTotalFiles, setFavoritesTotalFiles] = useState(0);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());
  const [selectedMedia, setSelectedMedia] = useState(null);

  const loadFavorites = useCallback(async (page) => {
    setIsFavoritesLoading(true);
    setFavoritesError("");
    try {
      const response = await mediaApi.listFavorites({ page, pageSize: PAGE_SIZE });
      const items = Array.isArray(response?.items) ? response.items : [];
      setFavoritesFiles(items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" })));
      setFavoritesTotalPages(Number(response?.totalPages || 0));
      setFavoritesTotalFiles(Number(response?.totalCount || items.length));
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : "Failed to load favorites.");
    } finally {
      setIsFavoritesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites(favoritesPage);
  }, [favoritesPage, loadFavorites]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadFavorites(favoritesPage);
    };
    window.addEventListener("gallery:media-updated", handleRefresh);
    return () => window.removeEventListener("gallery:media-updated", handleRefresh);
  }, [favoritesPage, loadFavorites]);

  const visibleFavoriteFiles = useMemo(() => favoritesFiles, [favoritesFiles]);
  const selectedMediaIndex = useMemo(() => (
    selectedMedia
      ? visibleFavoriteFiles.findIndex((file) => file.id === selectedMedia.id || file.relativePath === selectedMedia.relativePath)
      : -1
  ), [selectedMedia, visibleFavoriteFiles]);
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && visibleFavoriteFiles.length > 1;

  const handleNavigateSelectedMedia = useCallback((offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const nextIndex = (selectedMediaIndex + offset + visibleFavoriteFiles.length) % visibleFavoriteFiles.length;
    const nextItem = visibleFavoriteFiles[nextIndex];
    if (nextItem) {
      setSelectedMedia(nextItem);
    }
  }, [canNavigateSelectedMedia, selectedMediaIndex, visibleFavoriteFiles]);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedMedia(null);
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
  }, [selectedMedia, handleNavigateSelectedMedia]);

  const renderFavoritesPagination = () => {
    if (favoritesTotalPages <= 1) {
      return null;
    }

    return (
      <div className="pagination-wrap">
        <button type="button" className="pagination-btn" onClick={() => setFavoritesPage((value) => Math.max(1, value - 1))} disabled={favoritesPage <= 1}>
          Prev
        </button>
        <span className="pagination-state">Page {favoritesPage} / {favoritesTotalPages}</span>
        <button type="button" className="pagination-btn" onClick={() => setFavoritesPage((value) => Math.min(favoritesTotalPages, value + 1))} disabled={favoritesPage >= favoritesTotalPages}>
          Next
        </button>
      </div>
    );
  };

  return (
    <FavoritesPage
      favoritesError={favoritesError}
      isFavoritesLoading={isFavoritesLoading}
      favoritesTotalFiles={favoritesTotalFiles}
      visibleFavoriteFiles={visibleFavoriteFiles}
      renderFavoritesPagination={renderFavoritesPagination}
      setSelectedMedia={setSelectedMedia}
      failedPreviewPaths={failedPreviewPaths}
      getDisplayName={getDisplayName}
      setFailedPreviewPaths={setFailedPreviewPaths}
    >
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
    </FavoritesPage>
  );
}
