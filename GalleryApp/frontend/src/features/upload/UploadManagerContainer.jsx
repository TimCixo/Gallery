import { useEffect, useMemo, useRef, useState } from "react";
import { collectionsApi } from "../../api/collectionsApi";
import { mediaApi } from "../../api/mediaApi";
import { uploadApi } from "../../api/uploadApi";
import { useUploadManager } from "../../hooks/useUploadManager";
import { uploadSingleFileWithProgress } from "../../services/upload/uploadWorkerController";
import { ALLOWED_MEDIA_EXTENSIONS, VIDEO_EXTENSIONS, getExtensionFromPath } from "../../utils/mediaIdentity";
import { UploadContextProvider } from "./context/UploadContext";
import UploadModal from "./components/UploadModal";
import UploadQueueStep from "./components/UploadQueueStep";
import UploadEditorStep from "./components/UploadEditorStep";
import UploadCollectionPicker from "./components/UploadCollectionPicker";
import { useUploadCollections } from "./hooks/useUploadCollections";
import { useUploadEditorData } from "./hooks/useUploadEditorData";
import { useUploadQueue } from "./hooks/useUploadQueue";
import { createEmptyMediaDraft } from "../media/utils/bulkMediaEdit";
import { getGroupSelectedTagIds } from "../media/utils/groupTagSelection";
import { applyGroupDraftToUploadItems } from "./utils/groupUploadDraft";
import { parseNullableId } from "./utils/uploadHelpers";
import AppIcon from "../shared/components/AppIcon";

