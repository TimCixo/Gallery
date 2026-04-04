import { useCallback, useEffect, useMemo, useState } from "react";
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
import FavoritesPage from "./FavoritesPage";
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

export default function FavoritesContainer({
  recommendationSettings,
  mediaGridPageSize = DEFAULT_PAGE_SIZE,
  defaultMediaFitMode = "resize",
  showRelatedMediaStrip = true,
  confirmDestructiveActions = true,
  defaultQuickTaggingTags = ""
}) {
  const pageSize = Number.isInteger(mediaGridPageSize) && mediaGridPageSize > 0 ? mediaGridPageSize : DEFAULT_PAGE_SIZE;
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
  const [relatedMediaItems, setRelatedMediaItems] = useState([]);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [pendingMediaNavigation, setPendingMediaNavigation] = useState(null);

  const refreshTagCatalog = useCallback(async () => {
    await refreshMediaTagCatalog({
      tagsApi,
      setTagCatalog,
      setTagTypesCatalog,
      setIsTagCatalogLoading
    });
  }, []);

  const loadFavorites = useCallback(async (page) => {
    setIsFavoritesLoading(true);
    setFavoritesError("");
    try {
      const response = await mediaApi.listFavorites({ page, pageSize });
      const items = Array.isArray(response?.items) ? response.items : [];
      setFavoritesFiles(items.map((item) => ({ ...item, _tileUrl: item.tileUrl || item.previewUrl || item.originalUrl || item.url || "" })));
      setFavoritesPage(Number(response?.page || page));
      setFavoritesTotalPages(Number(response?.totalPages || 0));
      setFavoritesTotalFiles(Number(response?.totalCount || items.length));
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : "Failed to load favorites.");
    } finally {
      setIsFavoritesLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void loadFavorites(favoritesPage);
  }, [favoritesPage, loadFavorites]);

  useEffect(() => {
    setFavoritesPage(1);
  }, [pageSize]);

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

  const quickTagging = useQuickTagging({
    items: favoritesFiles,
    tagCatalog,
    ensureTagCatalog: async () => {
      if (tagCatalog.length === 0 && tagTypesCatalog.length === 0) {
        await refreshTagCatalog();
      }
    },
    updateMedia: mediaApi.updateMedia,
    onItemsChange: setFavoritesFiles,
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
    localItems: favoritesFiles,
    isEnabled: Boolean(selectedMedia)
  });
  const {
    recommendedMediaItems,
    isRecommendedMediaLoading,
    recommendedMediaError
  } = useRecommendedMedia({
    selectedMedia,
    listRecommendedMedia: mediaApi.listRecommendedMedia,
    settings: recommendationSettings
  });
  const visibleFavoriteFiles = useMemo(() => quickTagging.visibleItems, [quickTagging.visibleItems]);
  const mediaSelection = useMediaMultiSelect(visibleFavoriteFiles);

  useEffect(() => {
    if (quickTagging.isEnabled && mediaSelection.selectedCount > 0) {
      mediaSelection.clearSelection();
    }
  }, [mediaSelection, quickTagging.isEnabled]);
  const hasBlockingDialogOpen = Boolean(
    selectedMedia
    || isBulkEditing
    || isCollectionPickerOpen
    || mediaReferencePicker.isPickerOpen
  );
  const selectedMediaIndex = useMemo(() => (
    selectedMedia
      ? visibleFavoriteFiles.findIndex((file) => file.id === selectedMedia.id || file.relativePath === selectedMedia.relativePath)
      : -1
  ), [selectedMedia, visibleFavoriteFiles]);
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && favoritesTotalPages > 0;

  const handleNavigateSelectedMedia = useCallback((offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const navigation = resolvePagedMediaNavigation({
      currentIndex: selectedMediaIndex,
      itemCount: visibleFavoriteFiles.length,
      currentPage: favoritesPage,
      totalPages: favoritesTotalPages,
      offset
    });
    if (!navigation) {
      return;
    }

    if (navigation.type === "item") {
      const nextItem = visibleFavoriteFiles[navigation.index];
      if (nextItem) {
        setSelectedMedia(nextItem);
      }
      return;
    }

    setPendingMediaNavigation({
      ...navigation,
      sourceMediaId: selectedMedia?.id ?? null
    });
    setFavoritesPage(navigation.page);
  }, [canNavigateSelectedMedia, favoritesPage, favoritesTotalPages, selectedMedia?.id, selectedMediaIndex, visibleFavoriteFiles]);

  useEffect(() => {
    if (
      !pendingMediaNavigation
      || pendingMediaNavigation.type !== "page"
      || isFavoritesLoading
      || favoritesPage !== pendingMediaNavigation.page
    ) {
      return;
    }

    if (
      pendingMediaNavigation.sourceMediaId
      && visibleFavoriteFiles.some((item) => item.id === pendingMediaNavigation.sourceMediaId)
    ) {
      return;
    }

    const nextItem = pendingMediaNavigation.select === "last"
      ? visibleFavoriteFiles[visibleFavoriteFiles.length - 1]
      : visibleFavoriteFiles[0];
    if (nextItem) {
      setSelectedMedia(nextItem);
    }
    setPendingMediaNavigation(null);
  }, [favoritesPage, isFavoritesLoading, pendingMediaNavigation, visibleFavoriteFiles]);

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

  useEffect(() => {
    if (hasBlockingDialogOpen || favoritesTotalPages <= 1) {
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
      handleFavoritesPageChange(event.key === "ArrowRight" ? favoritesPage + 1 : favoritesPage - 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [favoritesPage, favoritesTotalPages, hasBlockingDialogOpen, isFavoritesLoading]);

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
    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            className="media-action-btn app-button-icon-only media-pagination-icon-btn"
            onClick={() => handleFavoritesPageChange(favoritesPage - 1)}
            disabled={isFavoritesLoading || favoritesPage <= 1 || favoritesTotalPages === 0}
            aria-label="Previous page"
          >
            <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
          </button>
          <p>
            Page {favoritesTotalPages <= 0 ? 0 : favoritesPage} of {Math.max(favoritesTotalPages, 1)}
          </p>
          <button
            type="button"
            className="media-action-btn app-button-icon-only media-pagination-icon-btn"
            onClick={() => handleFavoritesPageChange(favoritesPage + 1)}
            disabled={isFavoritesLoading || favoritesTotalPages === 0 || favoritesPage >= favoritesTotalPages}
            aria-label="Next page"
          >
            <AppIcon name="arrowRight" alt="" aria-hidden="true" />
          </button>
          <form className="media-pagination-jump" onSubmit={handleFavoritesPageJumpSubmit} noValidate>
            <input
              type="number"
              min={1}
              max={Math.max(favoritesTotalPages, 1)}
              step={1}
              inputMode="numeric"
              value={favoritesPageJumpInput}
              onChange={(event) => setFavoritesPageJumpInput(event.target.value)}
              onBlur={(event) => setFavoritesPageJumpInput(normalizePageJumpDisplayValue(event.target.value, favoritesPage, favoritesTotalPages))}
              disabled={isFavoritesLoading || favoritesTotalPages <= 1}
              aria-label="Go to favorites page"
            />
            <button type="submit" className="media-action-btn app-button-icon-only media-pagination-icon-btn" disabled={isFavoritesLoading || favoritesTotalPages <= 1} aria-label="Go to favorites page">
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
        setFavoritesFiles((current) => current.map((item) => (
          item.id === mediaId ? { ...item, isFavorite: nextIsFavorite } : item
        )));
      },
      onSuccess: async (nextIsFavorite) => {
        if (!nextIsFavorite) {
          await loadFavorites(favoritesPage);
        }
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
    if (!selectedMedia) {
      return undefined;
    }

    let cancelled = false;
    const loadRelatedMedia = async () => {
      try {
        const items = await buildRelatedMediaChain({ media: selectedMedia, findMediaById: mediaReferencePicker.findMediaById });
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
      setItems: setFavoritesFiles,
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
      setItems: setFavoritesFiles,
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
      setItems: setFavoritesFiles,
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
      setItems: setFavoritesFiles,
      setSelectedMedia,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
  };

  return (
    <FavoritesPage
      favoritesError={favoritesError}
      isFavoritesLoading={isFavoritesLoading}
      favoritesTotalFiles={favoritesTotalFiles}
      visibleFavoriteFiles={visibleFavoriteFiles}
      renderFavoritesPagination={renderFavoritesPagination}
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
    </FavoritesPage>
  );
}
