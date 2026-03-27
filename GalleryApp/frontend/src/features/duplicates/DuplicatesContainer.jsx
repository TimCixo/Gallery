import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { mediaApi } from "../../api/mediaApi";
import { tagsApi } from "../../api/tagsApi";
import { duplicatesApi } from "../../services/duplicatesApi";
import { normalizePageJumpDisplayValue, normalizePageJumpInput } from "../shared/utils/pagination";
import {
  addSelectedMediaToCollection,
  buildMediaUpdatePayload,
  openMediaCollectionPicker,
  refreshMediaTagCatalog,
  toggleSelectedMediaFavorite as toggleMediaFavorite
} from "../media/utils/mediaMutationHelpers";
import { buildRelatedMediaChain } from "../media/utils/relatedMediaChain";
import { useMediaReferencePicker } from "../media/hooks/useMediaReferencePicker";
import { useRecommendedMedia } from "../media/hooks/useRecommendedMedia";
import MediaDeleteConfirmModal from "../media/components/MediaDeleteConfirmModal";
import MediaViewerModal from "../media/components/MediaViewerModal";
import CollectionPickerModal from "../collections/components/CollectionPickerModal";
import CollectionPickerDialogContent from "../collections/components/CollectionPickerDialogContent";
import AppIcon from "../shared/components/AppIcon";
import DuplicatesPage from "./DuplicatesPage";

const DEFAULT_PAGE_SIZE = 12;

const getDisplayName = (value) => {
  const fileName = String(value || "");
  if (!fileName) {
    return "Untitled";
  }

  const normalized = fileName.split(/[\\/]/).pop() || fileName;
  return normalized.replace(/\.[^./]+$/, "") || normalized;
};

const getMediaLabel = (item) => String(item?.title || item?.name || item?.relativePath || `#${item?.id ?? "?"}`);

const patchGroupsByMediaId = (groups, mediaId, patch) => groups.map((group) => ({
  ...group,
  items: (Array.isArray(group.items) ? group.items : []).map((item) => (item.id === mediaId ? { ...item, ...patch } : item)),
  excludedItems: (Array.isArray(group.excludedItems) ? group.excludedItems : []).map((item) => (item.id === mediaId ? { ...item, ...patch } : item))
}));

