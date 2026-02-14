import { useEffect } from "react";

function MediaRelationPickerModal({ isOpen, onClose, onSelect, onSubmit, initialData, children }) {
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose} data-mode={initialData?.mode || "parent"}>
      {children}
    </div>
  );
}

export default MediaRelationPickerModal;
