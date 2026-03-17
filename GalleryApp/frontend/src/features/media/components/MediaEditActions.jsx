import AppIcon from "../../shared/components/AppIcon";

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
  const primaryVisual = primaryLabel === "Save"
    ? <AppIcon name="confirm" alt="" aria-hidden="true" />
    : (isPrimaryBusy ? (primaryBusyLabel || primaryLabel) : primaryLabel);
  const secondaryVisual = secondaryLabel === "Cancel"
    ? <AppIcon name="cancel" alt="" aria-hidden="true" />
    : secondaryLabel;
  const secondaryClassName = secondaryLabel === "Cancel"
    ? "media-action-btn app-button-icon-only"
    : "media-action-btn";
  const resolvedPrimaryClassName = primaryLabel === "Save"
    ? `${primaryClassName} app-button-icon-only`
    : primaryClassName;

  return (
    <div className="media-action-row media-action-row-spaced">
      {leadingSlot}
      <button
        type="button"
        className={secondaryClassName}
        onClick={onSecondary}
        disabled={isDisabled}
        aria-label={secondaryLabel}
        title={secondaryLabel}
      >
        {secondaryVisual}
      </button>
      <button
        type="button"
        className={resolvedPrimaryClassName}
        onClick={onPrimary}
        disabled={isDisabled}
        aria-label={isPrimaryBusy ? (primaryBusyLabel || primaryLabel) : primaryLabel}
        title={isPrimaryBusy ? (primaryBusyLabel || primaryLabel) : primaryLabel}
      >
        {primaryVisual}
      </button>
    </div>
  );
}
