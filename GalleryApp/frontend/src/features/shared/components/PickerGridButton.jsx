import AppIcon from "./AppIcon";

export default function PickerGridButton({
  title,
  subtitle = "",
  description = "",
  status = "",
  previewUrl = "",
  previewAlt = "",
  fallbackIcon = "create",
  fallbackLabel = "Preview unavailable",
  className = "",
  isSelected = false,
  disabled = false,
  onClick
}) {
  const buttonClassName = ["picker-grid-card", className, isSelected ? "is-selected" : ""].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="picker-grid-card-preview" aria-hidden="true">
        {previewUrl ? (
          <img src={previewUrl} alt={previewAlt} className="picker-grid-card-image" loading="lazy" />
        ) : (
          <span className="picker-grid-card-fallback">
            <AppIcon name={fallbackIcon} alt="" aria-hidden="true" />
            <small>{fallbackLabel}</small>
          </span>
        )}
      </span>
      <span className="picker-grid-card-body">
        <span className="picker-grid-card-main">
          <span className="picker-grid-card-title">{title}</span>
          {status ? <em className="picker-grid-card-status">{status}</em> : null}
        </span>
        {subtitle ? <span className="picker-grid-card-subtitle">{subtitle}</span> : null}
        {description ? <small className="picker-grid-card-description">{description}</small> : null}
      </span>
    </button>
  );
}
