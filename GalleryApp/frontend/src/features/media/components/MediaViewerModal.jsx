import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { tagsApi } from "../../../api/tagsApi";
import { formatFileSize, formatMediaDate } from "../../shared/utils/mediaFormatters";
import { isVideoFile, resolveOriginalMediaUrl, resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";
import { createPendingMediaDelete } from "../../shared/utils/deleteConfirm";
import TagDeleteConfirmModal from "../../tags/components/TagDeleteConfirmModal";
import AppIcon from "../../shared/components/AppIcon";
import MediaEditorPanel from "./MediaEditorPanel";
import MediaDeleteConfirmModal from "./MediaDeleteConfirmModal";
import MediaRelationPickerDialogContent from "./MediaRelationPickerDialogContent";
import MediaRelationPickerModal from "./MediaRelationPickerModal";
import { getNextMediaFitMode } from "../utils/mediaFitMode";

function renderSource(source) {
  if (!source) {
    return "-";
  }

  return (
    <a href={source} target="_blank" rel="noreferrer">
      {source}
    </a>
  );
}

const groupTagsByType = (tags) => {
  const map = new Map();
  (Array.isArray(tags) ? tags : []).forEach((tag) => {
    const typeName = String(tag?.tagTypeName || "Tags");
    if (!map.has(typeName)) {
      map.set(typeName, []);
    }
    map.get(typeName).push(tag);
  });
  return Array.from(map.entries());
};

const getTagTypeCellStyles = (colorValue) => {
  const color = /^#[0-9A-Fa-f]{6}$/.test(String(colorValue || "")) ? String(colorValue).toUpperCase() : "#64748B";
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const header = {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.2)`,
    borderColor: `rgba(${red}, ${green}, ${blue}, 0.38)`,
    color
  };
  const value = {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.1)`,
    borderColor: `rgba(${red}, ${green}, ${blue}, 0.2)`
  };

  return { header, value };
};

