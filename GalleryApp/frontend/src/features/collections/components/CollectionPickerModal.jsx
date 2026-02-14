import { useEffect } from "react";

function CollectionPickerModal({ isOpen, onClose, onSelect, initialData, children }) {
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
    <div className="media-confirm-overlay" onClick={onClose} data-kind={initialData?.kind || "media"}>
      {children}
    </div>
  );
}

export default CollectionPickerModal;
