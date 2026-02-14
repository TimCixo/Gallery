import { useEffect } from "react";

function MediaEditorModal({ isOpen, onClose, onNavigate, initialData, children }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
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

      if (!initialData?.canNavigate) {
        return;
      }

      event.preventDefault();
      onNavigate?.(event.key === "ArrowRight" ? 1 : -1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigate, initialData?.canNavigate]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      {children}
    </div>
  );
}

export default MediaEditorModal;
