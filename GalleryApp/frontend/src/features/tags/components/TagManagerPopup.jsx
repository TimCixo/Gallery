import { useEffect } from "react";

function TagManagerPopup({ isOpen, onClose, onSubmit, initialData, children }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeButton = initialData?.closeButtonRef?.current;
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.focus();
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
      const triggerButton = initialData?.triggerButtonRef?.current;
      if (triggerButton instanceof HTMLButtonElement) {
        triggerButton.focus();
      }
    };
  }, [isOpen, onClose, initialData]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      {children}
    </div>
  );
}

export default TagManagerPopup;
