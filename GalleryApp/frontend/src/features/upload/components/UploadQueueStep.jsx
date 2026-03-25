import { useState } from "react";
import { isFileDragEvent } from "../utils/uploadHelpers";
import UploadQueueGridItem from "./UploadQueueGridItem";

export default function UploadQueueStep({
  queue,
  dragAndDrop,
  isUploading,
  onOpenPicker,
  onSetDragAndDrop,
  onDrop,
  onPaste,
  onReorder,
  onRemove,
  state
}) {
  const [draggedKey, setDraggedKey] = useState("");
  const [dropTargetKey, setDropTargetKey] = useState("");

  return (
    <div className="upload-queue-step" onPaste={onPaste}>
      <button
        type="button"
        className={`upload-queue-dropzone${dragAndDrop.isQueueDragOver ? " is-dragover" : ""}`}
        onClick={onOpenPicker}
        onDragEnter={(event) => {
          if (!isFileDragEvent(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          onSetDragAndDrop({ isQueueDragOver: true });
        }}
        onDragOver={(event) => {
          if (!isFileDragEvent(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
          onSetDragAndDrop({ isQueueDragOver: true });
        }}
        onDragLeave={(event) => {
          if (!isFileDragEvent(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          onSetDragAndDrop({ isQueueDragOver: false });
        }}
        onDrop={(event) => {
          if (!isFileDragEvent(event)) {
            return;
          }
          onDrop(event);
        }}
        disabled={isUploading}
      >
        Click, drop, or paste files here
      </button>

      {queue.items.length === 0 ? (
        <p className="upload-queue-empty">No files selected yet.</p>
      ) : (
        <ul className="upload-queue-grid">
          {queue.items.map((item, index) => (
            <UploadQueueGridItem
              key={item.key}
              item={item}
              index={index}
              isUploading={isUploading}
              isDragging={draggedKey === item.key}
              isDropTarget={dropTargetKey === item.key && draggedKey !== item.key}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.key);
                setDraggedKey(item.key);
                setDropTargetKey(item.key);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                if (draggedKey && draggedKey !== item.key) {
                  setDropTargetKey(item.key);
                }
              }}
              onDragEnd={() => {
                setDraggedKey("");
                setDropTargetKey("");
              }}
              onDrop={(event) => {
                event.preventDefault();
                const nextDraggedKey = event.dataTransfer.getData("text/plain") || draggedKey;
                if (nextDraggedKey && nextDraggedKey !== item.key) {
                  onReorder(nextDraggedKey, item.key);
                }
                setDraggedKey("");
                setDropTargetKey("");
              }}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      {state.message ? (
        <p className={state.type === "error" ? "media-action-error" : "media-action-success"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
