import { useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../../api/collectionsApi";
import AppIcon from "../../shared/components/AppIcon";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";
import CollectionPickerDialogContent from "../../collections/components/CollectionPickerDialogContent";
import CollectionPickerModal from "../../collections/components/CollectionPickerModal";
import MediaEditorPanel from "./MediaEditorPanel";
import LinkOrderOverwriteConfirmModal from "./LinkOrderOverwriteConfirmModal";
import { useMediaReferencePicker } from "../hooks/useMediaReferencePicker";
import { applyOrderedRelationChainToItems, createBulkEditorItems, createEmptyMediaDraft } from "../utils/bulkMediaEdit";
import { getGroupSelectedTagIds } from "../utils/groupTagSelection";
import { disconnectSelectedLinkOrder, hasLinkedSelectionInOrder, hasLinkOrderOverwrite } from "../utils/linkOrderSelection";

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
  const [isGroupSelectionChainEnabled, setIsGroupSelectionChainEnabled] = useState(false);
  const [isLinkOrderOverwriteConfirmOpen, setIsLinkOrderOverwriteConfirmOpen] = useState(false);
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [collectionPickerItems, setCollectionPickerItems] = useState([]);
  const [collectionPickerError, setCollectionPickerError] = useState("");
  const [isCollectionPickerLoading, setIsCollectionPickerLoading] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextEditorItems = createBulkEditorItems(selectedItems);
    setEditorItems(nextEditorItems);
    setActiveIndex(0);
    setIsGroupEditEnabled(false);
    setGroupDraft(createEmptyMediaDraft());
    setGroupTouchedFields({});
    setGroupTagEdits({});
    setIsGroupSelectionChainEnabled(hasLinkedSelectionInOrder(nextEditorItems));
    setIsLinkOrderOverwriteConfirmOpen(false);
    setSelectedCollectionIds([]);
    setCollectionPickerItems([]);
    setCollectionPickerError("");
    setIsCollectionPickerLoading(false);
    setIsCollectionPickerOpen(false);
  }, [isOpen, selectedItems]);

  const activeItem = editorItems[activeIndex] || null;
  const canNavigatePrev = activeIndex > 0;
  const canNavigateNext = activeIndex < editorItems.length - 1;
  const activeDraft = activeItem?.draft || null;
  const visibleDraft = isGroupEditEnabled ? groupDraft : activeDraft;
  const selectedTagIds = isGroupEditEnabled
    ? getGroupSelectedTagIds(editorItems, groupTagEdits)
    : (Array.isArray(visibleDraft?.tagIds) ? visibleDraft.tagIds : []);
  const modalTitle = activeItem?.name || activeItem?.title || activeItem?.relativePath || `${editorItems.length} selected media`;
  const isInitiallyLinkedSelection = useMemo(() => hasLinkedSelectionInOrder(editorItems), [editorItems]);

  useEffect(() => {
    if (!isOpen) {
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

      if (isGroupEditEnabled || isSaving) {
        return;
      }

      if (event.key === "ArrowLeft" && !canNavigatePrev) {
        return;
      }

      if (event.key === "ArrowRight" && !canNavigateNext) {
        return;
      }

      event.preventDefault();
      setActiveIndex((current) => (
        event.key === "ArrowRight"
          ? Math.min(current + 1, editorItems.length - 1)
          : Math.max(current - 1, 0)
      ));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNavigateNext, canNavigatePrev, editorItems.length, isGroupEditEnabled, isOpen, isSaving]);

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
  const mediaReferencePicker = useMediaReferencePicker({
    valueByMode: {
      parent: visibleDraft?.parent,
      child: visibleDraft?.child
    },
    onSelectReference: (mode, item) => {
      const selectedId = Number(item?.id);
      if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
        return;
      }

      updateDraft({ [mode === "child" ? "child" : "parent"]: String(selectedId) });
    },
    localItems: selectedItems,
    isEnabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      return;
    }

    mediaReferencePicker.resetPicker();
  }, [isOpen, mediaReferencePicker.resetPicker]);

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
        if (cancelled) {
          return;
        }
        try {
          await mediaReferencePicker.findMediaById(relationId);
        } catch {
          // Ignore preload failures and let active preview resolution expose errors when needed.
        }
      }));
    };

    void preloadRelationMedia();
    return () => {
      cancelled = true;
    };
  }, [editorItems, isOpen, mediaReferencePicker.findMediaById]);

  const getItemsForSave = () => {
    if (!isGroupEditEnabled) {
      return editorItems;
    }

    const draftAppliedItems = editorItems.map((item) => {
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

    if (isGroupSelectionChainEnabled) {
      return applyOrderedRelationChainToItems(draftAppliedItems);
    }

    return isInitiallyLinkedSelection ? disconnectSelectedLinkOrder(draftAppliedItems) : draftAppliedItems;
  };

  const shouldConfirmLinkOrderOverwrite = isGroupEditEnabled
    && isGroupSelectionChainEnabled
    && hasLinkOrderOverwrite(editorItems);

  const handleSave = () => {
    if (shouldConfirmLinkOrderOverwrite) {
      setIsLinkOrderOverwriteConfirmOpen(true);
      return;
    }

    onSave?.({
      items: getItemsForSave(),
      collectionIds: selectedCollectionIds,
      relationStrategy: isGroupEditEnabled
        ? (isGroupSelectionChainEnabled ? "relink" : (isInitiallyLinkedSelection ? "disconnect" : "preserve"))
        : "preserve"
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
            showRelations={!isGroupEditEnabled}
            tagCatalog={tagCatalog}
            tagTypes={tagTypes}
            isTagCatalogLoading={isTagCatalogLoading}
            selectedTagIds={selectedTagIds}
            onToggleTag={toggleTag}
            onRefreshTagCatalog={onRefreshTagCatalog}
            relationPreviewByMode={mediaReferencePicker.previewByMode}
            onOpenRelationPicker={mediaReferencePicker.openPicker}
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
            onMediaRelationPickerPrev={() => mediaReferencePicker.setPickerPage((current) => Math.max(current - 1, 1))}
            onMediaRelationPickerNext={() => mediaReferencePicker.setPickerPage((current) => (
              mediaReferencePicker.pickerTotalPages > 0 ? Math.min(current + 1, mediaReferencePicker.pickerTotalPages) : current + 1
            ))}
            onMediaRelationPickerPageChange={mediaReferencePicker.setPickerPage}
            onCloseMediaRelationPicker={mediaReferencePicker.closePicker}
            onSelectMediaRelationFromPicker={mediaReferencePicker.selectFromPicker}
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
            onPrimaryAction={handleSave}
            secondaryActionLabel="Cancel"
            onSecondaryAction={onClose}
            actionLeadingSlot={(
              <div className="media-bulk-group-options">
                <label className="media-upload-group-toggle">
                  <input
                    type="checkbox"
                    checked={isGroupEditEnabled}
                    onChange={(event) => setIsGroupEditEnabled(event.target.checked)}
                    disabled={isSaving}
                  />
                  group
                </label>
                {isGroupEditEnabled ? (
                  <label className="media-upload-group-toggle">
                    <input
                      type="checkbox"
                      checked={isGroupSelectionChainEnabled}
                      onChange={(event) => setIsGroupSelectionChainEnabled(event.target.checked)}
                      disabled={isSaving || editorItems.length < 2}
                    />
                    link order
                  </label>
                ) : null}
              </div>
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

      <LinkOrderOverwriteConfirmModal
        isOpen={isLinkOrderOverwriteConfirmOpen}
        isSaving={isSaving}
        onConfirm={() => {
          setIsLinkOrderOverwriteConfirmOpen(false);
          onSave?.({
            items: getItemsForSave(),
            collectionIds: selectedCollectionIds,
            relationStrategy: "relink"
          });
        }}
        onClose={() => {
          if (!isSaving) {
            setIsLinkOrderOverwriteConfirmOpen(false);
          }
        }}
      />
    </>
  );
}
