import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const PAGE_SIZE = 36;
  const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".mkv",
    ".m4v"
  ]);
  const [health, setHealth] = useState("loading...");
  const [inputValue, setInputValue] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [invalidFileNames, setInvalidFileNames] = useState([]);
  const [uploadState, setUploadState] = useState({ type: "", message: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());
  const [selectedMedia, setSelectedMedia] = useState(null);
  const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);
  const videoExtensions = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]);
  const getExtensionFromPath = (value) => {
    if (!value) {
      return "";
    }

    const cleanValue = String(value).split("?")[0];
    const dotIndex = cleanValue.lastIndexOf(".");
    return dotIndex >= 0 ? cleanValue.slice(dotIndex).toLowerCase() : "";
  };
  const resolveTileUrl = (file) => {
    if (file?.tileUrl) {
      return file.tileUrl;
    }

    if (file?.previewUrl) {
      return file.previewUrl;
    }

    const original = file?.originalUrl || file?.url || "";
    if (file?.mediaType === "image" && original) {
      return original;
    }

    if (imageExtensions.has(getExtensionFromPath(original))) {
      return original;
    }

    if ((file?.mediaType === "video" || file?.mediaType === "gif") && file?.relativePath) {
      return `/api/media/preview?path=${encodeURIComponent(file.relativePath)}`;
    }

    return "";
  };
  const visibleMediaFiles = mediaFiles
    .map((file) => ({ ...file, _tileUrl: resolveTileUrl(file) }));
  const resolveOriginalMediaUrl = (file) => file?.originalUrl || file?.url || file?._tileUrl || "";
  const isVideoFile = (file) => {
    if (!file) {
      return false;
    }

    if (file.mediaType === "video") {
      return true;
    }

    return videoExtensions.has(getExtensionFromPath(resolveOriginalMediaUrl(file) || file.name));
  };
  const formatMediaDate = (value) => {
    if (!value) {
      return "Unknown";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString();
  };
  const fileInputRef = useRef(null);
  const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
  const getExtension = (fileName) => {
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  };

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setHealth(`${data.status} (${data.timestampUtc})`))
      .catch(() => setHealth("backend unavailable"));
  }, []);

  const loadMedia = async (page = 1) => {
    setIsMediaLoading(true);
    setMediaError("");

    try {
      const response = await fetch(`/api/media?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!response.ok) {
        throw new Error("Failed to fetch media files.");
      }

      const result = await response.json();
      setMediaFiles(Array.isArray(result.files) ? result.files : []);
      setCurrentPage(Number.isInteger(result.page) ? result.page : page);
      setTotalPages(Number.isInteger(result.totalPages) ? result.totalPages : 0);
      setTotalFiles(Number.isInteger(result.totalCount) ? result.totalCount : 0);
      setFailedPreviewPaths(new Set());
      setSelectedMedia(null);
    } catch (error) {
      setMediaFiles([]);
      setTotalPages(0);
      setTotalFiles(0);
      setMediaError(error instanceof Error ? error.message : "Failed to fetch media files.");
    } finally {
      setIsMediaLoading(false);
    }
  };

  useEffect(() => {
    loadMedia(1);
  }, []);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setSelectedMedia(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedMedia]);

  const handlePageChange = (nextPage) => {
    if (isMediaLoading) {
      return;
    }

    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages) || nextPage === currentPage) {
      return;
    }

    loadMedia(nextPage);
  };

  const renderPagination = () => (
    <div className="media-pagination">
      <button
        type="button"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isMediaLoading || currentPage <= 1 || totalPages === 0}
      >
        Prev
      </button>
      <p>
        Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
      </p>
      <button
        type="button"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isMediaLoading || totalPages === 0 || currentPage >= totalPages}
      >
        Next
      </button>
    </div>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedText(inputValue.trim());
  };

  const openUploadModal = () => {
    setUploadState({ type: "", message: "" });
    setIsUploadOpen(true);
  };

  const closeUploadModal = () => {
    setIsUploadOpen(false);
    setIsDragging(false);
    setSelectedFiles([]);
    setInvalidFileNames([]);
    setUploadState({ type: "", message: "" });
    setIsUploading(false);
  };

  const addFiles = (files) => {
    const next = Array.from(files);
    if (next.length === 0) {
      return;
    }

    setSelectedFiles((current) => {
      const map = new Map(current.map((file) => [getFileKey(file), file]));
      next.forEach((file) => {
        map.set(getFileKey(file), file);
      });
      return Array.from(map.values());
    });
    setInvalidFileNames([]);
    setUploadState({ type: "", message: "" });
  };

  const removeSelectedFile = (fileToRemove) => {
    const removeKey = getFileKey(fileToRemove);
    setSelectedFiles((current) => current.filter((file) => getFileKey(file) !== removeKey));
    setInvalidFileNames((current) => current.filter((name) => name !== fileToRemove.name));
    setUploadState({ type: "", message: "" });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadState({ type: "error", message: "Select at least one file." });
      return;
    }

    setIsUploading(true);
    setInvalidFileNames([]);
    setUploadState({ type: "", message: "" });

    try {
      const unsupportedFiles = selectedFiles.filter((file) => !allowedExtensions.has(getExtension(file.name)));
      if (unsupportedFiles.length > 0) {
        setInvalidFileNames(unsupportedFiles.map((file) => file.name));
        setUploadState({ type: "error", message: `Unsupported file type: ${unsupportedFiles[0].name}` });
        return;
      }

      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result?.error || "Upload failed.";
        const unsupportedMatch = /^Unsupported file type:\s*(.+)$/i.exec(errorMessage);
        if (unsupportedMatch?.[1]) {
          setInvalidFileNames([unsupportedMatch[1].trim()]);
        }
        throw new Error(errorMessage);
      }

      setUploadState({
        type: "success",
        message: `Uploaded ${result.files?.length ?? selectedFiles.length} file(s) to ${result.dateFolder}.`
      });
      setSelectedFiles([]);
      setInvalidFileNames([]);
      await loadMedia(1);
    } catch (error) {
      setUploadState({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed."
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="app-root">
      <header className="top-header">
        <a
          className="top-brand"
          href="/"
        >
          Gallery
        </a>

        <form
          className="top-form"
          onSubmit={handleSubmit}
        >
          <input
            className="top-input"
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Type text..."
          />
          <button
            type="submit"
            style={{
              padding: "0.55rem 0.85rem",
              border: "1px solid #0f172a",
              borderRadius: "0.45rem",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </form>

        <button
          className="top-upload"
          type="button"
          onClick={openUploadModal}
          style={{
            fontSize: "0.8rem",
            padding: "0.4rem 0.65rem",
            border: "1px solid #c6ccd2",
            borderRadius: "0.45rem",
            backgroundColor: "#ffffff",
            cursor: "pointer",
          }}
        >
          Upload
        </button>
      </header>

      <section className="media-section">
        {mediaError ? <p className="media-state error">{mediaError}</p> : null}
        {!mediaError && isMediaLoading ? <p className="media-state">Loading media...</p> : null}
        {!mediaError && !isMediaLoading && totalFiles === 0 ? (
          <p className="media-state">No files in backend/App_Data/Media.</p>
        ) : null}
        {!mediaError && !isMediaLoading && totalFiles > 0 && visibleMediaFiles.length === 0 ? (
          <p className="media-state">No preview images available for current files.</p>
        ) : null}

        {!mediaError && visibleMediaFiles.length > 0 ? (
          <>
            {renderPagination()}
            <div className="media-grid">
              {visibleMediaFiles.map((file) => (
                <article
                  key={file.relativePath}
                  className="media-tile"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMedia(file)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedMedia(file);
                    }
                  }}
                >
                  <div className="media-preview">
                    {file._tileUrl && !failedPreviewPaths.has(file.relativePath) ? (
                      <img
                        src={file._tileUrl}
                        alt={file.name}
                        loading="lazy"
                        onError={() => {
                          setFailedPreviewPaths((prev) => new Set(prev).add(file.relativePath));
                        }}
                      />
                    ) : (
                      <div className="media-fallback">Preview unavailable</div>
                    )}
                  </div>
                  <p
                    className="media-name"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                </article>
              ))}
            </div>
            {renderPagination()}
          </>
        ) : null}
      </section>

      <footer className="app-footer">
        <p>React frontend is running.</p>
        <p>Backend health: {health}</p>
        <p>Total saved files: {totalFiles}</p>
        {submittedText ? <p>Last submitted: {submittedText}</p> : null}
      </footer>

      {isUploadOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              backgroundColor: "#ffffff",
              borderRadius: "0.7rem",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
              padding: "1rem"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Upload media</h2>
              <button
                type="button"
                onClick={closeUploadModal}
                style={{
                  border: "1px solid #c6ccd2",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.4rem",
                  padding: "0.25rem 0.5rem",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? "2px dashed #0f172a" : "2px dashed #94a3b8",
                borderRadius: "0.6rem",
                padding: "2rem 1rem",
                textAlign: "center",
                backgroundColor: isDragging ? "#eef2ff" : "#f8fafc",
                cursor: "pointer"
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.gif"
                onChange={(event) => {
                  addFiles(event.target.files || []);
                  event.target.value = "";
                }}
                style={{ display: "none" }}
              />
              <p style={{ margin: 0, color: "#334155" }}>
                Drag and drop media files here, or click to select.
              </p>
            </div>

            <div style={{ marginTop: "0.75rem", maxHeight: "130px", overflowY: "auto" }}>
              {selectedFiles.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.92rem" }}>No files selected.</p>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.35rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles([]);
                        setInvalidFileNames([]);
                        setUploadState({ type: "", message: "" });
                      }}
                      style={{
                        border: "1px solid #c6ccd2",
                        backgroundColor: "#ffffff",
                        borderRadius: "0.35rem",
                        fontSize: "0.78rem",
                        padding: "0.18rem 0.45rem",
                        cursor: "pointer"
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                  {selectedFiles.map((file) => {
                    const key = getFileKey(file);
                    const isInvalid = invalidFileNames.includes(file.name);
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          margin: "0.2rem 0",
                          fontSize: "0.9rem",
                          color: isInvalid ? "#b91c1c" : "#0f172a"
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(file)}
                          aria-label={`Exclude ${file.name}`}
                          style={{
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            borderRadius: "0.35rem",
                            fontSize: "0.72rem",
                            lineHeight: 1,
                            width: "1.1rem",
                            height: "1.1rem",
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                        >
                          -
                        </button>
                        <span className="file-name">
                          {file.name}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {uploadState.message ? (
              <p
                style={{
                  marginTop: "0.75rem",
                  marginBottom: 0,
                  color: uploadState.type === "error" ? "#b91c1c" : "#166534",
                  fontSize: "0.9rem"
                }}
              >
                {uploadState.message}
              </p>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                style={{
                  padding: "0.5rem 0.8rem",
                  border: "1px solid #0f172a",
                  borderRadius: "0.45rem",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  cursor: isUploading ? "default" : "pointer",
                  opacity: isUploading ? 0.7 : 1
                }}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedMedia ? (
        <div
          className="media-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="media-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="media-modal-close"
              onClick={() => setSelectedMedia(null)}
            >
              Close
            </button>

            <div className="media-modal-content">
              {isVideoFile(selectedMedia) ? (
                <video
                  src={resolveOriginalMediaUrl(selectedMedia)}
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={resolveOriginalMediaUrl(selectedMedia)}
                  alt={selectedMedia.name}
                />
              )}
            </div>

            <div className="media-modal-meta">
              <p
                className="media-modal-name"
                title={selectedMedia.name}
              >
                {selectedMedia.name}
              </p>
              <p className="media-modal-date">
                Created: {formatMediaDate(selectedMedia.createdAtUtc || selectedMedia.modifiedAtUtc)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
