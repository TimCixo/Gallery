import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { mediaApi } from "../../api/mediaApi";
import { tagsApi } from "../../api/tagsApi";
import { normalizePageJumpDisplayValue, normalizePageJumpInput } from "../shared/utils/pagination";
import { createPendingMediaDelete } from "../shared/utils/deleteConfirm";
import CollectionPickerModal from "../collections/components/CollectionPickerModal";
import CollectionPickerDialogContent from "../collections/components/CollectionPickerDialogContent";
import BulkMediaActionBar from "../media/components/BulkMediaActionBar";
import BulkMediaEditorModal from "../media/components/BulkMediaEditorModal";
import MediaDeleteConfirmModal from "../media/components/MediaDeleteConfirmModal";
import MediaViewerModal from "../media/components/MediaViewerModal";
import { useMediaMultiSelect } from "../media/hooks/useMediaMultiSelect";
import { saveBulkMediaItems } from "../media/utils/bulkMediaSave";
import { buildRelatedMediaChain } from "../media/utils/relatedMediaChain";
import { fetchAllMediaItems } from "./utils/fetchAllMediaItems";
import { buildGroupedMediaPagination } from "./utils/groupRelatedMediaPagination";
import { loadGalleryViewState, persistGalleryViewState } from "./utils/galleryViewState";
import GalleryPage from "./GalleryPage";
import AppIcon from "../shared/components/AppIcon";

const PAGE_SIZE = 36;

const getDisplayName = (value) => {
  const fileName = String(value || "");
  if (!fileName) {
    return "Untitled";
  }

  const normalized = fileName.split(/[\\/]/).pop() || fileName;
  return normalized.replace(/\.[^./]+$/, "") || normalized;
};

