import { useReducer, useState } from "react";

const readResponsePayload = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const initialDragState = {
  status: "idle",
  draggedTag: null,
  targetTagTypeId: null,
  error: ""
};

const dragMachine = (state, action) => {
  switch (action.type) {
    case "DRAG_START":
      return { status: "dragging", draggedTag: action.payload, targetTagTypeId: null, error: "" };
    case "DRAG_TARGET_SET":
      if (state.status !== "dragging") {
        return state;
      }
      return { ...state, targetTagTypeId: action.payload };
    case "DROP_START":
      return { ...state, status: "dropping", error: "" };
    case "DROP_SUCCESS":
      return initialDragState;
    case "DRAG_CANCEL":
      return initialDragState;
    case "DROP_ERROR":
      return { ...state, status: "error", error: action.payload || "Failed to move tag." };
    default:
      return state;
  }
};

export function useTagItemsManager({ setTagTypesError }) {
  const [tagsByTagTypeId, setTagsByTagTypeId] = useState({});
  const [newTagDraftByTagTypeId, setNewTagDraftByTagTypeId] = useState({});
  const [editingTagByTagTypeId, setEditingTagByTagTypeId] = useState({});
  const [editingTagDraftById, setEditingTagDraftById] = useState({});
  const [savingTagByTagTypeId, setSavingTagByTagTypeId] = useState({});
  const [tagTableStateByTagTypeId, setTagTableStateByTagTypeId] = useState({});
  const [dragState, dispatchDrag] = useReducer(dragMachine, initialDragState);

  const ensureNewTagDraft = (tagTypeId) => {
    setNewTagDraftByTagTypeId((current) => (
      current[tagTypeId] ? current : { ...current, [tagTypeId]: { name: "", description: "" } }
    ));
  };

  const loadTagsForTagType = async (tagTypeId) => {
    setTagTableStateByTagTypeId((current) => ({ ...current, [tagTypeId]: { loading: true, error: "" } }));
    try {
      const response = await fetch(`/api/tag-types/${tagTypeId}/tags`);
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to fetch tags.");
      }

      setTagsByTagTypeId((current) => ({ ...current, [tagTypeId]: Array.isArray(result?.items) ? result.items : [] }));
      setTagTableStateByTagTypeId((current) => ({ ...current, [tagTypeId]: { loading: false, error: "" } }));
    } catch (error) {
      setTagsByTagTypeId((current) => ({ ...current, [tagTypeId]: [] }));
      setTagTableStateByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: { loading: false, error: error instanceof Error ? error.message : "Failed to fetch tags." }
      }));
    }
  };

  const handleCreateTag = async (tagTypeId) => {
    const draft = newTagDraftByTagTypeId[tagTypeId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) {
      setTagTypesError("Tag name is required.");
      return;
    }

    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tag-types/${tagTypeId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, description: String(draft.description || "").trim() })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create tag.");
      }

      setTagsByTagTypeId((current) => ({ ...current, [tagTypeId]: [result, ...(current[tagTypeId] ?? [])] }));
      setNewTagDraftByTagTypeId((current) => ({ ...current, [tagTypeId]: { name: "", description: "" } }));
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to create tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const handleSaveTag = async (tagTypeId, tagId) => {
    const draft = editingTagDraftById[tagId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    if (!normalizedName) {
      setTagTypesError("Tag name is required.");
      return;
    }

    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalizedName, description: String(draft.description || "").trim() })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update tag.");
      }

      setTagsByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: (current[tagTypeId] ?? []).map((item) => (item.id === tagId ? result : item))
      }));
      setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to update tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const handleDeleteTag = async (tagTypeId, tagId) => {
    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagTypesError("");

    try {
      const response = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete tag.");
      }

      setTagsByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: (current[tagTypeId] ?? []).filter((item) => item.id !== tagId)
      }));
      return true;
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to delete tag.");
      return false;
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const handleTagDragStart = (event, sourceTagTypeId, tagItem) => {
    event.dataTransfer.effectAllowed = "move";
    dispatchDrag({ type: "DRAG_START", payload: { id: tagItem.id, sourceTagTypeId } });
  };

  const handleTagDragEnter = (targetTagTypeId) => {
    dispatchDrag({ type: "DRAG_TARGET_SET", payload: targetTagTypeId });
  };

  const handleTagDragLeave = (targetTagTypeId) => {
    if (dragState.targetTagTypeId === targetTagTypeId) {
      dispatchDrag({ type: "DRAG_TARGET_SET", payload: null });
    }
  };

  const handleTagDrop = async (targetTagTypeId) => {
    const draggedTag = dragState.draggedTag;
    if (!draggedTag || draggedTag.sourceTagTypeId === targetTagTypeId || dragState.status === "dropping") {
      dispatchDrag({ type: "DRAG_CANCEL" });
      return;
    }

    dispatchDrag({ type: "DROP_START" });
    setTagTypesError("");

    try {
      const response = await fetch(`/api/tags/${draggedTag.id}/tag-type`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagTypeId: targetTagTypeId })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to move tag.");
      }

      await Promise.all([loadTagsForTagType(draggedTag.sourceTagTypeId), loadTagsForTagType(targetTagTypeId)]);
      dispatchDrag({ type: "DROP_SUCCESS" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to move tag.";
      setTagTypesError(message);
      dispatchDrag({ type: "DROP_ERROR", payload: message });
    }
  };

  const clearDragState = () => dispatchDrag({ type: "DRAG_CANCEL" });

  const removeTagTypeData = (tagTypeId) => {
    setTagsByTagTypeId((current) => {
      const next = { ...current };
      delete next[tagTypeId];
      return next;
    });
  };

  return {
    tagsByTagTypeId,
    newTagDraftByTagTypeId,
    setNewTagDraftByTagTypeId,
    editingTagByTagTypeId,
    setEditingTagByTagTypeId,
    editingTagDraftById,
    setEditingTagDraftById,
    savingTagByTagTypeId,
    tagTableStateByTagTypeId,
    dragState,
    ensureNewTagDraft,
    loadTagsForTagType,
    handleCreateTag,
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
