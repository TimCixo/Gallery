import { useEffect, useMemo, useState } from "react";
import { mediaApi } from "../../api/mediaApi";
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

export default function GalleryContainer() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadMedia = async () => {
      setIsMediaLoading(true);
      setMediaError("");
      try {
        const response = await mediaApi.listMedia({ page: currentPage, pageSize: PAGE_SIZE });
        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        setMediaFiles(items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" })));
        setTotalPages(Number(response?.totalPages || 0));
        setTotalFiles(Number(response?.totalCount || items.length));
      } catch (error) {
        if (!cancelled) {
          setMediaError(error instanceof Error ? error.message : "Failed to load media.");
        }
      } finally {
        if (!cancelled) {
          setIsMediaLoading(false);
        }
      }
    };

    void loadMedia();
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const visibleMediaFiles = useMemo(() => mediaFiles, [mediaFiles]);

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="pagination-wrap">
        <button type="button" className="pagination-btn" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}>
          Prev
        </button>
        <span className="pagination-state">Page {currentPage} / {totalPages}</span>
        <button type="button" className="pagination-btn" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>
          Next
        </button>
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
      setSelectedMedia={() => {}}
      failedPreviewPaths={failedPreviewPaths}
      getDisplayName={getDisplayName}
      setFailedPreviewPaths={setFailedPreviewPaths}
    />
  );
}
