import AppIcon from "./AppIcon";

export default function PickerDialog({
  title,
  className = "",
  onClose,
  toolbar = null,
  errorMessage = "",
  isLoading = false,
  loadingText = "Loading...",
  isEmpty = false,
  emptyText = "No items available.",
  items = [],
  renderItem,
  listClassName = "",
  footer = null,
  useDefaultGrid = true,
  content = null
}) {
  const dialogClassName = ["collection-picker-dialog", className].filter(Boolean).join(" ");
  const pickerListClassName = useDefaultGrid
    ? ["collection-picker-list", "picker-grid", listClassName].filter(Boolean).join(" ")
    : listClassName;

  return (
    <div className={dialogClassName} onClick={(event) => event.stopPropagation()}>
      <div className="picker-dialog-header">
        <p className="collection-picker-title">{title}</p>
        {onClose ? (
          <button
            type="button"
            className="media-action-btn app-button-icon-only"
            onClick={onClose}
            aria-label="Close picker"
            title="Close picker"
          >
            <AppIcon name="close" alt="" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {toolbar}
      {errorMessage ? <p className="media-action-error">{errorMessage}</p> : null}
      {isLoading ? (
        <p className="collections-state">{loadingText}</p>
      ) : isEmpty ? (
        <p className="collections-state">{emptyText}</p>
      ) : content ? (
        content
      ) : (
        <ul className={pickerListClassName}>
          {items.map((item, index) => renderItem(item, index))}
        </ul>
      )}
      {footer}
    </div>
  );
}
