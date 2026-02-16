import { useEffect } from "react";
import { useMediaEditorContext } from "../context/MediaEditorContext";

function MediaRelationPickerModal({ isOpen, onClose, initialData, children }) {
  const context = useMediaEditorContext();
  const isModalOpen = context.isRelationPickerOpen ?? isOpen;
  const closeHandler = context.onCloseRelationPicker ?? onClose;
  const mode = context.relationPickerMode ?? initialData?.mode ?? "parent";

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHandler?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeHandler]);

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={closeHandler} data-mode={mode}>
      {children}
    </div>
  );
}

export default MediaRelationPickerModal;