export default function GalleryContainer({
  searchQuery = "",
  searchSubmitSeq = 0,
  openMediaRequest = null,
  groupRelatedMedia = false
}) {
  const initialViewState = useMemo(() => loadGalleryViewState(), []);
  const mediaCacheRef = useRef(new Map());
  const relatedMediaChainCacheRef = useRef(new Map());
  const [mediaFiles, setMediaFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(
    initialViewState.searchQuery === searchQuery ? initialViewState.page : 1
  );
  const [totalPages, setTotalPages] = useState(0);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [persistedSelectedMediaId, setPersistedSelectedMediaId] = useState(
    initialViewState.searchQuery === searchQuery ? initialViewState.selectedMediaId : null
  );
  const [pageJumpInput, setPageJumpInput] = useState("1");
  const [mediaModalError, setMediaModalError] = useState("");
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [mediaDraft, setMediaDraft] = useState({ title: "", description: "", source: "", parent: "", child: "", tagIds: [] });
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [tagCatalog, setTagCatalog] = useState([]);
  const [tagTypesCatalog, setTagTypesCatalog] = useState([]);
  const [isTagCatalogLoading, setIsTagCatalogLoading] = useState(false);
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [collectionPickerItems, setCollectionPickerItems] = useState([]);
  const [collectionPickerError, setCollectionPickerError] = useState("");
  const [isCollectionPickerLoading, setIsCollectionPickerLoading] = useState(false);
  const [isAddingMediaToCollection, setIsAddingMediaToCollection] = useState(false);
  const [mediaRelationPreviewByMode, setMediaRelationPreviewByMode] = useState({
    parent: { item: null, isLoading: false, error: "" },
    child: { item: null, isLoading: false, error: "" }
  });
  const [relatedMediaItems, setRelatedMediaItems] = useState([]);
  const [isMediaRelationPickerOpen, setIsMediaRelationPickerOpen] = useState(false);
  const [mediaRelationPickerMode, setMediaRelationPickerMode] = useState("parent");
  const [mediaRelationPickerQuery, setMediaRelationPickerQuery] = useState("");
  const [mediaRelationPickerPage, setMediaRelationPickerPage] = useState(1);
  const [mediaRelationPickerItems, setMediaRelationPickerItems] = useState([]);
  const [mediaRelationPickerTotalPages, setMediaRelationPickerTotalPages] = useState(0);
  const [mediaRelationPickerTotalCount, setMediaRelationPickerTotalCount] = useState(0);
  const [isMediaRelationPickerLoading, setIsMediaRelationPickerLoading] = useState(false);
  const [mediaRelationPickerError, setMediaRelationPickerError] = useState("");
  const [pendingBulkDelete, setPendingBulkDelete] = useState(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const lastHandledSearchSubmitSeqRef = useRef(searchSubmitSeq);
  const previousSearchQueryRef = useRef(searchQuery);

  const closeSelectedMedia = useCallback(() => {
    setPersistedSelectedMediaId(null);
    setSelectedMedia(null);
  }, []);

  const refreshTagCatalog = useCallback(async () => {
    setIsTagCatalogLoading(true);
    try {
      const [tagsResponse, tagTypesResponse] = await Promise.all([
        tagsApi.listTags(),
        tagsApi.listTagTypes()
      ]);
      setTagCatalog(Array.isArray(tagsResponse?.items) ? tagsResponse.items : []);
      setTagTypesCatalog(Array.isArray(tagTypesResponse?.items) ? tagTypesResponse.items : []);
    } catch {
      setTagCatalog([]);
      setTagTypesCatalog([]);
    } finally {
      setIsTagCatalogLoading(false);
    }
  }, []);

  const loadMedia = useCallback(async (page, searchText = searchQuery) => {
    setIsMediaLoading(true);
    setMediaError("");
    try {
      if (groupRelatedMedia) {
        const items = await fetchAllMediaItems({ listMedia: mediaApi.listMedia, search: searchText, pageSize: 200 });
        const normalizedItems = items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" }));
        normalizedItems.forEach((item) => {
          const normalizedId = Number(item?.id);
          if (Number.isSafeInteger(normalizedId) && normalizedId > 0) {
            mediaCacheRef.current.set(normalizedId, item);
          }
        });

        const groupedPage = buildGroupedMediaPagination(normalizedItems, page, PAGE_SIZE);
        setMediaFiles(groupedPage.items);
        setTotalPages(groupedPage.totalPages);
        setTotalFiles(groupedPage.totalCount);
        if (groupedPage.page !== page) {
          setCurrentPage(groupedPage.page);
        }
        return;
      }

      const response = await mediaApi.listMedia({ page, pageSize: PAGE_SIZE, search: searchText || undefined });
      const items = Array.isArray(response?.items) ? response.items : [];
      const normalizedItems = items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" }));
      normalizedItems.forEach((item) => {
        const normalizedId = Number(item?.id);
        if (Number.isSafeInteger(normalizedId) && normalizedId > 0) {
          mediaCacheRef.current.set(normalizedId, item);
        }
      });
      setMediaFiles(normalizedItems);
      setTotalPages(Number(response?.totalPages || 0));
      setTotalFiles(Number(response?.totalCount || normalizedItems.length));
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Failed to load media.");
    } finally {
      setIsMediaLoading(false);
    }
  }, [groupRelatedMedia, searchQuery]);

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
    if (previousSearchQueryRef.current === searchQuery) {
      return;
    }

    previousSearchQueryRef.current = searchQuery;
    setCurrentPage(1);
    setSelectedMedia(null);
    setPersistedSelectedMediaId(null);
  }, [searchQuery]);

  useEffect(() => {
    if (searchSubmitSeq === lastHandledSearchSubmitSeqRef.current) {
      return;
    }
    lastHandledSearchSubmitSeqRef.current = searchSubmitSeq;

    if (currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    void loadMedia(1, searchQuery);
  }, [currentPage, loadMedia, searchQuery, searchSubmitSeq]);

  useEffect(() => {
    if (!openMediaRequest?.media) {
      return;
    }

    setSelectedMedia(openMediaRequest.media);
    setPersistedSelectedMediaId(Number(openMediaRequest.media.id) || null);
  }, [openMediaRequest]);

  useEffect(() => {
    persistGalleryViewState({
      page: currentPage,
      selectedMediaId: selectedMedia?.id ?? persistedSelectedMediaId,
      searchQuery
    });
  }, [currentPage, persistedSelectedMediaId, searchQuery, selectedMedia]);

  useEffect(() => {
    setPageJumpInput(String(currentPage));
  }, [currentPage]);

  const visibleMediaFiles = useMemo(() => mediaFiles, [mediaFiles]);
  const mediaSelection = useMediaMultiSelect(visibleMediaFiles);
  const hasBlockingDialogOpen = Boolean(
    selectedMedia
    || isBulkEditing
    || isCollectionPickerOpen
    || isMediaRelationPickerOpen
  );
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
        closeSelectedMedia();
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
  }, [closeSelectedMedia, selectedMedia, handleNavigateSelectedMedia]);

  useEffect(() => {
    if (!selectedMedia) {
      setIsCollectionPickerOpen(false);
      setCollectionPickerItems([]);
      setCollectionPickerError("");
      setMediaModalError("");
      setIsEditingMedia(false);
      setTagCatalog([]);
      setTagTypesCatalog([]);
      setIsTagCatalogLoading(false);
      setIsMediaRelationPickerOpen(false);
      setMediaRelationPickerMode("parent");
      setMediaRelationPickerQuery("");
      setMediaRelationPickerPage(1);
      setMediaRelationPickerItems([]);
      setMediaRelationPickerTotalPages(0);
      setMediaRelationPickerTotalCount(0);
      setIsMediaRelationPickerLoading(false);
      setMediaRelationPickerError("");
      setMediaRelationPreviewByMode({
        parent: { item: null, isLoading: false, error: "" },
        child: { item: null, isLoading: false, error: "" }
      });
      setRelatedMediaItems([]);
    }
  }, [selectedMedia]);

  useEffect(() => {
    if (mediaSelection.selectedCount > 0) {
      return;
    }

    setPendingBulkDelete(null);
    setIsBulkEditing(false);
  }, [mediaSelection.selectedCount]);

  useEffect(() => {
    if (!selectedMedia) {
      return;
    }
    setMediaDraft({
      title: String(selectedMedia.title || ""),
      description: String(selectedMedia.description || ""),
      source: String(selectedMedia.source || ""),
      parent: selectedMedia.parent ?? "",
      child: selectedMedia.child ?? "",
      tagIds: Array.isArray(selectedMedia.tags) ? selectedMedia.tags.map((tag) => Number(tag.id)).filter((id) => Number.isInteger(id) && id > 0) : []
    });
  }, [selectedMedia]);

  useEffect(() => {
    if (!selectedMedia || !isEditingMedia) {
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      await refreshTagCatalog();
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedMedia, isEditingMedia, refreshTagCatalog]);

  const handlePageChange = (nextPage) => {
    if (isMediaLoading) {
      return;
    }
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages) || nextPage === currentPage) {
      return;
    }

    setCurrentPage(nextPage);
  };

  useEffect(() => {
    if (hasBlockingDialogOpen || totalPages <= 1) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement
        && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      handlePageChange(event.key === "ArrowRight" ? currentPage + 1 : currentPage - 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, hasBlockingDialogOpen, isMediaLoading, totalPages]);

  const handlePageJumpSubmit = (event) => {
    event.preventDefault();
    if (isMediaLoading || totalPages <= 0) {
      return;
    }

    const result = normalizePageJumpInput(pageJumpInput, currentPage, totalPages);
    if (!result.isValid) {
      setPageJumpInput(String(currentPage));
      return;
    }

    setPageJumpInput(String(result.targetPage));
    handlePageChange(result.targetPage);
  };

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={isMediaLoading || currentPage <= 1 || totalPages === 0}
            aria-label="Previous page"
          >
            <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
          </button>
          <p>
            Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
          </p>
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={isMediaLoading || totalPages === 0 || currentPage >= totalPages}
            aria-label="Next page"
          >
            <AppIcon name="arrowRight" alt="" aria-hidden="true" />
          </button>
          <form className="media-pagination-jump" onSubmit={handlePageJumpSubmit} noValidate>
            <input
              type="number"
              min={1}
              max={Math.max(totalPages, 1)}
              step={1}
              inputMode="numeric"
              value={pageJumpInput}
              onChange={(event) => setPageJumpInput(event.target.value)}
              onBlur={(event) => setPageJumpInput(normalizePageJumpDisplayValue(event.target.value, currentPage, totalPages))}
              disabled={isMediaLoading || totalPages === 0}
              aria-label="Go to page"
            />
            <button type="submit" className="media-action-btn app-button-icon-only" disabled={isMediaLoading || totalPages === 0} aria-label="Go to page">
              <AppIcon name="confirm" alt="" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    );
  };

  const closeCollectionPicker = () => {
    if (isAddingMediaToCollection) {
      return;
    }
    setIsCollectionPickerOpen(false);
    setCollectionPickerError("");
  };

  const openCollectionPickerForSelectedMedia = async () => {
    if (!selectedMedia?.id || isCollectionPickerLoading || isAddingMediaToCollection) {
      return;
    }

    setIsCollectionPickerOpen(true);
    setCollectionPickerError("");
    setIsCollectionPickerLoading(true);
    try {
      const response = await collectionsApi.listCollections({ mediaId: selectedMedia.id });
      setCollectionPickerItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      setCollectionPickerItems([]);
      setCollectionPickerError(error instanceof Error ? error.message : "Failed to fetch collections.");
    } finally {
      setIsCollectionPickerLoading(false);
    }
  };

  const handleAddSelectedMediaToCollection = async (collectionId) => {
    if (!selectedMedia?.id || !Number.isInteger(collectionId) || collectionId <= 0 || isAddingMediaToCollection) {
      return;
    }

    setIsAddingMediaToCollection(true);
    setCollectionPickerError("");
    try {
      await collectionsApi.addMediaToCollection(collectionId, selectedMedia.id);
      setCollectionPickerItems((current) => current.map((item) => (
        item.id === collectionId ? { ...item, containsMedia: true } : item
      )));
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setCollectionPickerError(error instanceof Error ? error.message : "Failed to add media to collection.");
    } finally {
      setIsAddingMediaToCollection(false);
    }
  };

  const isSelectedMediaFavorite = Boolean(selectedMedia?.isFavorite);
  const toggleSelectedMediaFavorite = async () => {
    if (!selectedMedia?.id || isFavoriteUpdating) {
      return;
    }

    const mediaId = selectedMedia.id;
    const nextIsFavorite = !Boolean(selectedMedia.isFavorite);
    setIsFavoriteUpdating(true);
    setMediaModalError("");
    try {
      await mediaApi.setFavorite(mediaId, nextIsFavorite);
      setSelectedMedia((current) => (
        current && current.id === mediaId ? { ...current, isFavorite: nextIsFavorite } : current
      ));
      setMediaFiles((current) => current.map((item) => (
        item.id === mediaId ? { ...item, isFavorite: nextIsFavorite } : item
      )));
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to update favorites.");
    } finally {
      setIsFavoriteUpdating(false);
    }
  };

  const toNullableId = (value) => {
    const text = String(value ?? "").trim();
    if (!text) {
      return null;
    }
    const parsed = Number.parseInt(text, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const findMediaById = useCallback(async (mediaId) => {
    const normalizedId = Number(mediaId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const cachedCandidate = mediaCacheRef.current.get(normalizedId) || null;
    if (cachedCandidate) {
      return cachedCandidate;
    }

    const localCandidate = mediaFiles.find((item) => item?.id === normalizedId) || null;
    if (localCandidate) {
      mediaCacheRef.current.set(normalizedId, localCandidate);
      return localCandidate;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    const remoteCandidate = items.find((item) => Number(item?.id) === normalizedId) || null;
    if (remoteCandidate) {
      const normalizedCandidate = { ...remoteCandidate, _tileUrl: remoteCandidate.tileUrl || remoteCandidate.previewUrl || remoteCandidate.originalUrl || remoteCandidate.url || "" };
      mediaCacheRef.current.set(normalizedId, normalizedCandidate);
      return normalizedCandidate;
    }

    return null;
  }, [mediaFiles]);

  useEffect(() => {
    if (selectedMedia) {
      setPersistedSelectedMediaId(Number(selectedMedia.id) || null);
      return;
    }

    const selectedMediaId = Number(persistedSelectedMediaId);
    if (!Number.isSafeInteger(selectedMediaId) || selectedMediaId <= 0 || isMediaLoading) {
      return;
    }

    const localCandidate = mediaFiles.find((item) => Number(item?.id) === selectedMediaId) || null;
    if (localCandidate) {
      setSelectedMedia(localCandidate);
      return;
    }

    let cancelled = false;
    const restoreSelectedMedia = async () => {
      try {
        const candidate = await findMediaById(selectedMediaId);
        if (cancelled) {
          return;
        }

        if (candidate) {
          setSelectedMedia(candidate);
          return;
        }

        setPersistedSelectedMediaId(null);
      } catch {
        if (!cancelled) {
          setPersistedSelectedMediaId(null);
        }
      }
    };

    void restoreSelectedMedia();
    return () => {
      cancelled = true;
    };
  }, [findMediaById, isMediaLoading, mediaFiles, persistedSelectedMediaId, selectedMedia]);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const resolveMode = async (mode) => {
      const rawValue = String(
        isEditingMedia
          ? (mode === "parent" ? mediaDraft.parent : mediaDraft.child)
          : (mode === "parent" ? selectedMedia.parent : selectedMedia.child)
          || ""
      ).trim();
      if (!rawValue) {
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: "" }
        }));
        return;
      }

      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: "Invalid media id." }
        }));
        return;
      }

      setMediaRelationPreviewByMode((current) => ({
        ...current,
        [mode]: { item: null, isLoading: true, error: "" }
      }));

      try {
        const candidate = await findMediaById(parsed);
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: candidate
            ? { item: candidate, isLoading: false, error: "" }
            : { item: null, isLoading: false, error: "Media not found." }
        }));
      } catch (error) {
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: error instanceof Error ? error.message : "Failed to resolve media." }
        }));
      }
    };

    void resolveMode("parent");
    void resolveMode("child");
    return undefined;
  }, [selectedMedia, isEditingMedia, mediaDraft.parent, mediaDraft.child, findMediaById]);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const selectedMediaId = Number(selectedMedia.id);
    if (Number.isSafeInteger(selectedMediaId) && selectedMediaId > 0) {
      mediaCacheRef.current.set(selectedMediaId, selectedMedia);
      const cachedChain = relatedMediaChainCacheRef.current.get(selectedMediaId);
      if (Array.isArray(cachedChain) && cachedChain.length > 0) {
        setRelatedMediaItems(cachedChain);
      } else {
        setRelatedMediaItems((current) => (
          Array.isArray(current) && current.length > 0
            ? current.map((item) => ({
              ...item,
              isCurrent: Number(item?.id) === selectedMediaId,
              relationSide: Number(item?.id) === selectedMediaId ? "current" : item.relationSide
            }))
            : [{ ...selectedMedia, relationSide: "current", isCurrent: true }]
        ));
      }
    }

    let cancelled = false;
    const loadRelatedMedia = async () => {
      try {
        const items = await buildRelatedMediaChain({ media: selectedMedia, findMediaById });
        if (!cancelled) {
          if (Number.isSafeInteger(selectedMediaId) && selectedMediaId > 0) {
            relatedMediaChainCacheRef.current.set(selectedMediaId, items);
          }
          setRelatedMediaItems(items);
        }
      } catch {
        if (!cancelled) {
          const fallbackItems = [{ ...selectedMedia, relationSide: "current", isCurrent: true }];
          if (Number.isSafeInteger(selectedMediaId) && selectedMediaId > 0) {
            relatedMediaChainCacheRef.current.set(selectedMediaId, fallbackItems);
          }
          setRelatedMediaItems(fallbackItems);
        }
      }
    };

    void loadRelatedMedia();
    return () => {
      cancelled = true;
    };
  }, [selectedMedia, findMediaById]);

  const handleOpenRelatedMediaById = async (targetId) => {
    const normalizedId = Number(targetId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0 || selectedMedia?.id === normalizedId) {
      return;
    }

    setMediaModalError("");
    try {
      const candidate = await findMediaById(normalizedId);
      if (!candidate) {
        throw new Error(`Media with id ${normalizedId} was not found.`);
      }
      setSelectedMedia(candidate);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to open related media.");
    }
  };

  const openMediaRelationPicker = (mode) => {
    setMediaRelationPickerMode(mode === "child" ? "child" : "parent");
    setMediaRelationPickerQuery("");
    setMediaRelationPickerPage(1);
    setIsMediaRelationPickerOpen(true);
  };

  const closeMediaRelationPicker = () => {
    setIsMediaRelationPickerOpen(false);
    setMediaRelationPickerError("");
  };

  useEffect(() => {
    if (!isMediaRelationPickerOpen) {
      return undefined;
    }

    let cancelled = false;
    const loadItems = async () => {
      setIsMediaRelationPickerLoading(true);
      setMediaRelationPickerError("");
      try {
        const response = await mediaApi.listMedia({
          page: mediaRelationPickerPage,
          pageSize: 24,
          search: mediaRelationPickerQuery.trim() || undefined
        });
        if (cancelled) {
          return;
        }
        const items = Array.isArray(response?.items) ? response.items : [];
        setMediaRelationPickerItems(items);
        setMediaRelationPickerTotalPages(Number(response?.totalPages || 0));
        setMediaRelationPickerTotalCount(Number(response?.totalCount || items.length));
      } catch (error) {
        if (!cancelled) {
          setMediaRelationPickerItems([]);
          setMediaRelationPickerTotalPages(0);
          setMediaRelationPickerTotalCount(0);
          setMediaRelationPickerError(error instanceof Error ? error.message : "Failed to load media.");
        }
      } finally {
        if (!cancelled) {
          setIsMediaRelationPickerLoading(false);
        }
      }
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [isMediaRelationPickerOpen, mediaRelationPickerPage, mediaRelationPickerQuery]);

  const handleSelectMediaRelationFromPicker = (item) => {
    const selectedId = Number(item?.id);
    if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
      return;
    }

    const key = mediaRelationPickerMode === "child" ? "child" : "parent";
    setMediaDraft((current) => ({ ...current, [key]: String(selectedId) }));
    closeMediaRelationPicker();
  };

  const handleSaveMedia = async () => {
    if (!selectedMedia?.id || isSavingMedia || isDeletingMedia) {
      return;
    }

    setIsSavingMedia(true);
    setMediaModalError("");
    try {
      const payload = {
        title: String(mediaDraft.title || "").trim() || null,
        description: String(mediaDraft.description || "").trim() || null,
        source: String(mediaDraft.source || "").trim() || null,
        parent: toNullableId(mediaDraft.parent),
        child: toNullableId(mediaDraft.child),
        tagIds: Array.isArray(mediaDraft.tagIds) ? mediaDraft.tagIds : []
      };
      await mediaApi.updateMedia(selectedMedia.id, payload);

      const patch = {
        title: payload.title,
        description: payload.description,
        source: payload.source,
        parent: payload.parent,
        child: payload.child,
        tags: tagCatalog.filter((tag) => payload.tagIds.includes(Number(tag.id)))
      };
      setSelectedMedia((current) => (current ? { ...current, ...patch } : current));
      setMediaFiles((current) => current.map((item) => (
        item.id === selectedMedia.id ? { ...item, ...patch } : item
      )));
      setIsEditingMedia(false);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to update media.");
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleOpenBulkEdit = async () => {
    if (mediaSelection.selectedCount === 0 || isSavingMedia || isDeletingMedia) {
      return;
    }

    setMediaModalError("");
    setIsBulkEditing(true);
    await refreshTagCatalog();
  };

  const handleBulkSaveMedia = async ({ items, collectionIds, relationStrategy }) => {
    if (!Array.isArray(items) || items.length === 0 || isSavingMedia || isDeletingMedia) {
      return;
    }

    setIsSavingMedia(true);
    setMediaModalError("");
    try {
      const updatedItemsById = await saveBulkMediaItems({
        items,
        relationStrategy,
        collectionIds,
        tagCatalog,
        updateMedia: mediaApi.updateMedia,
        addMediaToCollection: collectionsApi.addMediaToCollection
      });

      setMediaFiles((current) => current.map((item) => updatedItemsById.get(item.id) || item));
      setSelectedMedia((current) => (current ? (updatedItemsById.get(current.id) || current) : current));
      setIsBulkEditing(false);
      mediaSelection.clearSelection();
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to update media.");
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleBulkDeleteMedia = async () => {
    if (mediaSelection.selectedCount === 0 || isDeletingMedia || isSavingMedia) {
      return;
    }

    setIsDeletingMedia(true);
    setMediaModalError("");
    try {
      for (const item of mediaSelection.selectedMediaItems) {
        await mediaApi.deleteMedia(item.id);
      }

      const selectedIds = new Set(mediaSelection.selectedMediaIds);
      setMediaFiles((current) => current.filter((item) => !selectedIds.has(Number(item.id))));
      setSelectedMedia((current) => (current && selectedIds.has(Number(current.id)) ? null : current));
      setPendingBulkDelete(null);
      mediaSelection.clearSelection();
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!selectedMedia?.id || isDeletingMedia || isSavingMedia) {
      return;
    }

    setIsDeletingMedia(true);
    setMediaModalError("");
    try {
      await mediaApi.deleteMedia(selectedMedia.id);
      setMediaFiles((current) => current.filter((item) => item.id !== selectedMedia.id));
      setSelectedMedia(null);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  return (
    <GalleryPage
      mediaError={mediaError}
      isMediaLoading={isMediaLoading}
      totalFiles={totalFiles}
      visibleMediaFiles={visibleMediaFiles}
      renderPagination={renderPagination}
      setSelectedMedia={setSelectedMedia}
      mediaSelection={mediaSelection}
      failedPreviewPaths={failedPreviewPaths}
      getDisplayName={getDisplayName}
      setFailedPreviewPaths={setFailedPreviewPaths}
      bulkActionBar={(
        <BulkMediaActionBar
          selectedCount={mediaSelection.selectedCount}
          onClearSelection={mediaSelection.clearSelection}
          onDeleteSelection={() => setPendingBulkDelete(createPendingMediaDelete(mediaSelection.selectedMediaItems))}
          onEditSelection={() => void handleOpenBulkEdit()}
        />
      )}
    >
      {selectedMedia ? (
        <MediaViewerModal
          file={selectedMedia}
          onClose={closeSelectedMedia}
          onPrev={() => handleNavigateSelectedMedia(-1)}
          onNext={() => handleNavigateSelectedMedia(1)}
          canNavigate={canNavigateSelectedMedia}
          getDisplayName={getDisplayName}
          isFavorite={isSelectedMediaFavorite}
          onToggleFavorite={toggleSelectedMediaFavorite}
          isFavoriteUpdating={isFavoriteUpdating}
          onOpenCollectionPicker={openCollectionPickerForSelectedMedia}
          isCollectionPickerLoading={isCollectionPickerLoading}
          isAddingMediaToCollection={isAddingMediaToCollection}
          errorMessage={mediaModalError}
          isEditing={isEditingMedia}
          draft={mediaDraft}
          onDraftChange={(patch) => setMediaDraft((current) => ({ ...current, ...patch }))}
          tagCatalog={tagCatalog}
          tagTypes={tagTypesCatalog}
          isTagCatalogLoading={isTagCatalogLoading}
          onRefreshTagCatalog={refreshTagCatalog}
          selectedTagIds={Array.isArray(mediaDraft.tagIds) ? mediaDraft.tagIds : []}
          onToggleTag={(tagId) => setMediaDraft((current) => {
            const currentIds = Array.isArray(current.tagIds) ? current.tagIds : [];
            const hasTag = currentIds.includes(tagId);
            return { ...current, tagIds: hasTag ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId] };
          })}
          relatedMediaItems={relatedMediaItems}
          relationPreviewByMode={mediaRelationPreviewByMode}
          onOpenRelationPicker={openMediaRelationPicker}
          onOpenRelatedMediaById={handleOpenRelatedMediaById}
          isMediaRelationPickerOpen={isMediaRelationPickerOpen}
          mediaRelationPickerMode={mediaRelationPickerMode}
          mediaRelationPickerQuery={mediaRelationPickerQuery}
          onMediaRelationPickerQueryChange={(value) => {
            setMediaRelationPickerQuery(value);
            setMediaRelationPickerPage(1);
          }}
          mediaRelationPickerItems={mediaRelationPickerItems}
          mediaRelationPickerPage={mediaRelationPickerPage}
          mediaRelationPickerTotalPages={mediaRelationPickerTotalPages}
          mediaRelationPickerTotalCount={mediaRelationPickerTotalCount}
          isMediaRelationPickerLoading={isMediaRelationPickerLoading}
          mediaRelationPickerError={mediaRelationPickerError}
          onMediaRelationPickerPrev={() => setMediaRelationPickerPage((current) => Math.max(1, current - 1))}
          onMediaRelationPickerNext={() => setMediaRelationPickerPage((current) => current + 1)}
          onMediaRelationPickerPageChange={(value) => setMediaRelationPickerPage(value)}
          onCloseMediaRelationPicker={closeMediaRelationPicker}
          onSelectMediaRelationFromPicker={handleSelectMediaRelationFromPicker}
          onStartEdit={() => setIsEditingMedia(true)}
          onCancelEdit={() => setIsEditingMedia(false)}
          onSaveEdit={handleSaveMedia}
          isSavingMedia={isSavingMedia}
          onDelete={handleDeleteMedia}
          isDeletingMedia={isDeletingMedia}
        />
      ) : null}
      <CollectionPickerModal isOpen={isCollectionPickerOpen} onClose={closeCollectionPicker} initialData={{ kind: "media" }}>
        <CollectionPickerDialogContent
          items={collectionPickerItems}
          errorMessage={collectionPickerError}
          isLoading={isCollectionPickerLoading}
          isBusy={isAddingMediaToCollection}
          onSelect={(item) => void handleAddSelectedMediaToCollection(item.id)}
          onClose={closeCollectionPicker}
        />
      </CollectionPickerModal>
      <BulkMediaEditorModal
        isOpen={isBulkEditing}
        selectedItems={mediaSelection.selectedMediaItems}
        tagCatalog={tagCatalog}
        tagTypes={tagTypesCatalog}
        isTagCatalogLoading={isTagCatalogLoading}
        onRefreshTagCatalog={refreshTagCatalog}
        isSaving={isSavingMedia}
        errorMessage={mediaModalError}
        onClose={() => setIsBulkEditing(false)}
        onSave={({ items, collectionIds, relationStrategy }) => void handleBulkSaveMedia({ items, collectionIds, relationStrategy })}
      />
      <MediaDeleteConfirmModal
        pendingMediaDelete={pendingBulkDelete}
        isDeletingMedia={isDeletingMedia}
        onConfirm={() => void handleBulkDeleteMedia()}
        onClose={() => {
          if (!isDeletingMedia) {
            setPendingBulkDelete(null);
          }
        }}
      />
    </GalleryPage>
  );
}
