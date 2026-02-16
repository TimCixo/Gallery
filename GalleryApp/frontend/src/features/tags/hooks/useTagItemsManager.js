import { useReducer, useState } from "react";
import { tagsApi } from "../../../services/tagsApi";

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
  const [tagTableStateByTagTypeId, setTagTableStateByTagTypeId] = useState({});
  const [dragState, dispatchDrag] = useReducer(dragReducer, initialDragState);

  const ensureNewTagDraft = (tagTypeId) => setNewTagDraftByTagTypeId((c) => (c[tagTypeId] ? c : { ...c, [tagTypeId]: { name: "", description: "" } }));

  const loadTagsForTagType = async (tagTypeId) => {
    setTagTableStateByTagTypeId((c) => ({ ...c, [tagTypeId]: { loading: true, error: "" } }));
    try {
      const result = await tagsApi.listTagsByTagType(tagTypeId);
      const items = Array.isArray(result?.items) ? result.items : [];
      setTagsByTagTypeId((c) => ({ ...c, [tagTypeId]: items }));
      setTagTableStateByTagTypeId((c) => ({ ...c, [tagTypeId]: { loading: false, error: "" } }));
    } catch (error) {
      setTagsByTagTypeId((c) => ({ ...c, [tagTypeId]: [] }));
      setTagTableStateByTagTypeId((c) => ({ ...c, [tagTypeId]: { loading: false, error: error instanceof Error ? error.message : "Failed to fetch tags." } }));
    }
  };

  const handleCreateTag = async (tagTypeId) => {
    const draft = newTagDraftByTagTypeId[tagTypeId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) return setTagTypesError("Tag name is required.");
    setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: true })); setTagTypesError("");
    try {
      const result = await tagsApi.createTag(tagTypeId, { name: normalizedName, description: String(draft.description || "").trim() || null });
      setTagsByTagTypeId((c) => ({ ...c, [tagTypeId]: [result, ...(c[tagTypeId] ?? [])] }));
      setNewTagDraftByTagTypeId((c) => ({ ...c, [tagTypeId]: { name: "", description: "" } }));
    } catch (error) { setTagTypesError(error instanceof Error ? error.message : "Failed to create tag."); }
    finally { setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: false })); }
  };

  const handleSaveTag = async (tagTypeId, tagId) => {
    const draft = editingTagDraftById[tagId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) return setTagTypesError("Tag name is required.");
    setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: true })); setTagTypesError("");
    try {
      const result = await tagsApi.updateTag(tagId, { name: normalizedName, description: String(draft.description || "").trim() || null });
      setTagsByTagTypeId((c) => ({ ...c, [tagTypeId]: (c[tagTypeId] ?? []).map((item) => (item.id === tagId ? result : item)) }));
      setEditingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: null }));
    } catch (error) { setTagTypesError(error instanceof Error ? error.message : "Failed to update tag."); }
    finally { setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: false })); }
  };

  const handleDeleteTag = async (tagTypeId, tagId) => {
    setSavingTagByTagTypeId((c) => ({ ...c, [tagTypeId]: true })); setTagTypesError("");
    try {
      await tagsApi.deleteTag(tagId);
      setTagsByTagTypeId((c) => ({ ...c, [tagTypeId]: (c[tagTypeId] ?? []).filter((item) => item.id !== tagId) }));
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
      await tagsApi.moveTagToType(draggedTag.id, targetTagTypeId);
      await Promise.all([loadTagsForTagType(draggedTag.sourceTagTypeId), loadTagsForTagType(targetTagTypeId)]);
      dispatchDrag({ type: "DROP_SUCCESS" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move tag.";
      setTagTypesError(message); dispatchDrag({ type: "DROP_ERROR", payload: message });
    }
  };

  const clearDragState = () => dispatchDrag({ type: "DRAG_CANCEL" });
  const removeTagTypeData = (tagTypeId) => setTagsByTagTypeId((c) => { const n = { ...c }; delete n[tagTypeId]; return n; });

  return { tagsByTagTypeId, newTagDraftByTagTypeId, setNewTagDraftByTagTypeId, editingTagByTagTypeId, setEditingTagByTagTypeId, editingTagDraftById, setEditingTagDraftById, savingTagByTagTypeId, tagTableStateByTagTypeId, dragState, ensureNewTagDraft, loadTagsForTagType, handleCreateTag, handleSaveTag, handleDeleteTag, handleTagDragStart, handleTagDragEnter, handleTagDragLeave, handleTagDrop, clearDragState, removeTagTypeData };
}
