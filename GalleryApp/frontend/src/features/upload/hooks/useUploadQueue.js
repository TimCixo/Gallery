import { useCallback } from "react";
import { createEmptyMediaDraft } from "../../media/utils/bulkMediaEdit";
import { VIDEO_EXTENSIONS, getExtensionFromPath } from "../../../utils/mediaIdentity";
import { getFileKey } from "../utils/uploadHelpers";
import { getUploadQueueActiveIndex, reorderUploadQueueItems } from "../utils/uploadQueueOrdering";

export function useUploadQueue({
  queue,
  collections,
  setQueueState,
  setSettings,
  setUiState,
  setCollectionsState,
  setDragAndDrop,
  setIsUploadOpen,
  loadUploadCollections
}) {
  const appendFiles = useCallback((files) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) {
      return;
    }

    const uniqueMap = new Map(nextFiles.map((file) => [getFileKey(file), file]));
    const nextItems = Array.from(uniqueMap.values()).map((file) => ({
      key: getFileKey(file),
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: VIDEO_EXTENSIONS.has(getExtensionFromPath(file.name)) ? "video" : "image",
      draft: createEmptyMediaDraft()
    }));

    const existingKeys = new Set(queue.items.map((item) => item.key));
    const appendItems = [];
    nextItems.forEach((item) => {
      if (existingKeys.has(item.key)) {
        URL.revokeObjectURL(item.previewUrl);
        return;
      }

      existingKeys.add(item.key);
      appendItems.push(item);
    });

    setQueueState({
      items: [...queue.items, ...appendItems],
      step: "queue",
      activeUploadIndex: 0
    });
    setSettings({
      isGroupUploadEnabled: false,
      uploadCollectionIds: []
    });
    setUiState({ type: "", message: "" });
    setCollectionsState({ error: "", isPickerOpen: false });
    setIsUploadOpen(true);

    if (collections.entities.length === 0 && !collections.loading) {
      void loadUploadCollections();
    }
  }, [
    queue.items,
    setQueueState,
    setSettings,
    setUiState,
    setCollectionsState,
    setIsUploadOpen,
    collections.entities.length,
    collections.loading,
    loadUploadCollections
  ]);

  const handleUploadPickerChange = useCallback((event) => {
    appendFiles(event.target.files);
    event.target.value = "";
  }, [appendFiles]);

  const handleUploadQueueDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragAndDrop({ isQueueDragOver: false });
    appendFiles(event.dataTransfer.files);
  }, [setDragAndDrop, appendFiles]);

  const handleUploadQueuePaste = useCallback((event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const pastedFiles = clipboardItems
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((item) => item instanceof File);

    if (pastedFiles.length === 0) {
      return;
    }

    event.preventDefault();
    appendFiles(pastedFiles);
  }, [appendFiles]);

  const handleRemoveUploadItem = useCallback((itemKey) => {
    const removed = queue.items.find((item) => item.key === itemKey);
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    setQueueState({
      items: queue.items.filter((item) => item.key !== itemKey),
      activeUploadIndex: Math.max(0, Math.min(queue.activeUploadIndex, queue.items.length - 2))
    });
  }, [queue.items, queue.activeUploadIndex, setQueueState]);

  const reorderUploadItem = useCallback((draggedKey, targetKey) => {
    if (!draggedKey || !targetKey || draggedKey === targetKey) {
      return;
    }

    const activeItemKey = queue.items[queue.activeUploadIndex]?.key || "";
    const nextItems = reorderUploadQueueItems(queue.items, draggedKey, targetKey);
    if (nextItems === queue.items) {
      return;
    }

    setQueueState({
      items: nextItems,
      activeUploadIndex: getUploadQueueActiveIndex(nextItems, activeItemKey)
    });
  }, [queue.items, setQueueState]);

  const updateActiveUploadDraft = useCallback((patch) => {
    if (queue.items.length === 0) {
      return;
    }

    const nextItems = queue.items.map((item, index) => (
      index === queue.activeUploadIndex ? { ...item, draft: { ...item.draft, ...patch } } : item
    ));

    setQueueState({ items: nextItems });
  }, [queue.items, queue.activeUploadIndex, setQueueState]);

  return {
    appendFiles,
    handleUploadPickerChange,
    handleUploadQueueDrop,
    handleUploadQueuePaste,
    handleRemoveUploadItem,
    reorderUploadItem,
    updateActiveUploadDraft
  };
}
