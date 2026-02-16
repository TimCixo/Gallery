import { useEffect } from "react";
import { useMediaEditorContext } from "../context/MediaEditorContext";

function MediaEditorModal({ isOpen, onClose, onNavigate, initialData, children }) {
  const context = useMediaEditorContext();
  const isModalOpen = context.isOpen ?? isOpen;
  const closeHandler = context.onClose ?? onClose;
  const navigateHandler = context.onNavigate ?? onNavigate;
  const canNavigate = context.canNavigate ?? initialData?.canNavigate;

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeHandler?.();
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement
        && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)
      ) {
        return;
      }

      if (!canNavigate) {
        return;
      }

      event.preventDefault();
      navigateHandler?.(event.key === "ArrowRight" ? 1 : -1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeHandler, navigateHandler, canNavigate]);

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={closeHandler}>
      {children}
    </div>
  );
}

export default MediaEditorModal;
