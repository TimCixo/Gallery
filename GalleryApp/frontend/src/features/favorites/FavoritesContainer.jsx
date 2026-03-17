import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { mediaApi } from "../../api/mediaApi";
import { tagsApi } from "../../api/tagsApi";
import { normalizePageJumpInput } from "../shared/utils/pagination";
import { createPendingMediaDelete } from "../shared/utils/deleteConfirm";
import CollectionPickerModal from "../collections/components/CollectionPickerModal";
import CollectionPickerDialogContent from "../collections/components/CollectionPickerDialogContent";
import BulkMediaActionBar from "../media/components/BulkMediaActionBar";
import BulkMediaEditorModal from "../media/components/BulkMediaEditorModal";
import MediaDeleteConfirmModal from "../media/components/MediaDeleteConfirmModal";
import MediaViewerModal from "../media/components/MediaViewerModal";
import { useMediaMultiSelect } from "../media/hooks/useMediaMultiSelect";
import { applyMediaDraftToItem, buildMediaUpdatePayloadFromDraft } from "../media/utils/bulkMediaEdit";
import { buildRelatedMediaChain } from "../media/utils/relatedMediaChain";
import FavoritesPage from "./FavoritesPage";
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

export default function FavoritesContainer() {
  const [favoritesFiles, setFavoritesFiles] = useState([]);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesTotalPages, setFavoritesTotalPages] = useState(0);
  const [favoritesTotalFiles, setFavoritesTotalFiles] = useState(0);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [favoritesPageJumpInput, setFavoritesPageJumpInput] = useState("1");
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
    setFavoritesPageJumpInput(String(favoritesPage));
  }, [favoritesPage]);

  useEffect(() => {
    const handleRefresh = () => {
      void loadFavorites(favoritesPage);
    };
    window.addEventListener("gallery:media-updated", handleRefresh);
    return () => window.removeEventListener("gallery:media-updated", handleRefresh);
  }, [favoritesPage, loadFavorites]);

  const visibleFavoriteFiles = useMemo(() => favoritesFiles, [favoritesFiles]);
  const mediaSelection = useMediaMultiSelect(visibleFavoriteFiles);
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

    void refreshTagCatalog();
    return undefined;
  }, [selectedMedia, isEditingMedia, refreshTagCatalog]);

  const handleFavoritesPageChange = (nextPage) => {
    if (isFavoritesLoading) {
      return;
    }
    if (nextPage < 1 || (favoritesTotalPages > 0 && nextPage > favoritesTotalPages) || nextPage === favoritesPage) {
      return;
    }

    setFavoritesPage(nextPage);
  };

  const handleFavoritesPageJumpSubmit = (event) => {
    event.preventDefault();
    if (isFavoritesLoading || favoritesTotalPages <= 0) {
      return;
    }

    const result = normalizePageJumpInput(favoritesPageJumpInput, favoritesPage, favoritesTotalPages);
    if (!result.isValid) {
      setFavoritesPageJumpInput(String(favoritesPage));
      return;
    }

    setFavoritesPageJumpInput(String(result.targetPage));
    handleFavoritesPageChange(result.targetPage);
  };

  const renderFavoritesPagination = () => {
    if (favoritesTotalPages <= 1) {
      return null;
    }

    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={() => handleFavoritesPageChange(favoritesPage - 1)}
            disabled={isFavoritesLoading || favoritesPage <= 1 || favoritesTotalPages === 0}
            aria-label="Previous page"
          >
            <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
          </button>
          <p>
            Page {favoritesTotalPages === 0 ? 0 : favoritesPage} of {favoritesTotalPages}
          </p>
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={() => handleFavoritesPageChange(favoritesPage + 1)}
            disabled={isFavoritesLoading || favoritesTotalPages === 0 || favoritesPage >= favoritesTotalPages}
            aria-label="Next page"
          >
            <AppIcon name="arrowRight" alt="" aria-hidden="true" />
          </button>
          <form className="media-pagination-jump" onSubmit={handleFavoritesPageJumpSubmit}>
            <input
              type="number"
              min={1}
              max={Math.max(favoritesTotalPages, 1)}
              step={1}
              inputMode="numeric"
              value={favoritesPageJumpInput}
              onChange={(event) => setFavoritesPageJumpInput(event.target.value)}
              disabled={isFavoritesLoading || favoritesTotalPages === 0}
              aria-label="Go to favorites page"
            />
            <button type="submit" className="media-action-btn app-button-icon-only" disabled={isFavoritesLoading || favoritesTotalPages === 0} aria-label="Go to favorites page">
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
      setFavoritesFiles((current) => current.map((item) => (
        item.id === mediaId ? { ...item, isFavorite: nextIsFavorite } : item
      )));
      if (!nextIsFavorite) {
        await loadFavorites(favoritesPage);
      }
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

    const localCandidate = favoritesFiles.find((item) => item?.id === normalizedId) || null;
    if (localCandidate) {
      return localCandidate;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    return items.find((item) => Number(item?.id) === normalizedId) || null;
  }, [favoritesFiles]);

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

    let cancelled = false;
    const loadRelatedMedia = async () => {
      try {
        const items = await buildRelatedMediaChain({ media: selectedMedia, findMediaById });
        if (!cancelled) {
          setRelatedMediaItems(items);
        }
      } catch {
        if (!cancelled) {
          setRelatedMediaItems([{ ...selectedMedia, relationSide: "current", isCurrent: true }]);
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
      setFavoritesFiles((current) => current.map((item) => (
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

  const handleBulkSaveMedia = async ({ items, collectionIds }) => {
    if (!Array.isArray(items) || items.length === 0 || isSavingMedia || isDeletingMedia) {
      return;
    }

    setIsSavingMedia(true);
    setMediaModalError("");
    try {
      for (const item of items) {
        await mediaApi.updateMedia(item.id, buildMediaUpdatePayloadFromDraft(item, item.draft));
        for (const collectionId of (Array.isArray(collectionIds) ? collectionIds : [])) {
          await collectionsApi.addMediaToCollection(collectionId, item.id);
        }
      }

      const updatedItemsById = new Map(items.map((item) => ([
        item.id,
        applyMediaDraftToItem(item, item.draft, tagCatalog)
      ])));

      setFavoritesFiles((current) => current.map((item) => updatedItemsById.get(item.id) || item));
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
      setFavoritesFiles((current) => current.filter((item) => !selectedIds.has(Number(item.id))));
      setSelectedMedia((current) => (current && selectedIds.has(Number(current.id)) ? null : current));
      setPendingBulkDelete(null);
      setIsBulkEditing(false);
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
      setFavoritesFiles((current) => current.filter((item) => item.id !== selectedMedia.id));
      setSelectedMedia(null);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  return (
    <FavoritesPage
      favoritesError={favoritesError}
      isFavoritesLoading={isFavoritesLoading}
      favoritesTotalFiles={favoritesTotalFiles}
      visibleFavoriteFiles={visibleFavoriteFiles}
      renderFavoritesPagination={renderFavoritesPagination}
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
          onClose={() => setSelectedMedia(null)}
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
        onSave={({ items, collectionIds }) => void handleBulkSaveMedia({ items, collectionIds })}
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
    </FavoritesPage>
  );
}
