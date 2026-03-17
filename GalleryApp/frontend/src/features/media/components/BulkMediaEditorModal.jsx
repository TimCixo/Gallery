import { useEffect, useMemo, useState } from "react";
import { collectionsApi } from "../../../api/collectionsApi";
import AppIcon from "../../shared/components/AppIcon";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";
import CollectionPickerDialogContent from "../../collections/components/CollectionPickerDialogContent";
import CollectionPickerModal from "../../collections/components/CollectionPickerModal";
import MediaEditorPanel from "./MediaEditorPanel";
import { createBulkEditorItems } from "../utils/bulkMediaEdit";

const EMPTY_RELATION_PREVIEW = Object.freeze({
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
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [collectionPickerItems, setCollectionPickerItems] = useState([]);
  const [collectionPickerError, setCollectionPickerError] = useState("");
  const [isCollectionPickerLoading, setIsCollectionPickerLoading] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEditorItems(createBulkEditorItems(selectedItems));
    setActiveIndex(0);
    setIsGroupEditEnabled(false);
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
  const modalTitle = activeItem?.name || activeItem?.title || activeItem?.relativePath || `${editorItems.length} selected media`;

  const previewNode = useMemo(() => {
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
  }, [activeItem]);

  const updateDraft = (patch) => {
    setEditorItems((current) => current.map((item, index) => (
      isGroupEditEnabled || index === activeIndex
        ? { ...item, draft: { ...item.draft, ...patch } }
        : item
    )));
  };

  const toggleTag = (tagId) => {
    setEditorItems((current) => current.map((item, index) => {
      if (!isGroupEditEnabled && index !== activeIndex) {
        return item;
      }

      const currentIds = Array.isArray(item.draft?.tagIds) ? item.draft.tagIds : [];
      const hasTag = currentIds.includes(tagId);
      return {
        ...item,
        draft: {
          ...item.draft,
          tagIds: hasTag ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId]
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

  if (!isOpen || !activeItem) {
    return null;
  }

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
                disabled={!canNavigatePrev || isSaving}
                aria-label="Previous selected media"
                title="Previous selected media"
              >
                <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="media-action-btn app-button-icon-only"
                onClick={() => setActiveIndex((current) => Math.min(current + 1, editorItems.length - 1))}
                disabled={!canNavigateNext || isSaving}
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
            draft={activeDraft}
            onDraftChange={updateDraft}
            isSavingMedia={isSaving}
            isDeletingMedia={false}
            tagCatalog={tagCatalog}
            tagTypes={tagTypes}
            isTagCatalogLoading={isTagCatalogLoading}
            selectedTagIds={Array.isArray(activeDraft?.tagIds) ? activeDraft.tagIds : []}
            onToggleTag={toggleTag}
            onRefreshTagCatalog={onRefreshTagCatalog}
            relationPreviewByMode={EMPTY_RELATION_PREVIEW}
            mediaRelationPickerMode="parent"
            mediaRelationPickerQuery=""
            mediaRelationPickerItems={[]}
            mediaRelationPickerPage={1}
            mediaRelationPickerTotalPages={0}
            mediaRelationPickerTotalCount={0}
            isMediaRelationPickerLoading={false}
            mediaRelationPickerError=""
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
            previewTitle={`Editing: ${modalTitle}`}
            primaryIconName="confirm"
            isPrimaryActionBusy={isSaving}
            onPrimaryAction={() => onSave?.({ items: editorItems, collectionIds: selectedCollectionIds })}
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
