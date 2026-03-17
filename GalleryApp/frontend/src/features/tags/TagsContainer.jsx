import { useEffect, useState } from "react";
import { tagsApi } from "../../api/tagsApi";
import TagDeleteConfirmModal from "./components/TagDeleteConfirmModal";
import TagsPage from "./TagsPage";

export default function TagsContainer() {
  const [tagTypeNameInput, setTagTypeNameInput] = useState("");
  const [tagTypeColorInput, setTagTypeColorInput] = useState("#2563EB");
  const [tagTypes, setTagTypes] = useState([]);
  const [isTagTypesLoading, setIsTagTypesLoading] = useState(true);
  const [isTagTypeSaving, setIsTagTypeSaving] = useState(false);
  const [editingTagTypeId, setEditingTagTypeId] = useState(null);
  const [editingTagTypeName, setEditingTagTypeName] = useState("");
  const [editingTagTypeColor, setEditingTagTypeColor] = useState("#2563EB");
  const [isTagTypeUpdating, setIsTagTypeUpdating] = useState(false);
  const [tagsByTagTypeId, setTagsByTagTypeId] = useState({});
  const [tagSearchQueryByTagTypeId, setTagSearchQueryByTagTypeId] = useState({});
  const [tagTableStateByTagTypeId] = useState({});
  const [newTagDraftByTagTypeId, setNewTagDraftByTagTypeId] = useState({});
  const [editingTagByTagTypeId, setEditingTagByTagTypeId] = useState({});
  const [editingTagDraftById, setEditingTagDraftById] = useState({});
  const [savingTagByTagTypeId, setSavingTagByTagTypeId] = useState({});
  const [tagTypesError, setTagTypesError] = useState("");
  const [draggedTag, setDraggedTag] = useState(null);
  const [dragTargetTagTypeId, setDragTargetTagTypeId] = useState(null);
  const [tagTypeCalloutOpenById, setTagTypeCalloutOpenById] = useState({});
  const [pendingTagDelete, setPendingTagDelete] = useState(null);
  const [isDeletingTagEntity, setIsDeletingTagEntity] = useState(false);

  const loadTagTypes = async () => {
    setIsTagTypesLoading(true);
    setTagTypesError("");
    try {
      const response = await tagsApi.listTagTypes();
      const items = Array.isArray(response?.items) ? response.items : [];
      setTagTypes(items);

      const tagsEntries = await Promise.all(items.map(async (item) => {
        const tagResponse = await tagsApi.listTagsByTagType(item.id);
        return [item.id, Array.isArray(tagResponse?.items) ? tagResponse.items : []];
      }));

      setTagsByTagTypeId(Object.fromEntries(tagsEntries));
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to load tag types.");
    } finally {
      setIsTagTypesLoading(false);
    }
  };

  useEffect(() => {
    void loadTagTypes();
  }, []);

  const handleCreateTagType = async (event) => {
    event.preventDefault();
    setIsTagTypeSaving(true);
    try {
      await tagsApi.createTagType({ name: tagTypeNameInput.trim(), color: tagTypeColorInput });
      setTagTypeNameInput("");
      await loadTagTypes();
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to create tag type.");
    } finally {
      setIsTagTypeSaving(false);
    }
  };

  const handleClearTagTypeForm = () => {
    setTagTypeNameInput("");
    setTagTypeColorInput("#2563EB");
  };

  const handleStartEditTagType = (item) => {
    setEditingTagTypeId(item.id);
    setEditingTagTypeName(String(item.name || ""));
    setEditingTagTypeColor(String(item.color || "#2563EB"));
  };

  const handleCancelEditTagType = () => {
    setEditingTagTypeId(null);
    setEditingTagTypeName("");
    setEditingTagTypeColor("#2563EB");
  };

  const handleSaveTagType = async (tagTypeId) => {
    setIsTagTypeUpdating(true);
    try {
      await tagsApi.updateTagType(tagTypeId, { name: editingTagTypeName.trim(), color: editingTagTypeColor });
      handleCancelEditTagType();
      await loadTagTypes();
    } finally {
      setIsTagTypeUpdating(false);
    }
  };

  const handleTagTypeCalloutToggle = (id, isOpen) => {
    setTagTypeCalloutOpenById((current) => ({ ...current, [id]: isOpen }));
  };

  const handleNewTagDraftChange = (tagTypeId, patch) => {
    setNewTagDraftByTagTypeId((current) => ({
      ...current,
      [tagTypeId]: { ...current[tagTypeId], ...patch }
    }));
  };

  const handleCreateTag = async (tagTypeId) => {
    const draft = newTagDraftByTagTypeId[tagTypeId] || {};
    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    try {
      await tagsApi.createTag(tagTypeId, { name: String(draft.name || "").trim(), description: String(draft.description || "") });
      setNewTagDraftByTagTypeId((current) => ({ ...current, [tagTypeId]: { name: "", description: "" } }));
      await loadTagTypes();
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const handleClearNewTagDraft = (tagTypeId) => {
    setNewTagDraftByTagTypeId((current) => ({ ...current, [tagTypeId]: { name: "", description: "" } }));
  };

  const handleStartEditTag = (tagTypeId, tag) => {
    setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: tag.id }));
    setEditingTagDraftById((current) => ({ ...current, [tag.id]: { name: tag.name || "", description: tag.description || "" } }));
  };

  const handleCancelEditTag = (tagTypeId) => {
    setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
  };

  const handleEditTagDraftChange = (tagId, patch) => {
    setEditingTagDraftById((current) => ({ ...current, [tagId]: { ...current[tagId], ...patch } }));
  };

  const handleSaveTag = async (tagTypeId, tagId) => {
    const draft = editingTagDraftById[tagId] || {};
    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    try {
      await tagsApi.updateTag(tagId, { name: String(draft.name || "").trim(), description: String(draft.description || "") });
      setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
      await loadTagTypes();
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };

  const openTagDeleteConfirm = (payload) => {
    setPendingTagDelete(payload);
  };

  const closeTagDeleteConfirm = () => {
    if (isDeletingTagEntity) {
      return;
    }

    setPendingTagDelete(null);
  };

  const handleConfirmTagDelete = async () => {
    if (!pendingTagDelete) {
      return;
    }

    setIsDeletingTagEntity(true);
    try {
      if (pendingTagDelete.kind === "tagType") {
        await tagsApi.deleteTagType(pendingTagDelete.id);
      } else {
        await tagsApi.deleteTag(pendingTagDelete.id);
      }
      setPendingTagDelete(null);
      await loadTagTypes();
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeletingTagEntity(false);
    }
  };

  const handleTagDragStart = (_event, sourceTagTypeId, tagItem) => {
    setDraggedTag({ id: tagItem.id, sourceTagTypeId });
  };
  const handleTagDragEnd = () => {
    setDraggedTag(null);
    setDragTargetTagTypeId(null);
  };
  const handleTagTypeDragOver = (event, targetTagTypeId) => {
    event.preventDefault();
    setDragTargetTagTypeId(targetTagTypeId);
  };
  const handleTagTypeDragLeave = () => setDragTargetTagTypeId(null);
  const handleTagTypeDrop = async (event, targetTagTypeId) => {
    event.preventDefault();
    if (!draggedTag || draggedTag.sourceTagTypeId === targetTagTypeId) {
      setDragTargetTagTypeId(null);
      return;
    }

    await tagsApi.moveTagToType(draggedTag.id, targetTagTypeId);
    setDraggedTag(null);
    setDragTargetTagTypeId(null);
    await loadTagTypes();
  };

  return (
    <>
      <TagsPage
        handleCreateTagType={handleCreateTagType}
        tagTypeColorInput={tagTypeColorInput}
        setTagTypeColorInput={setTagTypeColorInput}
        tagTypeNameInput={tagTypeNameInput}
        setTagTypeNameInput={setTagTypeNameInput}
        isTagTypeSaving={isTagTypeSaving}
        handleClearTagTypeForm={handleClearTagTypeForm}
        tagTypesError={tagTypesError}
        isTagTypesLoading={isTagTypesLoading}
        tagTypes={tagTypes}
        editingTagTypeId={editingTagTypeId}
        dragTargetTagTypeId={dragTargetTagTypeId}
        tagTypeCalloutOpenById={tagTypeCalloutOpenById}
        handleTagTypeCalloutToggle={handleTagTypeCalloutToggle}
        handleTagTypeDragOver={handleTagTypeDragOver}
        handleTagTypeDragLeave={handleTagTypeDragLeave}
        handleTagTypeDrop={handleTagTypeDrop}
        draggedTag={draggedTag}
        handleTagDragStart={handleTagDragStart}
        handleTagDragEnd={handleTagDragEnd}
        editingTagTypeColor={editingTagTypeColor}
        setEditingTagTypeColor={setEditingTagTypeColor}
        editingTagTypeName={editingTagTypeName}
        setEditingTagTypeName={setEditingTagTypeName}
        isTagTypeUpdating={isTagTypeUpdating}
        handleSaveTagType={handleSaveTagType}
        handleCancelEditTagType={handleCancelEditTagType}
        handleStartEditTagType={handleStartEditTagType}
        openTagDeleteConfirm={openTagDeleteConfirm}
        tagSearchQueryByTagTypeId={tagSearchQueryByTagTypeId}
        setTagSearchQueryByTagTypeId={setTagSearchQueryByTagTypeId}
        newTagDraftByTagTypeId={newTagDraftByTagTypeId}
        handleNewTagDraftChange={handleNewTagDraftChange}
        handleCreateTag={handleCreateTag}
        savingTagByTagTypeId={savingTagByTagTypeId}
        handleClearNewTagDraft={handleClearNewTagDraft}
        editingTagByTagTypeId={editingTagByTagTypeId}
        editingTagDraftById={editingTagDraftById}
        handleEditTagDraftChange={handleEditTagDraftChange}
        handleSaveTag={handleSaveTag}
        handleCancelEditTag={handleCancelEditTag}
        handleStartEditTag={handleStartEditTag}
        tagsByTagTypeId={tagsByTagTypeId}
        tagTableStateByTagTypeId={tagTableStateByTagTypeId}
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
