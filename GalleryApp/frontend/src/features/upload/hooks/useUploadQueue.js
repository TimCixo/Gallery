import { useCallback } from "react";
import { VIDEO_EXTENSIONS, getExtensionFromPath } from "../../../utils/mediaIdentity";
import { createMediaDraft, getFileKey } from "../utils/uploadHelpers";

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
      draft: createMediaDraft()
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

  const moveUploadItem = useCallback((itemKey, direction) => {
    const index = queue.items.findIndex((item) => item.key === itemKey);
    if (index < 0) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.items.length) {
      return;
    }

    const next = [...queue.items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setQueueState({ items: next });
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
    moveUploadItem,
    updateActiveUploadDraft
  };
}
