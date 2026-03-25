import { saveBulkMediaItems } from "./bulkMediaSave.js";
import { buildMediaUpdatePatch, buildMediaUpdatePayload } from "./mediaMutationHelpers.js";

export async function saveSelectedMediaDetails({
  selectedMedia,
  mediaDraft,
  isSavingMedia,
  isDeletingMedia,
  mediaApi,
  tagCatalog,
  toNullableId,
  setIsSavingMedia,
  setMediaModalError,
  setSelectedMedia,
  setItems,
  setIsEditingMedia,
  onSuccess
}) {
  if (!selectedMedia?.id || isSavingMedia || isDeletingMedia) {
    return false;
  }

  setIsSavingMedia(true);
  setMediaModalError("");
  try {
    const payload = buildMediaUpdatePayload(mediaDraft, toNullableId);
    await mediaApi.updateMedia(selectedMedia.id, payload);
    const patch = buildMediaUpdatePatch(payload, tagCatalog);
    setSelectedMedia((current) => (current ? { ...current, ...patch } : current));
    setItems((current) => current.map((item) => (
      item.id === selectedMedia.id ? { ...item, ...patch } : item
    )));
    setIsEditingMedia(false);
    onSuccess?.();
    return true;
  } catch (error) {
    setMediaModalError(error instanceof Error ? error.message : "Failed to update media.");
    return false;
  } finally {
    setIsSavingMedia(false);
  }
}

export async function saveBulkSelectedMedia({
  items,
  collectionIds,
  relationStrategy,
  isSavingMedia,
  isDeletingMedia,
  mediaApi,
  collectionsApi,
  tagCatalog,
  setIsSavingMedia,
  setMediaModalError,
  setItems,
  setSelectedMedia,
  setIsBulkEditing,
  clearSelection,
  onSuccess
}) {
  if (!Array.isArray(items) || items.length === 0 || isSavingMedia || isDeletingMedia) {
    return false;
  }

  setIsSavingMedia(true);
  setMediaModalError("");
  try {
    const updatedItemsById = await saveBulkMediaItems({
      items,
      relationStrategy,
      collectionIds,
      tagCatalog,
      updateMedia: mediaApi.updateMedia,
      addMediaToCollection: collectionsApi.addMediaToCollection
    });

    setItems((current) => current.map((item) => updatedItemsById.get(item.id) || item));
    setSelectedMedia((current) => (current ? (updatedItemsById.get(current.id) || current) : current));
    setIsBulkEditing(false);
    clearSelection();
    onSuccess?.();
    return true;
  } catch (error) {
    setMediaModalError(error instanceof Error ? error.message : "Failed to update media.");
    return false;
  } finally {
    setIsSavingMedia(false);
  }
}

export async function deleteBulkSelectedMedia({
  selectedMediaItems,
  selectedMediaIds,
  isDeletingMedia,
  isSavingMedia,
  mediaApi,
  setIsDeletingMedia,
  setMediaModalError,
  setItems,
  setSelectedMedia,
  setPendingBulkDelete,
  setIsBulkEditing,
  clearSelection,
  onSuccess
}) {
  if (!Array.isArray(selectedMediaItems) || selectedMediaItems.length === 0 || isDeletingMedia || isSavingMedia) {
    return false;
  }

  setIsDeletingMedia(true);
  setMediaModalError("");
  try {
    for (const item of selectedMediaItems) {
      await mediaApi.deleteMedia(item.id);
    }

    const selectedIds = new Set(selectedMediaIds);
    setItems((current) => current.filter((item) => !selectedIds.has(Number(item.id))));
    setSelectedMedia((current) => (current && selectedIds.has(Number(current.id)) ? null : current));
    setPendingBulkDelete(null);
    setIsBulkEditing(false);
    clearSelection();
    onSuccess?.();
    return true;
  } catch (error) {
    setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    return false;
  } finally {
    setIsDeletingMedia(false);
  }
}

export async function deleteSelectedMedia({
  selectedMedia,
  isDeletingMedia,
  isSavingMedia,
  mediaApi,
  setIsDeletingMedia,
  setMediaModalError,
  setItems,
  setSelectedMedia,
  onSuccess
}) {
  if (!selectedMedia?.id || isDeletingMedia || isSavingMedia) {
    return false;
  }

  setIsDeletingMedia(true);
  setMediaModalError("");
  try {
    await mediaApi.deleteMedia(selectedMedia.id);
    setItems((current) => current.filter((item) => item.id !== selectedMedia.id));
    setSelectedMedia(null);
    onSuccess?.();
    return true;
  } catch (error) {
    setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    return false;
  } finally {
    setIsDeletingMedia(false);
  }
}
