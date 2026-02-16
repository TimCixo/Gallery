import { useCallback } from "react";
import { collectionsApi } from "../../../api/collectionsApi";
import { uploadApi } from "../../../api/uploadApi";
import { uploadSingleFileWithProgress } from "../../../services/upload/uploadWorkerController";
import { ALLOWED_MEDIA_EXTENSIONS, getExtensionFromPath } from "../../../utils/mediaIdentity";
import { parseNullableId } from "../utils/uploadHelpers";

export function useUploadSubmission({
  queue,
  settings,
  setUiState,
  setIsUploading,
  setQueueState,
  closeModal
}) {
  const uploadTask = useCallback(async ({ file, draft, collectionIds }) => {
    const result = await uploadSingleFileWithProgress(file, () => {});
    const uploadedFiles = Array.isArray(result?.files) ? result.files : [];
    const uploaded = uploadedFiles[0];
    if (!uploaded?.id) {
      throw new Error(`Upload completed without media id for "${file.name}".`);
    }

    await uploadApi.updateUploadedMedia(uploaded.id, draft);
    for (const collectionId of collectionIds) {
      await collectionsApi.addMediaToCollection(collectionId, uploaded.id);
    }

    window.dispatchEvent(new CustomEvent("gallery:media-updated"));
  }, []);

  const normalizeDraft = useCallback((item) => {
    const title = String(item?.draft?.title || "").trim();
    const description = String(item?.draft?.description || "").trim();
    const source = String(item?.draft?.source || "").trim();

    if (source) {
      try {
        const url = new URL(source);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("Source URL must start with http:// or https://");
        }
      } catch {
        throw new Error(`Source must be a valid absolute URL for file "${item.file.name}".`);
      }
    }

    return {
      title: title || null,
      description: description || null,
      source: source || null,
      parent: parseNullableId(item?.draft?.parent, "Parent"),
      child: parseNullableId(item?.draft?.child, "Child"),
      tagIds: Array.isArray(item?.draft?.tagIds)
        ? item.draft.tagIds
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
        : []
    };
  }, []);

  const normalizeCollectionIds = useCallback(() => Array.from(new Set(
    settings.uploadCollectionIds
      .map((value) => Number(value))
      .filter((value) => Number.isSafeInteger(value) && value > 0)
  )), [settings.uploadCollectionIds]);

  const handleUpload = useCallback(async () => {
    const activeItem = queue.items[queue.activeUploadIndex];
    if (!activeItem) {
      setUiState({ type: "error", message: "Select at least one file." });
      return;
    }

    if (!ALLOWED_MEDIA_EXTENSIONS.has(getExtensionFromPath(activeItem.file.name))) {
      setUiState({ type: "error", message: `Unsupported file type: ${activeItem.file.name}` });
      return;
    }

    let normalizedDraft;
    let normalizedCollectionIds = [];
    try {
      normalizedDraft = normalizeDraft(activeItem);
      normalizedCollectionIds = normalizeCollectionIds();
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "Validation failed."
      });
      return;
    }

    setIsUploading(true);
    setUiState({ type: "", message: "" });

    try {
      if (settings.isGroupUploadEnabled) {
        const unsupportedFile = queue.items.find((item) => !ALLOWED_MEDIA_EXTENSIONS.has(getExtensionFromPath(item.file.name)));
        if (unsupportedFile) {
          throw new Error(`Unsupported file type: ${unsupportedFile.file.name}`);
        }

        for (const item of queue.items) {
          await uploadTask({
            file: item.file,
            draft: normalizedDraft,
            collectionIds: normalizedCollectionIds
          });
        }

        closeModal({ force: true });
        return;
      }

      await uploadTask({
        file: activeItem.file,
        draft: normalizedDraft,
        collectionIds: normalizedCollectionIds
      });

      const remaining = Math.max(queue.items.length - 1, 0);
      const removed = queue.items[queue.activeUploadIndex];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      const nextItems = queue.items.filter((_, index) => index !== queue.activeUploadIndex);
      if (remaining === 0) {
        closeModal({ force: true });
        return;
      }

      setQueueState({
        items: nextItems,
        activeUploadIndex: Math.min(queue.activeUploadIndex, remaining - 1)
      });
      setUiState({
        type: "success",
        message: `Queued: ${activeItem.file.name}. Remaining: ${remaining}`
      });
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed."
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    queue.items,
    queue.activeUploadIndex,
    settings.isGroupUploadEnabled,
    normalizeDraft,
    normalizeCollectionIds,
    uploadTask,
    setUiState,
    setIsUploading,
    setQueueState,
    closeModal
  ]);

  return { handleUpload };
}
