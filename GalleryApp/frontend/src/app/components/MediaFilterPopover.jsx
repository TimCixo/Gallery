import { useEffect } from "react";

export default function MediaFilterPopover({
  isOpen,
  buttonRef,
  onClose,
  groupRelatedMedia,
  onGroupRelatedMediaChange
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const triggerButton = buttonRef?.current;
      if (triggerButton instanceof HTMLButtonElement) {
        triggerButton.focus();
      }
    };
  }, [buttonRef, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="top-filter-popover-wrap">
      <div className="top-filter-popover" role="dialog" aria-modal="false" aria-label="Media filters">
        <label className="top-filter-checkbox">
          <input
            type="checkbox"
            checked={groupRelatedMedia}
            onChange={(event) => onGroupRelatedMediaChange?.(event.target.checked)}
          />
          <span>Групувати медіа</span>
        </label>
      </div>
    </div>
  );
}
