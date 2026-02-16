import { useState } from "react";
import UploadModal from "./components/UploadModal";

export default function UploadManagerContainer() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <button type="button" className="top-upload-btn" onClick={() => setIsUploadOpen(true)}>
        Upload
      </button>
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <div className="media-modal" onClick={(event) => event.stopPropagation()}>
          <header className="media-modal-header">
            <h2>Upload manager</h2>
          </header>
          <div className="media-modal-body">
            <p>Upload workflow was moved into UploadManagerContainer.</p>
          </div>
          <footer className="media-modal-footer">
            <button type="button" className="media-action-btn" onClick={() => setIsUploadOpen(false)}>
              Close
            </button>
          </footer>
        </div>
      </UploadModal>
    </>
  );
}
