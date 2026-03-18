import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASE_SEARCH_TAG_DEFINITIONS, BASE_TAG_TYPE_ID } from "../search/searchTags";
import TagsPage from "./TagsPage";
import TagDeleteConfirmModal from "./components/TagDeleteConfirmModal";
import { useTagItemsManager } from "./hooks/useTagItemsManager";
import { useTagTypesManager } from "./hooks/useTagTypesManager";

export default function TagsContainer() {
  const dragCollapseTimeoutRef = useRef(null);
  const tagTypesState = useTagTypesManager();
  const tagItemsState = useTagItemsManager({ setTagTypesError: tagTypesState.setTagTypesError });
  const [activeTagTypeId, setActiveTagTypeId] = useState(null);
  const [searchQueryByTagTypeId, setSearchQueryByTagTypeId] = useState({});
  const [pendingTagDelete, setPendingTagDelete] = useState(null);
  const [isDeletingTagEntity, setIsDeletingTagEntity] = useState(false);

  useEffect(() => {
    if (activeTagTypeId === null) {
      return;
    }

    if (activeTagTypeId === BASE_TAG_TYPE_ID) {
      return;
    }

    if (!tagTypesState.tagTypes.some((item) => item.id === activeTagTypeId)) {
      setActiveTagTypeId(null);
    }
  }, [activeTagTypeId, tagTypesState.tagTypes]);

  useEffect(() => {
    if (activeTagTypeId === null) {
      return;
    }

    if (activeTagTypeId === BASE_TAG_TYPE_ID) {
      return;
    }

    tagItemsState.ensureNewTagDraft(activeTagTypeId);
    void tagItemsState.loadTagsForTagType(activeTagTypeId);
  }, [activeTagTypeId, tagItemsState.ensureNewTagDraft, tagItemsState.loadTagsForTagType]);

  const tagTypeForm = useMemo(() => ({
    name: tagTypesState.tagTypeNameInput,
    color: tagTypesState.tagTypeColorInput,
    isSaving: tagTypesState.isTagTypeSaving
  }), [tagTypesState.isTagTypeSaving, tagTypesState.tagTypeColorInput, tagTypesState.tagTypeNameInput]);

  const tagEditState = useMemo(() => ({
    pageError: tagTypesState.tagTypesError,
    editingTagTypeId: tagTypesState.editingTagTypeId,
    editingTagTypeName: tagTypesState.editingTagTypeName,
    editingTagTypeColor: tagTypesState.editingTagTypeColor,
    isTagTypeUpdating: tagTypesState.isTagTypeUpdating,
    newTagDraftByTypeId: tagItemsState.newTagDraftByTagTypeId,
    editingTagByTypeId: tagItemsState.editingTagByTagTypeId,
    editingTagDraftById: tagItemsState.editingTagDraftById,
    savingTagByTypeId: tagItemsState.savingTagByTagTypeId,
    dragState: tagItemsState.dragState
  }), [
    tagItemsState.dragState,
    tagItemsState.editingTagByTagTypeId,
    tagItemsState.editingTagDraftById,
    tagItemsState.newTagDraftByTagTypeId,
    tagItemsState.savingTagByTagTypeId,
    tagTypesState.editingTagTypeColor,
    tagTypesState.editingTagTypeId,
    tagTypesState.editingTagTypeName,
    tagTypesState.isTagTypeUpdating,
    tagTypesState.tagTypesError
  ]);
  const baseTagType = useMemo(() => ({
    id: BASE_TAG_TYPE_ID,
    name: "base",
    color: "#64748B",
    tags: BASE_SEARCH_TAG_DEFINITIONS.map((item, index) => ({
      id: `base-${index}`,
      name: item.name,
      description: item.syntax
    }))
  }), []);

  const openTagDeleteConfirm = (payload) => {
    setPendingTagDelete(payload);
  };

  const closeTagDeleteConfirm = () => {
    if (!isDeletingTagEntity) {
      setPendingTagDelete(null);
    }
  };

  const clearPendingDragCollapse = useCallback(() => {
    if (dragCollapseTimeoutRef.current !== null) {
      window.clearTimeout(dragCollapseTimeoutRef.current);
      dragCollapseTimeoutRef.current = null;
    }
  }, []);

  const handleTagDragStart = useCallback((event, sourceTagTypeId, tagItem) => {
    clearPendingDragCollapse();
    tagItemsState.handleTagDragStart(event, sourceTagTypeId, tagItem);
    dragCollapseTimeoutRef.current = window.setTimeout(() => {
      setActiveTagTypeId(null);
      dragCollapseTimeoutRef.current = null;
    }, 90);
  }, [clearPendingDragCollapse, tagItemsState]);

  const handleTagDrop = useCallback(async (targetTagTypeId) => {
    clearPendingDragCollapse();
    await tagItemsState.handleTagDrop(targetTagTypeId);
  }, [clearPendingDragCollapse, tagItemsState]);

  const handleTagDragEnd = useCallback(() => {
    clearPendingDragCollapse();
    tagItemsState.clearDragState();
  }, [clearPendingDragCollapse, tagItemsState]);

  useEffect(() => () => {
    clearPendingDragCollapse();
  }, [clearPendingDragCollapse]);

  const handleConfirmTagDelete = async () => {
    if (!pendingTagDelete) {
      return;
    }

    setIsDeletingTagEntity(true);
    try {
      if (pendingTagDelete.kind === "tagType") {
        const deleted = await tagTypesState.handleDeleteTagType(pendingTagDelete.id);
        if (deleted) {
          tagItemsState.removeTagTypeData(pendingTagDelete.id);
          setSearchQueryByTagTypeId((current) => {
            const next = { ...current };
            delete next[pendingTagDelete.id];
            return next;
          });
          if (activeTagTypeId === pendingTagDelete.id) {
            setActiveTagTypeId(null);
          }
          setPendingTagDelete(null);
        }
      } else {
        const deleted = await tagItemsState.handleDeleteTag(pendingTagDelete.tagTypeId, pendingTagDelete.id);
        if (deleted) {
          setPendingTagDelete(null);
        }
      }
    } catch (error) {
      tagTypesState.setTagTypesError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeletingTagEntity(false);
    }
  };

  return (
    <>
      <TagsPage
        baseTagType={baseTagType}
        tagTypeForm={tagTypeForm}
        tagEditState={tagEditState}
        isTagTypesLoading={tagTypesState.isTagTypesLoading}
        activeTagTypeId={activeTagTypeId}
        tagTypes={tagTypesState.tagTypes}
        tagItemsByTypeId={tagItemsState.tagsByTagTypeId}
        tagItemsStateByTypeId={tagItemsState.tagItemsStateByTypeId}
        searchQueryByTagTypeId={searchQueryByTagTypeId}
        onTagTypeNameChange={tagTypesState.setTagTypeNameInput}
        onTagTypeColorChange={tagTypesState.setTagTypeColorInput}
        onSubmitTagType={tagTypesState.handleCreateTagType}
        onClearTagTypeForm={tagTypesState.handleClearTagTypeForm}
        onToggleTagType={setActiveTagTypeId}
        onStartEditTagType={tagTypesState.handleStartEditTagType}
        onEditTagTypeNameChange={tagTypesState.setEditingTagTypeName}
        onEditTagTypeColorChange={tagTypesState.setEditingTagTypeColor}
        onSaveTagType={tagTypesState.handleSaveTagType}
        onCancelEditTagType={tagTypesState.handleCancelEditTagType}
        onOpenDeleteConfirm={openTagDeleteConfirm}
        onTagSearchChange={(tagTypeId, value) => setSearchQueryByTagTypeId((current) => ({ ...current, [tagTypeId]: value }))}
        onNewTagDraftChange={tagItemsState.handleNewTagDraftChange}
        onCreateTag={tagItemsState.handleCreateTag}
        onClearNewTagDraft={tagItemsState.handleClearNewTagDraft}
        onStartEditTag={tagItemsState.handleStartEditTag}
        onEditTagDraftChange={tagItemsState.handleEditTagDraftChange}
        onSaveTag={tagItemsState.handleSaveTag}
        onCancelEditTag={tagItemsState.handleCancelEditTag}
        onDeleteTag={(tagTypeId, tagId, name) => openTagDeleteConfirm({ kind: "tag", id: tagId, tagTypeId, name })}
        onTagDragStart={handleTagDragStart}
        onTagDragEnter={tagItemsState.handleTagDragEnter}
        onTagDragLeave={tagItemsState.handleTagDragLeave}
        onTagDrop={handleTagDrop}
        onTagDragEnd={handleTagDragEnd}
      />
      <TagDeleteConfirmModal
        pendingTagDelete={pendingTagDelete}
        isDeletingTagEntity={isDeletingTagEntity}
        onConfirm={() => void handleConfirmTagDelete()}
        onClose={closeTagDeleteConfirm}
      />
    </>
  );
}