export default function UploadManagerContainer() {
  const { queue, state, settings, collections, dragAndDrop, background, actions, dispatch } = useUploadManager();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTaskStatuses, setUploadTaskStatuses] = useState([]);
  const [groupDraft, setGroupDraft] = useState(createEmptyMediaDraft);
  const [groupTouchedFields, setGroupTouchedFields] = useState({});
  const [groupTagEdits, setGroupTagEdits] = useState({});
  const [isGroupSelectionChainEnabled, setIsGroupSelectionChainEnabled] = useState(false);
  const inputRef = useRef(null);
  const backgroundUploadQueueRef = useRef([]);
  const isBackgroundUploadWorkerRunningRef = useRef(false);
  const uploadTaskSequenceRef = useRef(1);
  const uploadLinkGroupSequenceRef = useRef(1);
  const activeUploadTaskIdRef = useRef(null);
  const activeUploadXhrRef = useRef(null);
  const linkOrderGroupStateRef = useRef(new Map());
  const activeUploadItem = queue.items[queue.activeUploadIndex] || null;
  const visibleDraft = settings.isGroupUploadEnabled ? groupDraft : (activeUploadItem?.draft || null);
  const selectedTagIds = settings.isGroupUploadEnabled
    ? getGroupSelectedTagIds(queue.items, groupTagEdits)
    : (Array.isArray(visibleDraft?.tagIds) ? visibleDraft.tagIds : []);

  const setQueueState = (payload) => {
    dispatch({ type: actions.SET_QUEUE, payload });
  };

  const setUiState = (payload) => {
    dispatch({ type: actions.SET_STATE, payload });
  };

  const setSettings = (payload) => {
    dispatch({ type: actions.SET_SETTINGS, payload });
  };

  const setCollectionsState = (payload) => {
    dispatch({ type: actions.SET_COLLECTIONS, payload });
  };

  const setDragAndDrop = (payload) => {
    dispatch({ type: actions.SET_DRAG_AND_DROP, payload });
  };

  const setBackgroundState = (payload) => {
    dispatch({ type: actions.SET_BACKGROUND, payload });
  };

  const resetUploadState = () => {
    queue.items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueueState({ items: [], step: "queue", activeUploadIndex: 0, taskStatuses: [] });
    setUiState({ type: "", message: "" });
    setSettings({ isGroupUploadEnabled: false, uploadCollectionIds: [] });
    setCollectionsState({ entities: [], loading: false, error: "", isPickerOpen: false });
    setDragAndDrop({ isQueueDragOver: false, isPageDragOver: false });
    setIsUploading(false);
    setGroupDraft(createEmptyMediaDraft());
    setGroupTouchedFields({});
    setGroupTagEdits({});
    setIsGroupSelectionChainEnabled(false);
  };

  const closeModal = ({ force = false } = {}) => {
    if (isUploading && !force) {
      return;
    }

    if (!force && !isUploadOpen) {
      return;
    }

    resetUploadState();
    setIsUploadOpen(false);
  };

  const {
    loadUploadCollections,
    openUploadCollectionPicker,
    closeUploadCollectionPicker,
    toggleUploadCollectionSelection
  } = useUploadCollections({
    collections,
    settings,
    setCollectionsState,
    setSettings
  });

  const {
    handleUploadPickerChange,
    handleUploadQueueDrop,
    handleUploadQueuePaste,
    handleRemoveUploadItem,
    moveUploadItem,
    updateActiveUploadDraft
  } = useUploadQueue({
    queue,
    collections,
    setQueueState,
    setSettings,
    setUiState,
    setCollectionsState,
    setDragAndDrop,
    setIsUploadOpen,
    loadUploadCollections
  });

  const handleUploadDraftChange = (patch) => {
    if (settings.isGroupUploadEnabled) {
      setGroupDraft((current) => ({ ...current, ...patch }));
      setGroupTouchedFields((current) => ({
        ...current,
        ...Object.keys(patch || {}).reduce((result, key) => ({ ...result, [key]: true }), {})
      }));
      return;
    }

    updateActiveUploadDraft(patch);
  };

  const handleToggleUploadTag = (tagId) => {
    const normalizedTagId = Number(tagId);
    if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
      return;
    }

    if (!settings.isGroupUploadEnabled) {
      const currentIds = Array.isArray(activeUploadItem?.draft?.tagIds) ? activeUploadItem.draft.tagIds : [];
      const hasTag = currentIds.includes(normalizedTagId);
      updateActiveUploadDraft({
        tagIds: hasTag ? currentIds.filter((id) => id !== normalizedTagId) : [...currentIds, normalizedTagId]
      });
      return;
    }

    const effectiveHasTagEverywhere = queue.items.every((item) => {
      const currentIds = Array.isArray(item?.draft?.tagIds) ? item.draft.tagIds : [];
      const pendingAction = groupTagEdits[normalizedTagId] || null;
      if (pendingAction === "add") {
        return true;
      }
      if (pendingAction === "remove") {
        return false;
      }
      return currentIds.includes(normalizedTagId);
    });
    const nextAction = effectiveHasTagEverywhere ? "remove" : "add";

    setGroupTagEdits((current) => ({ ...current, [normalizedTagId]: nextAction }));
    setGroupDraft((current) => {
      const currentIds = Array.isArray(current.tagIds) ? current.tagIds : [];
      return {
        ...current,
        tagIds: nextAction === "add"
          ? [...new Set([...currentIds, normalizedTagId])]
          : currentIds.filter((id) => id !== normalizedTagId)
      };
    });
  };

  const uploadEditorData = useUploadEditorData({
    isEditorOpen: isUploadOpen && queue.step === "editor" && !!activeUploadItem,
    activeDraft: visibleDraft,
    onDraftChange: handleUploadDraftChange,
    onToggleTag: handleToggleUploadTag
  });

  const openPicker = () => {
    inputRef.current?.click();
  };

  const openUploadModal = () => {
    setIsUploadOpen(true);
    setQueueState({ step: "queue" });
    setUiState({ type: "", message: "" });
    if (collections.entities.length === 0 && !collections.loading) {
      void loadUploadCollections();
    }
  };

  useEffect(() => {
    if (!isUploadOpen || queue.step === "queue") {
      return;
    }

    if (queue.items.length === 0) {
      setQueueState({ activeUploadIndex: 0 });
      return;
    }

    if (queue.activeUploadIndex >= queue.items.length) {
      setQueueState({ activeUploadIndex: queue.items.length - 1 });
    }
  }, [isUploadOpen, queue.step, queue.items.length, queue.activeUploadIndex]);

  const uploadModalContextValue = useMemo(() => ({
    isOpen: isUploadOpen,
    onClose: closeModal,
    onPrev: queue.step === "editor" && !settings.isGroupUploadEnabled ? () => {
      setQueueState({ activeUploadIndex: Math.max(queue.activeUploadIndex - 1, 0) });
    } : undefined,
    onNext: queue.step === "editor" && !settings.isGroupUploadEnabled ? () => {
      setQueueState({ activeUploadIndex: Math.min(queue.activeUploadIndex + 1, Math.max(queue.items.length - 1, 0)) });
    } : undefined
  }), [isUploadOpen, queue.step, queue.activeUploadIndex, queue.items.length, settings.isGroupUploadEnabled]);

  const renderUploadPreview = () => {
    if (settings.isGroupUploadEnabled) {
      return <div className="media-bulk-preview">{queue.items.length}</div>;
    }

    if (!activeUploadItem) {
      return null;
    }

    if (activeUploadItem.mediaType === "video") {
      return <video src={activeUploadItem.previewUrl} preload="metadata" playsInline muted />;
    }

    return <img src={activeUploadItem.previewUrl} alt={activeUploadItem.file.name} loading="lazy" />;
  };

  const buildUploadItemsForSubmission = () => {
    return settings.isGroupUploadEnabled
      ? applyGroupDraftToUploadItems(queue.items, groupDraft, groupTouchedFields, groupTagEdits)
      : (activeUploadItem ? [activeUploadItem] : []);
  };

  const normalizeUploadDraft = (draft) => {
    const title = String(draft?.title || "").trim();
    const description = String(draft?.description || "").trim();
    const source = String(draft?.source || "").trim();

    if (source) {
      const url = new URL(source);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Source URL must start with http:// or https://");
      }
    }

    return {
      title: title || null,
      description: description || null,
      source: source || null,
      parent: parseNullableId(draft?.parent, "Parent"),
      child: parseNullableId(draft?.child, "Child"),
      tagIds: Array.isArray(draft?.tagIds)
        ? draft.tagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
        : []
    };
  };

  const hasUploadHistory = uploadTaskStatuses.length > 0 || background.total > 0;
  const backgroundRemaining = background.queued + (background.isProcessing ? 1 : 0);
  const uploadDropdownSummary = background.total === 0
    ? "No uploads"
    : backgroundRemaining > 0
      ? `Uploading ${background.completed + background.failed}/${background.total}`
      : `Uploaded ${background.completed}/${background.total}`;

  const getUploadTaskStatusLabel = (status) => {
    if (status === "uploaded") {
      return "Uploaded";
    }
    if (status === "queued") {
      return "Queued";
    }
    if (status === "error") {
      return "Retry";
    }
    return "Uploading";
  };

  const fetchMediaById = async (mediaId) => {
    const normalizedId = Number(mediaId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    const media = items.find((item) => Number(item?.id) === normalizedId) || null;
    return media ? { ...media, _tileUrl: media.tileUrl || media.previewUrl || media.originalUrl || media.url || "" } : null;
  };

  const runBackgroundUploadQueue = async () => {
    if (isBackgroundUploadWorkerRunningRef.current) {
      return;
    }

    isBackgroundUploadWorkerRunningRef.current = true;
    try {
      while (backgroundUploadQueueRef.current.length > 0) {
        const task = backgroundUploadQueueRef.current.shift();
        if (!task) {
          continue;
        }

        setBackgroundState((current) => ({
          ...current,
          queued: Math.max(current.queued - 1, 0),
          isProcessing: true,
          activeFileName: task.file.name,
          activePercent: 0
        }));
        setUploadTaskStatuses((current) => current.map((item) => (
          item.id === task.taskId
            ? { ...item, status: "uploading", percent: 0, error: "" }
            : item
        )));
        activeUploadTaskIdRef.current = task.taskId;

        try {
          const result = await uploadSingleFileWithProgress(
            task.file,
            (percent) => {
              setBackgroundState((current) => ({ ...current, activePercent: percent }));
              setUploadTaskStatuses((current) => current.map((item) => (
                item.id === task.taskId
                  ? { ...item, status: "uploading", percent }
                  : item
              )));
            },
            (xhr) => {
              activeUploadXhrRef.current = xhr;
            }
          );
          const uploadedFiles = Array.isArray(result?.files) ? result.files : [];
          const uploaded = uploadedFiles[0];
          const uploadedRelativePath = uploaded?.relativePath || "";
          const uploadedExtension = getExtensionFromPath(uploadedRelativePath || task.file.name);
          const encodedRelativePath = encodeURIComponent(uploadedRelativePath).replace(/%2F/g, "/");
          let resolvedDraft = task.draft;

          if (uploaded?.id) {
            if (Number.isSafeInteger(task.linkOrderGroupId) && task.linkOrderGroupId > 0) {
              const groupState = linkOrderGroupStateRef.current.get(task.linkOrderGroupId) || {
                previousUploadedMediaId: null,
                previousUploadedDraft: null
              };
              const previousUploadedMediaId = Number(groupState.previousUploadedMediaId);

              resolvedDraft = {
                ...task.draft,
                parent: Number.isSafeInteger(previousUploadedMediaId) && previousUploadedMediaId > 0 ? previousUploadedMediaId : null,
                child: null
              };

              if (Number.isSafeInteger(previousUploadedMediaId) && previousUploadedMediaId > 0) {
                await uploadApi.updateUploadedMedia(previousUploadedMediaId, {
                  ...(groupState.previousUploadedDraft || {}),
                  child: uploaded.id
                });
              }

              groupState.previousUploadedMediaId = uploaded.id;
              groupState.previousUploadedDraft = resolvedDraft;

              if (task.linkOrderIndex === task.linkOrderSize - 1) {
                linkOrderGroupStateRef.current.delete(task.linkOrderGroupId);
              } else {
                linkOrderGroupStateRef.current.set(task.linkOrderGroupId, groupState);
              }
            }

            await uploadApi.updateUploadedMedia(uploaded.id, resolvedDraft);
          }

          const uploadedMedia = uploadedRelativePath
            ? {
              id: uploaded?.id ?? null,
              name: uploaded?.storedName || task.file.name,
              relativePath: uploadedRelativePath,
              originalUrl: `/media/${encodedRelativePath}`,
              mediaType: VIDEO_EXTENSIONS.has(uploadedExtension) ? "video" : "image",
              title: resolvedDraft.title || null,
              description: resolvedDraft.description || null,
              source: resolvedDraft.source || null,
              parent: resolvedDraft.parent ?? null,
              child: resolvedDraft.child ?? null,
              _tileUrl: `/api/media/preview?path=${encodeURIComponent(uploadedRelativePath)}`
            }
            : null;

          if (uploaded?.id) {
            const collectionIds = Array.isArray(task.collectionIds) ? task.collectionIds : [];
            for (const collectionId of collectionIds) {
              await collectionsApi.addMediaToCollection(collectionId, uploaded.id);
            }
          }

          window.dispatchEvent(new CustomEvent("gallery:media-updated"));
          setBackgroundState((current) => ({
            ...current,
            completed: current.completed + 1,
            activePercent: 100
          }));
          setUploadTaskStatuses((current) => current.map((item) => (
            item.id === task.taskId
              ? { ...item, status: "uploaded", percent: 100, error: "", uploadedMedia }
              : item
          )));
        } catch (error) {
          setBackgroundState((current) => ({
            ...current,
            failed: current.failed + 1,
            activePercent: 0
          }));
          setUploadTaskStatuses((current) => current.map((item) => (
            item.id === task.taskId
              ? {
                ...item,
                status: "error",
                percent: 0,
                error: error instanceof Error ? error.message : "Upload failed."
              }
              : item
          )));
        } finally {
          activeUploadTaskIdRef.current = null;
          activeUploadXhrRef.current = null;
          setBackgroundState((current) => ({
            ...current,
            activeFileName: "",
            activePercent: 0
          }));
        }
      }
    } finally {
      isBackgroundUploadWorkerRunningRef.current = false;
      setBackgroundState((current) => ({
        ...current,
        isProcessing: false,
        activeFileName: "",
        activePercent: 0
      }));
      if (backgroundUploadQueueRef.current.length > 0) {
        void runBackgroundUploadQueue();
      }
    }
  };

  const enqueueBackgroundUpload = (task) => {
    const taskId = uploadTaskSequenceRef.current;
    uploadTaskSequenceRef.current += 1;

    const uploadTaskPayload = {
      file: task.file,
      draft: task.draft,
      collectionIds: Array.isArray(task.collectionIds) ? [...task.collectionIds] : [],
      linkOrderGroupId: Number.isSafeInteger(task.linkOrderGroupId) ? task.linkOrderGroupId : null,
      linkOrderIndex: Number.isSafeInteger(task.linkOrderIndex) ? task.linkOrderIndex : null,
      linkOrderSize: Number.isSafeInteger(task.linkOrderSize) ? task.linkOrderSize : null
    };

    backgroundUploadQueueRef.current.push({ ...uploadTaskPayload, taskId });
    setBackgroundState((current) => ({
      ...current,
      total: current.total + 1,
      queued: current.queued + 1
    }));
    setUploadTaskStatuses((current) => {
      const next = [
        {
          id: taskId,
          fileName: task.file.name,
          status: "queued",
          percent: 0,
          error: "",
          uploadedMedia: null,
          retryTask: uploadTaskPayload
        },
        ...current
      ];
      return next.slice(0, 60);
    });
    void runBackgroundUploadQueue();
  };

  const handleCancelUploadTask = (taskId) => {
    if (!taskId) {
      return;
    }

    if (activeUploadTaskIdRef.current === taskId) {
      activeUploadXhrRef.current?.abort();
      return;
    }

    const previousLength = backgroundUploadQueueRef.current.length;
    backgroundUploadQueueRef.current = backgroundUploadQueueRef.current.filter((task) => task.taskId !== taskId);
    if (backgroundUploadQueueRef.current.length === previousLength) {
      return;
    }

    setBackgroundState((current) => ({
      ...current,
      queued: Math.max(current.queued - 1, 0),
      failed: current.failed + 1
    }));
    setUploadTaskStatuses((current) => current.map((item) => (
      item.id === taskId
        ? { ...item, status: "error", percent: 0, error: "Upload cancelled." }
        : item
    )));
  };

  const handleOpenUploadedTask = async (taskId) => {
    const task = uploadTaskStatuses.find((item) => item.id === taskId);
    if (!task?.uploadedMedia) {
      return;
    }

    let nextMedia = task.uploadedMedia;
    const mediaId = Number(task.uploadedMedia.id);
    if (Number.isSafeInteger(mediaId) && mediaId > 0) {
      const freshMedia = await fetchMediaById(mediaId);
      if (freshMedia) {
        nextMedia = freshMedia;
      } else {
        setUiState({
          type: "warning",
          message: "Warning: media API unavailable. Opened cached upload data."
        });
      }
    }

    window.dispatchEvent(new CustomEvent("gallery:open-media", { detail: { media: nextMedia } }));
  };

  const handleRetryUploadTask = (taskId) => {
    const task = uploadTaskStatuses.find((item) => item.id === taskId);
    if (!task?.retryTask) {
      return;
    }

    backgroundUploadQueueRef.current.push({ ...task.retryTask, taskId: task.id });
    setBackgroundState((current) => ({
      ...current,
      queued: current.queued + 1,
      failed: Math.max(current.failed - 1, 0)
    }));
    setUploadTaskStatuses((current) => current.map((item) => (
      item.id === taskId
        ? { ...item, status: "queued", percent: 0, error: "" }
        : item
    )));
    setUiState({ type: "", message: "" });
    void runBackgroundUploadQueue();
  };

  const handleUpload = async () => {
    const activeItem = queue.items[queue.activeUploadIndex];
    if (!activeItem) {
      setUiState({ type: "error", message: "Select at least one file." });
      return;
    }

    setUiState({ type: "", message: "" });

    if (!ALLOWED_MEDIA_EXTENSIONS.has(getExtensionFromPath(activeItem.file.name))) {
      setUiState({ type: "error", message: `Unsupported file type: ${activeItem.file.name}` });
      return;
    }

    let normalizedUploadItems;
    let normalizedCollectionIds = [];
    try {
      const uploadItems = buildUploadItemsForSubmission();
      normalizedCollectionIds = Array.from(new Set(
        settings.uploadCollectionIds
          .map((value) => Number(value))
          .filter((value) => Number.isSafeInteger(value) && value > 0)
      ));

      normalizedUploadItems = uploadItems.map((item) => ({
        file: item.file,
        draft: normalizeUploadDraft(item.draft)
      }));
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "Validation failed."
      });
      return;
    }

    if (settings.isGroupUploadEnabled) {
      const unsupportedFile = queue.items.find((item) => !ALLOWED_MEDIA_EXTENSIONS.has(getExtensionFromPath(item.file.name)));
      if (unsupportedFile) {
        setUiState({ type: "error", message: `Unsupported file type: ${unsupportedFile.file.name}` });
        return;
      }

      const linkOrderGroupId = isGroupSelectionChainEnabled ? uploadLinkGroupSequenceRef.current++ : null;
      normalizedUploadItems.forEach((item, index) => {
        enqueueBackgroundUpload({
          file: item.file,
          draft: item.draft,
          collectionIds: normalizedCollectionIds,
          linkOrderGroupId,
          linkOrderIndex: linkOrderGroupId ? index : null,
          linkOrderSize: linkOrderGroupId ? normalizedUploadItems.length : null
        });
      });

      closeModal();
      return;
    }

    enqueueBackgroundUpload({
      file: normalizedUploadItems[0].file,
      draft: normalizedUploadItems[0].draft,
      collectionIds: normalizedCollectionIds
    });

    const remaining = Math.max(queue.items.length - 1, 0);
    const nextItems = queue.items.filter((_, index) => index !== queue.activeUploadIndex);
    if (activeItem.previewUrl) {
      URL.revokeObjectURL(activeItem.previewUrl);
    }
    setQueueState({
      items: nextItems,
      activeUploadIndex: remaining === 0 ? 0 : Math.min(queue.activeUploadIndex, remaining - 1)
    });

    if (remaining === 0) {
      closeModal();
    } else {
      setUiState({
        type: "success",
        message: `Queued: ${activeItem.file.name}. Remaining: ${remaining}`
      });
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.gif,.jfif"
        onChange={handleUploadPickerChange}
        style={{ display: "none" }}
      />
      {hasUploadHistory ? (
        <details className="top-upload-dropdown">
          <summary className="top-upload-dropdown-summary top-upload-dropdown-summary-icon" aria-label={uploadDropdownSummary} title={uploadDropdownSummary}>
            <AppIcon name="process" alt="" aria-hidden="true" />
          </summary>
          <div className="top-upload-dropdown-menu">
            {uploadTaskStatuses.length === 0 ? (
              <p className="top-upload-empty">No uploads</p>
            ) : (
              <ul className="top-upload-list">
                {uploadTaskStatuses.map((task) => (
                  <li key={task.id} className="top-upload-item">
                    <span className="top-upload-file">{task.fileName}</span>
                    {task.status === "uploading" ? (
                      <button
                        type="button"
                        className="top-upload-action top-upload-action-uploading"
                        onClick={() => handleCancelUploadTask(task.id)}
                        title="Click to cancel upload"
                      >
                        <div className="top-upload-inline-progress">
                          <div
                            className="top-upload-inline-progress-fill"
                            style={{ width: `${Math.max(0, Math.min(task.percent || 0, 100))}%` }}
                          />
                        </div>
                      </button>
                    ) : task.status === "uploaded" ? (
                      <button
                        type="button"
                        className="top-upload-action top-upload-action-uploaded"
                        onClick={() => void handleOpenUploadedTask(task.id)}
                        title="Click to open uploaded file"
                      >
                        {getUploadTaskStatusLabel(task.status)}
                      </button>
                    ) : task.status === "queued" ? (
                      <button
                        type="button"
                        className="top-upload-action"
                        onClick={() => handleCancelUploadTask(task.id)}
                        title="Click to cancel queued upload"
                      >
                        {getUploadTaskStatusLabel(task.status)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="top-upload-action top-upload-action-error"
                        onClick={() => handleRetryUploadTask(task.id)}
                        title={task.error || "Click to retry upload"}
                      >
                        {getUploadTaskStatusLabel(task.status)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ) : null}
      <button type="button" className="top-upload-btn top-upload-btn-icon" onClick={openUploadModal} aria-label="Upload files" title="Upload files">
        <AppIcon name="upload" alt="" aria-hidden="true" />
      </button>

      <UploadContextProvider value={uploadModalContextValue}>
        <UploadModal isOpen={isUploadOpen} onClose={closeModal}>
          <div
            className={`media-modal${queue.step === "queue" ? " media-modal-upload-queue" : " media-modal-editing"}`}
            onClick={(event) => event.stopPropagation()}
            onPaste={queue.step === "queue" ? handleUploadQueuePaste : undefined}
          >
            <div className={`media-modal-header${queue.step !== "queue" ? " media-modal-header-upload-editor" : ""}`}>
              {queue.step === "queue" ? (
                <h2 className="upload-modal-title">Queue ({queue.items.length})</h2>
              ) : null}

              {queue.step !== "queue" ? (
                <button
                  type="button"
                  className="media-icon-btn media-icon-btn-collections"
                  onClick={() => void openUploadCollectionPicker()}
                  disabled={collections.loading || isUploading}
                  aria-label="Add to collection"
                  title="Add to collection"
                >
                  <AppIcon name="collection" alt="" aria-hidden="true" />
                </button>
              ) : null}

              {queue.step !== "queue" ? (
                <div className="media-upload-nav">
                  <button
                    type="button"
                    className="media-action-btn app-button-icon-only"
                    onClick={() => setQueueState({ activeUploadIndex: Math.max(queue.activeUploadIndex - 1, 0) })}
                    disabled={settings.isGroupUploadEnabled || queue.items.length === 0 || queue.activeUploadIndex === 0 || isUploading}
                    aria-label="Previous upload item"
                  >
                    <AppIcon name="arrowLeft" alt="" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="media-action-btn app-button-icon-only"
                    onClick={() => setQueueState({ activeUploadIndex: Math.min(queue.activeUploadIndex + 1, queue.items.length - 1) })}
                    disabled={settings.isGroupUploadEnabled || queue.items.length === 0 || queue.activeUploadIndex >= queue.items.length - 1 || isUploading}
                    aria-label="Next upload item"
                  >
                    <AppIcon name="arrowRight" alt="" aria-hidden="true" />
                  </button>
                </div>
              ) : null}

              {queue.step === "queue" ? (
                <button
                  type="button"
                  className="media-action-btn media-action-primary upload-continue-btn"
                  onClick={() => setQueueState({ step: "editor" })}
                  disabled={queue.items.length === 0 || isUploading}
                >
                  Next
                </button>
              ) : null}

              <button type="button" className="media-action-btn app-button-icon-only" onClick={() => closeModal()} disabled={isUploading} aria-label="Close upload dialog" title="Close upload dialog">
                <AppIcon name="close" alt="" aria-hidden="true" />
              </button>
            </div>

            {queue.step === "queue" ? (
              <UploadQueueStep
                queue={queue}
                dragAndDrop={dragAndDrop}
                isUploading={isUploading}
                onOpenPicker={openPicker}
                onSetDragAndDrop={setDragAndDrop}
                onDrop={handleUploadQueueDrop}
                onPaste={handleUploadQueuePaste}
                onMove={moveUploadItem}
                onRemove={handleRemoveUploadItem}
                state={state}
              />
            ) : (
              <UploadEditorStep
                activeUploadItem={activeUploadItem}
                visibleDraft={visibleDraft}
                selectedTagIds={selectedTagIds}
                isUploading={isUploading}
                collections={collections}
                settings={settings}
                state={state}
                onDraftChange={handleUploadDraftChange}
                onOpenCollectionPicker={() => void openUploadCollectionPicker()}
                onToggleGroupUpload={(checked) => setSettings({ isGroupUploadEnabled: checked })}
                isGroupSelectionChainEnabled={isGroupSelectionChainEnabled}
                onToggleGroupSelectionChain={(checked) => setIsGroupSelectionChainEnabled(checked)}
                onBack={() => setQueueState({ step: "queue" })}
                onUpload={handleUpload}
                previewNode={renderUploadPreview()}
                previewTitle={settings.isGroupUploadEnabled
                  ? `${queue.items.length} selected media`
                  : String(visibleDraft?.title || activeUploadItem?.file?.name || "")}
                editorData={uploadEditorData}
              />
            )}
          </div>
        </UploadModal>
      </UploadContextProvider>

      <UploadCollectionPicker
        isOpen={isUploadOpen && collections.isPickerOpen}
        collections={collections}
        selectedIds={settings.uploadCollectionIds}
        onToggle={toggleUploadCollectionSelection}
        onClose={closeUploadCollectionPicker}
      />
    </>
  );
}
