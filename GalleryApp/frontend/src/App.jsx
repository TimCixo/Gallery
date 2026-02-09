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
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mediaModalError, setMediaModalError] = useState("");
  const [isMediaPinned, setIsMediaPinned] = useState(true);
  const [mediaDraft, setMediaDraft] = useState({
    title: "",
    description: "",
    source: "",
    parent: "",
    child: ""
  });
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
  const getMediaShortType = (file) => {
    const source = resolveOriginalMediaUrl(file) || file?.name || "";
    const extension = getExtensionFromPath(source);
    if (extension === ".gif") {
      return "gif";
    }

    if (isVideoFile(file)) {
      return "vid";
    }

    return "img";
  };
  const fileInputRef = useRef(null);
  const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
  const getExtension = (fileName) => {
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  };
  const getDisplayName = (fileName) => {
    if (!fileName) {
      return "";
    }

    return String(fileName).replace(/\.[^/.]+$/, "");
  };
  const createMediaDraft = (file) => ({
    title: file?.title || "",
    description: file?.description || "",
    source: file?.source || "",
    parent: file?.parent == null ? "" : String(file.parent),
    child: file?.child == null ? "" : String(file.child)
  });

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

    setIsEditingMedia(false);
    setIsSavingMedia(false);
    setIsDeletingMedia(false);
    setShowDeleteConfirm(false);
    setMediaModalError("");
    setIsMediaPinned(true);
    setMediaDraft(createMediaDraft(selectedMedia));

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setSelectedMedia(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedMedia]);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const canScrollInElement = (target) => {
      if (!(target instanceof Element)) {
        return false;
      }

      if (!isMediaPinned) {
        const modal = target.closest(".media-modal");
        if (modal && modal.scrollHeight > modal.clientHeight) {
          return true;
        }
      }

      const modalMeta = target.closest(".media-modal-meta");
      if (modalMeta && modalMeta.scrollHeight > modalMeta.clientHeight) {
        return true;
      }

      const confirmDialog = target.closest(".media-confirm-dialog");
      return Boolean(confirmDialog && confirmDialog.scrollHeight > confirmDialog.clientHeight);
    };

    const handleWheel = (event) => {
      if (!canScrollInElement(event.target)) {
        event.preventDefault();
      }
    };

    const handleTouchMove = (event) => {
      if (!canScrollInElement(event.target)) {
        event.preventDefault();
      }
    };

    const handleKeyDown = (event) => {
      const blockedKeys = new Set([" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);
      if (!blockedKeys.has(event.key)) {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)
      ) {
        return;
      }

      if (!canScrollInElement(event.target)) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedMedia, isMediaPinned]);

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

  const parseNullableId = (value, label) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return null;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`${label} must be a positive integer.`);
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error(`${label} must be a positive integer.`);
    }

    return parsed;
  };

  const readResponsePayload = async (response) => {
    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  };

  const handleStartEditMedia = () => {
    if (!selectedMedia?.id) {
      setMediaModalError("Cannot edit media without id.");
      return;
    }

    setMediaModalError("");
    setShowDeleteConfirm(false);
    setMediaDraft(createMediaDraft(selectedMedia));
    setIsEditingMedia(true);
  };

  const handleCancelEditMedia = () => {
    setIsEditingMedia(false);
    setMediaModalError("");
    setMediaDraft(createMediaDraft(selectedMedia));
  };

  const handleSaveMedia = async () => {
    if (!selectedMedia?.id) {
      setMediaModalError("Cannot edit media without id.");
      return;
    }

    setMediaModalError("");

    let parent = null;
    let child = null;
    try {
      parent = parseNullableId(mediaDraft.parent, "Parent");
      child = parseNullableId(mediaDraft.child, "Child");
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Validation failed.");
      return;
    }

    if (parent === selectedMedia.id || child === selectedMedia.id) {
      setMediaModalError("Parent and Child cannot reference current media id.");
      return;
    }

    const title = mediaDraft.title.trim();
    const description = mediaDraft.description.trim();
    const source = mediaDraft.source.trim();

    if (source) {
      try {
        const url = new URL(source);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("Source URL must start with http:// or https://");
        }
      } catch {
        setMediaModalError("Source must be a valid absolute URL.");
        return;
      }
    }

    setIsSavingMedia(true);
    try {
      const response = await fetch(`/api/media/${selectedMedia.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          description: description || null,
          source: source || null,
          parent,
          child
        })
      });

      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update media.");
      }

      const patch = {
        title: result.title ?? null,
        description: result.description ?? null,
        source: result.source ?? null,
        parent: result.parent ?? null,
        child: result.child ?? null
      };

      setMediaFiles((current) => current.map((file) => (file.id === selectedMedia.id ? { ...file, ...patch } : file)));
      setSelectedMedia((current) => (current && current.id === selectedMedia.id ? { ...current, ...patch } : current));
      setIsEditingMedia(false);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to update media.");
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleConfirmDeleteMedia = async () => {
    if (!selectedMedia?.id) {
      setMediaModalError("Cannot delete media without id.");
      return;
    }

    setMediaModalError("");
    setIsDeletingMedia(true);
    try {
      const response = await fetch(`/api/media/${selectedMedia.id}`, {
        method: "DELETE"
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete media.");
      }

      setSelectedMedia(null);
      await loadMedia(currentPage);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
      setShowDeleteConfirm(false);
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
                      alt={getDisplayName(file.name)}
                      loading="lazy"
                      onError={() => {
                        setFailedPreviewPaths((prev) => new Set(prev).add(file.relativePath));
                        }}
                      />
                    ) : (
                      <div className="media-fallback">Preview unavailable</div>
                    )}
                  </div>
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
            className={`media-modal${isMediaPinned ? "" : " media-modal-unpinned"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="media-modal-header">
              <button
                type="button"
                className="media-pin-toggle"
                onClick={() => setIsMediaPinned((current) => !current)}
              >
                {isMediaPinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                className="media-modal-close"
                onClick={() => setSelectedMedia(null)}
              >
                Close
              </button>
            </div>

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
                  alt={getDisplayName(selectedMedia.name)}
                />
              )}
            </div>

            <div className="media-modal-meta">
              <table className="media-meta-table">
                <tbody>
                  <tr>
                    <th scope="row">Title</th>
                    <td>
                      {isEditingMedia ? (
                        <input
                          type="text"
                          className="media-edit-input"
                          value={mediaDraft.title}
                          onChange={(event) => setMediaDraft((current) => ({ ...current, title: event.target.value }))}
                        />
                      ) : (selectedMedia.title || "-")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Description</th>
                    <td>
                      {isEditingMedia ? (
                        <textarea
                          className="media-edit-input media-edit-textarea"
                          value={mediaDraft.description}
                          onChange={(event) => setMediaDraft((current) => ({ ...current, description: event.target.value }))}
                        />
                      ) : (selectedMedia.description || "-")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Source</th>
                    <td>
                      {isEditingMedia ? (
                        <input
                          type="text"
                          className="media-edit-input"
                          value={mediaDraft.source}
                          onChange={(event) => setMediaDraft((current) => ({ ...current, source: event.target.value }))}
                        />
                      ) : selectedMedia.source ? (
                        <a
                          href={selectedMedia.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selectedMedia.source}
                        </a>
                      ) : "-"}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Type</th>
                    <td>{getMediaShortType(selectedMedia)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Parent Link</th>
                    <td>
                      {isEditingMedia ? (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="media-edit-input"
                          value={mediaDraft.parent}
                          onChange={(event) => setMediaDraft((current) => ({ ...current, parent: event.target.value }))}
                        />
                      ) : (selectedMedia.parent ?? "-")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Child Link</th>
                    <td>
                      {isEditingMedia ? (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="media-edit-input"
                          value={mediaDraft.child}
                          onChange={(event) => setMediaDraft((current) => ({ ...current, child: event.target.value }))}
                        />
                      ) : (selectedMedia.child ?? "-")}
                    </td>
                  </tr>
                </tbody>
              </table>

              <details className="media-system-callout">
                <summary className="media-system-summary">System details</summary>
                <table className="media-system-table">
                  <tbody>
                    <tr>
                      <th scope="row">Id</th>
                      <td>{selectedMedia.id ?? "-"}</td>
                    </tr>
                    <tr>
                      <th scope="row">Path</th>
                      <td>{selectedMedia.relativePath || "-"}</td>
                    </tr>
                    <tr>
                      <th scope="row">Created At</th>
                      <td>{formatMediaDate(selectedMedia.createdAtUtc || selectedMedia.modifiedAtUtc)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Name</th>
                      <td>{selectedMedia.name || "-"}</td>
                    </tr>
                  </tbody>
                </table>

                {mediaModalError ? (
                  <p className="media-action-error">{mediaModalError}</p>
                ) : null}

                {isEditingMedia ? (
                  <div className="media-action-row">
                    <button
                      type="button"
                      className="media-action-btn media-action-primary"
                      onClick={handleSaveMedia}
                      disabled={isSavingMedia || isDeletingMedia}
                    >
                      {isSavingMedia ? "Saving..." : "Okay"}
                    </button>
                    <button
                      type="button"
                      className="media-action-btn"
                      onClick={handleCancelEditMedia}
                      disabled={isSavingMedia || isDeletingMedia}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="media-action-row">
                    <button
                      type="button"
                      className="media-action-btn media-action-primary"
                      onClick={handleStartEditMedia}
                      disabled={!selectedMedia.id || isDeletingMedia}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="media-action-btn media-action-danger"
                      onClick={() => {
                        setMediaModalError("");
                        setShowDeleteConfirm(true);
                      }}
                      disabled={!selectedMedia.id || isDeletingMedia}
                    >
                      Delete
                    </button>
                  </div>
                )}

              </details>
            </div>
          </div>
          {showDeleteConfirm && !isEditingMedia ? (
            <div
              className="media-confirm-overlay"
              onClick={() => !isDeletingMedia && setShowDeleteConfirm(false)}
            >
              <div
                className="media-confirm-dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <p>Are you sure?</p>
                <div className="media-delete-buttons">
                  <button
                    type="button"
                    className="media-action-btn media-action-danger"
                    onClick={handleConfirmDeleteMedia}
                    disabled={isDeletingMedia}
                  >
                    {isDeletingMedia ? "Deleting..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    className="media-action-btn"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingMedia}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

export default App;
