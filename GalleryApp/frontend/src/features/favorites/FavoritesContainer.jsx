import { useEffect, useMemo, useState } from "react";
import { mediaApi } from "../../api/mediaApi";
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

  useEffect(() => {
    let cancelled = false;
    const loadFavorites = async () => {
      setIsFavoritesLoading(true);
      setFavoritesError("");
      try {
        const response = await mediaApi.listFavorites({ page: favoritesPage, pageSize: PAGE_SIZE });
        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        setFavoritesFiles(items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" })));
        setFavoritesTotalPages(Number(response?.totalPages || 0));
        setFavoritesTotalFiles(Number(response?.totalCount || items.length));
      } catch (error) {
        if (!cancelled) {
          setFavoritesError(error instanceof Error ? error.message : "Failed to load favorites.");
        }
      } finally {
        if (!cancelled) {
          setIsFavoritesLoading(false);
        }
      }
    };

    void loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [favoritesPage]);

  const visibleFavoriteFiles = useMemo(() => favoritesFiles, [favoritesFiles]);

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
      setSelectedMedia={() => {}}
      failedPreviewPaths={failedPreviewPaths}
      getDisplayName={getDisplayName}
      setFailedPreviewPaths={setFailedPreviewPaths}
    />
  );
}
