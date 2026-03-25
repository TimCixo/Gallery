import AppIcon from "../../shared/components/AppIcon";

export default function UploadQueueGridItem({
  item,
  index,
  isUploading,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragEnd,
  onDrop,
  onRemove
}) {
  const cardClassName = [
    "upload-queue-card",
    isDragging ? " is-dragging" : "",
    isDropTarget ? " is-drop-target" : ""
  ].join("");

  return (
    <li
      className={cardClassName}
      draggable={!isUploading}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      <div className="upload-queue-card-preview-wrap">
        <span className="upload-queue-card-order" aria-label={`Queue position ${index + 1}`}>
          {index + 1}
        </span>

        <button
          type="button"
          className="upload-queue-remove-btn"
          onClick={() => onRemove(item.key)}
          disabled={isUploading}
          aria-label={`Remove ${item.file.name} from queue`}
          title="Remove from queue"
        >
          <AppIcon name="close" alt="" aria-hidden="true" />
        </button>

        <div className="upload-queue-card-preview" aria-hidden="true">
          {item.mediaType === "video" ? (
            <video src={item.previewUrl} preload="metadata" playsInline muted />
          ) : (
            <img src={item.previewUrl} alt="" loading="lazy" />
          )}
        </div>
      </div>

      <div className="upload-queue-card-meta">
        <p className="upload-queue-file-name">{item.file.name}</p>
      </div>
    </li>
  );
}
