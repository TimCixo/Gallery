import { useEffect, useMemo, useRef, useState } from "react";
import { mediaApi } from "../../../api/mediaApi";
import { collectionsApi } from "../../../api/collectionsApi";
import AppIcon from "../../shared/components/AppIcon";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";
import CollectionPickerDialogContent from "../../collections/components/CollectionPickerDialogContent";
import CollectionPickerModal from "../../collections/components/CollectionPickerModal";
import MediaEditorPanel from "./MediaEditorPanel";
import { createBulkEditorItems, createEmptyMediaDraft } from "../utils/bulkMediaEdit";

const DEFAULT_RELATION_PREVIEW = Object.freeze({
  parent: { item: null, isLoading: false, error: "" },
  child: { item: null, isLoading: false, error: "" }
});

export default function BulkMediaEditorModal({
  isOpen,
  selectedItems,
  tagCatalog,
  tagTypes,
  isTagCatalogLoading,
  onRefreshTagCatalog,
  isSaving,
  errorMessage,
  onClose,
  onSave
}) {
  const [editorItems, setEditorItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGroupEditEnabled, setIsGroupEditEnabled] = useState(false);
  const [groupDraft, setGroupDraft] = useState(createEmptyMediaDraft);
  const [groupTouchedFields, setGroupTouchedFields] = useState({});
  const [groupTagEdits, setGroupTagEdits] = useState({});
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [collectionPickerItems, setCollectionPickerItems] = useState([]);
  const [collectionPickerError, setCollectionPickerError] = useState("");
  const [isCollectionPickerLoading, setIsCollectionPickerLoading] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const [relationPreviewByMode, setRelationPreviewByMode] = useState(DEFAULT_RELATION_PREVIEW);
  const [isMediaRelationPickerOpen, setIsMediaRelationPickerOpen] = useState(false);
  const [mediaRelationPickerMode, setMediaRelationPickerMode] = useState("parent");
  const [mediaRelationPickerQuery, setMediaRelationPickerQuery] = useState("");
  const [mediaRelationPickerItems, setMediaRelationPickerItems] = useState([]);
  const [mediaRelationPickerPage, setMediaRelationPickerPage] = useState(1);
  const [mediaRelationPickerTotalPages, setMediaRelationPickerTotalPages] = useState(0);
  const [mediaRelationPickerTotalCount, setMediaRelationPickerTotalCount] = useState(0);
  const [isMediaRelationPickerLoading, setIsMediaRelationPickerLoading] = useState(false);
  const [mediaRelationPickerError, setMediaRelationPickerError] = useState("");
  const mediaCacheRef = useRef(new Map());

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEditorItems(createBulkEditorItems(selectedItems));
    setActiveIndex(0);
    setIsGroupEditEnabled(false);
    setGroupDraft(createEmptyMediaDraft());
    setGroupTouchedFields({});
    setGroupTagEdits({});
    setSelectedCollectionIds([]);
    setCollectionPickerItems([]);
    setCollectionPickerError("");
    setIsCollectionPickerLoading(false);
    setIsCollectionPickerOpen(false);
    setRelationPreviewByMode(DEFAULT_RELATION_PREVIEW);
    setIsMediaRelationPickerOpen(false);
    setMediaRelationPickerMode("parent");
    setMediaRelationPickerQuery("");
    setMediaRelationPickerItems([]);
    setMediaRelationPickerPage(1);
    setMediaRelationPickerTotalPages(0);
    setMediaRelationPickerTotalCount(0);
    setIsMediaRelationPickerLoading(false);
    setMediaRelationPickerError("");
    mediaCacheRef.current = new Map();
  }, [isOpen, selectedItems]);

  const activeItem = editorItems[activeIndex] || null;
  const canNavigatePrev = activeIndex > 0;
  const canNavigateNext = activeIndex < editorItems.length - 1;
  const activeDraft = activeItem?.draft || null;
  const visibleDraft = isGroupEditEnabled ? groupDraft : activeDraft;
  const modalTitle = activeItem?.name || activeItem?.title || activeItem?.relativePath || `${editorItems.length} selected media`;

  const previewNode = useMemo(() => {
    if (isGroupEditEnabled) {
      return <div className="media-bulk-preview">{editorItems.length}</div>;
    }

    if (!activeItem) {
      return null;
    }

    if (isVideoFile(activeItem)) {
      return (
        <video
          src={resolveOriginalMediaUrl(activeItem)}
          poster={resolvePreviewMediaUrl(activeItem)}
          preload="metadata"
          playsInline
          muted
        />
      );
    }

    return (
      <img
        src={resolvePreviewMediaUrl(activeItem)}
        alt={String(activeItem?.name || "")}
        loading="lazy"
      />
    );
  }, [activeItem, editorItems.length, isGroupEditEnabled]);

  const updateDraft = (patch) => {
    if (isGroupEditEnabled) {
      setGroupDraft((current) => ({ ...current, ...patch }));
      setGroupTouchedFields((current) => ({
        ...current,
        ...Object.keys(patch).reduce((result, key) => ({ ...result, [key]: true }), {})
      }));
      return;
    }

    setEditorItems((current) => current.map((item, index) => (
      index === activeIndex
        ? { ...item, draft: { ...item.draft, ...patch } }
        : item
    )));
  };

  const findMediaById = async (mediaId) => {
    const normalizedId = Number(mediaId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const cachedCandidate = mediaCacheRef.current.get(normalizedId) || null;
    if (cachedCandidate) {
      return cachedCandidate;
    }

    const localCandidate = selectedItems.find((item) => Number(item?.id) === normalizedId) || null;
    if (localCandidate) {
      const normalizedCandidate = {
        ...localCandidate,
        _tileUrl: localCandidate.tileUrl || localCandidate.previewUrl || localCandidate.originalUrl || localCandidate.url || ""
      };
      mediaCacheRef.current.set(normalizedId, normalizedCandidate);
      return normalizedCandidate;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    const remoteCandidate = items.find((item) => Number(item?.id) === normalizedId) || null;
    if (remoteCandidate) {
      const normalizedCandidate = {
        ...remoteCandidate,
        _tileUrl: remoteCandidate.tileUrl || remoteCandidate.previewUrl || remoteCandidate.originalUrl || remoteCandidate.url || ""
      };
      mediaCacheRef.current.set(normalizedId, normalizedCandidate);
      return normalizedCandidate;
    }

    return null;
  };

  const toggleTag = (tagId) => {
    if (isGroupEditEnabled) {
      const targetedItems = editorItems;
      const effectiveHasTagEverywhere = targetedItems.every((item) => {
        const currentIds = Array.isArray(item.draft?.tagIds) ? item.draft.tagIds : [];
        const pendingAction = groupTagEdits[tagId] || null;
        if (pendingAction === "add") {
          return true;
        }
        if (pendingAction === "remove") {
          return false;
        }
        return currentIds.includes(tagId);
      });
      const nextAction = effectiveHasTagEverywhere ? "remove" : "add";
      setGroupTagEdits((current) => ({ ...current, [tagId]: nextAction }));
      setGroupDraft((current) => {
        const currentIds = Array.isArray(current.tagIds) ? current.tagIds : [];
        return {
          ...current,
          tagIds: nextAction === "add"
            ? [...new Set([...currentIds, tagId])]
            : currentIds.filter((id) => id !== tagId)
        };
      });
      return;
    }

    setEditorItems((current) => current.map((item, index) => {
      if (index !== activeIndex) {
        return item;
      }

      const currentIds = Array.isArray(item.draft?.tagIds) ? item.draft.tagIds : [];
      const targetedItems = current.filter((candidate, candidateIndex) => candidateIndex === activeIndex);
      const shouldRemoveTag = targetedItems.every((candidate) => (
        Array.isArray(candidate.draft?.tagIds) && candidate.draft.tagIds.includes(tagId)
      ));
      return {
        ...item,
        draft: {
          ...item.draft,
          tagIds: shouldRemoveTag ? currentIds.filter((id) => id !== tagId) : [...new Set([...currentIds, tagId])]
        }
      };
    }));
  };

  const openCollectionPicker = async () => {
    if (isCollectionPickerLoading) {
      return;
    }

    setIsCollectionPickerOpen(true);
    setCollectionPickerError("");
    if (collectionPickerItems.length > 0) {
      return;
    }

    setIsCollectionPickerLoading(true);
    try {
      const response = await collectionsApi.listCollections();
      setCollectionPickerItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      setCollectionPickerItems([]);
      setCollectionPickerError(error instanceof Error ? error.message : "Failed to fetch collections.");
    } finally {
      setIsCollectionPickerLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || editorItems.length === 0) {
      return undefined;
    }

    const relationIds = Array.from(new Set(editorItems.flatMap((item) => {
      const parentId = Number.parseInt(String(item?.draft?.parent || "").trim(), 10);
      const childId = Number.parseInt(String(item?.draft?.child || "").trim(), 10);
      return [parentId, childId].filter((value) => Number.isSafeInteger(value) && value > 0);
    })));

    if (relationIds.length === 0) {
      return undefined;
    }

    let cancelled = false;
    const preloadRelationMedia = async () => {
      await Promise.all(relationIds.map(async (relationId) => {
        if (cancelled || mediaCacheRef.current.has(relationId)) {
          return;
        }
        try {
          await findMediaById(relationId);
        } catch {
          // Ignore preload failures and let active preview resolution expose errors when needed.
        }
      }));
    };

    void preloadRelationMedia();
    return () => {
      cancelled = true;
    };
  }, [editorItems, isOpen]);

  useEffect(() => {
    if (!visibleDraft) {
      setRelationPreviewByMode(DEFAULT_RELATION_PREVIEW);
      return undefined;
    }

    let cancelled = false;
    const resolveMode = async (mode) => {
      const rawValue = String(mode === "parent" ? (visibleDraft.parent || "") : (visibleDraft.child || "")).trim();
      if (!rawValue) {
        if (!cancelled) {
          setRelationPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: "" }
          }));
        }
        return;
      }

      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        if (!cancelled) {
          setRelationPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: "Invalid media id." }
          }));
        }
        return;
      }

      const cachedCandidate = mediaCacheRef.current.get(parsed) || null;
      if (cachedCandidate) {
        if (!cancelled) {
          setRelationPreviewByMode((current) => ({
            ...current,
            [mode]: { item: cachedCandidate, isLoading: false, error: "" }
          }));
        }
        return;
      }

      setRelationPreviewByMode((current) => ({
        ...current,
        [mode]: { item: null, isLoading: true, error: "" }
      }));

      try {
        const candidate = await findMediaById(parsed);
        if (!cancelled) {
          setRelationPreviewByMode((current) => ({
            ...current,
            [mode]: candidate
              ? { item: candidate, isLoading: false, error: "" }
              : { item: null, isLoading: false, error: "Media not found." }
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setRelationPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: error instanceof Error ? error.message : "Failed to resolve media." }
          }));
        }
      }
    };

    void resolveMode("parent");
    void resolveMode("child");
    return () => {
      cancelled = true;
    };
  }, [visibleDraft]);

  const openMediaRelationPicker = (mode) => {
    setMediaRelationPickerMode(mode === "child" ? "child" : "parent");
    setMediaRelationPickerQuery("");
    setMediaRelationPickerPage(1);
    setMediaRelationPickerError("");
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
    updateDraft({ [key]: String(selectedId) });
    closeMediaRelationPicker();
  };

  const getItemsForSave = () => {
    if (!isGroupEditEnabled) {
      return editorItems;
    }

    return editorItems.map((item) => {
      const nextDraft = { ...item.draft };

      Object.entries(groupTouchedFields).forEach(([fieldKey, isTouched]) => {
        if (!isTouched) {
          return;
        }
        nextDraft[fieldKey] = groupDraft[fieldKey] ?? "";
      });

      if (Object.keys(groupTagEdits).length > 0) {
        let nextTagIds = Array.isArray(item.draft?.tagIds) ? [...item.draft.tagIds] : [];
        Object.entries(groupTagEdits).forEach(([tagId, action]) => {
          const normalizedTagId = Number(tagId);
          if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
            return;
          }
          if (action === "add") {
            nextTagIds = [...new Set([...nextTagIds, normalizedTagId])];
          }
          if (action === "remove") {
            nextTagIds = nextTagIds.filter((id) => id !== normalizedTagId);
          }
        });
        nextDraft.tagIds = nextTagIds;
      }

      return { ...item, draft: nextDraft };
    });
  };

  if (!isOpen || !activeItem) {
    return null;
  }

  const previewTitle = isGroupEditEnabled ? `${editorItems.length} selected media` : `Editing: ${modalTitle}`;

  return (
    <>
      <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="media-modal media-modal-editing" onClick={(event) => event.stopPropagation()}>
          <div className="media-modal-header media-modal-header-bulk">
            <div className="media-modal-bulk-header-start">
              <button
                type="button"
                className="media-icon-btn media-icon-btn-collections"
                onClick={() => void openCollectionPicker()}
                disabled={isSaving}
                aria-label="Add selected media to collections"
                title="Add selected media to collections"
              >
                <AppIcon name="collection" alt="" aria-hidden="true" />
              </button>
            </div>
            <div className="media-upload-nav">
              <button
                type="button"
                className="media-action-btn app-button-icon-only"
                onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
                disabled={isGroupEditEnabled || !canNavigatePrev || isSaving}
                aria-label="Previous selected media"
                title="Previous selected media"
              >
                <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="media-action-btn app-button-icon-only"
                onClick={() => setActiveIndex((current) => Math.min(current + 1, editorItems.length - 1))}
                disabled={isGroupEditEnabled || !canNavigateNext || isSaving}
                aria-label="Next selected media"
                title="Next selected media"
              >
                <AppIcon name="arrowRight" alt="" aria-hidden="true" />
              </button>
            </div>
            <div className="media-modal-bulk-header-actions">
              <button
                type="button"
                className="media-icon-btn media-icon-btn-close"
                onClick={onClose}
                disabled={isSaving}
                aria-label="Close bulk editor"
                title="Close bulk editor"
              >
                <AppIcon name="close" alt="" aria-hidden="true" />
              </button>
            </div>
          </div>

          <MediaEditorPanel
            mode="bulk"
            file={activeItem}
            onClose={onClose}
            showFavoriteButton={false}
            showCloseButton={false}
            allowOpenRelatedMedia={false}
            previewNode={previewNode}
            previewClassName="media-edit-thumbnail media-bulk-preview-wrap"
            errorMessage={errorMessage}
            draft={visibleDraft}
            onDraftChange={updateDraft}
            isSavingMedia={isSaving}
            isDeletingMedia={false}
            tagCatalog={tagCatalog}
            tagTypes={tagTypes}
            isTagCatalogLoading={isTagCatalogLoading}
            selectedTagIds={Array.isArray(visibleDraft?.tagIds) ? visibleDraft.tagIds : []}
            onToggleTag={toggleTag}
            onRefreshTagCatalog={onRefreshTagCatalog}
            relationPreviewByMode={relationPreviewByMode}
            onOpenRelationPicker={openMediaRelationPicker}
            isMediaRelationPickerOpen={isMediaRelationPickerOpen}
            mediaRelationPickerMode={mediaRelationPickerMode}
            mediaRelationPickerQuery={mediaRelationPickerQuery}
            onMediaRelationPickerQueryChange={setMediaRelationPickerQuery}
            mediaRelationPickerItems={mediaRelationPickerItems}
            mediaRelationPickerPage={mediaRelationPickerPage}
            mediaRelationPickerTotalPages={mediaRelationPickerTotalPages}
            mediaRelationPickerTotalCount={mediaRelationPickerTotalCount}
            isMediaRelationPickerLoading={isMediaRelationPickerLoading}
            mediaRelationPickerError={mediaRelationPickerError}
            onMediaRelationPickerPrev={() => setMediaRelationPickerPage((current) => Math.max(current - 1, 1))}
            onMediaRelationPickerNext={() => setMediaRelationPickerPage((current) => (
              mediaRelationPickerTotalPages > 0 ? Math.min(current + 1, mediaRelationPickerTotalPages) : current + 1
            ))}
            onMediaRelationPickerPageChange={setMediaRelationPickerPage}
            onCloseMediaRelationPicker={closeMediaRelationPicker}
            onSelectMediaRelationFromPicker={handleSelectMediaRelationFromPicker}
            systemDetailsNode={(
              <table className="media-system-table">
                <tbody>
                  <tr>
                    <th scope="row">Selected Items</th>
                    <td>{editorItems.length}</td>
                  </tr>
                  <tr>
                    <th scope="row">Current Item</th>
                    <td>{activeIndex + 1} / {editorItems.length}</td>
                  </tr>
                  <tr>
                    <th scope="row">Group Edit</th>
                    <td>{isGroupEditEnabled ? "Enabled" : "Disabled"}</td>
                  </tr>
                </tbody>
              </table>
            )}
            primaryActionLabel="Apply"
            primaryActionBusyLabel="Applying..."
            previewTitle={previewTitle}
            primaryIconName="confirm"
            isPrimaryActionBusy={isSaving}
            onPrimaryAction={() => onSave?.({ items: getItemsForSave(), collectionIds: selectedCollectionIds })}
            secondaryActionLabel="Cancel"
            onSecondaryAction={onClose}
            actionLeadingSlot={(
              <label className="media-upload-group-toggle">
                <input
                  type="checkbox"
                  checked={isGroupEditEnabled}
                  onChange={(event) => setIsGroupEditEnabled(event.target.checked)}
                  disabled={isSaving}
                />
                group
              </label>
            )}
          />
        </div>
      </div>

      <CollectionPickerModal isOpen={isCollectionPickerOpen} onClose={() => setIsCollectionPickerOpen(false)} initialData={{ kind: "media" }}>
        <CollectionPickerDialogContent
          items={collectionPickerItems}
          errorMessage={collectionPickerError}
          isLoading={isCollectionPickerLoading}
          onSelect={(item) => {
            const collectionId = Number(item?.id);
            if (!Number.isSafeInteger(collectionId) || collectionId <= 0) {
              return;
            }

            setSelectedCollectionIds((current) => (
              current.includes(collectionId)
                ? current.filter((id) => id !== collectionId)
                : [...current, collectionId]
            ));
          }}
          onClose={() => setIsCollectionPickerOpen(false)}
          selectedIds={selectedCollectionIds}
        />
      </CollectionPickerModal>
    </>
  );
}