export default function MediaViewerModal({
  file,
  onClose,
  onPrev,
  onNext,
  canNavigate,
  getDisplayName,
  isFavorite,
  onToggleFavorite,
  isFavoriteUpdating,
  onOpenCollectionPicker,
  isCollectionPickerLoading,
  isAddingMediaToCollection,
  errorMessage,
  isEditing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  isSavingMedia,
  onDelete,
  isDeletingMedia,
  tagCatalog,
  tagTypes,
  isTagCatalogLoading,
  selectedTagIds,
  onToggleTag,
  onRefreshTagCatalog,
  relatedMediaItems,
  relationPreviewByMode,
  onOpenRelationPicker,
  onOpenRelatedMediaById,
  isMediaRelationPickerOpen,
  mediaRelationPickerMode,
  mediaRelationPickerQuery,
  onMediaRelationPickerQueryChange,
  mediaRelationPickerItems,
  mediaRelationPickerPage,
  mediaRelationPickerTotalPages,
  mediaRelationPickerTotalCount,
  isMediaRelationPickerLoading,
  mediaRelationPickerError,
  onMediaRelationPickerPrev,
  onMediaRelationPickerNext,
  onMediaRelationPickerPageChange,
  onCloseMediaRelationPicker,
  onSelectMediaRelationFromPicker
}) {
  if (!file) {
    return null;
  }

  const tagTypesSorted = Array.isArray(tagTypes) ? [...tagTypes] : [];
  const fallbackTypeEntries = groupTagsByType(tagCatalog).map(([name]) => ({ id: name, name, color: "#64748B" }));
  const normalizedTagTypes = tagTypesSorted.length > 0 ? tagTypesSorted : fallbackTypeEntries;
  const selectedTagIdsSet = new Set(Array.isArray(selectedTagIds) ? selectedTagIds : []);
  const selectedTagsByType = new Map();
  (Array.isArray(file.tags) ? file.tags : []).forEach((tag) => {
    const typeId = Number(tag?.tagTypeId);
    if (!Number.isInteger(typeId) || typeId <= 0) {
      return;
    }
    if (!selectedTagsByType.has(typeId)) {
      selectedTagsByType.set(typeId, []);
    }
    selectedTagsByType.get(typeId).push(tag);
  });
  const catalogTagsByType = new Map();
  (Array.isArray(tagCatalog) ? tagCatalog : []).forEach((tag) => {
    const typeId = Number(tag?.tagTypeId);
    if (!Number.isInteger(typeId) || typeId <= 0) {
      return;
    }
    if (!catalogTagsByType.has(typeId)) {
      catalogTagsByType.set(typeId, []);
    }
    catalogTagsByType.get(typeId).push(tag);
  });
  const [activeTagTypeDropdownId, setActiveTagTypeDropdownId] = useState(null);
  const [tagTypeQueryById, setTagTypeQueryById] = useState({});
  const [activeTagManagerTagTypeId, setActiveTagManagerTagTypeId] = useState(null);
  const [newTagDraftByTagTypeId, setNewTagDraftByTagTypeId] = useState({});
  const [editingTagByTagTypeId, setEditingTagByTagTypeId] = useState({});
  const [editingTagDraftById, setEditingTagDraftById] = useState({});
  const [savingTagByTagTypeId, setSavingTagByTagTypeId] = useState({});
  const [tagManagerError, setTagManagerError] = useState("");
  const [pendingTagDelete, setPendingTagDelete] = useState(null);
  const [pendingMediaDelete, setPendingMediaDelete] = useState(null);
  const [mediaFitMode, setMediaFitMode] = useState("resize");
  const [mediaAssetOverflow, setMediaAssetOverflow] = useState({ x: false, y: false });
  const [imageSourceAttempt, setImageSourceAttempt] = useState("primary");
  const mediaAssetFrameRef = useRef(null);
  const previewMediaUrl = resolvePreviewMediaUrl(file);
  const originalMediaUrl = resolveOriginalMediaUrl(file);
  const directViewMediaUrl = !isVideoFile(file) && file?.relativePath
    ? `/api/media/view?path=${encodeURIComponent(file.relativePath)}`
    : "";
  const primaryImageMediaUrl = directViewMediaUrl || originalMediaUrl;
  const imageMediaUrl = imageSourceAttempt === "primary"
    ? primaryImageMediaUrl
    : imageSourceAttempt === "original"
      ? originalMediaUrl
      : previewMediaUrl;
  const visibleRelatedMediaItems = Array.isArray(relatedMediaItems) && relatedMediaItems.length > 0
    ? relatedMediaItems
    : [{ ...file, relationSide: "current", isCurrent: true }];

  const getDraftTagNamesByType = (tagTypeId) => {
    const typeTags = catalogTagsByType.get(tagTypeId) || [];
    const selected = typeTags
      .filter((tag) => selectedTagIdsSet.has(Number(tag.id)))
      .map((tag) => String(tag.name || "").trim())
      .filter(Boolean);
    return Array.from(new Set(selected));
  };

  const getTagTypeSuggestionNames = (tagTypeId, selectedNames, query) => {
    const selected = new Set(selectedNames.map((name) => name.toLowerCase()));
    const normalizedQuery = String(query || "").trim().toLowerCase();
    const allNames = Array.from(new Set((catalogTagsByType.get(tagTypeId) || [])
      .map((tag) => String(tag?.name || "").trim())
      .filter(Boolean)));

    return allNames
      .filter((name) => !selected.has(name.toLowerCase()))
      .filter((name) => (normalizedQuery ? name.toLowerCase().includes(normalizedQuery) : true))
      .slice(0, 40);
  };

  const addTagToSelectionByName = (tagTypeId, tagName) => {
    const normalized = String(tagName || "").trim().toLowerCase();
    if (!normalized) {
      return;
    }
    const tag = (catalogTagsByType.get(tagTypeId) || []).find((item) => String(item?.name || "").trim().toLowerCase() === normalized);
    const tagId = Number(tag?.id);
    if (Number.isInteger(tagId) && tagId > 0 && !selectedTagIdsSet.has(tagId)) {
      onToggleTag?.(tagId);
    }
  };

  const removeTagFromSelectionByName = (tagTypeId, tagName) => {
    const normalized = String(tagName || "").trim().toLowerCase();
    const tag = (catalogTagsByType.get(tagTypeId) || []).find((item) => String(item?.name || "").trim().toLowerCase() === normalized);
    const tagId = Number(tag?.id);
    if (Number.isInteger(tagId) && tagId > 0 && selectedTagIdsSet.has(tagId)) {
      onToggleTag?.(tagId);
    }
  };

  const tagManagerTags = useMemo(() => {
    if (activeTagManagerTagTypeId === null) {
      return [];
    }
    return catalogTagsByType.get(activeTagManagerTagTypeId) || [];
  }, [activeTagManagerTagTypeId, tagCatalog]);

  const handleCreateTag = async (tagTypeId) => {
    const draft = newTagDraftByTagTypeId[tagTypeId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    const normalizedDescription = String(draft.description || "").trim();
    if (!normalizedName) {
      setTagManagerError("Tag name is required.");
      return;
    }

    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagManagerError("");
    try {
      await tagsApi.createTag(tagTypeId, { name: normalizedName, description: normalizedDescription || null });
      await onRefreshTagCatalog?.();
      setNewTagDraftByTagTypeId((current) => ({ ...current, [tagTypeId]: { name: "", description: "" } }));
      addTagToSelectionByName(tagTypeId, normalizedName);
    } catch (error) {
      setTagManagerError(error instanceof Error ? error.message : "Failed to create tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const handleSaveTag = async (tagTypeId, tagId) => {
    const draft = editingTagDraftById[tagId] || {};
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) {
      setTagManagerError("Tag name is required.");
      return;
    }

    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagManagerError("");
    try {
      await tagsApi.updateTag(tagId, { name: normalizedName, description: String(draft.description || "") });
      await onRefreshTagCatalog?.();
      setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
    } catch (error) {
      setTagManagerError(error instanceof Error ? error.message : "Failed to update tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const handleDeleteTagRequest = (tagTypeId, tagId) => {
    const tag = (catalogTagsByType.get(tagTypeId) || []).find((item) => item.id === tagId);
    setPendingTagDelete({
      kind: "tag",
      id: tagId,
      tagTypeId,
      name: String(tag?.name || "")
    });
  };

  const closeTagDeleteConfirm = () => {
    if (pendingTagDelete && savingTagByTagTypeId[pendingTagDelete.tagTypeId]) {
      return;
    }

    setPendingTagDelete(null);
  };

  const handleDeleteTag = async () => {
    if (!pendingTagDelete) {
      return;
    }

    const { tagTypeId, id: tagId } = pendingTagDelete;
    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagManagerError("");
    try {
      await tagsApi.deleteTag(tagId);
      if (selectedTagIdsSet.has(tagId)) {
        onToggleTag?.(tagId);
      }
      await onRefreshTagCatalog?.();
      setPendingTagDelete(null);
    } catch (error) {
      setTagManagerError(error instanceof Error ? error.message : "Failed to delete tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const activeRelatedMediaRef = useRef(null);
  const relatedMediaStripRef = useRef(null);

  const syncMediaAssetOverflow = () => {
    const frame = mediaAssetFrameRef.current;
    if (!frame) {
      return;
    }

    setMediaAssetOverflow({
      x: frame.scrollWidth > frame.clientWidth,
      y: frame.scrollHeight > frame.clientHeight,
    });
  };

  const centerMediaAssetFrame = () => {
    const frame = mediaAssetFrameRef.current;
    if (!frame) {
      return;
    }

    const maxScrollLeft = Math.max(0, frame.scrollWidth - frame.clientWidth);
    const maxScrollTop = Math.max(0, frame.scrollHeight - frame.clientHeight);

    if (mediaFitMode === "height") {
      frame.scrollLeft = maxScrollLeft / 2;
      frame.scrollTop = 0;
      return;
    }

    if (mediaFitMode === "width") {
      frame.scrollLeft = 0;
      frame.scrollTop = maxScrollTop / 2;
      return;
    }

    frame.scrollLeft = 0;
    frame.scrollTop = 0;
  };

  const renderLinkedMediaId = (value, label) => {
    if (value == null) {
      return "-";
    }

    const normalizedId = Number(value);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return String(value);
    }

    return (
      <button
        type="button"
        className="media-id-link"
        onClick={() => onOpenRelatedMediaById?.(normalizedId, label)}
      >
        {normalizedId}
      </button>
    );
  };

  useLayoutEffect(() => {
    const stripElement = relatedMediaStripRef.current;
    const activeElement = activeRelatedMediaRef.current;
    if (!stripElement || !activeElement) {
      return undefined;
    }

    const centerActiveRelatedMedia = () => {
      const stripRect = stripElement.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();
      const targetLeft =
        stripElement.scrollLeft +
        (activeRect.left - stripRect.left) -
        ((stripRect.width - activeRect.width) / 2);
      const maxScrollLeft = Math.max(0, stripElement.scrollWidth - stripElement.clientWidth);

      stripElement.scrollTo({
        left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
        behavior: "auto",
      });
    };

    let innerFrameId = 0;
    const frameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        centerActiveRelatedMedia();
      });
    });

    window.addEventListener("resize", centerActiveRelatedMedia);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(innerFrameId);
      window.removeEventListener("resize", centerActiveRelatedMedia);
    };
  }, [file?.id, visibleRelatedMediaItems]);

  useLayoutEffect(() => {
    let innerFrameId = 0;
    const frameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        syncMediaAssetOverflow();
        centerMediaAssetFrame();
      });
    });

    window.addEventListener("resize", syncMediaAssetOverflow);
    window.addEventListener("resize", centerMediaAssetFrame);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(innerFrameId);
      window.removeEventListener("resize", syncMediaAssetOverflow);
      window.removeEventListener("resize", centerMediaAssetFrame);
    };
  }, [file?.id, mediaFitMode]);

  useEffect(() => {
    setImageSourceAttempt("primary");
  }, [file?.id, primaryImageMediaUrl]);

  if (isEditing) {
    return (
      <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="media-modal media-modal-editing" onClick={(event) => event.stopPropagation()}>
          <MediaEditorPanel
            mode="media"
            file={file}
            onClose={onClose}
            showFavoriteButton
            showCloseButton
            allowOpenRelatedMedia
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            isFavoriteUpdating={isFavoriteUpdating}
            onOpenCollectionPicker={onOpenCollectionPicker}
            isCollectionPickerLoading={isCollectionPickerLoading}
            isAddingMediaToCollection={isAddingMediaToCollection}
            errorMessage={errorMessage}
            draft={draft}
            onDraftChange={onDraftChange}
            isSavingMedia={isSavingMedia}
            isDeletingMedia={isDeletingMedia}
            tagCatalog={tagCatalog}
            tagTypes={tagTypes}
            isTagCatalogLoading={isTagCatalogLoading}
            selectedTagIds={selectedTagIds}
            onToggleTag={onToggleTag}
            onRefreshTagCatalog={onRefreshTagCatalog}
            relationPreviewByMode={relationPreviewByMode}
            onOpenRelationPicker={onOpenRelationPicker}
            onOpenRelatedMediaById={onOpenRelatedMediaById}
            isMediaRelationPickerOpen={isMediaRelationPickerOpen}
            mediaRelationPickerMode={mediaRelationPickerMode}
            mediaRelationPickerQuery={mediaRelationPickerQuery}
            onMediaRelationPickerQueryChange={onMediaRelationPickerQueryChange}
            mediaRelationPickerItems={mediaRelationPickerItems}
            mediaRelationPickerPage={mediaRelationPickerPage}
            mediaRelationPickerTotalPages={mediaRelationPickerTotalPages}
            mediaRelationPickerTotalCount={mediaRelationPickerTotalCount}
            isMediaRelationPickerLoading={isMediaRelationPickerLoading}
            mediaRelationPickerError={mediaRelationPickerError}
            onMediaRelationPickerPrev={onMediaRelationPickerPrev}
            onMediaRelationPickerNext={onMediaRelationPickerNext}
            onMediaRelationPickerPageChange={onMediaRelationPickerPageChange}
            onCloseMediaRelationPicker={onCloseMediaRelationPicker}
            onSelectMediaRelationFromPicker={onSelectMediaRelationFromPicker}
            primaryActionLabel="Save"
            primaryActionBusyLabel="Saving..."
            isPrimaryActionBusy={isSavingMedia}
            onPrimaryAction={onSaveEdit}
            secondaryActionLabel="Cancel"
            onSecondaryAction={onCancelEdit}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        {visibleRelatedMediaItems.length > 0 ? (
          <div ref={relatedMediaStripRef} className="media-related-strip">
            {visibleRelatedMediaItems.map((item) => {
              const relatedId = Number(item?.id);
              const previewUrl = resolvePreviewMediaUrl(item);
              const isCurrent = Boolean(item?.isCurrent);
              const title = item.title || item.relativePath || (Number.isSafeInteger(relatedId) ? `#${relatedId}` : "Related media");

              return (
                <button
                  key={relatedId || item.relativePath || "unknown"}
                  ref={isCurrent ? activeRelatedMediaRef : null}
                  type="button"
                  className={`media-related-card${isCurrent ? " is-current" : ""}`}
                  onClick={() => {
                    if (!isCurrent && Number.isSafeInteger(relatedId) && relatedId > 0) {
                      onOpenRelatedMediaById?.(relatedId, item.relationSide || "related");
                    }
                  }}
                  title={title}
                  aria-label={isCurrent ? "Current media" : `Open related media ${relatedId}`}
                >
                  <span className="media-related-card-thumb-wrap" aria-hidden="true">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="media-related-card-thumb"
                        loading="lazy"
                      />
                    ) : (
                      <span className="media-linked-editor-placeholder">
                        <AppIcon name="create" alt="" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        <div className={`media-modal${isEditing ? " media-modal-editing" : ""}`} onClick={(event) => event.stopPropagation()}>
        {!isEditing ? (
          <div className="media-modal-content">
            <button
              type="button"
              className="media-fit-btn"
              onClick={() => setMediaFitMode((currentMode) => getNextMediaFitMode(currentMode))}
              aria-label={`Switch media scale mode. Current mode: ${mediaFitMode}`}
              title={`Scale mode: ${mediaFitMode}`}
            >
              <AppIcon name={mediaFitMode} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="media-nav-btn media-nav-btn-prev"
              onClick={onPrev}
              disabled={!canNavigate}
              aria-label="Previous media"
              title="Previous media"
            >
              <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
            </button>
            <div
              ref={mediaAssetFrameRef}
              className={`media-modal-asset-frame media-modal-asset-frame-${mediaFitMode}${mediaAssetOverflow.x ? " is-overflow-x" : ""}${mediaAssetOverflow.y ? " is-overflow-y" : ""}`}
            >
              {isVideoFile(file) ? (
                <video
                  src={originalMediaUrl}
                  poster={previewMediaUrl}
                  className={`media-modal-asset media-modal-fit-${mediaFitMode}`}
                  onLoadedMetadata={() => {
                    syncMediaAssetOverflow();
                    centerMediaAssetFrame();
                  }}
                  controls
                  autoPlay
                  preload="metadata"
                />
              ) : (
                <img
                  src={imageMediaUrl}
                  alt={getDisplayName(file.name)}
                  className={`media-modal-asset media-modal-fit-${mediaFitMode}`}
                  onLoad={() => {
                    syncMediaAssetOverflow();
                    centerMediaAssetFrame();
                  }}
                  onError={() => {
                    if (imageSourceAttempt === "primary" && originalMediaUrl && primaryImageMediaUrl !== originalMediaUrl) {
                      setImageSourceAttempt("original");
                      return;
                    }

                    if (imageSourceAttempt !== "preview" && previewMediaUrl && previewMediaUrl !== imageMediaUrl) {
                      setImageSourceAttempt("preview");
                    }
                  }}
                />
              )}
            </div>
            <button
              type="button"
              className="media-nav-btn media-nav-btn-next"
              onClick={onNext}
              disabled={!canNavigate}
              aria-label="Next media"
              title="Next media"
            >
              <AppIcon name="arrowRight" alt="" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className="media-modal-meta">
          <div className="media-favorite-row">
            <button
              type="button"
              className="media-icon-btn media-icon-btn-collections"
              onClick={onOpenCollectionPicker}
              disabled={isCollectionPickerLoading || isAddingMediaToCollection || !file.id}
              aria-label="Add to collection"
              title="Add to collection"
            >
              <AppIcon name="collection" alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`media-favorite-btn${isFavorite ? " is-active" : ""}`}
              onClick={onToggleFavorite}
              disabled={isFavoriteUpdating || !file.id}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
            >
              <AppIcon name={isFavorite ? "favoriteEnabled" : "favoriteDisabled"} alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="media-icon-btn media-icon-btn-close"
              onClick={onClose}
              aria-label="Close media modal"
              title="Close media modal"
            >
              <AppIcon name="close" alt="" aria-hidden="true" />
            </button>
          </div>

          {errorMessage ? <p className="media-action-error">{errorMessage}</p> : null}

          <div className={`media-meta-primary${isEditing ? " is-editing" : ""}`}>
            <table className="media-meta-table">
              <tbody>
              <tr>
                <th scope="row">Source</th>
                <td>
                  {isEditing ? (
                    <input
                      type="url"
                      className="media-edit-input"
                      value={draft?.source ?? ""}
                      onChange={(event) => onDraftChange?.({ source: event.target.value })}
                      placeholder="https://example.com"
                    />
                  ) : renderSource(file.source)}
                </td>
              </tr>
              <tr>
                <th scope="row">Title</th>
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      className="media-edit-input"
                      value={draft?.title ?? ""}
                      onChange={(event) => onDraftChange?.({ title: event.target.value })}
                    />
                  ) : (file.title || "-")}
                </td>
              </tr>
              <tr>
                <th scope="row">Description</th>
                <td>
                  {isEditing ? (
                    <textarea
                      className="media-edit-input media-edit-textarea"
                      value={draft?.description ?? ""}
                      onChange={(event) => onDraftChange?.({ description: event.target.value })}
                    />
                  ) : (file.description || "-")}
                </td>
              </tr>
                {normalizedTagTypes.map((tagType, index) => {
                const typeId = Number(tagType?.id);
                const typeName = String(tagType?.name || `Tag type ${index + 1}`);
                const rowStyles = getTagTypeCellStyles(tagType?.color);
                const typeSelectedTags = Number.isInteger(typeId) ? (selectedTagsByType.get(typeId) || []) : [];
                const typeCatalogTags = Number.isInteger(typeId) ? (catalogTagsByType.get(typeId) || []) : [];
                if (!isEditing && typeSelectedTags.length === 0) {
                  return null;
                }

                return (
                  <tr key={`tag-type-row-${tagType.id ?? typeName}`}>
                    <th scope="row" style={rowStyles.header}>
                      <span className="media-tagtype-label">
                        <span className="media-tagtype-heading">
                          <span>{typeName}</span>
                          {isEditing ? (
                            <button
                              type="button"
                              className="media-tagtype-manage-btn"
                              aria-label={`Manage tags for ${typeName}`}
                              title={`Manage tags for ${typeName}`}
                              disabled={!Number.isInteger(typeId) || typeId <= 0}
                              onClick={() => {
                                setTagManagerError("");
                                if (Number.isInteger(typeId) && typeId > 0) {
                                  setActiveTagManagerTagTypeId(typeId);
                                }
                              }}
                            >
                              {"\u2026"}
                            </button>
                          ) : null}
                        </span>
                      </span>
                    </th>
                    <td style={rowStyles.value}>
                      {!isEditing ? (
                        typeSelectedTags.length > 0 ? (
                          <div className="media-tag-view-list">
                            {typeSelectedTags.map((tag) => (
                              <span key={`tag-${tag.id}`} className="media-tag-view-pill">
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        ) : "-"
                      ) : (
                        <>
                          {isTagCatalogLoading ? (
                            <span>Loading tags...</span>
                          ) : (
                            <div className="media-tagtype-edit-wrap">
                              <div
                                className="media-tagtype-field"
                                onMouseDown={(event) => {
                                  if (event.target instanceof HTMLElement && event.target.tagName === "BUTTON") {
                                    return;
                                  }
                                  const input = event.currentTarget.querySelector("input");
                                  if (input instanceof HTMLInputElement) {
                                    input.focus();
                                  }
                                }}
                              >
                                {getDraftTagNamesByType(typeId).map((name) => (
                                  <span key={`${typeId}-${name}`} className="media-tag-view-pill media-tag-edit-pill">
                                    <span>{name}</span>
                                    <button
                                      type="button"
                                      className="media-tag-pill-remove"
                                      aria-label={`Remove ${name}`}
                                      onClick={() => removeTagFromSelectionByName(typeId, name)}
                                    >
                                      x
                                    </button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  className="media-tagtype-input"
                                  value={String(tagTypeQueryById[typeId] || "")}
                                  onFocus={() => setActiveTagTypeDropdownId(typeId)}
                                  onBlur={() => {
                                    window.setTimeout(() => {
                                      setActiveTagTypeDropdownId((current) => (current === typeId ? null : current));
                                    }, 120);
                                  }}
                                  onChange={(event) => {
                                    setTagTypeQueryById((current) => ({ ...current, [typeId]: event.target.value }));
                                    setActiveTagTypeDropdownId(typeId);
                                  }}
                                  onKeyDown={(event) => {
                                    const inputValue = String(tagTypeQueryById[typeId] || "");
                                    const draftValue = getDraftTagNamesByType(typeId);
                                    const suggestions = getTagTypeSuggestionNames(typeId, draftValue, inputValue);
                                    if (event.key === "Escape") {
                                      setActiveTagTypeDropdownId(null);
                                      return;
                                    }
                                    if (event.key === "Backspace" && !inputValue && draftValue.length > 0) {
                                      event.preventDefault();
                                      removeTagFromSelectionByName(typeId, draftValue[draftValue.length - 1]);
                                      return;
                                    }
                                    if ((event.key === "Enter" || event.key === "Tab") && suggestions.length > 0) {
                                      event.preventDefault();
                                      addTagToSelectionByName(typeId, suggestions[0]);
                                      setTagTypeQueryById((current) => ({ ...current, [typeId]: "" }));
                                      setActiveTagTypeDropdownId(typeId);
                                    }
                                  }}
                                  placeholder="Add tag..."
                                />
                              </div>

                              {activeTagTypeDropdownId === typeId ? (
                                <ul className="media-tag-dropdown">
                                  {getTagTypeSuggestionNames(typeId, getDraftTagNamesByType(typeId), String(tagTypeQueryById[typeId] || "")).length > 0 ? (
                                    getTagTypeSuggestionNames(typeId, getDraftTagNamesByType(typeId), String(tagTypeQueryById[typeId] || "")).map((name) => (
                                      <li key={`${typeId}-suggestion-${name}`}>
                                        <button
                                          type="button"
                                          className="media-tag-dropdown-item"
                                          onMouseDown={(event) => event.preventDefault()}
                                          onClick={() => {
                                            addTagToSelectionByName(typeId, name);
                                            setTagTypeQueryById((current) => ({ ...current, [typeId]: "" }));
                                            setActiveTagTypeDropdownId(typeId);
                                          }}
                                        >
                                          <span>{name}</span>
                                        </button>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="media-tag-dropdown-empty">No matches</li>
                                  )}
                                </ul>
                              ) : null}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
            {isEditing ? (
              <div className="media-edit-thumbnail" aria-label="Current media thumbnail">
                {isVideoFile(file) ? (
                  <video
                    src={resolveOriginalMediaUrl(file)}
                    poster={resolvePreviewMediaUrl(file)}
                    preload="metadata"
                    playsInline
                    muted
                  />
                ) : (
                  <img
                    src={resolvePreviewMediaUrl(file)}
                    alt={getDisplayName(file.name)}
                    loading="lazy"
                  />
                )}
              </div>
            ) : null}
          </div>

          <div className="media-action-row media-action-row-spaced">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="media-action-btn media-action-primary app-button-icon-only"
                  onClick={onSaveEdit}
                  disabled={isSavingMedia || isDeletingMedia}
                  aria-label={isSavingMedia ? "Saving media" : "Save media"}
                  title={isSavingMedia ? "Saving media" : "Save media"}
                >
                  <AppIcon name="confirm" alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="media-action-btn app-button-icon-only"
                  onClick={onCancelEdit}
                  disabled={isSavingMedia || isDeletingMedia}
                  aria-label="Cancel edit"
                  title="Cancel edit"
                >
                  <AppIcon name="cancel" alt="" aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="media-action-btn media-action-primary app-button-icon-only"
                  onClick={onStartEdit}
                  disabled={isSavingMedia || isDeletingMedia}
                  aria-label="Edit media"
                  title="Edit media"
                >
                  <AppIcon name="edit" alt="" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="media-action-btn media-action-danger app-button-icon-only"
                  onClick={() => setPendingMediaDelete(createPendingMediaDelete(file))}
                  disabled={isSavingMedia || isDeletingMedia}
                  aria-label={isDeletingMedia ? "Deleting media" : "Delete media"}
                  title={isDeletingMedia ? "Deleting media" : "Delete media"}
                >
                  <AppIcon name="delete" alt="" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          <details className="media-system-callout">
            <summary className="media-system-summary">System details</summary>
            <table className="media-system-table">
              <tbody>
                <tr>
                  <th scope="row">Id</th>
                  <td>{file.id ?? "-"}</td>
                </tr>
                <tr>
                  <th scope="row">Path</th>
                  <td>{file.relativePath || "-"}</td>
                </tr>
                <tr>
                  <th scope="row">Created At</th>
                  <td>{formatMediaDate(file.createdAtUtc || file.modifiedAtUtc)}</td>
                </tr>
                <tr>
                  <th scope="row">Name</th>
                  <td>{file.name || "-"}</td>
                </tr>
                <tr>
                  <th scope="row">File Size</th>
                  <td>{formatFileSize(file.sizeBytes)}</td>
                </tr>
              </tbody>
            </table>
          </details>
        </div>
      </div>
      </div>

      <MediaRelationPickerModal isOpen={isMediaRelationPickerOpen} onClose={onCloseMediaRelationPicker} initialData={{ mode: mediaRelationPickerMode }}>
        <MediaRelationPickerDialogContent
          mode={mediaRelationPickerMode}
          query={mediaRelationPickerQuery}
          onQueryChange={onMediaRelationPickerQueryChange}
          items={mediaRelationPickerItems}
          page={mediaRelationPickerPage}
          totalPages={mediaRelationPickerTotalPages}
          totalCount={mediaRelationPickerTotalCount}
          isLoading={isMediaRelationPickerLoading}
          errorMessage={mediaRelationPickerError}
          tagCatalog={tagCatalog}
          tagTypes={tagTypes}
          onPrev={onMediaRelationPickerPrev}
          onNext={onMediaRelationPickerNext}
          onPageChange={onMediaRelationPickerPageChange}
          onClose={onCloseMediaRelationPicker}
          onSelect={onSelectMediaRelationFromPicker}
        />
      </MediaRelationPickerModal>

      {activeTagManagerTagTypeId !== null ? (
        <div
          className="media-confirm-overlay"
          onClick={() => {
            if (!savingTagByTagTypeId[activeTagManagerTagTypeId]) {
              setActiveTagManagerTagTypeId(null);
              setTagManagerError("");
            }
          }}
        >
          <div className="media-confirm-dialog tag-manager-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="tag-manager-header">
              <h3>Manage tags</h3>
              <button
                type="button"
                className="media-action-btn app-button-icon-only"
                onClick={() => setActiveTagManagerTagTypeId(null)}
                disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                aria-label="Close tag manager"
                title="Close tag manager"
              >
                <AppIcon name="close" alt="" aria-hidden="true" />
              </button>
            </div>
            <table className="tag-table">
              <tbody>
                <tr>
                  <td>
                    <input
                      type="text"
                      className="tag-table-input"
                      value={newTagDraftByTagTypeId[activeTagManagerTagTypeId]?.name ?? ""}
                      onChange={(event) => setNewTagDraftByTagTypeId((current) => ({ ...current, [activeTagManagerTagTypeId]: { ...(current[activeTagManagerTagTypeId] || {}), name: event.target.value } }))}
                      placeholder="New tag name"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="tag-table-input"
                      value={newTagDraftByTagTypeId[activeTagManagerTagTypeId]?.description ?? ""}
                      onChange={(event) => setNewTagDraftByTagTypeId((current) => ({ ...current, [activeTagManagerTagTypeId]: { ...(current[activeTagManagerTagTypeId] || {}), description: event.target.value } }))}
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <div className="tag-table-actions">
                      <button
                        type="button"
                        className="tags-action-btn tags-action-create"
                        onClick={() => void handleCreateTag(activeTagManagerTagTypeId)}
                        disabled={!String(newTagDraftByTagTypeId[activeTagManagerTagTypeId]?.name || "").trim() || !!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                        title="Create tag"
                      >
                        <AppIcon name="create" alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="tags-action-btn tags-action-clear"
                        onClick={() => setNewTagDraftByTagTypeId((current) => ({ ...current, [activeTagManagerTagTypeId]: { name: "", description: "" } }))}
                        disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                        title="Clear new tag"
                      >
                        <AppIcon name="cancel" alt="" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
                {tagManagerTags.map((tagItem) => {
                  const isEditingTag = editingTagByTagTypeId[activeTagManagerTagTypeId] === tagItem.id;
                  const editingDraft = editingTagDraftById[tagItem.id] ?? { name: String(tagItem.name || ""), description: String(tagItem.description || "") };
                  return (
                    <tr key={tagItem.id}>
                      <td>
                        {isEditingTag ? (
                          <input
                            type="text"
                            className="tag-table-input"
                            value={editingDraft.name}
                            onChange={(event) => setEditingTagDraftById((current) => ({ ...current, [tagItem.id]: { ...editingDraft, name: event.target.value } }))}
                          />
                        ) : tagItem.name}
                      </td>
                      <td>
                        {isEditingTag ? (
                          <input
                            type="text"
                            className="tag-table-input"
                            value={editingDraft.description}
                            onChange={(event) => setEditingTagDraftById((current) => ({ ...current, [tagItem.id]: { ...editingDraft, description: event.target.value } }))}
                          />
                        ) : (tagItem.description || "-")}
                      </td>
                      <td>
                        <div className="tag-table-actions">
                          {isEditingTag ? (
                            <>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-create"
                                onClick={() => void handleSaveTag(activeTagManagerTagTypeId, tagItem.id)}
                                disabled={!String(editingDraft.name || "").trim() || !!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                                title="Save tag"
                              >
                                <AppIcon name="confirm" alt="" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-clear"
                                onClick={() => setEditingTagByTagTypeId((current) => ({ ...current, [activeTagManagerTagTypeId]: null }))}
                                disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                                title="Cancel edit"
                              >
                                <AppIcon name="cancel" alt="" aria-hidden="true" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="tags-action-btn tag-table-edit-btn"
                                onClick={() => {
                                  setEditingTagByTagTypeId((current) => ({ ...current, [activeTagManagerTagTypeId]: tagItem.id }));
                                  setEditingTagDraftById((current) => ({ ...current, [tagItem.id]: { name: String(tagItem.name || ""), description: String(tagItem.description || "") } }));
                                }}
                                title="Edit tag"
                              >
                                <AppIcon name="edit" alt="" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-delete"
                                onClick={() => handleDeleteTagRequest(activeTagManagerTagTypeId, tagItem.id)}
                                disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                                title="Delete tag"
                              >
                                <AppIcon name="delete" alt="" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tagManagerError ? <p className="tag-table-state tag-table-state-error">{tagManagerError}</p> : null}
          </div>
        </div>
      ) : null}

      <TagDeleteConfirmModal
        pendingTagDelete={pendingTagDelete}
        isDeletingTagEntity={!!(pendingTagDelete && savingTagByTagTypeId[pendingTagDelete.tagTypeId])}
        onConfirm={() => void handleDeleteTag()}
        onClose={closeTagDeleteConfirm}
      />

      <MediaDeleteConfirmModal
        pendingMediaDelete={pendingMediaDelete}
        isDeletingMedia={isDeletingMedia}
        onConfirm={() => {
          void onDelete?.();
          setPendingMediaDelete(null);
        }}
        onClose={() => {
          if (!isDeletingMedia) {
            setPendingMediaDelete(null);
          }
        }}
      />
    </>
  );
}
