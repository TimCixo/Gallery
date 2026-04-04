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
import MediaQuickTaggingAction from "../media/components/MediaQuickTaggingAction";
import MediaDeleteConfirmModal from "../media/components/MediaDeleteConfirmModal";
import MediaViewerModal from "../media/components/MediaViewerModal";
import QuickTaggingModal from "../media/components/QuickTaggingModal";
import { useMediaReferencePicker } from "../media/hooks/useMediaReferencePicker";
import { useMediaMultiSelect } from "../media/hooks/useMediaMultiSelect";
import { useQuickTagging } from "../media/hooks/useQuickTagging";
import { useRecommendedMedia } from "../media/hooks/useRecommendedMedia";
import {
  deleteBulkSelectedMedia,
  deleteSelectedMedia,
  saveBulkSelectedMedia,
  saveSelectedMediaDetails
} from "../media/utils/mediaBulkActions";
import {
  addSelectedMediaToCollection,
  openMediaCollectionPicker,
  refreshMediaTagCatalog,
  toggleSelectedMediaFavorite as toggleMediaFavorite
} from "../media/utils/mediaMutationHelpers";
import { resolvePagedMediaNavigation } from "../media/utils/pagedMediaNavigation";
import { buildRelatedMediaChain } from "../media/utils/relatedMediaChain";
import { fetchAllMediaItems } from "./utils/fetchAllMediaItems";
import { buildGroupedMediaPagination } from "./utils/groupRelatedMediaPagination";
import { loadGalleryViewState, persistGalleryViewState } from "./utils/galleryViewState";
import GalleryPage from "./GalleryPage";
import AppIcon from "../shared/components/AppIcon";

