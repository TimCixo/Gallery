import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { mediaApi } from "../../api/mediaApi";
import { tagsApi } from "../../api/tagsApi";
import { normalizePageJumpDisplayValue, normalizePageJumpInput } from "../shared/utils/pagination";
import { createPendingMediaDelete } from "../shared/utils/deleteConfirm";
import CollectionPickerModal from "./components/CollectionPickerModal";
import CollectionPickerDialogContent from "./components/CollectionPickerDialogContent";
import CollectionDeleteConfirmModal from "./components/CollectionDeleteConfirmModal";
import GalleryMediaTile from "../gallery/GalleryMediaTile";
import BulkMediaActionBar from "../media/components/BulkMediaActionBar";
import BulkMediaEditorModal from "../media/components/BulkMediaEditorModal";
import MediaQuickTaggingAction from "../media/components/MediaQuickTaggingAction";
import MediaDeleteConfirmModal from "../media/components/MediaDeleteConfirmModal";
import MediaViewerModal from "../media/components/MediaViewerModal";
import MediaRelationPickerDialogContent from "../media/components/MediaRelationPickerDialogContent";
import MediaRelationPickerModal from "../media/components/MediaRelationPickerModal";
import MediaReferenceField from "../media/components/MediaReferenceField";
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
import { buildRelatedMediaChain } from "../media/utils/relatedMediaChain";
import CollectionsPage from "./CollectionsPage";
import AppIcon from "../shared/components/AppIcon";

