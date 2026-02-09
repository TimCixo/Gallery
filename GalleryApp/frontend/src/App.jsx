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
  const [isSlideMenuOpen, setIsSlideMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("gallery");
  const [uploadItems, setUploadItems] = useState([]);
  const [uploadState, setUploadState] = useState({ type: "", message: "" });
  const [backgroundUploadState, setBackgroundUploadState] = useState({
    total: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    isProcessing: false,
    activeFileName: "",
    activePercent: 0
  });
  const [uploadTaskStatuses, setUploadTaskStatuses] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [favoritesFiles, setFavoritesFiles] = useState([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesTotalPages, setFavoritesTotalPages] = useState(0);
  const [favoritesTotalFiles, setFavoritesTotalFiles] = useState(0);
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
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false);
  const [mediaDraft, setMediaDraft] = useState({
    title: "",
    description: "",
    source: "",
    parent: "",
    child: ""
  });
  const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);
  const videoExtensions = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]);
  const backgroundUploadQueueRef = useRef([]);
  const isBackgroundUploadWorkerRunningRef = useRef(false);
  const uploadTaskSequenceRef = useRef(1);
  const activeUploadTaskIdRef = useRef(null);
  const activeUploadXhrRef = useRef(null);
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
  const visibleFavoriteFiles = favoritesFiles
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
  const renderMediaMetaTable = ({ file, draft, editable, onDraftChange, extraRows = null }) => (
    <table className="media-meta-table">
      <tbody>
        {extraRows}
        <tr>
          <th scope="row">Title</th>
          <td>
            {editable ? (
              <input
                type="text"
                className="media-edit-input"
                value={draft.title}
                onChange={(event) => onDraftChange({ title: event.target.value })}
              />
            ) : (file?.title || "-")}
          </td>
        </tr>
        <tr>
          <th scope="row">Description</th>
          <td>
            {editable ? (
              <textarea
                className="media-edit-input media-edit-textarea"
                value={draft.description}
                onChange={(event) => onDraftChange({ description: event.target.value })}
              />
            ) : (file?.description || "-")}
          </td>
        </tr>
        <tr>
          <th scope="row">Source</th>
          <td>
            {editable ? (
              <input
                type="text"
                className="media-edit-input"
                value={draft.source}
                onChange={(event) => onDraftChange({ source: event.target.value })}
              />
            ) : file?.source ? (
              <a
                href={file.source}
                target="_blank"
                rel="noreferrer"
              >
                {file.source}
              </a>
            ) : "-"}
          </td>
        </tr>
        <tr>
          <th scope="row">Type</th>
          <td>{getMediaShortType(file)}</td>
        </tr>
        <tr>
          <th scope="row">Parent Link</th>
          <td>
            {editable ? (
              <input
                type="number"
                min="1"
                step="1"
                className="media-edit-input"
                value={draft.parent}
                onChange={(event) => onDraftChange({ parent: event.target.value })}
              />
            ) : (file?.parent ?? "-")}
          </td>
        </tr>
        <tr>
          <th scope="row">Child Link</th>
          <td>
            {editable ? (
              <input
                type="number"
                min="1"
                step="1"
                className="media-edit-input"
                value={draft.child}
                onChange={(event) => onDraftChange({ child: event.target.value })}
              />
            ) : (file?.child ?? "-")}
          </td>
        </tr>
      </tbody>
    </table>
  );
  const uploadPickerRef = useRef(null);
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
    if (activePage === "favorites") {
      loadFavorites(1);
    }
  }, [activePage]);

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
    setIsFavoriteUpdating(false);
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
    if (!isUploadOpen) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        closeUploadModal();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isUploadOpen]);

  useEffect(() => {
    if (!isSlideMenuOpen) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsSlideMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isSlideMenuOpen]);

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

  const handleFavoritesPageChange = (nextPage) => {
    if (isFavoritesLoading) {
      return;
    }

    if (nextPage < 1 || (favoritesTotalPages > 0 && nextPage > favoritesTotalPages) || nextPage === favoritesPage) {
      return;
    }

    loadFavorites(nextPage);
  };

  const renderFavoritesPagination = () => (
    <div className="media-pagination">
      <button
        type="button"
        onClick={() => handleFavoritesPageChange(favoritesPage - 1)}
        disabled={isFavoritesLoading || favoritesPage <= 1 || favoritesTotalPages === 0}
      >
        Prev
      </button>
      <p>
        Page {favoritesTotalPages === 0 ? 0 : favoritesPage} of {favoritesTotalPages}
      </p>
      <button
        type="button"
        onClick={() => handleFavoritesPageChange(favoritesPage + 1)}
        disabled={isFavoritesLoading || favoritesTotalPages === 0 || favoritesPage >= favoritesTotalPages}
      >
        Next
      </button>
    </div>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmittedText(inputValue.trim());
  };

  const openUploadPicker = () => {
    uploadPickerRef.current?.click();
  };

  const closeUploadModal = () => {
    setUploadItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setIsUploadOpen(false);
    setUploadState({ type: "", message: "" });
  };

  const handleUploadPickerChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (nextFiles.length === 0) {
      return;
    }

    const uniqueMap = new Map(nextFiles.map((file) => [getFileKey(file), file]));
    const nextItems = Array.from(uniqueMap.values()).map((file) => {
      const sourceUrl = URL.createObjectURL(file);
      const extension = getExtension(file.name);
      return {
        key: getFileKey(file),
        file,
        previewUrl: sourceUrl,
        mediaType: videoExtensions.has(extension) ? "video" : "image",
        draft: createMediaDraft(null)
      };
    });

    setUploadItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return nextItems;
    });
    setUploadState({ type: "", message: "" });
    setIsUploadOpen(true);
  };

  const updateActiveUploadDraft = (patch) => {
    setUploadItems((current) => {
      if (current.length === 0) {
        return current;
      }

      const [first, ...rest] = current;
      return [{ ...first, draft: { ...first.draft, ...patch } }, ...rest];
    });
  };

  const uploadSingleFileWithProgress = (file, onProgress, onXhrReady) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onXhrReady?.(xhr);
    const formData = new FormData();
    formData.append("files", file);

    xhr.upload.onprogress = (progressEvent) => {
      const loaded = progressEvent.loaded || 0;
      const total = progressEvent.total || 0;
      const percent = total > 0 ? Math.min((loaded / total) * 100, 100) : 0;
      onProgress(percent);
    };

    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.onload = () => {
      let payload = {};
      if (xhr.responseType === "json") {
        payload = xhr.response || {};
      } else {
        try {
          payload = JSON.parse(xhr.responseText || "{}");
        } catch {
          payload = {};
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        const errorMessage = payload?.error || "Upload failed.";
        reject(new Error(errorMessage));
      }
    };

    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";
    xhr.send(formData);
  });

  const runBackgroundUploadQueue = async () => {
    if (isBackgroundUploadWorkerRunningRef.current) {
      return;
    }

    isBackgroundUploadWorkerRunningRef.current = true;
    try {
      while (backgroundUploadQueueRef.current.length > 0) {
        const task = backgroundUploadQueueRef.current.shift();
        if (!task) {
          continue;
        }

        setBackgroundUploadState((current) => ({
          ...current,
          queued: Math.max(current.queued - 1, 0),
          isProcessing: true,
          activeFileName: task.file.name,
          activePercent: 0
        }));
        setUploadTaskStatuses((current) => current.map((item) => (
          item.id === task.taskId
            ? { ...item, status: "uploading", percent: 0, error: "" }
            : item
        )));
        activeUploadTaskIdRef.current = task.taskId;

        try {
          const result = await uploadSingleFileWithProgress(
            task.file,
            (percent) => {
              setBackgroundUploadState((current) => ({ ...current, activePercent: percent }));
              setUploadTaskStatuses((current) => current.map((item) => (
                item.id === task.taskId
                  ? { ...item, status: "uploading", percent }
                  : item
              )));
            },
            (xhr) => {
              activeUploadXhrRef.current = xhr;
            }
          );
          const uploadedFiles = Array.isArray(result.files) ? result.files : [];
          const uploaded = uploadedFiles[0];
          const uploadedRelativePath = uploaded?.relativePath || "";
          const uploadedExtension = getExtension(uploadedRelativePath || task.file.name);
          const uploadedMedia = uploadedRelativePath
            ? {
              id: uploaded?.id ?? null,
              name: uploaded?.storedName || task.file.name,
              relativePath: uploadedRelativePath,
              originalUrl: `/media/${encodeURIComponent(uploadedRelativePath).replace(/%2F/g, "/")}`,
              mediaType: videoExtensions.has(uploadedExtension) ? "video" : "image",
              title: task.draft.title || null,
              description: task.draft.description || null,
              source: task.draft.source || null,
              parent: task.draft.parent ?? null,
              child: task.draft.child ?? null
            }
            : null;

          if (uploaded?.id) {
            const response = await fetch(`/api/media/${uploaded.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(task.draft)
            });
            if (!response.ok) {
              const payload = await readResponsePayload(response);
              throw new Error(payload?.error || `Failed to save metadata for ${task.file.name}.`);
            }
          }

          await loadMedia(1);
          setBackgroundUploadState((current) => ({
            ...current,
            completed: current.completed + 1,
            activePercent: 100
          }));
          setUploadTaskStatuses((current) => current.map((item) => (
            item.id === task.taskId
              ? { ...item, status: "uploaded", percent: 100, error: "", uploadedMedia }
              : item
          )));
        } catch (error) {
          setBackgroundUploadState((current) => ({
            ...current,
            failed: current.failed + 1,
            activePercent: 0
          }));
          setUploadTaskStatuses((current) => current.map((item) => (
            item.id === task.taskId
              ? {
                ...item,
                status: "error",
                percent: 0,
                error: error instanceof Error ? error.message : "Upload failed."
              }
              : item
          )));
        } finally {
          activeUploadTaskIdRef.current = null;
          activeUploadXhrRef.current = null;
          setBackgroundUploadState((current) => ({
            ...current,
            activeFileName: "",
            activePercent: 0
          }));
        }
      }
    } finally {
      isBackgroundUploadWorkerRunningRef.current = false;
      setBackgroundUploadState((current) => ({
        ...current,
        isProcessing: false,
        activeFileName: "",
        activePercent: 0
      }));
      if (backgroundUploadQueueRef.current.length > 0) {
        void runBackgroundUploadQueue();
      }
    }
  };

  const loadFavorites = async (page = 1) => {
    setIsFavoritesLoading(true);
    setFavoritesError("");

    try {
      const response = await fetch(`/api/favorites?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!response.ok) {
        throw new Error("Failed to fetch favorites.");
      }

      const result = await response.json();
      setFavoritesFiles(Array.isArray(result.files) ? result.files : []);
      setFavoritesPage(Number.isInteger(result.page) ? result.page : page);
      setFavoritesTotalPages(Number.isInteger(result.totalPages) ? result.totalPages : 0);
      setFavoritesTotalFiles(Number.isInteger(result.totalCount) ? result.totalCount : 0);
    } catch (error) {
      setFavoritesFiles([]);
      setFavoritesPage(1);
      setFavoritesTotalPages(0);
      setFavoritesTotalFiles(0);
      setFavoritesError(error instanceof Error ? error.message : "Failed to fetch favorites.");
    } finally {
      setIsFavoritesLoading(false);
    }
  };

  const enqueueBackgroundUpload = (task) => {
    const taskId = uploadTaskSequenceRef.current;
    uploadTaskSequenceRef.current += 1;

    backgroundUploadQueueRef.current.push({ ...task, taskId });
    setBackgroundUploadState((current) => ({
      ...current,
      total: current.total + 1,
      queued: current.queued + 1
    }));
    setUploadTaskStatuses((current) => {
      const next = [
        {
          id: taskId,
          fileName: task.file.name,
          status: "uploading",
          percent: 0,
          error: "",
          uploadedMedia: null
        },
        ...current
      ];
      return next.slice(0, 60);
    });
    void runBackgroundUploadQueue();
  };

  const handleCancelUploadTask = (taskId) => {
    if (!taskId) {
      return;
    }

    const isActiveTask = activeUploadTaskIdRef.current === taskId;
    if (isActiveTask) {
      if (activeUploadXhrRef.current) {
        activeUploadXhrRef.current.abort();
      }
      return;
    }

    const previousLength = backgroundUploadQueueRef.current.length;
    backgroundUploadQueueRef.current = backgroundUploadQueueRef.current.filter((task) => task.taskId !== taskId);
    if (backgroundUploadQueueRef.current.length === previousLength) {
      return;
    }

    setBackgroundUploadState((current) => ({
      ...current,
      queued: Math.max(current.queued - 1, 0),
      failed: current.failed + 1
    }));
    setUploadTaskStatuses((current) => current.map((item) => (
      item.id === taskId
        ? { ...item, status: "error", percent: 0, error: "Upload cancelled." }
        : item
    )));
  };

  const handleOpenUploadedTask = (taskId) => {
    const task = uploadTaskStatuses.find((item) => item.id === taskId);
    if (!task?.uploadedMedia) {
      return;
    }

    setSelectedMedia(task.uploadedMedia);
  };

  const copyTextToClipboard = async (text) => {
    const value = String(text || "");
    if (!value) {
      return false;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const handleCopyUploadError = async (taskId) => {
    const task = uploadTaskStatuses.find((item) => item.id === taskId);
    if (!task?.error) {
      return;
    }

    const copied = await copyTextToClipboard(task.error);
    if (copied) {
      setUploadState({ type: "success", message: "Error copied to clipboard." });
    } else {
      setUploadState({ type: "error", message: "Failed to copy error to clipboard." });
    }
  };

  const handleUpload = async () => {
    const activeItem = uploadItems[0];
    if (!activeItem) {
      setUploadState({ type: "error", message: "Select at least one file." });
      return;
    }

    setUploadState({ type: "", message: "" });

    if (!allowedExtensions.has(getExtension(activeItem.file.name))) {
      setUploadState({ type: "error", message: `Unsupported file type: ${activeItem.file.name}` });
      return;
    }

    let normalizedDraft;
    try {
      const title = activeItem.draft.title.trim();
      const description = activeItem.draft.description.trim();
      const source = activeItem.draft.source.trim();
      const parent = parseNullableId(activeItem.draft.parent, "Parent");
      const child = parseNullableId(activeItem.draft.child, "Child");

      if (source) {
        try {
          const url = new URL(source);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Source URL must start with http:// or https://");
          }
        } catch {
          throw new Error(`Source must be a valid absolute URL for file "${activeItem.file.name}".`);
        }
      }

      normalizedDraft = {
        title: title || null,
        description: description || null,
        source: source || null,
        parent,
        child
      };
    } catch (error) {
      setUploadState({
        type: "error",
        message: error instanceof Error ? error.message : "Validation failed."
      });
      return;
    }

    enqueueBackgroundUpload({
      file: activeItem.file,
      draft: normalizedDraft
    });

    const remaining = Math.max(uploadItems.length - 1, 0);
    setUploadItems((current) => {
      if (current.length === 0) {
        return current;
      }

      const [first, ...rest] = current;
      URL.revokeObjectURL(first.previewUrl);
      return rest;
    });

    if (remaining === 0) {
      closeUploadModal();
    } else {
      setUploadState({
        type: "success",
        message: `Queued: ${activeItem.file.name}. Remaining: ${remaining}`
      });
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
      await loadFavorites(favoritesPage);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
      setShowDeleteConfirm(false);
    }
  };

  const activeUploadItem = uploadItems[0] || null;
  const activeUploadFile = activeUploadItem
    ? {
      name: activeUploadItem.file.name,
      originalUrl: activeUploadItem.previewUrl,
      mediaType: activeUploadItem.mediaType,
      title: activeUploadItem.draft.title,
      description: activeUploadItem.draft.description,
      source: activeUploadItem.draft.source,
      parent: activeUploadItem.draft.parent ? Number(activeUploadItem.draft.parent) : null,
      child: activeUploadItem.draft.child ? Number(activeUploadItem.draft.child) : null
    }
    : null;
  const hasUploadHistory = uploadTaskStatuses.length > 0 || backgroundUploadState.total > 0;
  const backgroundRemaining = backgroundUploadState.queued + (backgroundUploadState.isProcessing ? 1 : 0);
  const uploadDropdownSummary = backgroundUploadState.total === 0
    ? "No uploads"
    : backgroundRemaining > 0
      ? `Uploading ${backgroundUploadState.completed + backgroundUploadState.failed}/${backgroundUploadState.total}`
      : `Uploaded ${backgroundUploadState.completed}/${backgroundUploadState.total}`;
  const getUploadTaskStatusLabel = (status) => {
    if (status === "uploaded") {
      return "Uploaded";
    }

    if (status === "error") {
      return "Error";
    }

    return "Uploading";
  };
  const isGalleryPage = activePage === "gallery";
  const isSelectedMediaFavorite = Boolean(selectedMedia?.isFavorite);
  const toggleSelectedMediaFavorite = async () => {
    if (!selectedMedia?.id || isFavoriteUpdating) {
      return;
    }

    const nextIsFavorite = !Boolean(selectedMedia.isFavorite);
    const mediaId = selectedMedia.id;

    setIsFavoriteUpdating(true);
    setMediaModalError("");
    try {
      const response = await fetch(`/api/media/${mediaId}/favorite`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextIsFavorite })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update favorites.");
      }

      setSelectedMedia((current) => (
        current && current.id === mediaId ? { ...current, isFavorite: nextIsFavorite } : current
      ));
      setMediaFiles((current) => current.map((file) => (
        file.id === mediaId ? { ...file, isFavorite: nextIsFavorite } : file
      )));
      await loadFavorites(favoritesPage);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to update favorites.");
    } finally {
      setIsFavoriteUpdating(false);
    }
  };
  const openGalleryPage = (event) => {
    event.preventDefault();
    setActivePage("gallery");
    setIsSlideMenuOpen(false);
  };
  const openFavoritesPage = () => {
    setActivePage("favorites");
    setIsSlideMenuOpen(false);
    setSelectedMedia(null);
  };

  return (
    <main className="app-root">
      <header className="top-header">
        <div className="top-brand-group">
          <button
            type="button"
            className="top-menu-toggle"
            onClick={() => setIsSlideMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={isSlideMenuOpen}
            aria-controls="app-slide-menu"
          >
            <span />
            <span />
            <span />
          </button>
          <a
            className="top-brand"
            href="/"
            onClick={openGalleryPage}
          >
            Gallery
          </a>
        </div>

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

        <div className="top-upload-group">
          {hasUploadHistory ? (
          <details className="top-upload-dropdown">
            <summary className="top-upload-dropdown-summary">
              {uploadDropdownSummary}
            </summary>
            <div className="top-upload-dropdown-menu">
              {uploadTaskStatuses.length === 0 ? (
                <p className="top-upload-empty">No uploads</p>
              ) : (
                <ul className="top-upload-list">
                  {uploadTaskStatuses.map((task) => (
                    <li
                      key={task.id}
                      className="top-upload-item"
                    >
                      <span className="top-upload-file">{task.fileName}</span>
                      {task.status === "uploading" ? (
                        <button
                          type="button"
                          className="top-upload-action top-upload-action-uploading"
                          onClick={() => handleCancelUploadTask(task.id)}
                          title="Click to cancel upload"
                        >
                          <div className="top-upload-inline-progress">
                            <div
                              className="top-upload-inline-progress-fill"
                              style={{ width: `${Math.max(0, Math.min(task.percent || 0, 100))}%` }}
                            />
                          </div>
                        </button>
                      ) : task.status === "uploaded" ? (
                        <button
                          type="button"
                          className="top-upload-action top-upload-action-uploaded"
                          onClick={() => handleOpenUploadedTask(task.id)}
                          title="Click to open uploaded file"
                        >
                          {getUploadTaskStatusLabel(task.status)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="top-upload-action top-upload-action-error"
                          onClick={() => handleCopyUploadError(task.id)}
                          title={task.error || "Click to copy error text"}
                        >
                          {getUploadTaskStatusLabel(task.status)}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
          ) : null}
          <button
            className="top-upload"
            type="button"
            onClick={openUploadPicker}
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
        </div>
        <input
          ref={uploadPickerRef}
          type="file"
          multiple
          accept="image/*,video/*,.gif"
          onChange={handleUploadPickerChange}
          style={{ display: "none" }}
        />
      </header>

      {isSlideMenuOpen ? (
        <div
          className="slide-menu-overlay"
          onClick={() => setIsSlideMenuOpen(false)}
        >
          <aside
            id="app-slide-menu"
            className="slide-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="slide-menu-header">
              <p>Menu</p>
            </div>
            <nav className="slide-menu-nav">
              <button
                type="button"
                className="slide-menu-item"
                onClick={openFavoritesPage}
              >
                Favorite
              </button>
              <button type="button" className="slide-menu-item">Collections</button>
            </nav>
          </aside>
        </div>
      ) : null}

      {isGalleryPage ? (
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
      ) : (
        <section className="favorites-page">
          {favoritesError ? <p className="media-state error">{favoritesError}</p> : null}
          {!favoritesError && isFavoritesLoading ? <p className="media-state">Loading favorites...</p> : null}
          {!favoritesError && !isFavoritesLoading && favoritesTotalFiles === 0 ? (
            <p className="media-state">No favorite media yet.</p>
          ) : null}
          {!favoritesError && favoritesTotalFiles > 0 ? (
            <>
              {renderFavoritesPagination()}
              <div className="media-grid">
                {visibleFavoriteFiles.map((file) => (
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
              {renderFavoritesPagination()}
            </>
          ) : null}
        </section>
      )}

      <footer className="app-footer">
        <p>React frontend is running.</p>
        <p>Backend health: {health}</p>
        <p>Total saved files: {totalFiles}</p>
        {submittedText ? <p>Last submitted: {submittedText}</p> : null}
      </footer>

      {isUploadOpen ? (
        <div
          className="media-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeUploadModal}
        >
          <div
            className="media-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="media-modal-header">
              <h2 className="upload-modal-title">
                {uploadItems.length === 0 ? "No files remaining" : `Remaining files: ${uploadItems.length}`}
              </h2>
              <button
                type="button"
                className="media-modal-close"
                onClick={closeUploadModal}
              >
                Close
              </button>
            </div>

            <div className="media-modal-content">
              {activeUploadFile ? (
                isVideoFile(activeUploadFile) ? (
                  <video
                    src={activeUploadFile.originalUrl}
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={activeUploadFile.originalUrl}
                    alt={getDisplayName(activeUploadFile.name)}
                  />
                )
              ) : (
                <div className="media-fallback">No file selected</div>
              )}
            </div>

            <div className="media-modal-meta">
              {renderMediaMetaTable({
                file: activeUploadFile,
                draft: activeUploadItem?.draft || createMediaDraft(null),
                editable: true,
                onDraftChange: updateActiveUploadDraft,
                extraRows: (
                  <>
                    <tr>
                      <th scope="row">File</th>
                      <td>{activeUploadItem?.file.name || "-"}</td>
                    </tr>
                  </>
                )
              })}

              {uploadState.message ? (
                <p className={uploadState.type === "error" ? "media-action-error" : "media-action-success"}>
                  {uploadState.message}
                </p>
              ) : null}

              <div className="media-action-row media-action-row-spaced">
                <button
                  type="button"
                  className="media-action-btn"
                  onClick={closeUploadModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="media-action-btn media-action-primary"
                  onClick={handleUpload}
                  disabled={uploadItems.length === 0}
                >
                  Okay
                </button>
              </div>
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
              <div className="media-favorite-row">
                <button
                  type="button"
                  className={`media-favorite-btn${isSelectedMediaFavorite ? " is-active" : ""}`}
                  aria-label={isSelectedMediaFavorite ? "Remove from favorites" : "Add to favorites"}
                  title={isSelectedMediaFavorite ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isSelectedMediaFavorite}
                  onClick={toggleSelectedMediaFavorite}
                  disabled={isFavoriteUpdating || !selectedMedia?.id}
                >
                  ❤
                </button>
              </div>
              {renderMediaMetaTable({
                file: selectedMedia,
                draft: mediaDraft,
                editable: isEditingMedia,
                onDraftChange: (patch) => setMediaDraft((current) => ({ ...current, ...patch }))
              })}

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


