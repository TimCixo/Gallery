import { useEffect } from "react";

function UploadModal({ isOpen, onClose, onSubmit, initialData, children }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        initialData?.onPrev?.();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        initialData?.onNext?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, initialData]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      {children}
    </div>
  );
}

export default UploadModal;
