import { useCallback, useReducer, useState } from "react";
import { tagsApi } from "../../../api/tagsApi";
import {
  createTagItemsState,
  moveTagItem,
  prependTagItem,
  removeTagItem,
  removeTagTypeEntry,
  replaceTagItem,
  shouldLoadTagItems
} from "../state/tagItemsState";

const initialDragState = { status: "idle", draggedTag: null, targetTagTypeId: null, error: "" };
function dragReducer(state, action) {
  switch (action.type) {
    case "DRAG_START": return { status: "dragging", draggedTag: action.payload, targetTagTypeId: null, error: "" };
    case "DRAG_TARGET_SET": return { ...state, targetTagTypeId: action.payload };
    case "DROP_START": return { ...state, status: "dropping", error: "" };
    case "DROP_SUCCESS": return initialDragState;
    case "DROP_ERROR": return { ...state, status: "error", error: action.payload || "Failed to move tag." };
    case "DRAG_CANCEL": return initialDragState;
    default: return state;
  }
}

export function useTagItemsManager({ setTagTypesError }) {
  const [tagsByTagTypeId, setTagsByTagTypeId] = useState({});
  const [newTagDraftByTagTypeId, setNewTagDraftByTagTypeId] = useState({});
  const [editingTagByTagTypeId, setEditingTagByTagTypeId] = useState({});
  const [editingTagDraftById, setEditingTagDraftById] = useState({});
  const [savingTagByTagTypeId, setSavingTagByTagTypeId] = useState({});
  const [tagItemsStateByTypeId, setTagItemsStateByTypeId] = useState({});
  const [dragState, dispatchDrag] = useReducer(dragReducer, initialDragState);

  const ensureNewTagDraft = useCallback(
    (tagTypeId) => setNewTagDraftByTagTypeId((current) => (
      current[tagTypeId] ? current : { ...current, [tagTypeId]: { name: "", description: "" } }
    )),
    []
  );

  const loadTagsForTagType = useCallback(async (tagTypeId, { force = false } = {}) => {
    let shouldFetch = true;
    setTagItemsStateByTypeId((current) => {
      const nextState = current[tagTypeId] || createTagItemsState();
      shouldFetch = force || shouldLoadTagItems(nextState);
      return shouldFetch
        ? { ...current, [tagTypeId]: createTagItemsState({ ...nextState, loading: true, error: "" }) }
        : current;
    });

    if (!shouldFetch) {
      return;
    }

    try {
      const result = await tagsApi.listTagsByTagType(tagTypeId);
      const items = Array.isArray(result?.items) ? result.items : [];
      setTagsByTagTypeId((current) => ({ ...current, [tagTypeId]: items }));
      setTagItemsStateByTypeId((current) => ({
        ...current,
        [tagTypeId]: createTagItemsState({ loading: false, error: "", hasLoaded: true })
      }));
    } catch (error) {
      setTagsByTagTypeId((current) => ({ ...current, [tagTypeId]: [] }));
      setTagItemsStateByTypeId((current) => ({
        ...current,
        [tagTypeId]: createTagItemsState({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch tags.",
          hasLoaded: true
        })
      }));
    }
  }, []);

  const handleNewTagDraftChange = useCallback((tagTypeId, patch) => {
    setNewTagDraftByTagTypeId((current) => ({
      ...current,
      [tagTypeId]: { ...(current[tagTypeId] || { name: "", description: "" }), ...patch }
    }));
  }, []);

  const handleCreateTag = async (tagTypeId) => {
    const draft = newTagDraftByTagTypeId[tagTypeId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) return setTagTypesError("Tag name is required.");
    setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: true })); setTagTypesError("");
    try {
      const result = await tagsApi.createTag(tagTypeId, { name: normalizedName, description: String(draft.description || "").trim() || null });
      setTagsByTagTypeId((current) => prependTagItem(current, tagTypeId, result));
      setNewTagDraftByTagTypeId((current) => ({ ...current, [tagTypeId]: { name: "", description: "" } }));
      setTagItemsStateByTypeId((current) => ({
        ...current,
        [tagTypeId]: createTagItemsState({ ...(current[tagTypeId] || {}), hasLoaded: true })
      }));
    } catch (error) { setTagTypesError(error instanceof Error ? error.message : "Failed to create tag."); }
    finally { setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: false })); }
  };

  const handleClearNewTagDraft = useCallback((tagTypeId) => {
    setNewTagDraftByTagTypeId((current) => ({ ...current, [tagTypeId]: { name: "", description: "" } }));
  }, []);

  const handleStartEditTag = useCallback((tagTypeId, tag) => {
    setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: tag.id }));
    setEditingTagDraftById((current) => ({
      ...current,
      [tag.id]: { name: tag.name || "", description: tag.description || "" }
    }));
  }, []);

  const handleCancelEditTag = useCallback((tagTypeId) => {
    setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
  }, []);

  const handleEditTagDraftChange = useCallback((tagId, patch) => {
    setEditingTagDraftById((current) => ({
      ...current,
      [tagId]: { ...(current[tagId] || { name: "", description: "" }), ...patch }
    }));
  }, []);

  const handleSaveTag = async (tagTypeId, tagId) => {
    const draft = editingTagDraftById[tagId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) return setTagTypesError("Tag name is required.");
    setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: true })); setTagTypesError("");
    try {
      const result = await tagsApi.updateTag(tagId, { name: normalizedName, description: String(draft.description || "").trim() || null });
      setTagsByTagTypeId((current) => replaceTagItem(current, tagTypeId, tagId, result));
      setEditingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: null }));
    } catch (error) { setTagTypesError(error instanceof Error ? error.message : "Failed to update tag."); }
    finally { setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: false })); }
  };

  const handleDeleteTag = async (tagTypeId, tagId) => {
    setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: true })); setTagTypesError("");
    try {
      await tagsApi.deleteTag(tagId);
      setTagsByTagTypeId((current) => removeTagItem(current, tagTypeId, tagId));
      return true;
    } catch (error) { setTagTypesError(error instanceof Error ? error.message : "Failed to delete tag."); return false; }
    finally { setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: false })); }
  };

  const handleTagDragStart = (event, sourceTagTypeId, tagItem) => { event.dataTransfer.effectAllowed = "move"; dispatchDrag({ type: "DRAG_START", payload: { id: tagItem.id, sourceTagTypeId } }); };
  const handleTagDragEnter = (targetTagTypeId) => dispatchDrag({ type: "DRAG_TARGET_SET", payload: targetTagTypeId });
  const handleTagDragLeave = (targetTagTypeId) => { if (dragState.targetTagTypeId === targetTagTypeId) dispatchDrag({ type: "DRAG_TARGET_SET", payload: null }); };

  const handleTagDrop = async (targetTagTypeId) => {
    const draggedTag = dragState.draggedTag;
    if (!draggedTag || draggedTag.sourceTagTypeId === targetTagTypeId || dragState.status === "dropping") return dispatchDrag({ type: "DRAG_CANCEL" });
    dispatchDrag({ type: "DROP_START" }); setTagTypesError("");
    try {
      const movedTag = await tagsApi.moveTagToType(draggedTag.id, targetTagTypeId);
      setTagsByTagTypeId((current) => moveTagItem(current, {
        sourceTagTypeId: draggedTag.sourceTagTypeId,
        targetTagTypeId,
        tagId: draggedTag.id,
        nextTagItem: movedTag
      }));
      setTagItemsStateByTypeId((current) => ({
        ...current,
        [draggedTag.sourceTagTypeId]: createTagItemsState({ ...(current[draggedTag.sourceTagTypeId] || {}), hasLoaded: true }),
        [targetTagTypeId]: createTagItemsState({ ...(current[targetTagTypeId] || {}), hasLoaded: true })
      }));
      dispatchDrag({ type: "DROP_SUCCESS" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move tag.";
      setTagTypesError(message); dispatchDrag({ type: "DROP_ERROR", payload: message });
    }
  };

  const clearDragState = () => dispatchDrag({ type: "DRAG_CANCEL" });
  const removeTagTypeData = useCallback((tagTypeId) => {
    setTagsByTagTypeId((current) => removeTagTypeEntry(current, tagTypeId));
    setNewTagDraftByTagTypeId((current) => removeTagTypeEntry(current, tagTypeId));
    setEditingTagByTagTypeId((current) => removeTagTypeEntry(current, tagTypeId));
    setSavingTagByTagTypeId((current) => removeTagTypeEntry(current, tagTypeId));
    setTagItemsStateByTypeId((current) => removeTagTypeEntry(current, tagTypeId));
  }, []);

  return {
    tagsByTagTypeId,
    newTagDraftByTagTypeId,
    editingTagByTagTypeId,
    editingTagDraftById,
    savingTagByTagTypeId,
    tagItemsStateByTypeId,
    dragState,
    ensureNewTagDraft,
    loadTagsForTagType,
    handleNewTagDraftChange,
    handleCreateTag,
    handleClearNewTagDraft,
    handleStartEditTag,
    handleCancelEditTag,
    handleEditTagDraftChange,
    handleSaveTag,
    handleDeleteTag,
    handleTagDragStart,
    handleTagDragEnter,
    handleTagDragLeave,
    handleTagDrop,
    clearDragState,
    removeTagTypeData
  };
}
