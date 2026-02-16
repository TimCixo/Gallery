import { useCallback, useEffect, useMemo, useState } from "react";
import { mediaApi } from "../../api/mediaApi";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../shared/utils/mediaPredicates";
import GalleryPage from "./GalleryPage";

const PAGE_SIZE = 36;

const getDisplayName = (value) => {
  const fileName = String(value || "");
  if (!fileName) {
    return "Untitled";
  }

  const normalized = fileName.split(/[\\/]/).pop() || fileName;
  return normalized.replace(/\.[^./]+$/, "") || normalized;
};

export default function GalleryContainer({ searchQuery = "" }) {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [pageJumpInput, setPageJumpInput] = useState("1");

  const loadMedia = useCallback(async (page, searchText = searchQuery) => {
    setIsMediaLoading(true);
    setMediaError("");
    try {
      const response = await mediaApi.listMedia({ page, pageSize: PAGE_SIZE, search: searchText || undefined });
      const items = Array.isArray(response?.items) ? response.items : [];
      setMediaFiles(items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" })));
      setTotalPages(Number(response?.totalPages || 0));
      setTotalFiles(Number(response?.totalCount || items.length));
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Failed to load media.");
    } finally {
      setIsMediaLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void loadMedia(currentPage, searchQuery);
  }, [currentPage, loadMedia, searchQuery]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadMedia(currentPage, searchQuery);
    };
    window.addEventListener("gallery:media-updated", handleRefresh);
    return () => window.removeEventListener("gallery:media-updated", handleRefresh);
  }, [currentPage, loadMedia, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setPageJumpInput(String(currentPage));
  }, [currentPage]);

  const visibleMediaFiles = useMemo(() => mediaFiles, [mediaFiles]);
  const selectedMediaIndex = useMemo(() => (
    selectedMedia
      ? visibleMediaFiles.findIndex((file) => file.id === selectedMedia.id || file.relativePath === selectedMedia.relativePath)
      : -1
  ), [selectedMedia, visibleMediaFiles]);
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && visibleMediaFiles.length > 1;

  const handleNavigateSelectedMedia = useCallback((offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const nextIndex = (selectedMediaIndex + offset + visibleMediaFiles.length) % visibleMediaFiles.length;
    const nextItem = visibleMediaFiles[nextIndex];
    if (nextItem) {
      setSelectedMedia(nextItem);
    }
  }, [canNavigateSelectedMedia, selectedMediaIndex, visibleMediaFiles]);

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

  const handlePageChange = (nextPage) => {
    if (isMediaLoading) {
      return;
    }
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages) || nextPage === currentPage) {
      return;
    }

    setCurrentPage(nextPage);
  };

  const handlePageJumpSubmit = (event) => {
    event.preventDefault();
    if (isMediaLoading || totalPages <= 0) {
      return;
    }

    const parsed = Number.parseInt(pageJumpInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageJumpInput(String(currentPage));
      return;
    }

    const targetPage = Math.min(Math.max(parsed, 1), totalPages);
    setPageJumpInput(String(targetPage));
    handlePageChange(targetPage);
  };

  const renderPagination = (showLoadingState = false) => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={isMediaLoading || currentPage <= 1}>
            Prev
          </button>
          <p>Page {currentPage} of {totalPages}</p>
          <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={isMediaLoading || currentPage >= totalPages}>
            Next
          </button>
          <form className="media-pagination-jump" onSubmit={handlePageJumpSubmit}>
            <input
              type="number"
              min={1}
              max={Math.max(totalPages, 1)}
              step={1}
              inputMode="numeric"
              value={pageJumpInput}
              onChange={(event) => setPageJumpInput(event.target.value)}
              disabled={isMediaLoading || totalPages === 0}
              aria-label="Go to page"
            />
            <button type="submit" disabled={isMediaLoading || totalPages === 0}>
              Go
            </button>
          </form>
        </div>
        {showLoadingState ? (
          <p className="media-pagination-status" aria-live="polite">
            {isMediaLoading ? "Loading media..." : "\u00A0"}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <GalleryPage
      mediaError={mediaError}
      isMediaLoading={isMediaLoading}
      totalFiles={totalFiles}
      visibleMediaFiles={visibleMediaFiles}
      renderPagination={renderPagination}
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
    </GalleryPage>
  );
}