const PAGE_SIZE = 36;
const EMPTY_COLLECTION_DRAFT = Object.freeze({ label: "", description: "", cover: "" });

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
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false);
  const [collectionEditorMode, setCollectionEditorMode] = useState("create");
  const [createCollectionDraft, setCreateCollectionDraft] = useState(EMPTY_COLLECTION_DRAFT);
  const [createCollectionError, setCreateCollectionError] = useState("");
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [pendingCollectionDelete, setPendingCollectionDelete] = useState(null);
  const [isCollectionDeleting, setIsCollectionDeleting] = useState(false);
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

  const refreshTagCatalog = useCallback(async () => {
    await refreshMediaTagCatalog({
      tagsApi,
      setTagCatalog,
      setTagTypesCatalog,
      setIsTagCatalogLoading
    });
  }, []);
  const {
    recommendedMediaItems,
    isRecommendedMediaLoading,
    recommendedMediaError
  } = useRecommendedMedia({
    selectedMedia,
    listRecommendedMedia: mediaApi.listRecommendedMedia
  });

  const loadCollections = useCallback(async () => {
    setIsCollectionsLoading(true);
    setCollectionsError("");
    try {
      const response = await collectionsApi.listCollections({ search: searchQuery || undefined });
      const items = Array.isArray(response?.items) ? response.items : [];
      setCollections(items);
      return items;
    } catch (error) {
      setCollections([]);
      setCollectionsError(error instanceof Error ? error.message : "Failed to load collections.");
      return [];
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

    mediaSelection.clearSelection();
    setSelectedCollection(item);
    setSelectedMedia(null);
    await loadCollectionMedia(item.id, 1);
  };

  const openCreateCollectionModal = () => {
    setCollectionEditorMode("create");
    setCreateCollectionDraft(EMPTY_COLLECTION_DRAFT);
    setCreateCollectionError("");
    setIsCreateCollectionModalOpen(true);
  };

  const openEditCollectionModal = () => {
    if (!selectedCollection || isSavingCollection || isCollectionDeleting) {
      return;
    }

    setCollectionEditorMode("edit");
    setCreateCollectionDraft({
      label: String(selectedCollection.label || ""),
      description: String(selectedCollection.description || ""),
      cover: selectedCollection.cover ? String(selectedCollection.cover) : ""
    });
    setCreateCollectionError("");
    setIsCreateCollectionModalOpen(true);
  };

  const closeCreateCollectionModal = () => {
    if (isSavingCollection) {
      return;
    }

    setIsCreateCollectionModalOpen(false);
    setCreateCollectionError("");
    mediaReferencePicker.resetPicker();
  };

  const quickTagging = useQuickTagging({
    items: collectionFiles,
    tagCatalog,
    ensureTagCatalog: async () => {
      if (tagCatalog.length === 0 && tagTypesCatalog.length === 0) {
        await refreshTagCatalog();
      }
    },
    updateMedia: mediaApi.updateMedia,
    onItemsChange: setCollectionFiles
  });
  const mediaReferencePicker = useMediaReferencePicker({
    valueByMode: {
      parent: isEditingMedia ? mediaDraft.parent : selectedMedia?.parent,
      child: isEditingMedia ? mediaDraft.child : selectedMedia?.child,
      cover: createCollectionDraft.cover
    },
    onSelectReference: (mode, item) => {
      const selectedId = Number(item?.id);
      if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
        return;
      }

      if (mode === "cover") {
        setCreateCollectionDraft((current) => ({ ...current, cover: String(selectedId) }));
        return;
      }

      setMediaDraft((current) => ({ ...current, [mode === "child" ? "child" : "parent"]: String(selectedId) }));
    },
    localItems: collectionFiles,
    availableModes: ["parent", "child", "cover"],
    isEnabled: Boolean(selectedMedia || isCreateCollectionModalOpen)
  });
  const visibleCollectionFiles = useMemo(() => quickTagging.visibleItems, [quickTagging.visibleItems]);
  const mediaSelection = useMediaMultiSelect(visibleCollectionFiles);
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
    if (selectedCollection) {
      return;
    }

    mediaSelection.clearSelection();
  }, [mediaSelection.clearSelection, selectedCollection]);

  useEffect(() => {
    if (quickTagging.isEnabled && mediaSelection.selectedCount > 0) {
      mediaSelection.clearSelection();
    }
  }, [mediaSelection.clearSelection, mediaSelection.selectedCount, quickTagging.isEnabled]);

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

    const result = normalizePageJumpInput(collectionFilesPageJumpInput, collectionFilesPage, collectionFilesTotalPages);
    if (!result.isValid) {
      setCollectionFilesPageJumpInput(String(collectionFilesPage));
      return;
    }

    setCollectionFilesPageJumpInput(String(result.targetPage));
    handleCollectionFilesPageChange(result.targetPage);
  };

  const renderCollectionFilesPagination = () => {
    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            className="media-action-btn app-button-icon-only media-pagination-icon-btn"
            onClick={() => handleCollectionFilesPageChange(collectionFilesPage - 1)}
            disabled={isCollectionFilesLoading || collectionFilesPage <= 1 || collectionFilesTotalPages === 0}
            aria-label="Previous page"
          >
            <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
          </button>
          <p>
            Page {collectionFilesTotalPages <= 0 ? 0 : collectionFilesPage} of {Math.max(collectionFilesTotalPages, 1)}
          </p>
          <button
            type="button"
            className="media-action-btn app-button-icon-only media-pagination-icon-btn"
            onClick={() => handleCollectionFilesPageChange(collectionFilesPage + 1)}
            disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0 || collectionFilesPage >= collectionFilesTotalPages}
            aria-label="Next page"
          >
            <AppIcon name="arrowRight" alt="" aria-hidden="true" />
          </button>
          <form className="media-pagination-jump" onSubmit={handleCollectionFilesPageJumpSubmit} noValidate>
            <input
              type="number"
              min={1}
              max={Math.max(collectionFilesTotalPages, 1)}
              step={1}
              inputMode="numeric"
              value={collectionFilesPageJumpInput}
              onChange={(event) => setCollectionFilesPageJumpInput(event.target.value)}
              onBlur={(event) => setCollectionFilesPageJumpInput(normalizePageJumpDisplayValue(event.target.value, collectionFilesPage, collectionFilesTotalPages))}
              disabled={isCollectionFilesLoading || collectionFilesTotalPages <= 1}
              aria-label="Go to collection media page"
            />
            <button type="submit" className="media-action-btn app-button-icon-only media-pagination-icon-btn" disabled={isCollectionFilesLoading || collectionFilesTotalPages <= 1} aria-label="Go to collection media page">
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
        setCollectionFiles((current) => current.map((item) => (
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

  const handleCreateCollection = async (event) => {
    event.preventDefault();
    if (isSavingCollection) {
      return;
    }

    const label = String(createCollectionDraft.label || "").trim();
    if (!label) {
      setCreateCollectionError("Collection name is required.");
      return;
    }

    setIsSavingCollection(true);
    setCreateCollectionError("");
    try {
      const payload = {
        label,
        description: String(createCollectionDraft.description || "").trim() || null,
        cover: toNullableId(createCollectionDraft.cover)
      };
      const collectionId = collectionEditorMode === "edit" ? Number(selectedCollection?.id) || null : null;
      const saved = await collectionsApi.saveCollection(collectionId, payload);
      setIsCreateCollectionModalOpen(false);
      setCreateCollectionDraft(EMPTY_COLLECTION_DRAFT);
      const items = await loadCollections();
      const savedCollectionId = Number(saved?.id || collectionId);
      const refreshedCollection = items.find((item) => Number(item?.id) === savedCollectionId) || null;

      if (collectionEditorMode === "edit" && selectedCollection?.id) {
        setSelectedCollection((current) => {
          if (!current || current.id !== selectedCollection.id) {
            return current;
          }

          return refreshedCollection || {
            ...current,
            label: saved?.label ?? payload.label,
            description: saved?.description ?? payload.description,
            cover: saved?.cover ?? payload.cover,
            coverMedia: refreshedCollection?.coverMedia ?? current.coverMedia ?? null
          };
        });
      }

      if (collectionEditorMode === "create" && (saved?.id || refreshedCollection?.id)) {
        const createdItem = refreshedCollection || {
          id: saved.id,
          label: saved.label ?? payload.label,
          description: saved.description ?? payload.description,
          cover: saved.cover ?? payload.cover,
          coverMedia: null
        };
        await handleOpenCollection(createdItem);
      }
    } catch (error) {
      setCreateCollectionError(error instanceof Error ? error.message : `Failed to ${collectionEditorMode} collection.`);
    } finally {
      setIsSavingCollection(false);
    }
  };

  const requestDeleteSelectedCollection = () => {
    if (!selectedCollection?.id || isCollectionDeleting || isSavingCollection) {
      return;
    }

    setPendingCollectionDelete({
      id: selectedCollection.id,
      name: String(selectedCollection.label || "")
    });
  };

  const closeCollectionDeleteConfirm = () => {
    if (isCollectionDeleting) {
      return;
    }

    setPendingCollectionDelete(null);
  };

  const handleDeleteCollection = async () => {
    if (!pendingCollectionDelete?.id || isCollectionDeleting) {
      return;
    }

    setIsCollectionDeleting(true);
    setCollectionsError("");
    try {
      await collectionsApi.deleteCollection(pendingCollectionDelete.id);
      setPendingCollectionDelete(null);
      setIsCreateCollectionModalOpen(false);
      setSelectedCollection((current) => (current?.id === pendingCollectionDelete.id ? null : current));
      setSelectedMedia(null);
      setCollectionFiles([]);
      setCollectionFilesPage(1);
      setCollectionFilesTotalPages(0);
      setCollectionFilesTotalCount(0);
      setCollectionFilesError("");
      await loadCollections();
    } catch (error) {
      setCollectionsError(error instanceof Error ? error.message : "Failed to delete collection.");
    } finally {
      setIsCollectionDeleting(false);
    }
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
      setItems: setCollectionFiles,
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
      setItems: setCollectionFiles,
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
      setItems: setCollectionFiles,
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
      setItems: setCollectionFiles,
      setSelectedMedia,
      onSuccess: () => window.dispatchEvent(new CustomEvent("gallery:media-updated"))
    });
  };

  return (
    <CollectionsPage
      openCreateCollectionModal={openCreateCollectionModal}
      isCollectionsLoading={isCollectionsLoading}
      collections={collections}
      handleOpenCollection={handleOpenCollection}
    >
      {collectionsError ? <p className="collections-error">{collectionsError}</p> : null}
      {isCreateCollectionModalOpen ? (
        <div className="media-confirm-overlay" role="dialog" aria-modal="true" onClick={closeCreateCollectionModal}>
          <div className="collection-modal" onClick={(event) => event.stopPropagation()}>
            <div className="media-modal-header">
              <h2 className="upload-modal-title">{collectionEditorMode === "edit" ? "Edit collection" : "New collection"}</h2>
              <button
                type="button"
                className="media-icon-btn media-icon-btn-close"
                onClick={closeCreateCollectionModal}
                disabled={isSavingCollection}
                aria-label="Close collection editor"
                title="Close collection editor"
              >
                <AppIcon name="close" alt="" aria-hidden="true" />
              </button>
            </div>
            <form className="collection-modal-body" onSubmit={handleCreateCollection}>
              <div className="collection-modal-form">
                <div className="collections-form">
                  <input
                    type="text"
                    className="collections-input"
                    value={createCollectionDraft.label}
                    onChange={(event) => setCreateCollectionDraft((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Collection name"
                    autoFocus
                  />
                  <textarea
                    className="collections-input"
                    value={createCollectionDraft.description}
                    onChange={(event) => setCreateCollectionDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Description"
                    rows={5}
                  />
                  <div className="collection-modal-cover-field">
                    <p className="collections-preview-title">Cover</p>
                    <MediaReferenceField
                      label="cover media"
                      value={createCollectionDraft.cover}
                      previewState={mediaReferencePicker.previewByMode.cover}
                      onOpenPicker={() => mediaReferencePicker.openPicker("cover")}
                      onClear={() => setCreateCollectionDraft((current) => ({ ...current, cover: "" }))}
                      disabled={isSavingCollection}
                    />
                  </div>
                </div>
                {createCollectionError ? <p className="collections-error">{createCollectionError}</p> : null}
              </div>
              <div className="collection-modal-actions">
                <button
                  type="submit"
                  className="media-action-btn media-action-primary app-button-icon-only"
                  disabled={isSavingCollection}
                  aria-label={isSavingCollection ? (collectionEditorMode === "edit" ? "Saving collection" : "Creating collection") : (collectionEditorMode === "edit" ? "Save collection" : "Create collection")}
                  title={isSavingCollection ? (collectionEditorMode === "edit" ? "Saving collection" : "Creating collection") : (collectionEditorMode === "edit" ? "Save collection" : "Create collection")}
                >
                  <AppIcon name="confirm" alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="media-action-btn app-button-icon-only"
                  onClick={closeCreateCollectionModal}
                  disabled={isSavingCollection}
                  aria-label="Cancel collection editor"
                  title="Cancel collection editor"
                >
                  <AppIcon name="cancel" alt="" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {selectedCollection ? (
        <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedCollection(null)}>
          <div className="collection-view-modal" onClick={(event) => event.stopPropagation()}>
            <div className="media-modal-header">
              <div className="collection-view-actions-spacer" />
            </div>
            <div className="collection-view-summary">
              <div className="collection-view-cover">
                {selectedCollection.coverMedia?.tileUrl ? (
                  <img
                    src={selectedCollection.coverMedia.tileUrl}
                    alt={String(selectedCollection.label || "Collection cover")}
                    loading="lazy"
                  />
                ) : (
                  <div className="collections-item-cover-fallback">No cover</div>
                )}
              </div>
              <div className="collection-view-info">
                <div className="collection-view-info-header">
                  <h2 className="upload-modal-title">{selectedCollection.label}</h2>
                  <div className="collection-view-actions">
                    <button
                      type="button"
                      className="media-icon-btn collection-view-action-edit"
                      onClick={openEditCollectionModal}
                      disabled={isSavingCollection || isCollectionDeleting}
                      aria-label="Edit collection"
                      title="Edit collection"
                    >
                      <AppIcon name="edit" alt="" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="media-icon-btn collection-view-action-delete"
                      onClick={requestDeleteSelectedCollection}
                      disabled={isSavingCollection || isCollectionDeleting}
                      aria-label={isCollectionDeleting ? "Deleting collection" : "Delete collection"}
                      title={isCollectionDeleting ? "Deleting collection" : "Delete collection"}
                    >
                      <AppIcon name="delete" alt="" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="media-icon-btn media-icon-btn-close"
                      onClick={() => setSelectedCollection(null)}
                      aria-label="Close collection modal"
                      title="Close collection modal"
                    >
                      <AppIcon name="close" alt="" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p>{selectedCollection.description || "No description."}</p>
              </div>
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
                <div className="media-pagination-toolbar">
                  {renderCollectionFilesPagination()}
                  <MediaQuickTaggingAction
                    isSelectionMode={mediaSelection.isSelectionMode}
                    onOpenConfig={() => void quickTagging.openConfig()}
                  />
                  <BulkMediaActionBar
                    selectedCount={mediaSelection.selectedCount}
                    onClearSelection={mediaSelection.clearSelection}
                    onDeleteSelection={() => setPendingBulkDelete(createPendingMediaDelete(mediaSelection.selectedMediaItems))}
                    onEditSelection={() => void handleOpenBulkEdit()}
                  />
                </div>
              ) : null}
              {!collectionFilesError && collectionFilesTotalCount > 0 ? (
                <>
                  <div className="media-grid">
                    {visibleCollectionFiles.map((file) => (
                      <GalleryMediaTile
                        key={file.id || file.relativePath}
                        file={file}
                        alt={getDisplayName(file.name)}
                        hasPreviewError={failedPreviewPaths.has(file.relativePath)}
                        onSelect={quickTagging.isEnabled ? (item) => void quickTagging.applyTagToMedia(item) : setSelectedMedia}
                        onStartSelection={quickTagging.isEnabled ? undefined : mediaSelection.startSelection}
                        onToggleSelection={quickTagging.isEnabled ? undefined : mediaSelection.toggleSelection}
                        isSelected={mediaSelection.isSelected(file)}
                        selectionIndex={mediaSelection.getSelectionIndex(file)}
                        isSelectionMode={quickTagging.isEnabled ? false : mediaSelection.isSelectionMode}
                        onPreviewError={(relativePath) => setFailedPreviewPaths((prev) => new Set(prev).add(relativePath))}
                      />
                    ))}
                  </div>
                  {renderCollectionFilesPagination()}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
      <CollectionDeleteConfirmModal
        pendingCollectionDelete={pendingCollectionDelete}
        isCollectionDeleting={isCollectionDeleting}
        onConfirm={() => void handleDeleteCollection()}
        onClose={closeCollectionDeleteConfirm}
      />
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
      <QuickTaggingModal
        isOpen={quickTagging.isConfigOpen}
        tagCatalog={tagCatalog}
        isLoading={isTagCatalogLoading}
        initialConfig={quickTagging.config}
        onConfirm={quickTagging.confirmConfig}
        onDisable={quickTagging.disable}
        onClose={quickTagging.closeConfig}
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
      <MediaRelationPickerModal isOpen={isCreateCollectionModalOpen && mediaReferencePicker.isPickerOpen} onClose={mediaReferencePicker.closePicker} initialData={{ mode: mediaReferencePicker.pickerMode }}>
        <MediaRelationPickerDialogContent
          mode={mediaReferencePicker.pickerMode}
          query={mediaReferencePicker.pickerQuery}
          onQueryChange={mediaReferencePicker.setPickerQuery}
          items={mediaReferencePicker.pickerItems}
          page={mediaReferencePicker.pickerPage}
          totalPages={mediaReferencePicker.pickerTotalPages}
          totalCount={mediaReferencePicker.pickerTotalCount}
          isLoading={mediaReferencePicker.isPickerLoading}
          errorMessage={mediaReferencePicker.pickerError}
          tagCatalog={tagCatalog}
          tagTypes={tagTypesCatalog}
          onPrev={() => mediaReferencePicker.setPickerPage((current) => Math.max(1, current - 1))}
          onNext={() => mediaReferencePicker.setPickerPage((current) => current + 1)}
          onPageChange={mediaReferencePicker.setPickerPage}
          onClose={mediaReferencePicker.closePicker}
          onSelect={mediaReferencePicker.selectFromPicker}
        />
      </MediaRelationPickerModal>
    </CollectionsPage>
  );
}
