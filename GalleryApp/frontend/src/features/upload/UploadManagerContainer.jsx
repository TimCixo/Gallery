import { useRef, useState } from "react";
import { uploadApi } from "../../api/uploadApi";
import UploadModal from "./components/UploadModal";

export default function UploadManagerContainer() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadItems, setUploadItems] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  const closeModal = () => {
    if (isUploading) {
      return;
    }

    setIsUploadOpen(false);
    setUploadError("");
    setUploadSuccess("");
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  const appendFiles = (files) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) {
      return;
    }

    setUploadItems((current) => [...current, ...nextFiles]);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleUploadPickerChange = (event) => {
    appendFiles(event.target.files);
    event.target.value = "";
  };

  const handleRemoveUploadItem = (index) => {
    setUploadItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleUpload = async () => {
    if (isUploading || uploadItems.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const response = await uploadApi.uploadFiles(uploadItems);
      const uploadedCount = Array.isArray(response?.files) ? response.files.length : 0;
      setUploadItems([]);
      setUploadSuccess(uploadedCount > 0 ? `Uploaded ${uploadedCount} file(s).` : "Upload completed.");
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,.gif,.jfif"
        onChange={handleUploadPickerChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className="top-upload-btn"
        onClick={() => setIsUploadOpen(true)}
      >
        Upload
      </button>
      <UploadModal isOpen={isUploadOpen} onClose={closeModal}>
        <div className="media-modal media-modal-upload-queue" onClick={(event) => event.stopPropagation()}>
          <header className="media-modal-header">
            <h2>Upload manager</h2>
          </header>
          <div className="media-modal-body">
            <div className="media-action-row">
              <button type="button" className="media-action-btn media-action-primary" onClick={openPicker} disabled={isUploading}>
                Add files
              </button>
              <button type="button" className="media-action-btn" onClick={() => setUploadItems([])} disabled={isUploading || uploadItems.length === 0}>
                Clear queue
              </button>
            </div>

            {uploadError ? <p className="media-state error">{uploadError}</p> : null}
            {uploadSuccess ? <p className="media-state">{uploadSuccess}</p> : null}

            {uploadItems.length === 0 ? (
              <p className="media-state">No files selected.</p>
            ) : (
              <ul className="upload-file-list">
                {uploadItems.map((item, index) => (
                  <li key={`${item.name}-${item.size}-${index}`} className="upload-file-item">
                    <span>{item.name}</span>
                    <button
                      type="button"
                      className="media-action-btn"
                      onClick={() => handleRemoveUploadItem(index)}
                      disabled={isUploading}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className="media-modal-footer">
            <button
              type="button"
              className="media-action-btn media-action-primary"
              onClick={handleUpload}
              disabled={isUploading || uploadItems.length === 0}
            >
              {isUploading ? "Uploading..." : "Start upload"}
            </button>
            <button type="button" className="media-action-btn" onClick={closeModal} disabled={isUploading}>
              Close
            </button>
          </footer>
        </div>
      </UploadModal>
    </>
  );
}