const DEFAULT_PAGE_SIZE = 36;

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
  groupRelatedMedia = false,
  recommendationSettings,
  mediaGridPageSize = DEFAULT_PAGE_SIZE,
  defaultMediaFitMode = "resize",
  showRelatedMediaStrip = true,
  confirmDestructiveActions = true,
  defaultQuickTaggingTags = ""
}) {
  const pageSize = Number.isInteger(mediaGridPageSize) && mediaGridPageSize > 0 ? mediaGridPageSize : DEFAULT_PAGE_SIZE;
  const initialViewState = useMemo(() => loadGalleryViewState(), []);
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
  const [relatedMediaItems, setRelatedMediaItems] = useState([]);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [pendingMediaNavigation, setPendingMediaNavigation] = useState(null);
  const lastHandledSearchSubmitSeqRef = useRef(searchSubmitSeq);
  const previousSearchQueryRef = useRef(searchQuery);

  const closeSelectedMedia = useCallback(() => {
    setPersistedSelectedMediaId(null);
    setSelectedMedia(null);
  }, []);

  const refreshTagCatalog = useCallback(async () => {
    await refreshMediaTagCatalog({
      tagsApi,
      setTagCatalog,
      setTagTypesCatalog,
      setIsTagCatalogLoading
    });
  }, []);

  const loadMedia = useCallback(async (page, searchText = searchQuery) => {
    setIsMediaLoading(true);
    setMediaError("");
    try {
      if (groupRelatedMedia) {
        const items = await fetchAllMediaItems({ listMedia: mediaApi.listMedia, search: searchText, pageSize: 200 });
        const normalizedItems = items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" }));

        const groupedPage = buildGroupedMediaPagination(normalizedItems, page, pageSize);
        setMediaFiles(groupedPage.items);
        setTotalPages(groupedPage.totalPages);
        setTotalFiles(groupedPage.totalCount);
        if (groupedPage.page !== page) {
          setCurrentPage(groupedPage.page);
        }
        return;
      }

      const response = await mediaApi.listMedia({ page, pageSize, search: searchText || undefined });
      const items = Array.isArray(response?.items) ? response.items : [];
      const normalizedItems = items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" }));
      setMediaFiles(normalizedItems);
      setTotalPages(Number(response?.totalPages || 0));
      setTotalFiles(Number(response?.totalCount || normalizedItems.length));
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Failed to load media.");
    } finally {
      setIsMediaLoading(false);
    }
  }, [groupRelatedMedia, pageSize, searchQuery]);

  const quickTagging = useQuickTagging({
    items: mediaFiles,
    tagCatalog,
    ensureTagCatalog: async () => {
      if (tagCatalog.length === 0 && tagTypesCatalog.length === 0) {
        await refreshTagCatalog();
      }
    },
    updateMedia: mediaApi.updateMedia,
    onItemsChange: setMediaFiles,
    defaultAddTagsInput: defaultQuickTaggingTags
  });
  const mediaReferencePicker = useMediaReferencePicker({
    valueByMode: {
      parent: isEditingMedia ? mediaDraft.parent : selectedMedia?.parent,
      child: isEditingMedia ? mediaDraft.child : selectedMedia?.child
    },
    onSelectReference: (mode, item) => {
      const selectedId = Number(item?.id);
      if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
        return;
      }

      setMediaDraft((current) => ({ ...current, [mode === "child" ? "child" : "parent"]: String(selectedId) }));
    },
    localItems: mediaFiles,
    isEnabled: Boolean(selectedMedia)
  });
  const visibleMediaFiles = useMemo(() => quickTagging.visibleItems, [quickTagging.visibleItems]);
  const mediaSelection = useMediaMultiSelect(visibleMediaFiles);
  const {
    recommendedMediaItems,
    isRecommendedMediaLoading,
    recommendedMediaError
  } = useRecommendedMedia({
    selectedMedia,
    listRecommendedMedia: mediaApi.listRecommendedMedia,
    settings: recommendationSettings
  });

  useEffect(() => {
    void loadMedia(currentPage, searchQuery);
  }, [currentPage, loadMedia, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

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
    mediaSelection.clearSelection();
    setCurrentPage(1);
    setSelectedMedia(null);
    setPersistedSelectedMediaId(null);
  }, [mediaSelection, searchQuery]);

  useEffect(() => {
    if (quickTagging.isEnabled && mediaSelection.selectedCount > 0) {
      mediaSelection.clearSelection();
    }
  }, [mediaSelection, quickTagging.isEnabled]);

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
  const hasBlockingDialogOpen = Boolean(
    selectedMedia
    || isBulkEditing
    || isCollectionPickerOpen
    || mediaReferencePicker.isPickerOpen
  );
  const selectedMediaIndex = useMemo(() => (
    selectedMedia
      ? visibleMediaFiles.findIndex((file) => file.id === selectedMedia.id || file.relativePath === selectedMedia.relativePath)
      : -1
  ), [selectedMedia, visibleMediaFiles]);
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && totalPages > 0;

  const handleNavigateSelectedMedia = useCallback((offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const navigation = resolvePagedMediaNavigation({
      currentIndex: selectedMediaIndex,
      itemCount: visibleMediaFiles.length,
      currentPage,
      totalPages,
      offset
    });
    if (!navigation) {
      return;
    }

    if (navigation.type === "item") {
      const nextItem = visibleMediaFiles[navigation.index];
      if (nextItem) {
        setSelectedMedia(nextItem);
      }
      return;
    }

    setPendingMediaNavigation({
      ...navigation,
      sourceMediaId: selectedMedia?.id ?? null
    });
    setCurrentPage(navigation.page);
  }, [canNavigateSelectedMedia, currentPage, selectedMedia?.id, selectedMediaIndex, totalPages, visibleMediaFiles]);

  useEffect(() => {
    if (
      !pendingMediaNavigation
      || pendingMediaNavigation.type !== "page"
      || isMediaLoading
      || currentPage !== pendingMediaNavigation.page
    ) {
      return;
    }

    if (
      pendingMediaNavigation.sourceMediaId
      && visibleMediaFiles.some((item) => item.id === pendingMediaNavigation.sourceMediaId)
    ) {
      return;
    }

    const nextItem = pendingMediaNavigation.select === "last"
      ? visibleMediaFiles[visibleMediaFiles.length - 1]
      : visibleMediaFiles[0];
    if (nextItem) {
      setSelectedMedia(nextItem);
    }
    setPendingMediaNavigation(null);
  }, [currentPage, isMediaLoading, pendingMediaNavigation, visibleMediaFiles]);

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
      mediaReferencePicker.resetPicker();
      setRelatedMediaItems([]);
    }
  }, [mediaReferencePicker.resetPicker, selectedMedia]);

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
    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            className="media-action-btn app-button-icon-only media-pagination-icon-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={isMediaLoading || currentPage <= 1 || totalPages === 0}
            aria-label="Previous page"
          >
            <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
          </button>
          <p>
            Page {totalPages <= 0 ? 0 : currentPage} of {Math.max(totalPages, 1)}
          </p>
          <button
            type="button"
            className="media-action-btn app-button-icon-only media-pagination-icon-btn"
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
              disabled={isMediaLoading || totalPages <= 1}
              aria-label="Go to page"
            />
            <button type="submit" className="media-action-btn app-button-icon-only media-pagination-icon-btn" disabled={isMediaLoading || totalPages <= 1} aria-label="Go to page">
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
    await openMediaCollectionPicker({
      selectedMedia,
      isCollectionPickerLoading,
      isAddingMediaToCollection,
      collectionsApi,
      setIsCollectionPickerOpen,
      setCollectionPickerError,
      setIsCollectionPickerLoading,
      setCollectionPickerItems
    });
  };

  const handleAddSelectedMediaToCollection = async (collectionId) => {
    await addSelectedMediaToCollection({
      selectedMedia,
      collectionId,
      isAddingMediaToCollection,
      collectionsApi,
      setIsAddingMediaToCollection,
      setCollectionPickerError,
      setCollectionPickerItems,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
  };

  const isSelectedMediaFavorite = Boolean(selectedMedia?.isFavorite);
  const toggleSelectedMediaFavorite = async () => {
    await toggleMediaFavorite({
      selectedMedia,
      isFavoriteUpdating,
      mediaApi,
      setIsFavoriteUpdating,
      setMediaModalError,
      applyLocalFavoriteState: (nextIsFavorite, mediaId) => {
        setSelectedMedia((current) => (
          current && current.id === mediaId ? { ...current, isFavorite: nextIsFavorite } : current
        ));
        setMediaFiles((current) => current.map((item) => (
          item.id === mediaId ? { ...item, isFavorite: nextIsFavorite } : item
        )));
      },
      onSuccess: async () => {
        window.dispatchEvent(new CustomEvent("gallery:media-updated"));
      }
    });
  };

  const toNullableId = (value) => {
    const text = String(value ?? "").trim();
    if (!text) {
      return null;
    }
    const parsed = Number.parseInt(text, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  };

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
        const candidate = await mediaReferencePicker.findMediaById(selectedMediaId);
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
  }, [isMediaLoading, mediaFiles, mediaReferencePicker.findMediaById, persistedSelectedMediaId, selectedMedia]);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const selectedMediaId = Number(selectedMedia.id);
    if (Number.isSafeInteger(selectedMediaId) && selectedMediaId > 0) {
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
        const items = await buildRelatedMediaChain({ media: selectedMedia, findMediaById: mediaReferencePicker.findMediaById });
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
  }, [mediaReferencePicker.findMediaById, selectedMedia]);

  const handleOpenRelatedMediaById = async (targetId) => {
    const normalizedId = Number(targetId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0 || selectedMedia?.id === normalizedId) {
      return;
    }

    setMediaModalError("");
    try {
      const candidate = await mediaReferencePicker.findMediaById(normalizedId);
      if (!candidate) {
        throw new Error(`Media with id ${normalizedId} was not found.`);
      }
      setSelectedMedia(candidate);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to open related media.");
    }
  };

  const handleSaveMedia = async () => {
    await saveSelectedMediaDetails({
      selectedMedia,
      mediaDraft,
      isSavingMedia,
      isDeletingMedia,
      mediaApi,
      tagCatalog,
      toNullableId,
      setIsSavingMedia,
      setMediaModalError,
      setSelectedMedia,
      setItems: setMediaFiles,
      setIsEditingMedia,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
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
    await saveBulkSelectedMedia({
      items,
      collectionIds,
      relationStrategy,
      isSavingMedia,
      isDeletingMedia,
      mediaApi,
      collectionsApi,
      tagCatalog,
      setIsSavingMedia,
      setMediaModalError,
      setItems: setMediaFiles,
      setSelectedMedia,
      setIsBulkEditing,
      clearSelection: mediaSelection.clearSelection,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
  };

  const handleBulkDeleteMedia = async () => {
    await deleteBulkSelectedMedia({
      selectedMediaItems: mediaSelection.selectedMediaItems,
      selectedMediaIds: mediaSelection.selectedMediaIds,
      isDeletingMedia,
      isSavingMedia,
      mediaApi,
      setIsDeletingMedia,
      setMediaModalError,
      setItems: setMediaFiles,
      setSelectedMedia,
      setPendingBulkDelete,
      setIsBulkEditing,
      clearSelection: mediaSelection.clearSelection,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
  };

  const handleDeleteMedia = async () => {
    await deleteSelectedMedia({
      selectedMedia,
      isDeletingMedia,
      isSavingMedia,
      mediaApi,
      setIsDeletingMedia,
      setMediaModalError,
      setItems: setMediaFiles,
      setSelectedMedia,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
  };

  return (
    <GalleryPage
      mediaError={mediaError}
      isMediaLoading={isMediaLoading}
      totalFiles={totalFiles}
      visibleMediaFiles={visibleMediaFiles}
      renderPagination={renderPagination}
      setSelectedMedia={setSelectedMedia}
      onTileSelect={quickTagging.isEnabled ? (file) => void quickTagging.applyTagToMedia(file) : null}
      mediaSelection={mediaSelection}
      failedPreviewPaths={failedPreviewPaths}
      getDisplayName={getDisplayName}
      setFailedPreviewPaths={setFailedPreviewPaths}
      bulkActionBar={(
        <>
          <MediaQuickTaggingAction
            isSelectionMode={mediaSelection.isSelectionMode}
            onOpenConfig={() => void quickTagging.openConfig()}
          />
          <BulkMediaActionBar
            selectedCount={mediaSelection.selectedCount}
            onClearSelection={mediaSelection.clearSelection}
            onDeleteSelection={() => {
              if (confirmDestructiveActions) {
                setPendingBulkDelete(createPendingMediaDelete(mediaSelection.selectedMediaItems));
                return;
              }
              void handleBulkDeleteMedia();
            }}
            onEditSelection={() => void handleOpenBulkEdit()}
          />
        </>
      )}
    >
      <QuickTaggingModal
        isOpen={quickTagging.isConfigOpen}
        tagCatalog={tagCatalog}
        isLoading={isTagCatalogLoading}
        initialConfig={quickTagging.config}
        defaultAddTagsInput={quickTagging.defaultAddTagsInput}
        onConfirm={quickTagging.confirmConfig}
        onDisable={quickTagging.disable}
        onClose={quickTagging.closeConfig}
      />
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
          recommendedMediaItems={recommendedMediaItems}
          isRecommendedMediaLoading={isRecommendedMediaLoading}
          recommendedMediaError={recommendedMediaError}
          areRecommendationsEnabled={recommendationSettings?.enabled !== false}
          relationPreviewByMode={mediaReferencePicker.previewByMode}
          onOpenRelationPicker={mediaReferencePicker.openPicker}
          onOpenRelatedMediaById={handleOpenRelatedMediaById}
          isMediaRelationPickerOpen={mediaReferencePicker.isPickerOpen}
          mediaRelationPickerMode={mediaReferencePicker.pickerMode}
          mediaRelationPickerQuery={mediaReferencePicker.pickerQuery}
          onMediaRelationPickerQueryChange={mediaReferencePicker.setPickerQuery}
          mediaRelationPickerItems={mediaReferencePicker.pickerItems}
          mediaRelationPickerPage={mediaReferencePicker.pickerPage}
          mediaRelationPickerTotalPages={mediaReferencePicker.pickerTotalPages}
          mediaRelationPickerTotalCount={mediaReferencePicker.pickerTotalCount}
          isMediaRelationPickerLoading={mediaReferencePicker.isPickerLoading}
          mediaRelationPickerError={mediaReferencePicker.pickerError}
          onMediaRelationPickerPrev={() => mediaReferencePicker.setPickerPage((current) => Math.max(1, current - 1))}
          onMediaRelationPickerNext={() => mediaReferencePicker.setPickerPage((current) => current + 1)}
          onMediaRelationPickerPageChange={mediaReferencePicker.setPickerPage}
          onCloseMediaRelationPicker={mediaReferencePicker.closePicker}
          onSelectMediaRelationFromPicker={mediaReferencePicker.selectFromPicker}
          onStartEdit={() => setIsEditingMedia(true)}
          onCancelEdit={() => setIsEditingMedia(false)}
          onSaveEdit={handleSaveMedia}
          isSavingMedia={isSavingMedia}
          onDelete={handleDeleteMedia}
          isDeletingMedia={isDeletingMedia}
          defaultMediaFitMode={defaultMediaFitMode}
          showRelatedMediaStrip={showRelatedMediaStrip}
          confirmDestructiveActions={confirmDestructiveActions}
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
      {confirmDestructiveActions ? (
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
      ) : null}
    </GalleryPage>
  );
}
