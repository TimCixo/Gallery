import { isFileDragEvent } from "../utils/uploadHelpers";

export default function UploadQueueStep({
  queue,
  dragAndDrop,
  isUploading,
  onOpenPicker,
  onSetDragAndDrop,
  onDrop,
  onPaste,
  onMove,
  onRemove,
  state
}) {
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
        <ul className="upload-queue-list">
          {queue.items.map((item, index) => (
            <li key={item.key} className="upload-queue-item">
              <span className="upload-queue-file-name">{item.file.name}</span>
              <div className="upload-queue-item-actions">
                <button
                  type="button"
                  className="media-action-btn"
                  onClick={() => onMove(item.key, "up")}
                  disabled={index === 0 || isUploading}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="media-action-btn"
                  onClick={() => onMove(item.key, "down")}
                  disabled={index === queue.items.length - 1 || isUploading}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="media-action-btn media-action-danger"
                  onClick={() => onRemove(item.key)}
                  disabled={isUploading}
                >
                  Remove
                </button>
              </div>
            </li>
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
