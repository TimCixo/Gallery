export default function MediaEditActions({
  primaryLabel,
  primaryBusyLabel,
  isPrimaryBusy = false,
  onPrimary,
  secondaryLabel,
  onSecondary,
  isDisabled = false,
  leadingSlot = null,
  primaryClassName = "media-action-btn media-action-primary"
}) {
  return (
    <div className="media-action-row media-action-row-spaced">
      {leadingSlot}
      <button
        type="button"
        className="media-action-btn"
        onClick={onSecondary}
        disabled={isDisabled}
      >
        {secondaryLabel}
      </button>
      <button
        type="button"
        className={primaryClassName}
        onClick={onPrimary}
        disabled={isDisabled}
      >
        {isPrimaryBusy ? (primaryBusyLabel || primaryLabel) : primaryLabel}
      </button>
    </div>
  );
}
