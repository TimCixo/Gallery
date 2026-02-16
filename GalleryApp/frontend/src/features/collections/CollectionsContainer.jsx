import { useCallback, useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { mediaApi } from "../../api/mediaApi";
import { tagsApi } from "../../api/tagsApi";
import CollectionPickerModal from "./components/CollectionPickerModal";
import MediaViewerModal from "../media/components/MediaViewerModal";
import CollectionsPage from "./CollectionsPage";

const PAGE_SIZE = 36;

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
  const [mediaRelationPreviewByMode, setMediaRelationPreviewByMode] = useState({
    parent: { item: null, isLoading: false, error: "" },
    child: { item: null, isLoading: false, error: "" }
  });
  const [isMediaRelationPickerOpen, setIsMediaRelationPickerOpen] = useState(false);
  const [mediaRelationPickerMode, setMediaRelationPickerMode] = useState("parent");
  const [mediaRelationPickerQuery, setMediaRelationPickerQuery] = useState("");
  const [mediaRelationPickerPage, setMediaRelationPickerPage] = useState(1);
  const [mediaRelationPickerItems, setMediaRelationPickerItems] = useState([]);
  const [mediaRelationPickerTotalPages, setMediaRelationPickerTotalPages] = useState(0);
  const [mediaRelationPickerTotalCount, setMediaRelationPickerTotalCount] = useState(0);
  const [isMediaRelationPickerLoading, setIsMediaRelationPickerLoading] = useState(false);
  const [mediaRelationPickerError, setMediaRelationPickerError] = useState("");

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

  const loadCollections = useCallback(async () => {
    setIsCollectionsLoading(true);
    setCollectionsError("");
    try {
      const response = await collectionsApi.listCollections({ search: searchQuery || undefined });
      setCollections(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      setCollections([]);
      setCollectionsError(error instanceof Error ? error.message : "Failed to load collections.");
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

    setSelectedCollection(item);
    setSelectedMedia(null);
    await loadCollectionMedia(item.id, 1);
  };

  const visibleCollectionFiles = useMemo(() => collectionFiles, [collectionFiles]);
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

    const parsed = Number.parseInt(collectionFilesPageJumpInput, 10);
    if (!Number.isFinite(parsed)) {
      setCollectionFilesPageJumpInput(String(collectionFilesPage));
      return;
    }

    const targetPage = Math.min(Math.max(parsed, 1), collectionFilesTotalPages);
    setCollectionFilesPageJumpInput(String(targetPage));
    handleCollectionFilesPageChange(targetPage);
  };

  const renderCollectionFilesPagination = (showLoadingState = false) => {
    if (collectionFilesTotalPages <= 1) {
      return null;
    }

    return (
      <div className="media-pagination-wrap">
        <div className="media-pagination">
          <button
            type="button"
            onClick={() => handleCollectionFilesPageChange(collectionFilesPage - 1)}
            disabled={isCollectionFilesLoading || collectionFilesPage <= 1}
          >
            Prev
          </button>
          <p>Page {collectionFilesPage} of {collectionFilesTotalPages}</p>
          <button
            type="button"
            onClick={() => handleCollectionFilesPageChange(collectionFilesPage + 1)}
            disabled={isCollectionFilesLoading || collectionFilesPage >= collectionFilesTotalPages}
          >
            Next
          </button>
          <form className="media-pagination-jump" onSubmit={handleCollectionFilesPageJumpSubmit}>
            <input
              type="number"
              min={1}
              max={Math.max(collectionFilesTotalPages, 1)}
              step={1}
              inputMode="numeric"
              value={collectionFilesPageJumpInput}
              onChange={(event) => setCollectionFilesPageJumpInput(event.target.value)}
              disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0}
              aria-label="Go to collection page"
            />
            <button type="submit" disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0}>
              Go
            </button>
          </form>
        </div>
        {showLoadingState ? (
          <p className="media-pagination-status" aria-live="polite">
            {isCollectionFilesLoading ? "Loading collection files..." : "\u00A0"}
          </p>
        ) : null}
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
      setCollectionFiles((current) => current.map((item) => (
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

    const localCandidate = collectionFiles.find((item) => item?.id === normalizedId) || null;
    if (localCandidate) {
      return localCandidate;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    return items.find((item) => Number(item?.id) === normalizedId) || null;
  }, [collectionFiles]);

  useEffect(() => {
    if (!selectedMedia || !isEditingMedia) {
      return undefined;
    }

    const resolveMode = async (mode) => {
      const rawValue = String(mode === "parent" ? mediaDraft.parent : mediaDraft.child || "").trim();
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
      setCollectionFiles((current) => current.map((item) => (
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

  const handleDeleteMedia = async () => {
    if (!selectedMedia?.id || isDeletingMedia || isSavingMedia) {
      return;
    }

    setIsDeletingMedia(true);
    setMediaModalError("");
    try {
      await mediaApi.deleteMedia(selectedMedia.id);
      setCollectionFiles((current) => current.filter((item) => item.id !== selectedMedia.id));
      setSelectedMedia(null);
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  return (
    <CollectionsPage
      openCreateCollectionModal={() => {}}
      isCollectionsLoading={isCollectionsLoading}
      collections={collections}
      handleOpenCollection={handleOpenCollection}
    >
      {collectionsError ? <p className="collections-error">{collectionsError}</p> : null}
      {selectedCollection ? (
        <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedCollection(null)}>
          <div className="collection-view-modal" onClick={(event) => event.stopPropagation()}>
            <div className="media-modal-header">
              <h2 className="upload-modal-title">{selectedCollection.label}</h2>
              <button type="button" className="media-action-btn" onClick={() => setSelectedCollection(null)}>
                Close
              </button>
            </div>
            <div className="collection-view-meta">
              <p>{selectedCollection.description || "No description."}</p>
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
                <>
                  {renderCollectionFilesPagination(true)}
                  <div className="media-grid">
                    {visibleCollectionFiles.map((file) => (
                      <article
                        key={file.id || file.relativePath}
                        className="media-tile"
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMedia(file)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedMedia(file);
                          }
                        }}
                      >
                        <div className="media-preview">
                          {file._tileUrl && !failedPreviewPaths.has(file.relativePath) ? (
                            <img
                              src={file._tileUrl}
                              alt={getDisplayName(file.name)}
                              loading="lazy"
                              onError={() => setFailedPreviewPaths((prev) => new Set(prev).add(file.relativePath))}
                            />
                          ) : (
                            <div className="media-fallback">Preview unavailable</div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {renderCollectionFilesPagination(false)}
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
        <div className="collection-picker-dialog" onClick={(event) => event.stopPropagation()}>
          <p className="collection-picker-title">Select collection</p>
          {collectionPickerError ? <p className="media-action-error">{collectionPickerError}</p> : null}
          {isCollectionPickerLoading ? (
            <p className="collections-state">Loading collections...</p>
          ) : collectionPickerItems.length === 0 ? (
            <p className="collections-state">No collections available.</p>
          ) : (
            <ul className="collection-picker-list">
              {collectionPickerItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`collection-picker-item${item.containsMedia ? " is-included" : ""}`}
                    onClick={() => void handleAddSelectedMediaToCollection(item.id)}
                    disabled={isAddingMediaToCollection}
                  >
                    <span>{item.label}</span>
                    <em>{item.containsMedia ? "Included" : "Not included"}</em>
                    <small>{item.description || "No description."}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollectionPickerModal>
    </CollectionsPage>
  );
}
