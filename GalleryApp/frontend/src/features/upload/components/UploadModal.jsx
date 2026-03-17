import { useEffect } from "react";
import { useOptionalUploadContext } from "../context/UploadContext";

function UploadModal({ isOpen, onClose, initialData, children }) {
  const context = useOptionalUploadContext();
  const isModalOpen = context?.isOpen ?? isOpen;
  const closeHandler = context?.onClose ?? onClose;
  const prevHandler = context?.onPrev ?? initialData?.onPrev;
  const nextHandler = context?.onNext ?? initialData?.onNext;

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeHandler?.();
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
        prevHandler?.();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextHandler?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeHandler, prevHandler, nextHandler]);

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={closeHandler}>
      {children}
    </div>
  );
}

export default UploadModal;
