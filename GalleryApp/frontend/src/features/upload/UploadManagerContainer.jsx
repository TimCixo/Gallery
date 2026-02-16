import { useEffect, useMemo, useRef, useState } from "react";
import { useUploadManager } from "../../hooks/useUploadManager";
import { UploadContextProvider } from "./context/UploadContext";
import UploadModal from "./components/UploadModal";
import UploadQueueStep from "./components/UploadQueueStep";
import UploadEditorStep from "./components/UploadEditorStep";
import UploadCollectionPicker from "./components/UploadCollectionPicker";
import { useUploadCollections } from "./hooks/useUploadCollections";
import { useUploadEditorData } from "./hooks/useUploadEditorData";
import { useUploadQueue } from "./hooks/useUploadQueue";
import { useUploadSubmission } from "./hooks/useUploadSubmission";

export default function UploadManagerContainer() {
  const { queue, state, settings, collections, dragAndDrop, actions, dispatch } = useUploadManager();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const activeUploadItem = queue.items[queue.activeUploadIndex] || null;

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

  const resetUploadState = () => {
    queue.items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    dispatch({ type: actions.RESET });
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

  const { handleUpload } = useUploadSubmission({
    queue,
    settings,
    setUiState,
    setIsUploading,
    setQueueState,
    closeModal
  });

  const uploadEditorData = useUploadEditorData({
    isEditorOpen: isUploadOpen && queue.step === "editor" && !!activeUploadItem,
    activeDraft: activeUploadItem?.draft || null,
    onDraftChange: updateActiveUploadDraft
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
    onPrev: queue.step === "editor" ? () => {
      setQueueState({ activeUploadIndex: Math.max(queue.activeUploadIndex - 1, 0) });
    } : undefined,
    onNext: queue.step === "editor" ? () => {
      setQueueState({ activeUploadIndex: Math.min(queue.activeUploadIndex + 1, Math.max(queue.items.length - 1, 0)) });
    } : undefined
  }), [isUploadOpen, queue.step, queue.activeUploadIndex, queue.items.length]);

  const renderUploadPreview = () => {
    if (!activeUploadItem) {
      return null;
    }

    if (activeUploadItem.mediaType === "video") {
      return <video src={activeUploadItem.previewUrl} preload="metadata" playsInline muted />;
    }

    return <img src={activeUploadItem.previewUrl} alt={activeUploadItem.file.name} loading="lazy" />;
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
      <button type="button" className="top-upload-btn" onClick={openUploadModal}>
        Upload
      </button>

      <UploadContextProvider value={uploadModalContextValue}>
        <UploadModal isOpen={isUploadOpen} onClose={closeModal}>
          <div
            className={`media-modal${queue.step === "queue" ? " media-modal-upload-queue" : " media-modal-editing"}`}
            onClick={(event) => event.stopPropagation()}
            onPaste={queue.step === "queue" ? handleUploadQueuePaste : undefined}
          >
            <div className="media-modal-header">
              <h2 className="upload-modal-title">
                {queue.step === "queue"
                  ? `Queue (${queue.items.length})`
                  : (queue.items.length === 0 ? "No files remaining" : `Editing: ${activeUploadItem?.file.name || "-"}`)}
              </h2>

              {queue.step !== "queue" ? (
                <div className="media-upload-nav">
                  <button
                    type="button"
                    className="media-action-btn"
                    onClick={() => setQueueState({ activeUploadIndex: Math.max(queue.activeUploadIndex - 1, 0) })}
                    disabled={queue.items.length === 0 || queue.activeUploadIndex === 0 || isUploading}
                    aria-label="Previous upload item"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    className="media-action-btn"
                    onClick={() => setQueueState({ activeUploadIndex: Math.min(queue.activeUploadIndex + 1, queue.items.length - 1) })}
                    disabled={queue.items.length === 0 || queue.activeUploadIndex >= queue.items.length - 1 || isUploading}
                    aria-label="Next upload item"
                  >
                    {">"}
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

              <button type="button" className="media-action-btn" onClick={() => closeModal()} disabled={isUploading}>
                Close
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
                isUploading={isUploading}
                collections={collections}
                settings={settings}
                state={state}
                onDraftChange={updateActiveUploadDraft}
                onOpenCollectionPicker={() => void openUploadCollectionPicker()}
                onToggleGroupUpload={(checked) => setSettings({ isGroupUploadEnabled: checked })}
                onBack={() => setQueueState({ step: "queue" })}
                onUpload={handleUpload}
                renderUploadPreview={renderUploadPreview}
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