export default function DuplicatesContainer({
  recommendationSettings,
  duplicatesPageSize = DEFAULT_PAGE_SIZE,
  defaultMediaFitMode = "resize",
  showRelatedMediaStrip = true,
  confirmDestructiveActions = true
}) {
  const pageSize = Number.isInteger(duplicatesPageSize) && duplicatesPageSize > 0 ? duplicatesPageSize : DEFAULT_PAGE_SIZE;
  const [groups, setGroups] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pageJumpInput, setPageJumpInput] = useState("1");
  const [parentSelectionByGroupKey, setParentSelectionByGroupKey] = useState({});
  const [actionGroupKey, setActionGroupKey] = useState("");
  const [pendingGroupAction, setPendingGroupAction] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
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
  const {
    recommendedMediaItems,
    isRecommendedMediaLoading,
    recommendedMediaError
  } = useRecommendedMedia({
    selectedMedia,
    listRecommendedMedia: mediaApi.listRecommendedMedia,
    settings: recommendationSettings
  });

  const flattenItems = useMemo(
    () => groups.flatMap((group) => [...(group.items || []), ...(group.excludedItems || [])]),
    [groups]
  );
  const selectedMediaGroup = useMemo(() => {
    if (!selectedMedia?.id) {
      return null;
    }

    return groups.find((group) => (
      [...(group.items || []), ...(group.excludedItems || [])].some((item) => item.id === selectedMedia.id)
    )) || null;
  }, [groups, selectedMedia]);
  const selectedMediaBucket = useMemo(() => {
    if (!selectedMediaGroup || !selectedMedia?.id) {
      return [];
    }

    const activeItems = Array.isArray(selectedMediaGroup.items) ? selectedMediaGroup.items : [];
    if (activeItems.some((item) => item.id === selectedMedia.id)) {
      return activeItems;
    }

    return Array.isArray(selectedMediaGroup.excludedItems) ? selectedMediaGroup.excludedItems : [];
  }, [selectedMediaGroup, selectedMedia]);
  const selectedGroupItems = useMemo(
    () => selectedMediaBucket,
    [selectedMediaBucket]
  );
  const selectedMediaIndex = useMemo(
    () => selectedMedia ? selectedGroupItems.findIndex((item) => item.id === selectedMedia.id) : -1,
    [selectedGroupItems, selectedMedia]
  );
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && selectedGroupItems.length > 1;

  const refreshTagCatalog = useCallback(async () => {
    await refreshMediaTagCatalog({
      tagsApi,
      setTagCatalog,
      setTagTypesCatalog,
      setIsTagCatalogLoading
    });
  }, []);

  const loadGroups = useCallback(async (nextPage) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await duplicatesApi.listDuplicateGroups({ page: nextPage, pageSize });
      const nextGroups = Array.isArray(response?.items) ? response.items : [];
      setGroups(nextGroups);
      setTotalPages(Number(response?.totalPages || 0));
      setTotalCount(Number(response?.totalCount || nextGroups.length));
      setParentSelectionByGroupKey((current) => {
        const nextState = { ...current };
        nextGroups.forEach((group) => {
          const activeIds = new Set((group.items || []).map((item) => item.id));
          if (!activeIds.has(nextState[group.groupKey])) {
            nextState[group.groupKey] = group.parentMediaId ?? group.items?.[0]?.id ?? null;
          }
        });
        return nextState;
      });
    } catch (error) {
      setGroups([]);
      setTotalPages(0);
      setTotalCount(0);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load duplicate groups.");
    } finally {
      setIsLoading(false);
      setActionGroupKey("");
    }
  }, [pageSize]);

  useEffect(() => {
    void loadGroups(page);
  }, [page, loadGroups]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  useEffect(() => {
    if (!selectedMedia) {
      return;
    }

    const nextSelectedMedia = flattenItems.find((item) => item.id === selectedMedia.id) || null;
    if (!nextSelectedMedia) {
      setSelectedMedia(null);
      return;
    }

    if (nextSelectedMedia !== selectedMedia) {
      setSelectedMedia(nextSelectedMedia);
    }
  }, [flattenItems, selectedMedia]);

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
      setRelatedMediaItems([]);
      mediaReferencePicker.resetPicker();
    }
  }, [selectedMedia]);

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
      return;
    }

    void refreshTagCatalog();
  }, [isEditingMedia, refreshTagCatalog, selectedMedia]);

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
    localItems: flattenItems,
    isEnabled: Boolean(selectedMedia)
  });

  useEffect(() => {
    if (!selectedMedia) {
      return;
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

  const getSelectedParentId = useCallback((group) => {
    const selectedParentId = parentSelectionByGroupKey[group.groupKey];
    const activeIds = new Set((group.items || []).map((item) => item.id));
    if (activeIds.has(selectedParentId)) {
      return selectedParentId;
    }

    return group.parentMediaId ?? group.items?.[0]?.id ?? null;
  }, [parentSelectionByGroupKey]);

  const handlePageChange = (nextPage) => {
    if (isLoading) {
      return;
    }

    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages) || nextPage === page) {
      return;
    }

    setPage(nextPage);
  };

  const handlePageJumpSubmit = (event) => {
    event.preventDefault();
    if (isLoading || totalPages <= 0) {
      return;
    }

    const result = normalizePageJumpInput(pageJumpInput, page, totalPages);
    if (!result.isValid) {
      setPageJumpInput(String(page));
      return;
    }

    setPageJumpInput(String(result.targetPage));
    handlePageChange(result.targetPage);
  };

  const renderPagination = () => (
    <div className="media-pagination-wrap">
      <div className="media-pagination">
        <button
          type="button"
          className="media-action-btn app-button-icon-only media-pagination-icon-btn"
          onClick={() => handlePageChange(page - 1)}
          disabled={isLoading || page <= 1 || totalPages === 0}
          aria-label="Previous page"
        >
          <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
        </button>
        <p>Page {totalPages <= 0 ? 0 : page} of {Math.max(totalPages, 1)}</p>
        <button
          type="button"
          className="media-action-btn app-button-icon-only media-pagination-icon-btn"
          onClick={() => handlePageChange(page + 1)}
          disabled={isLoading || totalPages === 0 || page >= totalPages}
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
            onBlur={(event) => setPageJumpInput(normalizePageJumpDisplayValue(event.target.value, page, totalPages))}
            disabled={isLoading || totalPages <= 1}
            aria-label="Go to duplicates page"
          />
          <button type="submit" className="media-action-btn app-button-icon-only media-pagination-icon-btn" disabled={isLoading || totalPages <= 1} aria-label="Go to duplicates page">
            <AppIcon name="confirm" alt="" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );

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

  const handleNavigateSelectedMedia = useCallback((offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const nextIndex = (selectedMediaIndex + offset + selectedGroupItems.length) % selectedGroupItems.length;
    const nextItem = selectedGroupItems[nextIndex];
    if (nextItem) {
      setSelectedMedia(nextItem);
    }
  }, [canNavigateSelectedMedia, selectedGroupItems, selectedMediaIndex]);

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

  const toggleSelectedMediaFavorite = async () => {
    await toggleMediaFavorite({
      selectedMedia,
      isFavoriteUpdating,
      mediaApi,
      setIsFavoriteUpdating,
      setMediaModalError,
      applyLocalFavoriteState: (nextIsFavorite, mediaId) => {
        setSelectedMedia((current) => (current && current.id === mediaId ? { ...current, isFavorite: nextIsFavorite } : current));
        setGroups((current) => patchGroupsByMediaId(current, mediaId, { isFavorite: nextIsFavorite }));
      },
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
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

  const handleSaveMedia = async () => {
    if (!selectedMedia?.id || isSavingMedia || isDeletingMedia) {
      return;
    }

    setIsSavingMedia(true);
    setMediaModalError("");
    try {
      await mediaApi.updateMedia(selectedMedia.id, buildMediaUpdatePayload(mediaDraft, toNullableId));
      setIsEditingMedia(false);
      await loadGroups(page);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to update media.");
    } finally {
      setIsSavingMedia(false);
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
      setSelectedMedia(null);
      await loadGroups(page);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleExclude = async (groupKey, mediaId) => {
    setActionGroupKey(groupKey);
    setMediaModalError("");
    try {
      await duplicatesApi.excludeDuplicateMedia(groupKey, mediaId);
      await loadGroups(page);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to exclude media.");
      setActionGroupKey("");
    }
  };

  const handleRestore = async (groupKey, mediaId) => {
    setActionGroupKey(groupKey);
    setMediaModalError("");
    try {
      await duplicatesApi.restoreDuplicateMedia(groupKey, mediaId);
      await loadGroups(page);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to restore media.");
      setActionGroupKey("");
    }
  };

  const handleConfirmGroupAction = async (action = pendingGroupAction) => {
    if (!action) {
      return;
    }

    setActionGroupKey(action.groupKey);
    setMediaModalError("");
    try {
      if (action.kind === "merge") {
        await duplicatesApi.mergeDuplicateGroup(action.groupKey, action.parentMediaId);
      } else {
        await duplicatesApi.deleteDuplicateGroupItems(action.groupKey, {
          parentMediaId: action.parentMediaId,
          mediaIds: action.targetIds
        });
      }

      setPendingGroupAction(null);
      await loadGroups(page);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to apply duplicate group action.");
      setActionGroupKey("");
    }
  };

  return (
    <>
      <DuplicatesPage
        errorMessage={errorMessage}
        isLoading={isLoading}
        totalCount={totalCount}
        groups={groups}
        renderPagination={renderPagination}
        getSelectedParentId={getSelectedParentId}
        actionGroupKey={actionGroupKey}
        onParentChange={(groupKey, mediaId) => setParentSelectionByGroupKey((current) => ({ ...current, [groupKey]: mediaId }))}
        onOpenMedia={setSelectedMedia}
        onExclude={handleExclude}
        onRestore={handleRestore}
        onMergeRequest={(group, parentItem, targets) => {
          const nextAction = {
            kind: "merge",
            groupKey: group.groupKey,
            parentMediaId: parentItem.id,
            parentLabel: getMediaLabel(parentItem),
            targetIds: targets.map((item) => item.id),
            targetLabels: targets.map((item) => getMediaLabel(item))
          };
          if (confirmDestructiveActions) {
            setPendingGroupAction(nextAction);
            return;
          }
          void handleConfirmGroupAction(nextAction);
        }}
        onDeleteRequest={(group, parentItem, targets) => {
          const nextAction = {
            kind: "delete",
            groupKey: group.groupKey,
            parentMediaId: parentItem.id,
            parentLabel: getMediaLabel(parentItem),
            targetIds: targets.map((item) => item.id),
            targetLabels: targets.map((item) => getMediaLabel(item))
          };
          if (confirmDestructiveActions) {
            setPendingGroupAction(nextAction);
            return;
          }
          void handleConfirmGroupAction(nextAction);
        }}
      />

      {confirmDestructiveActions ? (
        <MediaDeleteConfirmModal
          pendingAction={pendingGroupAction}
          pendingMediaDelete={pendingGroupAction}
          isBusy={!!actionGroupKey}
          isDeletingMedia={!!actionGroupKey}
          onConfirm={() => void handleConfirmGroupAction()}
          onClose={() => setPendingGroupAction(null)}
          message={
            pendingGroupAction
              ? pendingGroupAction.kind === "merge"
                ? `Merge duplicates into "${pendingGroupAction.parentLabel}" and remove: ${pendingGroupAction.targetLabels.join(", ")}. Parent keeps its own conflicting values; only missing metadata is filled.`
                : `Delete duplicates ${pendingGroupAction.targetLabels.join(", ")} and preserve parent "${pendingGroupAction.parentLabel}"?`
              : ""
          }
          confirmLabel={pendingGroupAction?.kind === "merge" ? "Merge duplicates" : "Delete duplicates"}
          confirmTitle={pendingGroupAction?.kind === "merge" ? "Merge duplicates" : "Delete duplicates"}
          cancelLabel="Cancel"
          cancelTitle="Cancel"
          confirmButtonClassName={`media-action-btn ${pendingGroupAction?.kind === "merge" ? "media-action-primary" : "media-action-danger"} app-button-icon-only`}
        />
      ) : null}

      {selectedMedia ? (
        <MediaViewerModal
          file={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onPrev={() => handleNavigateSelectedMedia(-1)}
          onNext={() => handleNavigateSelectedMedia(1)}
          canNavigate={canNavigateSelectedMedia}
          getDisplayName={getDisplayName}
          isFavorite={Boolean(selectedMedia?.isFavorite)}
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
    </>
  );
}
