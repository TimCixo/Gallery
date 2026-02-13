import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const PAGE_SIZE = 36;
  const baseSearchTagOptions = ["path", "title", "description", "id", "source"];
  const baseSearchTagNames = new Set(baseSearchTagOptions);
  const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".jfif",
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
  const [tagTypeNameInput, setTagTypeNameInput] = useState("");
  const [tagTypeColorInput, setTagTypeColorInput] = useState("#2563EB");
  const [tagTypes, setTagTypes] = useState([]);
  const [isTagTypesLoading, setIsTagTypesLoading] = useState(false);
  const [isTagTypeSaving, setIsTagTypeSaving] = useState(false);
  const [editingTagTypeId, setEditingTagTypeId] = useState(null);
  const [editingTagTypeName, setEditingTagTypeName] = useState("");
  const [editingTagTypeColor, setEditingTagTypeColor] = useState("#2563EB");
  const [isTagTypeUpdating, setIsTagTypeUpdating] = useState(false);
  const [tagsByTagTypeId, setTagsByTagTypeId] = useState({});
  const [tagSearchQueryByTagTypeId, setTagSearchQueryByTagTypeId] = useState({});
  const [tagTableStateByTagTypeId, setTagTableStateByTagTypeId] = useState({});
  const [newTagDraftByTagTypeId, setNewTagDraftByTagTypeId] = useState({});
  const [editingTagByTagTypeId, setEditingTagByTagTypeId] = useState({});
  const [editingTagDraftById, setEditingTagDraftById] = useState({});
  const [savingTagByTagTypeId, setSavingTagByTagTypeId] = useState({});
  const [tagTypesError, setTagTypesError] = useState("");
  const [isTagMoveInProgress, setIsTagMoveInProgress] = useState(false);
  const [draggedTag, setDraggedTag] = useState(null);
  const [dragTargetTagTypeId, setDragTargetTagTypeId] = useState(null);
  const [tagTypeCalloutOpenById, setTagTypeCalloutOpenById] = useState({});
  const [collapsedTagTypeCallouts, setCollapsedTagTypeCallouts] = useState(null);
  const [uploadItems, setUploadItems] = useState([]);
  const [uploadStep, setUploadStep] = useState("queue");
  const [activeUploadIndex, setActiveUploadIndex] = useState(0);
  const [uploadState, setUploadState] = useState({ type: "", message: "" });
  const [isGroupUploadEnabled, setIsGroupUploadEnabled] = useState(false);
  const [uploadCollectionIds, setUploadCollectionIds] = useState([]);
  const [uploadCollections, setUploadCollections] = useState([]);
  const [isUploadCollectionsLoading, setIsUploadCollectionsLoading] = useState(false);
  const [uploadCollectionsError, setUploadCollectionsError] = useState("");
  const [isUploadCollectionPickerOpen, setIsUploadCollectionPickerOpen] = useState(false);
  const [isUploadQueueDragOver, setIsUploadQueueDragOver] = useState(false);
  const [isDragOverPage, setIsDragOverPage] = useState(false);
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
  const [collections, setCollections] = useState([]);
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState("");
  const [collectionsSearchQuery, setCollectionsSearchQuery] = useState("");
  const [collectionFormLabel, setCollectionFormLabel] = useState("");
  const [collectionFormDescription, setCollectionFormDescription] = useState("");
  const [collectionFormCover, setCollectionFormCover] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState(null);
  const [isCollectionSaving, setIsCollectionSaving] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionPreviewMedia, setCollectionPreviewMedia] = useState(null);
  const [isCollectionPreviewLoading, setIsCollectionPreviewLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionFiles, setCollectionFiles] = useState([]);
  const [isCollectionFilesLoading, setIsCollectionFilesLoading] = useState(false);
  const [collectionFilesError, setCollectionFilesError] = useState("");
  const [collectionFilesPage, setCollectionFilesPage] = useState(1);
  const [collectionFilesTotalPages, setCollectionFilesTotalPages] = useState(0);
  const [collectionFilesTotalCount, setCollectionFilesTotalCount] = useState(0);
  const [collectionFilesPageJumpInput, setCollectionFilesPageJumpInput] = useState("1");
  const [pendingCollectionDelete, setPendingCollectionDelete] = useState(null);
  const [isCollectionDeleting, setIsCollectionDeleting] = useState(false);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesTotalPages, setFavoritesTotalPages] = useState(0);
  const [favoritesTotalFiles, setFavoritesTotalFiles] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageJumpInput, setPageJumpInput] = useState("1");
  const [favoritesPageJumpInput, setFavoritesPageJumpInput] = useState("1");
  const [totalFiles, setTotalFiles] = useState(0);
  const [failedPreviewPaths, setFailedPreviewPaths] = useState(new Set());
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isEditingMedia, setIsEditingMedia] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingTagDelete, setPendingTagDelete] = useState(null);
  const [isDeletingTagEntity, setIsDeletingTagEntity] = useState(false);
  const [mediaModalError, setMediaModalError] = useState("");
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false);
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [collectionPickerItems, setCollectionPickerItems] = useState([]);
  const [isCollectionPickerLoading, setIsCollectionPickerLoading] = useState(false);
  const [collectionPickerError, setCollectionPickerError] = useState("");
  const [isAddingMediaToCollection, setIsAddingMediaToCollection] = useState(false);
  const [mediaTagCatalog, setMediaTagCatalog] = useState([]);
  const [isMediaTagCatalogLoading, setIsMediaTagCatalogLoading] = useState(false);
  const [mediaTagCatalogError, setMediaTagCatalogError] = useState("");
  const [activeTagManagerTagTypeId, setActiveTagManagerTagTypeId] = useState(null);
  const [mediaDraft, setMediaDraft] = useState({
    title: "",
    description: "",
    source: "",
    tagsByType: {},
    parent: "",
    child: ""
  });
  const [isMediaRelationPickerOpen, setIsMediaRelationPickerOpen] = useState(false);
  const [mediaRelationPickerMode, setMediaRelationPickerMode] = useState("parent");
  const [mediaRelationPickerQuery, setMediaRelationPickerQuery] = useState("");
  const [mediaRelationPickerPage, setMediaRelationPickerPage] = useState(1);
  const [mediaRelationPickerItems, setMediaRelationPickerItems] = useState([]);
  const [mediaRelationPickerTotalPages, setMediaRelationPickerTotalPages] = useState(0);
  const [mediaRelationPickerTotalCount, setMediaRelationPickerTotalCount] = useState(0);
  const [isMediaRelationPickerLoading, setIsMediaRelationPickerLoading] = useState(false);
  const [mediaRelationPickerError, setMediaRelationPickerError] = useState("");
  const [mediaRelationPreviewByMode, setMediaRelationPreviewByMode] = useState({
    parent: { item: null, isLoading: false, error: "" },
    child: { item: null, isLoading: false, error: "" }
  });
  const [activeTagTypeDropdownId, setActiveTagTypeDropdownId] = useState(null);
  const [tagTypeQueryById, setTagTypeQueryById] = useState({});
  const imageExtensions = new Set([".jpg", ".jpeg", ".jfif", ".png", ".webp", ".bmp"]);
  const videoExtensions = new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]);
  const backgroundUploadQueueRef = useRef([]);
  const isBackgroundUploadWorkerRunningRef = useRef(false);
  const uploadTaskSequenceRef = useRef(1);
  const activeUploadTaskIdRef = useRef(null);
  const activeUploadXhrRef = useRef(null);
  const pageDragCounterRef = useRef(0);
  const searchInputRef = useRef(null);
  const searchHighlightRef = useRef(null);
  const tagManagerCloseButtonRef = useRef(null);
  const tagManagerTriggerButtonRef = useRef(null);
  const mediaLoadAbortRef = useRef(null);
  const mediaLoadRequestIdRef = useRef(0);
  const [searchCaretPosition, setSearchCaretPosition] = useState(0);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [activeSearchSuggestionIndex, setActiveSearchSuggestionIndex] = useState(0);
  const [isSearchSuggestionExplicitlyActive, setIsSearchSuggestionExplicitlyActive] = useState(false);
  const searchTagTypeOptions = (() => {
    const map = new Map();

    tagTypes.forEach((tagType) => {
      const name = String(tagType?.name || "").trim();
      if (!name) {
        return;
      }

      const lowerName = name.toLowerCase();
      const color = /^#[0-9A-Fa-f]{6}$/.test(String(tagType?.color || "").trim())
        ? String(tagType.color).trim()
        : "#94a3b8";
      if (!map.has(lowerName)) {
        map.set(lowerName, {
          lowerName,
          label: name,
          color
        });
      }
    });

    mediaTagCatalog.forEach((tag) => {
      const typeName = String(tag?.tagTypeName || "").trim();
      if (!typeName) {
        return;
      }

      const lowerName = typeName.toLowerCase();
      if (map.has(lowerName)) {
        return;
      }

      const color = /^#[0-9A-Fa-f]{6}$/.test(String(tag?.tagTypeColor || "").trim())
        ? String(tag.tagTypeColor).trim()
        : "#94a3b8";
      map.set(lowerName, {
        lowerName,
        label: typeName,
        color
      });
    });

    return Array.from(map.values());
  })();
  const searchTagTypeMap = (() => {
    const map = new Map();
    searchTagTypeOptions.forEach((item) => {
      map.set(item.lowerName, item);
    });
    return map;
  })();
  const searchTagOptions = Array.from(new Set([
    ...baseSearchTagOptions,
    ...searchTagTypeOptions.map((item) => item.lowerName)
  ]));
  const syncSearchHighlightScroll = () => {
    if (!searchInputRef.current || !searchHighlightRef.current) {
      return;
    }

    searchHighlightRef.current.scrollLeft = searchInputRef.current.scrollLeft;
  };
  const parseSearchSegments = (value) => {
    const text = String(value || "");
    if (!text) {
      return [];
    }

    const segments = [];
    let index = 0;
    while (index < text.length) {
      if (text[index] === " ") {
        const start = index;
        while (index < text.length && text[index] === " ") {
          index += 1;
        }

        segments.push({ text: text.slice(start, index), isTag: false });
        continue;
      }

      const tokenStart = index;
      let tokenEnd = tokenStart;
      while (tokenEnd < text.length && text[tokenEnd] !== " ") {
        tokenEnd += 1;
      }
      const token = text.slice(tokenStart, tokenEnd);
      const separatorIndex = token.indexOf(":");
      const tokenWithoutAtPrefix = token.startsWith("@") ? token.slice(1) : token;
      const normalizedToken = tokenWithoutAtPrefix.trim().toLowerCase();
      const tagName = separatorIndex > 0
        ? tokenWithoutAtPrefix.slice(0, separatorIndex - (token.startsWith("@") ? 1 : 0)).trim().toLowerCase()
        : "";
      const normalizedTokenTagName = separatorIndex < 0
        ? normalizedToken
        : tagName;
      const tagType = searchTagTypeMap.get(normalizedTokenTagName);
      const isKnownSearchTag = baseSearchTagNames.has(normalizedTokenTagName);
      const isTypedKnownPrefix = separatorIndex < 0 && searchTagOptions.some((option) => option.startsWith(normalizedTokenTagName));
      const isTag = Boolean(normalizedTokenTagName) && (
        isKnownSearchTag
        || tagType != null
        || isTypedKnownPrefix
      );
      segments.push({
        text: text.slice(tokenStart, tokenEnd),
        isTag,
        color: tagType?.color || ""
      });
      index = tokenEnd;
    }

    return segments;
  };
  const handleSearchInputChange = (event) => {
    setInputValue(event.target.value);
    const caretPosition = event.target.selectionStart ?? event.target.value.length;
    setSearchCaretPosition(caretPosition);
    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);
  };
  const updateSearchCaretPosition = (event) => {
    const caretPosition = event.target.selectionStart ?? event.target.value.length;
    setSearchCaretPosition(caretPosition);
    setIsSearchSuggestionExplicitlyActive(false);
  };
  const getSearchTokenRange = (text, caret) => {
    const normalizedText = String(text || "");
    const normalizedCaret = Math.max(0, Math.min(caret ?? normalizedText.length, normalizedText.length));
    let start = normalizedCaret;
    while (start > 0 && normalizedText[start - 1] !== " ") {
      start -= 1;
    }

    let end = normalizedCaret;
    while (end < normalizedText.length && normalizedText[end] !== " ") {
      end += 1;
    }

    return {
      start,
      end,
      token: normalizedText.slice(start, end),
      tokenBeforeCaret: normalizedText.slice(start, normalizedCaret)
    };
  };
  const searchTokenRange = getSearchTokenRange(inputValue, searchCaretPosition);
  const searchSuggestions = (() => {
    const tokenBeforeCaret = searchTokenRange.tokenBeforeCaret;
    const token = searchTokenRange.token;
    const tokenBeforeCaretWithoutAtPrefix = tokenBeforeCaret.startsWith("@")
      ? tokenBeforeCaret.slice(1)
      : tokenBeforeCaret;
    const tokenWithoutAtPrefix = token.startsWith("@") ? token.slice(1) : token;
    const separatorIndex = tokenWithoutAtPrefix.indexOf(":");
    if (separatorIndex < 0) {
      if (tokenBeforeCaretWithoutAtPrefix.includes(":")) {
        return [];
      }

      const typedFragment = tokenBeforeCaretWithoutAtPrefix.trim().toLowerCase();
      const byTagNames = searchTagOptions
        .filter((tagName) => tagName.startsWith(typedFragment))
        .slice(0, 40)
        .map((tagName) => ({
          kind: "tagName",
          key: `tag-${tagName}`,
          tagName,
          label: `${tagName}:`,
          color: searchTagTypeMap.get(tagName)?.color || ""
        }));

      const byTagPairs = [];
      const seenPairs = new Set();
      mediaTagCatalog.forEach((tag) => {
        const candidateTypeName = String(tag?.tagTypeName || "").trim();
        const candidateType = candidateTypeName.toLowerCase();
        const candidateValueName = String(tag?.name || "").trim();
        const candidateValue = candidateValueName.toLowerCase();
        if (!candidateType || !candidateValueName) {
          return;
        }

        if (typedFragment && !candidateType.includes(typedFragment) && !candidateValue.includes(typedFragment)) {
          return;
        }

        const normalizedPair = `${candidateType}:${candidateValue}`;
        if (seenPairs.has(normalizedPair)) {
          return;
        }

        seenPairs.add(normalizedPair);
        byTagPairs.push({
          kind: "tagValue",
          key: `pair-${normalizedPair}`,
          tagName: candidateType,
          tagValue: candidateValueName,
          label: `${candidateType}:${candidateValueName}`,
          color: searchTagTypeMap.get(candidateType)?.color || ""
        });
      });

      byTagPairs.sort((left, right) => left.label.localeCompare(right.label));

      return [...byTagNames, ...byTagPairs].slice(0, 40);
    }

    if (!tokenBeforeCaretWithoutAtPrefix.includes(":")) {
      return [];
    }

    if (separatorIndex <= 0) {
      return [];
    }

    const tagName = tokenWithoutAtPrefix.slice(0, separatorIndex).trim().toLowerCase();
    if (!tagName || baseSearchTagNames.has(tagName) || !searchTagTypeMap.has(tagName)) {
      return [];
    }

    const typedTagValuePrefix = tokenBeforeCaretWithoutAtPrefix
      .slice(tokenBeforeCaretWithoutAtPrefix.indexOf(":") + 1)
      .trimStart()
      .replace(/^"/, "")
      .toLowerCase();

    const candidates = [];
    const seen = new Set();
    mediaTagCatalog.forEach((tag) => {
      const candidateType = String(tag?.tagTypeName || "").trim().toLowerCase();
      const candidateName = String(tag?.name || "").trim();
      if (!candidateName || candidateType !== tagName) {
        return;
      }

      const normalizedCandidate = candidateName.toLowerCase();
      if (typedTagValuePrefix && !normalizedCandidate.includes(typedTagValuePrefix)) {
        return;
      }
      if (seen.has(normalizedCandidate)) {
        return;
      }

      seen.add(normalizedCandidate);
      candidates.push(candidateName);
    });

    candidates.sort((left, right) => left.localeCompare(right));
    return candidates.slice(0, 40).map((tagValue) => ({
      kind: "tagValue",
      key: `value-${tagName}-${tagValue.toLowerCase()}`,
      tagName,
      tagValue,
      label: tagValue,
      color: searchTagTypeMap.get(tagName)?.color || ""
    }));
  })();
  const hasSearchSuggestions = isSearchInputFocused && searchSuggestions.length > 0;
  const formatSearchTagValue = (value) => (/\s/.test(value) ? `"${value.replace(/"/g, "")}"` : value);
  const applySearchSuggestion = (suggestion) => {
    const prefix = inputValue.slice(0, searchTokenRange.start);
    const suffix = inputValue.slice(searchTokenRange.end);
    if (!suggestion) {
      return;
    }

    let insertedToken = `${suggestion.tagName}:`;
    if (suggestion.kind === "tagValue") {
      insertedToken = `${suggestion.tagName}:${formatSearchTagValue(suggestion.tagValue)}`;
      if (!suffix.startsWith(" ")) {
        insertedToken += " ";
      }
    }

    const nextValue = `${prefix}${insertedToken}${suffix}`;
    const nextCaret = prefix.length + insertedToken.length;

    setInputValue(nextValue);
    setSearchCaretPosition(nextCaret);
    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);

    requestAnimationFrame(() => {
      if (!searchInputRef.current) {
        return;
      }

      searchInputRef.current.focus();
      searchInputRef.current.setSelectionRange(nextCaret, nextCaret);
      syncSearchHighlightScroll();
    });
  };
  const handleSearchInputKeyDown = (event) => {
    if (!hasSearchSuggestions) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsSearchSuggestionExplicitlyActive(true);
      setActiveSearchSuggestionIndex((current) => (current + 1) % searchSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsSearchSuggestionExplicitlyActive(true);
      setActiveSearchSuggestionIndex((current) => (
        (current - 1 + searchSuggestions.length) % searchSuggestions.length
      ));
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const selectedSuggestion = searchSuggestions[Math.max(0, Math.min(activeSearchSuggestionIndex, searchSuggestions.length - 1))];
      if (selectedSuggestion) {
        applySearchSuggestion(selectedSuggestion);
      }
      return;
    }

    if (event.key === "Enter") {
      if (!isSearchSuggestionExplicitlyActive) {
        return;
      }

      event.preventDefault();
      const selectedSuggestion = searchSuggestions[Math.max(0, Math.min(activeSearchSuggestionIndex, searchSuggestions.length - 1))];
      if (selectedSuggestion) {
        applySearchSuggestion(selectedSuggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsSearchInputFocused(false);
      setIsSearchSuggestionExplicitlyActive(false);
    }
  };
  useEffect(() => {
    syncSearchHighlightScroll();
  }, [inputValue]);
  useEffect(() => {
    if (activeSearchSuggestionIndex < searchSuggestions.length) {
      return;
    }

    setActiveSearchSuggestionIndex(0);
    setIsSearchSuggestionExplicitlyActive(false);
  }, [searchSuggestions.length, activeSearchSuggestionIndex]);
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
  const visibleCollectionFiles = collectionFiles
    .map((file) => ({ ...file, _tileUrl: resolveTileUrl(file) }));
  const getMediaIdentity = (file) => {
    if (!file || typeof file !== "object") {
      return "";
    }

    const id = Number(file.id);
    if (Number.isSafeInteger(id) && id > 0) {
      return `id:${id}`;
    }

    const path = String(file.relativePath || "").trim();
    if (path) {
      return `path:${path}`;
    }

    return "";
  };
  const selectedMediaIdentity = getMediaIdentity(selectedMedia);
  const modalMediaScope = selectedCollection
    ? "collection"
    : activePage === "favorites"
      ? "favorites"
      : "gallery";
  const currentModalMediaFiles = modalMediaScope === "collection"
    ? visibleCollectionFiles
    : modalMediaScope === "favorites"
      ? visibleFavoriteFiles
      : visibleMediaFiles;
  const selectedMediaIndex = currentModalMediaFiles.findIndex(
    (file) => getMediaIdentity(file) === selectedMediaIdentity
  );
  const canNavigateSelectedMedia = selectedMediaIndex >= 0 && currentModalMediaFiles.length > 1;
  const handleNavigateSelectedMedia = (offset) => {
    if (!canNavigateSelectedMedia || !Number.isInteger(offset) || offset === 0) {
      return;
    }

    const nextIndex = (selectedMediaIndex + offset + currentModalMediaFiles.length) % currentModalMediaFiles.length;
    const nextFile = currentModalMediaFiles[nextIndex];
    if (nextFile) {
      setSelectedMedia(nextFile);
    }
  };
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
  const formatFileSize = (value) => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "-";
    }

    if (bytes === 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(fractionDigits)} ${units[unitIndex]} (${bytes.toLocaleString()} B)`;
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
  const getMediaTagName = (tag) => {
    if (!tag || typeof tag !== "object") {
      return "";
    }

    return String(tag.name || "").trim();
  };
  const getMediaTagColor = (tag) => {
    const value = String(tag?.tagTypeColor || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#94a3b8";
  };
  const getTagId = (tag) => {
    const value = Number(tag?.id);
    return Number.isInteger(value) && value > 0 ? value : null;
  };
  const getFileMediaTags = (file) => (
    Array.isArray(file?.tags)
      ? file.tags.filter((tag) => getTagId(tag) !== null)
      : []
  );
  const getTagTypeId = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const parseTagNamesList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }

    return String(value || "")
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const mediaTagCatalogByTypeId = (() => {
    const map = new Map();
    mediaTagCatalog.forEach((tag) => {
      const tagTypeId = getTagTypeId(tag?.tagTypeId);
      if (tagTypeId === null) {
        return;
      }

      if (!map.has(tagTypeId)) {
        map.set(tagTypeId, []);
      }

      map.get(tagTypeId).push(tag);
    });
    return map;
  })();
  const buildMediaDraftTagsByType = (file) => {
    const grouped = new Map();
    getFileMediaTags(file).forEach((tag) => {
      const tagTypeId = getTagTypeId(tag?.tagTypeId);
      const tagName = getMediaTagName(tag);
      if (tagTypeId === null || !tagName) {
        return;
      }

      if (!grouped.has(tagTypeId)) {
        grouped.set(tagTypeId, []);
      }

      const names = grouped.get(tagTypeId);
      if (!names.includes(tagName)) {
        names.push(tagName);
      }
    });

    const draftByType = {};
    grouped.forEach((names, tagTypeId) => {
      draftByType[tagTypeId] = names;
    });
    return draftByType;
  };
  const getTagTypeRows = (file) => {
    const rows = [];
    const seen = new Set();

    tagTypes.forEach((tagType) => {
      const tagTypeId = getTagTypeId(tagType?.id);
      if (tagTypeId === null) {
        return;
      }

      seen.add(tagTypeId);
      rows.push({
        id: tagTypeId,
        name: String(tagType?.name || "").trim() || `TagType ${tagTypeId}`,
        color: /^#[0-9A-Fa-f]{6}$/.test(String(tagType?.color || "").trim())
          ? String(tagType.color).trim()
          : "#94a3b8"
      });
    });

    getFileMediaTags(file).forEach((tag) => {
      const tagTypeId = getTagTypeId(tag?.tagTypeId);
      if (tagTypeId === null || seen.has(tagTypeId)) {
        return;
      }

      seen.add(tagTypeId);
      rows.push({
        id: tagTypeId,
        name: String(tag?.tagTypeName || "").trim() || `TagType ${tagTypeId}`,
        color: getMediaTagColor(tag)
      });
    });

    return rows;
  };
  const hexToRgbaSoft = (hexColor, alpha) => {
    const value = String(hexColor || "").trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return `rgba(148, 163, 184, ${alpha})`;
    }

    const r = Number.parseInt(value.slice(1, 3), 16);
    const g = Number.parseInt(value.slice(3, 5), 16);
    const b = Number.parseInt(value.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const getTagTypeCellStyles = (color) => ({
    header: {
      backgroundColor: hexToRgbaSoft(color, 0.22),
      borderColor: hexToRgbaSoft(color, 0.5)
    },
    value: {
      backgroundColor: hexToRgbaSoft(color, 0.08),
      borderColor: hexToRgbaSoft(color, 0.35)
    }
  });
  const getDraftTagNamesByType = (draftByType, tagTypeId) => {
    if (!draftByType || typeof draftByType !== "object") {
      return [];
    }

    return Array.from(new Set(parseTagNamesList(draftByType[tagTypeId])));
  };
  const getTagTypeSuggestionNames = (tagTypeId, selectedNames, query) => {
    const selected = new Set(selectedNames.map((name) => name.toLowerCase()));
    const normalizedQuery = String(query || "").trim().toLowerCase();
    const allNames = Array.from(new Set((mediaTagCatalogByTypeId.get(tagTypeId) || [])
      .map((tag) => getMediaTagName(tag))
      .filter(Boolean)));

    return allNames
      .filter((name) => !selected.has(name.toLowerCase()))
      .filter((name) => (normalizedQuery ? name.toLowerCase().includes(normalizedQuery) : true))
      .slice(0, 40);
  };
  const addTagToDraftByType = (tagTypeId, tagName, draftByType, onDraftChange) => {
    const normalized = String(tagName || "").trim();
    if (!normalized) {
      return;
    }

    const current = getDraftTagNamesByType(draftByType, tagTypeId);
    if (current.some((name) => name.toLowerCase() === normalized.toLowerCase())) {
      return;
    }

    onDraftChange({
      tagsByType: {
        ...draftByType,
        [tagTypeId]: [...current, normalized]
      }
    });
  };
  const removeTagFromDraftByType = (tagTypeId, tagName, draftByType, onDraftChange) => {
    const current = getDraftTagNamesByType(draftByType, tagTypeId);
    const next = current.filter((name) => name.toLowerCase() !== String(tagName || "").toLowerCase());
    onDraftChange({
      tagsByType: {
        ...draftByType,
        [tagTypeId]: next
      }
    });
  };
  const renderMediaMetaTable = ({
    file,
    draft,
    editable,
    onDraftChange,
    linkedMediaCandidates = [],
    extraRows = null,
    showTagsRow = false
  }) => {
    const tagTypeRows = showTagsRow ? getTagTypeRows(file) : [];
    const hasTitle = Boolean(String(file?.title || "").trim());
    const hasDescription = Boolean(String(file?.description || "").trim());
    const hasSource = Boolean(String(file?.source || "").trim());
    const hasParent = file?.parent != null;
    const hasChild = file?.child != null;
    const resolveDraftLinkedId = (value) => {
      const normalizedValue = String(value || "").trim();
      if (!normalizedValue) {
        return null;
      }

      const parsed = Number.parseInt(normalizedValue, 10);
      return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
    };
    const renderRelationEditor = (mode, label) => {
      const draftValue = mode === "parent" ? draft.parent : draft.child;
      const relationId = resolveDraftLinkedId(draftValue);
      const previewState = mediaRelationPreviewByMode[mode] || { item: null, isLoading: false, error: "" };
      const relationItem = previewState.item;

      return (
        <div className="media-linked-editor">
          <div className="media-linked-editor-controls">
            <input
              type="number"
              min="1"
              step="1"
              className="media-edit-input"
              value={draftValue}
              onChange={(event) => onDraftChange({ [mode]: event.target.value })}
            />
            <button
              type="button"
              className="media-action-btn"
              onClick={() => openMediaRelationPicker(mode)}
            >
              Select...
            </button>
            <button
              type="button"
              className="media-action-btn"
              onClick={() => onDraftChange({ [mode]: "" })}
              disabled={!String(draftValue || "").trim()}
            >
              Clear
            </button>
          </div>
          {String(draftValue || "").trim() ? (
            <div className="media-linked-editor-preview">
              {relationId ? renderLinkedMediaId(relationId, label) : <span>{draftValue}</span>}
              {previewState.isLoading ? (
                <small>Resolving...</small>
              ) : previewState.error ? (
                <small className="media-action-error">{previewState.error}</small>
              ) : relationItem ? (
                <small>{relationItem.title || relationItem.relativePath || "Untitled media"}</small>
              ) : (
                <small>Media not found.</small>
              )}
            </div>
          ) : null}
        </div>
      );
    };
    const renderLinkedMediaId = (value, label) => {
      if (value == null) {
        return "-";
      }

      const normalizedId = Number(value);
      if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
        return String(value);
      }

      return (
        <button
          type="button"
          className="media-id-link"
          onClick={() => {
            void handleOpenRelatedMediaById(normalizedId, label);
          }}
        >
          {normalizedId}
        </button>
      );
    };
    const renderLinkedMediaPicker = (fieldKey, label) => {
      const currentValue = String(draft?.[fieldKey] || "");
      const normalizedQuery = currentValue.trim().toLowerCase();
      const filteredCandidates = Array.isArray(linkedMediaCandidates)
        ? linkedMediaCandidates
          .filter((candidate) => {
            if (candidate?.id == null && !candidate?.isQueued) {
              return false;
            }

            if (!normalizedQuery) {
              return true;
            }

            const idValue = candidate?.id == null ? "" : String(candidate.id);
            const nameValue = String(candidate?.displayName || "").toLowerCase();
            return idValue.includes(normalizedQuery) || nameValue.includes(normalizedQuery);
          })
          .slice(0, 8)
        : [];

      return (
        <div className="media-linked-picker">
          <input
            type="number"
            min="1"
            step="1"
            className="media-edit-input"
            value={currentValue}
            onChange={(event) => onDraftChange({ [fieldKey]: event.target.value })}
          />
          {filteredCandidates.length > 0 ? (
            <ul className="media-linked-picker-list">
              {filteredCandidates.map((candidate) => {
                const candidateKey = candidate?.key || `${fieldKey}-${candidate?.id ?? "queued"}`;
                const isQueued = Boolean(candidate?.isQueued);
                const candidateId = candidate?.id == null ? "" : String(candidate.id);
                const name = String(candidate?.displayName || "Untitled");

                return (
                  <li key={candidateKey}>
                    <button
                      type="button"
                      className={`media-linked-picker-item${isQueued ? " is-queued" : ""}`}
                      onClick={() => onDraftChange({ [fieldKey]: candidateId })}
                      disabled={isQueued || !candidateId}
                      title={isQueued ? `${label} is queued and has no id yet` : `Select ${candidateId}`}
                    >
                      <span>#{candidateId || "—"} {name}</span>
                      {isQueued ? <em>queued</em> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      );
    };

    return (
      <table className="media-meta-table">
      <tbody>
        {extraRows}
        {editable || hasTitle ? (
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
        ) : null}
        {editable || hasDescription ? (
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
        ) : null}
        {editable || hasSource ? (
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
        ) : null}
        {showTagsRow ? (
          <>
            {tagTypeRows.map((tagType) => {
              const cellStyles = getTagTypeCellStyles(tagType.color);
              const typeTags = getFileMediaTags(file).filter((tag) => getTagTypeId(tag?.tagTypeId) === tagType.id);
              const draftByType = draft?.tagsByType && typeof draft.tagsByType === "object"
                ? draft.tagsByType
                : {};
              const draftValue = getDraftTagNamesByType(draftByType, tagType.id);
              const inputValue = String(tagTypeQueryById[tagType.id] || "");
              const suggestions = getTagTypeSuggestionNames(tagType.id, draftValue, inputValue);

              if (!editable && typeTags.length === 0) {
                return null;
              }

              return (
                <tr key={tagType.id} className="media-tagtype-row">
                  <th scope="row" style={cellStyles.header}>
                    <span className="media-tagtype-label">{tagType.name}</span>
                    {editable ? (
                      <button
                        type="button"
                        className="media-tagtype-manage-btn"
                        aria-label={`Manage tags for ${tagType.name}`}
                        title={`Manage tags for ${tagType.name}`}
                        onClick={(event) => handleOpenTagManagerPopup(tagType.id, event.currentTarget)}
                      >
                        {"\u2026"}
                      </button>
                    ) : null}
                  </th>
                  <td style={cellStyles.value}>
                    {editable ? (
                      <div className="media-tagtype-edit-wrap">
                        <div
                          className="media-tagtype-field"
                          onMouseDown={(event) => {
                            if (event.target instanceof HTMLElement && event.target.tagName === "BUTTON") {
                              return;
                            }

                            const input = event.currentTarget.querySelector("input");
                            if (input instanceof HTMLInputElement) {
                              input.focus();
                            }
                          }}
                        >
                          {draftValue.map((name) => (
                            <span key={`${tagType.id}-${name}`} className="media-tag-view-pill media-tag-edit-pill">
                              <span>{name}</span>
                              <button
                                type="button"
                                className="media-tag-pill-remove"
                                aria-label={`Remove ${name}`}
                                onClick={() => removeTagFromDraftByType(tagType.id, name, draftByType, onDraftChange)}
                              >
                                x
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            className="media-tagtype-input"
                            value={inputValue}
                            onFocus={() => setActiveTagTypeDropdownId(tagType.id)}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setActiveTagTypeDropdownId((current) => (current === tagType.id ? null : current));
                              }, 120);
                            }}
                            onChange={(event) => {
                              setTagTypeQueryById((current) => ({
                                ...current,
                                [tagType.id]: event.target.value
                              }));
                              setActiveTagTypeDropdownId(tagType.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setActiveTagTypeDropdownId(null);
                                return;
                              }

                              if (event.key === "Backspace" && !inputValue && draftValue.length > 0) {
                                event.preventDefault();
                                removeTagFromDraftByType(
                                  tagType.id,
                                  draftValue[draftValue.length - 1],
                                  draftByType,
                                  onDraftChange
                                );
                                return;
                              }

                              if ((event.key === "Enter" || event.key === "Tab") && suggestions.length > 0) {
                                event.preventDefault();
                                addTagToDraftByType(tagType.id, suggestions[0], draftByType, onDraftChange);
                                setTagTypeQueryById((current) => ({
                                  ...current,
                                  [tagType.id]: ""
                                }));
                                setActiveTagTypeDropdownId(tagType.id);
                              }
                            }}
                            placeholder="Add tag..."
                          />
                        </div>

                        {activeTagTypeDropdownId === tagType.id ? (
                          <ul className="media-tag-dropdown">
                            {suggestions.length > 0 ? (
                              suggestions.map((name) => (
                                <li key={`${tagType.id}-suggestion-${name}`}>
                                  <button
                                    type="button"
                                    className="media-tag-dropdown-item"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                      addTagToDraftByType(tagType.id, name, draftByType, onDraftChange);
                                      setTagTypeQueryById((current) => ({
                                        ...current,
                                        [tagType.id]: ""
                                      }));
                                      setActiveTagTypeDropdownId(tagType.id);
                                    }}
                                  >
                                    <span>{name}</span>
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li className="media-tag-dropdown-empty">No matches</li>
                            )}
                          </ul>
                        ) : null}
                      </div>
                    ) : typeTags.length > 0 ? (
                      <div className="media-tag-view-list">
                        {typeTags.map((tag) => {
                          const id = getTagId(tag);
                          if (id === null) {
                            return null;
                          }

                          return (
                            <span
                              key={id}
                              className="media-tag-view-pill"
                              title={String(tag.tagTypeName || "")}
                            >
                              {getMediaTagName(tag)}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {editable && isMediaTagCatalogLoading ? (
              <tr>
                <th scope="row">Tags</th>
                <td><small className="media-edit-hint">Loading tags...</small></td>
              </tr>
            ) : null}
            {editable && mediaTagCatalogError ? (
              <tr>
                <th scope="row">Tags</th>
                <td><small className="media-action-error">{mediaTagCatalogError}</small></td>
              </tr>
            ) : null}
          </>
        ) : null}
        {editable || hasParent ? (
          <tr>
              <th scope="row">Parent Id</th>
              <td>
                {editable ? (
                  renderLinkedMediaPicker("parent", "Parent")
                ) : renderLinkedMediaId(file?.parent, "Parent")}
              </td>
            </tr>
        ) : null}
        {editable || hasChild ? (
          <tr>
              <th scope="row">Child Id</th>
              <td>
                {editable ? (
                  renderLinkedMediaPicker("child", "Child")
                ) : renderLinkedMediaId(file?.child, "Child")}
              </td>
            </tr>
        ) : null}
      </tbody>
      </table>
    );
  };
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
    tagsByType: buildMediaDraftTagsByType(file),
    parent: file?.parent == null ? "" : String(file.parent),
    child: file?.child == null ? "" : String(file.child)
  });
  const getPagedFiles = (payload) => {
    if (Array.isArray(payload?.files)) {
      return payload.files;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    return [];
  };

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((data) => setHealth(`${data.status} (${data.timestampUtc})`))
      .catch(() => setHealth("backend unavailable"));
  }, []);

  const loadMedia = async (page = 1, searchText = submittedText) => {
    mediaLoadAbortRef.current?.abort();
    const controller = new AbortController();
    mediaLoadAbortRef.current = controller;
    mediaLoadRequestIdRef.current += 1;
    const requestId = mediaLoadRequestIdRef.current;
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    setIsMediaLoading(true);
    setMediaError("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE)
      });
      const normalizedSearchText = String(searchText || "").trim();
      if (normalizedSearchText) {
        query.set("search", normalizedSearchText);
      }

      const response = await fetch(`/api/media?${query.toString()}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error("Failed to fetch media files.");
      }

      const result = await response.json();
      if (requestId !== mediaLoadRequestIdRef.current) {
        return;
      }
      setMediaFiles(getPagedFiles(result));
      setCurrentPage(Number.isInteger(result.page) ? result.page : page);
      setTotalPages(Number.isInteger(result.totalPages) ? result.totalPages : 0);
      setTotalFiles(Number.isInteger(result.totalCount) ? result.totalCount : 0);
      setFailedPreviewPaths(new Set());
      setSelectedMedia(null);
    } catch (error) {
      if (requestId !== mediaLoadRequestIdRef.current) {
        return;
      }
      setMediaFiles([]);
      setTotalPages(0);
      setTotalFiles(0);
      if (error instanceof DOMException && error.name === "AbortError") {
        setMediaError("Media request timed out. Try again.");
      } else {
        setMediaError(error instanceof Error ? error.message : "Failed to fetch media files.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === mediaLoadRequestIdRef.current) {
        setIsMediaLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMedia(1, "");
  }, []);

  useEffect(() => () => {
    mediaLoadAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    void loadTagTypes();
    void loadMediaTagCatalog();
  }, []);

  useEffect(() => {
    if (activePage === "favorites") {
      loadFavorites(1);
    }
    if (activePage === "collections") {
      loadCollections(collectionsSearchQuery);
    }
    if (activePage === "tags") {
      loadTagTypes();
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
    setIsFavoriteUpdating(false);
    setIsCollectionPickerOpen(false);
    setCollectionPickerItems([]);
    setCollectionPickerError("");
    setIsCollectionPickerLoading(false);
    setIsAddingMediaToCollection(false);
    setActiveTagTypeDropdownId(null);
    setTagTypeQueryById({});
    setMediaDraft(createMediaDraft(selectedMedia));
    void loadMediaTagCatalog();

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

    const handleMediaArrows = (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable)
      ) {
        return;
      }

      if (!canNavigateSelectedMedia) {
        return;
      }

      event.preventDefault();
      handleNavigateSelectedMedia(event.key === "ArrowRight" ? 1 : -1);
    };

    window.addEventListener("keydown", handleMediaArrows);
    return () => window.removeEventListener("keydown", handleMediaArrows);
  }, [selectedMedia, canNavigateSelectedMedia, selectedMediaIndex, currentModalMediaFiles]);

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
    if (activeTagManagerTagTypeId === null) {
      return undefined;
    }

    const closeButton = tagManagerCloseButtonRef.current;
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.focus();
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTagManagerPopup();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      if (tagManagerTriggerButtonRef.current instanceof HTMLButtonElement) {
        tagManagerTriggerButtonRef.current.focus();
      }
    };
  }, [activeTagManagerTagTypeId]);

  useEffect(() => {
    if (!selectedMedia) {
      return undefined;
    }

    const canScrollInElement = (target) => {
      if (!(target instanceof Element)) {
        return false;
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
  }, [selectedMedia]);

  const handlePageChange = (nextPage) => {
    if (isMediaLoading) {
      return;
    }

    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages) || nextPage === currentPage) {
      return;
    }

    loadMedia(nextPage, submittedText);
  };

  useEffect(() => {
    setPageJumpInput(String(currentPage));
  }, [currentPage]);

  const handlePageJumpSubmit = (event) => {
    event.preventDefault();
    if (isMediaLoading || totalPages <= 0) {
      return;
    }

    const parsed = Number.parseInt(pageJumpInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageJumpInput(String(currentPage));
      return;
    }

    const targetPage = Math.min(Math.max(parsed, 1), totalPages);
    setPageJumpInput(String(targetPage));
    handlePageChange(targetPage);
  };

  const renderPagination = (showLoadingState = false) => (
    <div className="media-pagination-wrap">
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
        <form className="media-pagination-jump" onSubmit={handlePageJumpSubmit}>
          <input
            type="number"
            min={1}
            max={Math.max(totalPages, 1)}
            step={1}
            inputMode="numeric"
            value={pageJumpInput}
            onChange={(event) => setPageJumpInput(event.target.value)}
            disabled={isMediaLoading || totalPages === 0}
            aria-label="Go to page"
          />
          <button type="submit" disabled={isMediaLoading || totalPages === 0}>
            Go
          </button>
        </form>
      </div>
      {showLoadingState ? (
        <p className="media-pagination-status" aria-live="polite">
          {isMediaLoading ? "Loading media..." : "\u00A0"}
        </p>
      ) : null}
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

  useEffect(() => {
    setFavoritesPageJumpInput(String(favoritesPage));
  }, [favoritesPage]);

  const handleFavoritesPageJumpSubmit = (event) => {
    event.preventDefault();
    if (isFavoritesLoading || favoritesTotalPages <= 0) {
      return;
    }

    const parsed = Number.parseInt(favoritesPageJumpInput, 10);
    if (!Number.isFinite(parsed)) {
      setFavoritesPageJumpInput(String(favoritesPage));
      return;
    }

    const targetPage = Math.min(Math.max(parsed, 1), favoritesTotalPages);
    setFavoritesPageJumpInput(String(targetPage));
    handleFavoritesPageChange(targetPage);
  };

  const renderFavoritesPagination = (showLoadingState = false) => (
    <div className="media-pagination-wrap">
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
        <form className="media-pagination-jump" onSubmit={handleFavoritesPageJumpSubmit}>
          <input
            type="number"
            min={1}
            max={Math.max(favoritesTotalPages, 1)}
            step={1}
            inputMode="numeric"
            value={favoritesPageJumpInput}
            onChange={(event) => setFavoritesPageJumpInput(event.target.value)}
            disabled={isFavoritesLoading || favoritesTotalPages === 0}
            aria-label="Go to favorites page"
          />
          <button type="submit" disabled={isFavoritesLoading || favoritesTotalPages === 0}>
            Go
          </button>
        </form>
      </div>
      {showLoadingState ? (
        <p className="media-pagination-status" aria-live="polite">
          {isFavoritesLoading ? "Loading favorites..." : "\u00A0"}
        </p>
      ) : null}
    </div>
  );

  const handleCollectionFilesPageChange = (nextPage) => {
    if (isCollectionFilesLoading || !selectedCollection?.id) {
      return;
    }

    if (nextPage < 1 || (collectionFilesTotalPages > 0 && nextPage > collectionFilesTotalPages) || nextPage === collectionFilesPage) {
      return;
    }

    loadCollectionMedia(selectedCollection.id, nextPage);
  };

  useEffect(() => {
    setCollectionFilesPageJumpInput(String(collectionFilesPage));
  }, [collectionFilesPage]);

  const handleCollectionFilesPageJumpSubmit = (event) => {
    event.preventDefault();
    if (isCollectionFilesLoading || collectionFilesTotalPages <= 0 || !selectedCollection?.id) {
      return;
    }

    const parsed = Number.parseInt(collectionFilesPageJumpInput, 10);
    if (!Number.isFinite(parsed)) {
      setCollectionFilesPageJumpInput(String(collectionFilesPage));
      return;
    }

    const targetPage = Math.min(Math.max(parsed, 1), collectionFilesTotalPages);
    setCollectionFilesPageJumpInput(String(targetPage));
    handleCollectionFilesPageChange(targetPage);
  };

  const renderCollectionFilesPagination = (showLoadingState = false) => (
    <div className="media-pagination-wrap">
      <div className="media-pagination">
        <button
          type="button"
          onClick={() => handleCollectionFilesPageChange(collectionFilesPage - 1)}
          disabled={isCollectionFilesLoading || collectionFilesPage <= 1 || collectionFilesTotalPages === 0}
        >
          Prev
        </button>
        <p>
          Page {collectionFilesTotalPages === 0 ? 0 : collectionFilesPage} of {collectionFilesTotalPages}
        </p>
        <button
          type="button"
          onClick={() => handleCollectionFilesPageChange(collectionFilesPage + 1)}
          disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0 || collectionFilesPage >= collectionFilesTotalPages}
        >
          Next
        </button>
        <form className="media-pagination-jump" onSubmit={handleCollectionFilesPageJumpSubmit}>
          <input
            type="number"
            min={1}
            max={Math.max(collectionFilesTotalPages, 1)}
            step={1}
            inputMode="numeric"
            value={collectionFilesPageJumpInput}
            onChange={(event) => setCollectionFilesPageJumpInput(event.target.value)}
            disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0}
            aria-label="Go to collection media page"
          />
          <button type="submit" disabled={isCollectionFilesLoading || collectionFilesTotalPages === 0}>
            Go
          </button>
        </form>
      </div>
      {showLoadingState ? (
        <p className="media-pagination-status" aria-live="polite">
          {isCollectionFilesLoading ? "Loading collection files..." : "\u00A0"}
        </p>
      ) : null}
    </div>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextSubmittedText = inputValue.trim();
    setSubmittedText(nextSubmittedText);
    setActivePage("gallery");
    loadMedia(1, nextSubmittedText);
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
    setIsGroupUploadEnabled(false);
    setUploadCollectionIds([]);
    setUploadCollectionsError("");
    setIsUploadCollectionPickerOpen(false);
    setUploadStep("queue");
    setIsUploadQueueDragOver(false);
    setActiveUploadIndex(0);
  };

  const loadUploadCollections = async () => {
    setIsUploadCollectionsLoading(true);
    setUploadCollectionsError("");
    try {
      const response = await fetch("/api/collections");
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Collections API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error("Failed to fetch collections.");
      }

      const result = await response.json();
      setUploadCollections(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      setUploadCollections([]);
      setUploadCollectionsError(error instanceof Error ? error.message : "Failed to fetch collections.");
    } finally {
      setIsUploadCollectionsLoading(false);
    }
  };

  const appendUploadItems = (files) => {
    const nextFiles = Array.from(files || []);
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
      const existingKeys = new Set(current.map((item) => item.key));
      const appendItems = [];

      nextItems.forEach((item) => {
        if (existingKeys.has(item.key)) {
          URL.revokeObjectURL(item.previewUrl);
          return;
        }

        existingKeys.add(item.key);
        appendItems.push(item);
      });

      return [...current, ...appendItems];
    });
    setUploadState({ type: "", message: "" });
    setUploadStep("queue");
    setIsGroupUploadEnabled(false);
    setUploadCollectionIds([]);
    setUploadCollectionsError("");
    setActiveUploadIndex(0);
    setIsUploadOpen(true);
    if (uploadCollections.length === 0 && !isUploadCollectionsLoading) {
      void loadUploadCollections();
    }
  };

  const handleUploadPickerChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);
    event.target.value = "";
    appendUploadItems(nextFiles);
  };

  const handleUploadQueueDrop = (event) => {
    if (!isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsUploadQueueDragOver(false);
    appendUploadItems(event.dataTransfer.files);
  };
  const handleUploadQueuePaste = (event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const pastedFiles = clipboardItems
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((item) => item instanceof File);

    if (pastedFiles.length === 0) {
      return;
    }

    event.preventDefault();
    appendUploadItems(pastedFiles);
  };


  const handleRemoveUploadItem = (itemKey) => {
    setUploadItems((current) => {
      const next = current.filter((item) => item.key !== itemKey);
      const removed = current.find((item) => item.key === itemKey);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };

  const moveUploadItem = (itemKey, direction) => {
    setUploadItems((current) => {
      const index = current.findIndex((item) => item.key === itemKey);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const updateActiveUploadDraft = (patch) => {
    setUploadItems((current) => {
      if (current.length === 0) {
        return current;
      }

      return current.map((item, index) => (
        index === activeUploadIndex ? { ...item, draft: { ...item.draft, ...patch } } : item
      ));
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

            const collectionIds = Array.isArray(task.collectionIds) ? task.collectionIds : [];
            for (const collectionId of collectionIds) {
              const addToCollectionResponse = await fetch(`/api/collections/${collectionId}/media`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaId: uploaded.id })
              });
              if (!addToCollectionResponse.ok) {
                const payload = await readResponsePayload(addToCollectionResponse);
                throw new Error(payload?.error || `Failed to add ${task.file.name} to collection.`);
              }
            }
          }

          await loadMedia(1, submittedText);
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
      setFavoritesFiles(getPagedFiles(result));
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

  const loadCollections = async (search = "") => {
    setIsCollectionsLoading(true);
    setCollectionsError("");

    try {
      const query = new URLSearchParams();
      const normalizedSearch = String(search || "").trim();
      if (normalizedSearch) {
        query.set("search", normalizedSearch);
      }

      const response = await fetch(`/api/collections${query.toString() ? `?${query.toString()}` : ""}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Collections API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error("Failed to fetch collections.");
      }

      const result = await response.json();
      setCollections(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      setCollections([]);
      setCollectionsError(error instanceof Error ? error.message : "Failed to fetch collections.");
    } finally {
      setIsCollectionsLoading(false);
    }
  };

  const loadCollectionMedia = async (collectionId, page = 1) => {
    const normalizedCollectionId = Number(collectionId);
    if (!Number.isSafeInteger(normalizedCollectionId) || normalizedCollectionId <= 0) {
      setCollectionFiles([]);
      setCollectionFilesPage(1);
      setCollectionFilesTotalPages(0);
      setCollectionFilesTotalCount(0);
      setCollectionFilesError("Collection id is invalid.");
      return;
    }

    setIsCollectionFilesLoading(true);
    setCollectionFilesError("");
    try {
      const response = await fetch(`/api/collections/${normalizedCollectionId}/media?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Collection media API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error("Failed to fetch collection media.");
      }

      const result = await response.json();
      setCollectionFiles(getPagedFiles(result));
      setCollectionFilesPage(Number.isInteger(result.page) ? result.page : page);
      setCollectionFilesTotalPages(Number.isInteger(result.totalPages) ? result.totalPages : 0);
      setCollectionFilesTotalCount(Number.isInteger(result.totalCount) ? result.totalCount : 0);
    } catch (error) {
      setCollectionFiles([]);
      setCollectionFilesPage(1);
      setCollectionFilesTotalPages(0);
      setCollectionFilesTotalCount(0);
      setCollectionFilesError(error instanceof Error ? error.message : "Failed to fetch collection media.");
    } finally {
      setIsCollectionFilesLoading(false);
    }
  };

  const parseNullableCollectionCoverId = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return null;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new Error("Cover must be a positive media id.");
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error("Cover must be a positive media id.");
    }

    return parsed;
  };

  const resetCollectionForm = () => {
    setCollectionFormLabel("");
    setCollectionFormDescription("");
    setCollectionFormCover("");
    setEditingCollectionId(null);
    setCollectionPreviewMedia(null);
  };

  const closeCollectionModal = () => {
    resetCollectionForm();
    setCollectionsError("");
    setIsCollectionModalOpen(false);
    setIsCollectionPreviewLoading(false);
  };

  const openCreateCollectionModal = () => {
    resetCollectionForm();
    setCollectionsError("");
    setIsCollectionModalOpen(true);
  };

  const handleSubmitCollection = async (event) => {
    event.preventDefault();
    const label = collectionFormLabel.trim();
    if (!label) {
      setCollectionsError("Collection name is required.");
      return;
    }

    let cover = null;
    try {
      cover = parseNullableCollectionCoverId(collectionFormCover);
    } catch (error) {
      setCollectionsError(error instanceof Error ? error.message : "Cover is invalid.");
      return;
    }

    setIsCollectionSaving(true);
    setCollectionsError("");
    try {
      const payload = {
        label,
        description: collectionFormDescription.trim() || null,
        cover
      };
      const isEdit = Number.isInteger(editingCollectionId) && editingCollectionId > 0;
      const endpoint = isEdit ? `/api/collections/${editingCollectionId}` : "/api/collections";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to save collection.");
      }

      closeCollectionModal();
      await loadCollections(collectionsSearchQuery);
    } catch (error) {
      setCollectionsError(error instanceof Error ? error.message : "Failed to save collection.");
    } finally {
      setIsCollectionSaving(false);
    }
  };

  const handleStartEditCollection = (item) => {
    setEditingCollectionId(item?.id ?? null);
    setCollectionFormLabel(String(item?.label || ""));
    setCollectionFormDescription(String(item?.description || ""));
    setCollectionFormCover(item?.cover ? String(item.cover) : "");
    setCollectionsError("");
    setIsCollectionModalOpen(true);
  };

  const handleOpenCollection = async (item) => {
    if (!item?.id) {
      return;
    }

    setSelectedCollection(item);
    setSelectedMedia(null);
    await loadCollectionMedia(item.id, 1);
  };

  const handleEditSelectedCollection = () => {
    if (!selectedCollection) {
      return;
    }

    setSelectedCollection(null);
    handleStartEditCollection(selectedCollection);
  };

  const handleRequestDeleteCollection = (item) => {
    if (!item?.id) {
      return;
    }

    setPendingCollectionDelete({
      id: item.id,
      name: String(item.label || "")
    });
  };

  const closeDeleteCollectionConfirm = () => {
    if (isCollectionDeleting) {
      return;
    }

    setPendingCollectionDelete(null);
  };

  const handleConfirmDeleteCollection = async () => {
    if (!pendingCollectionDelete?.id || isCollectionDeleting) {
      return;
    }

    setIsCollectionDeleting(true);
    setCollectionsError("");
    try {
      const response = await fetch(`/api/collections/${pendingCollectionDelete.id}`, {
        method: "DELETE"
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete collection.");
      }

      if (selectedCollection?.id === pendingCollectionDelete.id) {
        setSelectedCollection(null);
        setCollectionFiles([]);
        setCollectionFilesError("");
        setCollectionFilesPage(1);
        setCollectionFilesTotalPages(0);
        setCollectionFilesTotalCount(0);
      }

      setPendingCollectionDelete(null);
      await loadCollections(collectionsSearchQuery);
    } catch (error) {
      setCollectionsError(error instanceof Error ? error.message : "Failed to delete collection.");
    } finally {
      setIsCollectionDeleting(false);
    }
  };

  const loadTagTypes = async () => {
    setIsTagTypesLoading(true);
    setTagTypesError("");

    try {
      const response = await fetch("/api/tag-types");
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("TagTypes API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error("Failed to fetch tag types.");
      }

      const result = await response.json();
      setTagTypes(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      setTagTypes([]);
      setTagTypesError(error instanceof Error ? error.message : "Failed to fetch tag types.");
    } finally {
      setIsTagTypesLoading(false);
    }
  };
  const loadMediaTagCatalog = async () => {
    setIsMediaTagCatalogLoading(true);
    setMediaTagCatalogError("");

    try {
      const response = await fetch("/api/tags");
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tags API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error("Failed to fetch tags for autocomplete.");
      }

      const result = await response.json();
      setMediaTagCatalog(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      setMediaTagCatalog([]);
      setMediaTagCatalogError(error instanceof Error ? error.message : "Failed to fetch tags for autocomplete.");
    } finally {
      setIsMediaTagCatalogLoading(false);
    }
  };
  const loadTagsForTagType = async (tagTypeId) => {
    setTagTableStateByTagTypeId((current) => ({
      ...current,
      [tagTypeId]: { loading: true, error: "" }
    }));

    try {
      const response = await fetch(`/api/tag-types/${tagTypeId}/tags`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tags API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error("Failed to fetch tags.");
      }

      const result = await response.json();
      const items = Array.isArray(result.items) ? result.items : [];
      setTagsByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: items
      }));
      setTagTableStateByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: { loading: false, error: "" }
      }));
      return items;
    } catch (error) {
      setTagsByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: []
      }));
      setTagTableStateByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: {
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch tags."
        }
      }));
      return [];
    }
  };

  const enqueueBackgroundUpload = (task) => {
    const taskId = uploadTaskSequenceRef.current;
    uploadTaskSequenceRef.current += 1;

    const uploadTaskPayload = {
      file: task.file,
      draft: task.draft,
      collectionIds: Array.isArray(task.collectionIds) ? [...task.collectionIds] : []
    };

    backgroundUploadQueueRef.current.push({ ...uploadTaskPayload, taskId });
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
          status: "queued",
          percent: 0,
          error: "",
          uploadedMedia: null,
          retryTask: uploadTaskPayload
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

  const handleOpenUploadedTask = async (taskId) => {
    const task = uploadTaskStatuses.find((item) => item.id === taskId);
    if (!task?.uploadedMedia) {
      return;
    }

    const mediaId = Number(task.uploadedMedia.id);
    if (Number.isSafeInteger(mediaId) && mediaId > 0) {
      const freshMedia = await fetchMediaById(mediaId);
      if (freshMedia) {
        setSelectedMedia(freshMedia);
        return;
      }

      setUploadState({
        type: "warning",
        message: "Warning: media API unavailable. Opened cached upload data."
      });
    }

    setSelectedMedia(task.uploadedMedia);
  };

  const handleRetryUploadTask = (taskId) => {
    const task = uploadTaskStatuses.find((item) => item.id === taskId);
    if (!task?.retryTask) {
      return;
    }

    backgroundUploadQueueRef.current.push({ ...task.retryTask, taskId: task.id });
    setBackgroundUploadState((current) => ({
      ...current,
      queued: current.queued + 1,
      failed: Math.max(current.failed - 1, 0)
    }));
    setUploadTaskStatuses((current) => current.map((item) => (
      item.id === taskId
        ? { ...item, status: "queued", percent: 0, error: "" }
        : item
    )));
    setUploadState({ type: "", message: "" });
    void runBackgroundUploadQueue();
  };

  const handleUpload = async () => {
    const activeItem = uploadItems[activeUploadIndex];
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
    let normalizedCollectionIds = [];
    try {
      const title = activeItem.draft.title.trim();
      const description = activeItem.draft.description.trim();
      const source = activeItem.draft.source.trim();
      const tagIds = parseMediaTagIdsByType(activeItem.draft.tagsByType);
      const parent = parseNullableId(activeItem.draft.parent, "Parent");
      const child = parseNullableId(activeItem.draft.child, "Child");
      normalizedCollectionIds = Array.from(new Set(
        uploadCollectionIds
          .map((value) => Number(value))
          .filter((value) => Number.isSafeInteger(value) && value > 0)
      ));

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
        tagIds,
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

    if (isGroupUploadEnabled) {
      const unsupportedFile = uploadItems.find((item) => !allowedExtensions.has(getExtension(item.file.name)));
      if (unsupportedFile) {
        setUploadState({ type: "error", message: `Unsupported file type: ${unsupportedFile.file.name}` });
        return;
      }

      uploadItems.forEach((item) => {
        enqueueBackgroundUpload({
          file: item.file,
          draft: normalizedDraft,
          collectionIds: normalizedCollectionIds
        });
      });

      closeUploadModal();
      return;
    }

    enqueueBackgroundUpload({
      file: activeItem.file,
      draft: normalizedDraft,
      collectionIds: normalizedCollectionIds
    });

    const remaining = Math.max(uploadItems.length - 1, 0);
    setUploadItems((current) => {
      if (current.length === 0 || activeUploadIndex < 0 || activeUploadIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [removedItem] = next.splice(activeUploadIndex, 1);
      if (removedItem) {
        URL.revokeObjectURL(removedItem.previewUrl);
      }
      return next;
    });

    setActiveUploadIndex((current) => {
      if (remaining === 0) {
        return 0;
      }

      return Math.min(current, remaining - 1);
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
  const openUploadCollectionPicker = async () => {
    if (isUploadCollectionsLoading) {
      return;
    }

    setIsUploadCollectionPickerOpen(true);
    if (uploadCollections.length === 0 && !uploadCollectionsError) {
      await loadUploadCollections();
    }
  };
  const closeUploadCollectionPicker = () => {
    setIsUploadCollectionPickerOpen(false);
  };
  const toggleUploadCollectionSelection = (collectionId) => {
    const normalizedId = Number(collectionId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return;
    }

    setUploadCollectionIds((current) => (
      current.includes(normalizedId)
        ? current.filter((item) => item !== normalizedId)
        : [...current, normalizedId]
    ));
  };
  const parseMediaTagIdsByType = (tagsByType) => {
    if (!tagsByType || typeof tagsByType !== "object") {
      return [];
    }

    const result = [];
    const seen = new Set();
    for (const [tagTypeIdRaw, value] of Object.entries(tagsByType)) {
      const tagTypeId = getTagTypeId(tagTypeIdRaw);
      if (tagTypeId === null) {
        continue;
      }

      const names = parseTagNamesList(value);
      if (names.length === 0) {
        continue;
      }

      const catalog = mediaTagCatalogByTypeId.get(tagTypeId) || [];
      const byName = new Map();
      catalog.forEach((tag) => {
        const tagName = getMediaTagName(tag).toLowerCase();
        if (!tagName || byName.has(tagName)) {
          return;
        }
        byName.set(tagName, tag);
      });

      const tagTypeRow = tagTypes.find((item) => getTagTypeId(item?.id) === tagTypeId);
      const tagTypeLabel = String(tagTypeRow?.name || `TagType ${tagTypeId}`);
      for (const name of names) {
        const match = byName.get(name.toLowerCase());
        if (!match) {
          throw new Error(`Tag "${name}" not found in ${tagTypeLabel}.`);
        }

        const tagId = getTagId(match);
        if (tagId === null || seen.has(tagId)) {
          continue;
        }

        seen.add(tagId);
        result.push(tagId);
      }
    }

    return result;
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
  const fetchMediaById = async (mediaId) => {
    const normalizedId = Number(mediaId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const query = new URLSearchParams({
      page: "1",
      pageSize: "1",
      search: `id:${normalizedId}`
    });
    const response = await fetch(`/api/media?${query.toString()}`);
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const files = getPagedFiles(payload);
    return files.find((item) => item?.id === normalizedId) || null;
  };
  const closeMediaRelationPicker = () => {
    setIsMediaRelationPickerOpen(false);
    setMediaRelationPickerError("");
  };
  const openMediaRelationPicker = (mode) => {
    setMediaRelationPickerMode(mode === "child" ? "child" : "parent");
    setMediaRelationPickerPage(1);
    setMediaRelationPickerQuery("");
    setMediaRelationPickerError("");
    setIsMediaRelationPickerOpen(true);
  };
  const handleSelectMediaRelationFromPicker = (item) => {
    const relationId = Number(item?.id);
    if (!Number.isSafeInteger(relationId) || relationId <= 0) {
      return;
    }

    setMediaDraft((current) => ({
      ...current,
      [mediaRelationPickerMode]: String(relationId)
    }));
    closeMediaRelationPicker();
  };
  const loadMediaRelationPicker = async () => {
    setIsMediaRelationPickerLoading(true);
    setMediaRelationPickerError("");
    try {
      const query = new URLSearchParams({
        page: String(mediaRelationPickerPage),
        pageSize: "12"
      });
      const normalizedSearch = String(mediaRelationPickerQuery || "").trim();
      if (normalizedSearch) {
        query.set("search", normalizedSearch);
      }

      const response = await fetch(`/api/media?${query.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load media picker data.");
      }

      const payload = await response.json();
      setMediaRelationPickerItems(getPagedFiles(payload));
      setMediaRelationPickerTotalPages(Math.max(0, Number(payload?.totalPages) || 0));
      setMediaRelationPickerTotalCount(Math.max(0, Number(payload?.total) || 0));
    } catch (error) {
      setMediaRelationPickerItems([]);
      setMediaRelationPickerTotalPages(0);
      setMediaRelationPickerTotalCount(0);
      setMediaRelationPickerError(error instanceof Error ? error.message : "Failed to load media picker data.");
    } finally {
      setIsMediaRelationPickerLoading(false);
    }
  };

  useEffect(() => {
    if (!isMediaRelationPickerOpen) {
      return;
    }

    void loadMediaRelationPicker();
  }, [isMediaRelationPickerOpen, mediaRelationPickerPage, mediaRelationPickerQuery]);

  useEffect(() => {
    if (!isEditingMedia) {
      setMediaRelationPreviewByMode({
        parent: { item: null, isLoading: false, error: "" },
        child: { item: null, isLoading: false, error: "" }
      });
      return;
    }

    const relationModes = ["parent", "child"];
    const allCandidates = [selectedMedia, ...mediaFiles, ...favoritesFiles, ...collectionFiles];
    relationModes.forEach((mode) => {
      const rawValue = String(mode === "parent" ? mediaDraft.parent : mediaDraft.child || "").trim();
      if (!rawValue) {
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: "" }
        }));
        return;
      }

      const relationId = Number.parseInt(rawValue, 10);
      if (!Number.isSafeInteger(relationId) || relationId <= 0) {
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: "Invalid id." }
        }));
        return;
      }

      const localCandidate = allCandidates.find((item) => item?.id === relationId) || null;
      if (localCandidate) {
        setMediaRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: localCandidate, isLoading: false, error: "" }
        }));
        return;
      }

      setMediaRelationPreviewByMode((current) => ({
        ...current,
        [mode]: { item: null, isLoading: true, error: "" }
      }));

      void fetchMediaById(relationId)
        .then((item) => {
          setMediaRelationPreviewByMode((current) => ({
            ...current,
            [mode]: {
              item,
              isLoading: false,
              error: item ? "" : "Media not found."
            }
          }));
        })
        .catch(() => {
          setMediaRelationPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: "Failed to resolve media." }
          }));
        });
    });
  }, [isEditingMedia, mediaDraft.parent, mediaDraft.child, selectedMedia, mediaFiles, favoritesFiles, collectionFiles]);

  useEffect(() => {
    if (!isCollectionModalOpen) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        closeCollectionModal();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isCollectionModalOpen]);

  useEffect(() => {
    if (!selectedCollection) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setSelectedCollection(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedCollection]);

  useEffect(() => {
    if (!isCollectionModalOpen) {
      setCollectionPreviewMedia(null);
      setIsCollectionPreviewLoading(false);
      return;
    }

    const trimmedCover = String(collectionFormCover || "").trim();
    if (!trimmedCover) {
      setCollectionPreviewMedia(null);
      setIsCollectionPreviewLoading(false);
      return;
    }

    if (!/^\d+$/.test(trimmedCover)) {
      setCollectionPreviewMedia(null);
      setIsCollectionPreviewLoading(false);
      return;
    }

    const coverId = Number.parseInt(trimmedCover, 10);
    if (!Number.isSafeInteger(coverId) || coverId <= 0) {
      setCollectionPreviewMedia(null);
      setIsCollectionPreviewLoading(false);
      return;
    }

    let isCancelled = false;
    const localCandidate = [selectedMedia, ...mediaFiles, ...favoritesFiles, ...collectionFiles]
      .find((item) => item?.id === coverId) || null;
    if (localCandidate) {
      setCollectionPreviewMedia(localCandidate);
      setIsCollectionPreviewLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    setIsCollectionPreviewLoading(true);
    void fetchMediaById(coverId)
      .then((item) => {
        if (!isCancelled) {
          setCollectionPreviewMedia(item);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCollectionPreviewMedia(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCollectionPreviewLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isCollectionModalOpen, collectionFormCover, selectedMedia, mediaFiles, favoritesFiles, collectionFiles]);

  const handleOpenRelatedMediaById = async (targetId, relationLabel) => {
    const normalizedId = Number(targetId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      setMediaModalError(`${relationLabel} id is invalid.`);
      return;
    }

    if (selectedMedia?.id === normalizedId) {
      return;
    }

    setMediaModalError("");

    const localCandidate = [selectedMedia, ...mediaFiles, ...favoritesFiles].find((item) => item?.id === normalizedId);
    if (localCandidate) {
      setSelectedMedia(localCandidate);
      return;
    }

    try {
      const query = new URLSearchParams({
        page: "1",
        pageSize: "1",
        search: `id:${normalizedId}`
      });
      const response = await fetch(`/api/media?${query.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load related media.");
      }

      const payload = await response.json();
      const files = getPagedFiles(payload);
      const matched = files.find((item) => item?.id === normalizedId);
      if (!matched) {
        throw new Error(`${relationLabel} media with id ${normalizedId} was not found.`);
      }

      setSelectedMedia(matched);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to open related media.");
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
    setActiveTagTypeDropdownId(null);
    setTagTypeQueryById({});
    setIsEditingMedia(true);
  };

  const handleCancelEditMedia = () => {
    setIsEditingMedia(false);
    setMediaModalError("");
    setActiveTagTypeDropdownId(null);
    setTagTypeQueryById({});
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
    let tagIds = [];
    try {
      parent = parseNullableId(mediaDraft.parent, "Parent");
      child = parseNullableId(mediaDraft.child, "Child");
      tagIds = parseMediaTagIdsByType(mediaDraft.tagsByType);
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
    const previousParentId = selectedMedia?.parent ?? null;
    const previousChildId = selectedMedia?.child ?? null;
    try {
      const response = await fetch(`/api/media/${selectedMedia.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          description: description || null,
          source: source || null,
          tagIds,
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

      const refreshedCurrentMedia = await fetchMediaById(selectedMedia.id);
      if (refreshedCurrentMedia) {
        setMediaFiles((current) => current.map((file) => (
          file.id === selectedMedia.id ? { ...file, ...refreshedCurrentMedia } : file
        )));
        setFavoritesFiles((current) => current.map((file) => (
          file.id === selectedMedia.id ? { ...file, ...refreshedCurrentMedia } : file
        )));
        setCollectionFiles((current) => current.map((file) => (
          file.id === selectedMedia.id ? { ...file, ...refreshedCurrentMedia } : file
        )));
        setSelectedMedia((current) => (
          current && current.id === selectedMedia.id
            ? { ...current, ...refreshedCurrentMedia }
            : current
        ));
      }

      const relatedIds = Array.from(new Set(
        [previousParentId, previousChildId, patch.parent, patch.child]
          .map((value) => Number(value))
          .filter((value) => Number.isSafeInteger(value) && value > 0 && value !== selectedMedia.id)
      ));

      if (relatedIds.length > 0) {
        const relatedItems = await Promise.all(relatedIds.map((relatedId) => fetchMediaById(relatedId)));
        const relatedById = new Map(
          relatedItems
            .filter((item) => item?.id != null)
            .map((item) => [item.id, item])
        );

        if (relatedById.size > 0) {
          setMediaFiles((current) => current.map((file) => (
            relatedById.has(file.id) ? { ...file, ...relatedById.get(file.id) } : file
          )));
          setFavoritesFiles((current) => current.map((file) => (
            relatedById.has(file.id) ? { ...file, ...relatedById.get(file.id) } : file
          )));
        }
      }

      setIsEditingMedia(false);
      setActiveTagTypeDropdownId(null);
      setTagTypeQueryById({});
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
      await loadMedia(currentPage, submittedText);
      await loadFavorites(favoritesPage);
    } catch (error) {
      setMediaModalError(error instanceof Error ? error.message : "Failed to delete media.");
    } finally {
      setIsDeletingMedia(false);
      setShowDeleteConfirm(false);
    }
  };

  const activeUploadItem = uploadItems[activeUploadIndex] || null;
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
  const collectionPreviewTileUrl = collectionPreviewMedia ? resolveTileUrl(collectionPreviewMedia) : "";
  const selectedUploadCollections = uploadCollections
    .filter((item) => uploadCollectionIds.includes(Number(item.id)));
  const hasUploadHistory = uploadTaskStatuses.length > 0 || backgroundUploadState.total > 0;
  const backgroundRemaining = backgroundUploadState.queued + (backgroundUploadState.isProcessing ? 1 : 0);
  const uploadItemsDraftMedia = uploadItems.map((item, index) => ({
    key: item.key,
    id: null,
    displayName: item?.draft?.title?.trim() || getDisplayName(item?.file?.name) || "Untitled",
    isQueued: true,
    queueIndex: index
  }));
  const existingMediaById = new Map();
  mediaFiles.forEach((item) => {
    const mediaId = Number(item?.id);
    if (!Number.isSafeInteger(mediaId) || mediaId <= 0 || existingMediaById.has(mediaId)) {
      return;
    }

    existingMediaById.set(mediaId, {
      key: `existing-${mediaId}`,
      id: mediaId,
      displayName: String(item?.title || getDisplayName(item?.name || item?.path || "") || `Media ${mediaId}`),
      isQueued: false
    });
  });
  const linkedMediaCandidates = [
    ...uploadItemsDraftMedia,
    ...Array.from(existingMediaById.values())
  ];
  const uploadDropdownSummary = backgroundUploadState.total === 0
    ? "No uploads"
    : backgroundRemaining > 0
      ? `Uploading ${backgroundUploadState.completed + backgroundUploadState.failed}/${backgroundUploadState.total}`
      : `Uploaded ${backgroundUploadState.completed}/${backgroundUploadState.total}`;
  const getUploadTaskStatusLabel = (status) => {
    if (status === "uploaded") {
      return "Uploaded";
    }

    if (status === "queued") {
      return "Queued";
    }

    if (status === "error") {
      return "Retry";
    }

    return "Uploading";
  };
  const isGalleryPage = activePage === "gallery";
  const isFavoritesPage = activePage === "favorites";
  const isCollectionsPage = activePage === "collections";
  useEffect(() => {
    if (!isUploadOpen) {
      return;
    }

    setActiveUploadIndex((current) => {
      if (uploadItems.length === 0) {
        return 0;
      }

      return Math.min(Math.max(current, 0), uploadItems.length - 1);
    });
  }, [uploadItems.length, isUploadOpen]);

  useEffect(() => {
    if (!isUploadOpen) {
      return undefined;
    }

    const handleUploadNavigation = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveUploadIndex((current) => Math.max(current - 1, 0));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveUploadIndex((current) => Math.min(current + 1, Math.max(uploadItems.length - 1, 0)));
      }
    };

    window.addEventListener("keydown", handleUploadNavigation);
    return () => window.removeEventListener("keydown", handleUploadNavigation);
  }, [isUploadOpen, uploadItems.length]);

  const isFileDragEvent = (event) => Array.from(event.dataTransfer?.types || []).includes("Files");
  const handleRootDragEnter = (event) => {
    if (!isGalleryPage || !isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pageDragCounterRef.current += 1;
    setIsDragOverPage(true);
  };
  const handleRootDragOver = (event) => {
    if (!isGalleryPage || !isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!isDragOverPage) {
      setIsDragOverPage(true);
    }
  };
  const handleRootDragLeave = (event) => {
    if (!isGalleryPage || !isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pageDragCounterRef.current = Math.max(pageDragCounterRef.current - 1, 0);
    if (pageDragCounterRef.current === 0) {
      setIsDragOverPage(false);
    }
  };
  const handleRootDrop = (event) => {
    if (!isGalleryPage || !isFileDragEvent(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pageDragCounterRef.current = 0;
    setIsDragOverPage(false);
    appendUploadItems(event.dataTransfer.files);
  };
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
  const openCollectionPickerForSelectedMedia = async () => {
    if (!selectedMedia?.id || isCollectionPickerLoading || isAddingMediaToCollection) {
      return;
    }

    setIsCollectionPickerOpen(true);
    setCollectionPickerError("");
    setIsCollectionPickerLoading(true);
    try {
      const response = await fetch(`/api/collections?mediaId=${selectedMedia.id}`);
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to fetch collections.");
      }

      setCollectionPickerItems(Array.isArray(result.items) ? result.items : []);
    } catch (error) {
      setCollectionPickerItems([]);
      setCollectionPickerError(error instanceof Error ? error.message : "Failed to fetch collections.");
    } finally {
      setIsCollectionPickerLoading(false);
    }
  };
  const closeCollectionPicker = () => {
    if (isAddingMediaToCollection) {
      return;
    }

    setIsCollectionPickerOpen(false);
    setCollectionPickerError("");
  };
  const handleAddSelectedMediaToCollection = async (collectionId) => {
    if (!selectedMedia?.id || !Number.isInteger(collectionId) || collectionId <= 0 || isAddingMediaToCollection) {
      return;
    }

    setIsAddingMediaToCollection(true);
    setCollectionPickerError("");
    setMediaModalError("");
    try {
      const response = await fetch(`/api/collections/${collectionId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: selectedMedia.id })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(result?.error || "Failed to add media to collection.");
      }

      setCollectionPickerItems((current) => current.map((item) => (
        item.id === collectionId
          ? { ...item, containsMedia: Boolean(result?.isIncluded) }
          : item
      )));
      setCollectionPickerError("");
      setMediaModalError("");
    } catch (error) {
      setCollectionPickerError(error instanceof Error ? error.message : "Failed to add media to collection.");
    } finally {
      setIsAddingMediaToCollection(false);
    }
  };
  const openGalleryPage = (event) => {
    event.preventDefault();
    setActivePage("gallery");
    setSelectedMedia(null);
    setSelectedCollection(null);
    setIsSlideMenuOpen(false);
    loadMedia(1, submittedText);
  };
  const openFavoritesPage = () => {
    setActivePage("favorites");
    setIsSlideMenuOpen(false);
    setSelectedMedia(null);
    setSelectedCollection(null);
  };
  const openTagsPage = () => {
    setActivePage("tags");
    setIsSlideMenuOpen(false);
    setSelectedMedia(null);
    setSelectedCollection(null);
  };
  const openCollectionsPage = () => {
    setActivePage("collections");
    setIsSlideMenuOpen(false);
    setSelectedMedia(null);
  };
  const handleCreateTagType = async (event) => {
    event.preventDefault();
    const normalizedName = tagTypeNameInput.trim();
    const normalizedColor = String(tagTypeColorInput || "").trim().toUpperCase();

    if (!normalizedName) {
      setTagTypesError("Name is required.");
      return;
    }

    if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
      setTagTypesError("Color must be a valid hex code (#RRGGBB).");
      return;
    }

    setIsTagTypeSaving(true);
    setTagTypesError("");
    try {
      const response = await fetch("/api/tag-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          color: normalizedColor
        })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("TagTypes API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to create tag type.");
      }

      setTagTypes((current) => [{
        id: result.id,
        name: result.name,
        color: result.color
      }, ...current]);
      setTagTypeNameInput("");
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to create tag type.");
    } finally {
      setIsTagTypeSaving(false);
    }
  };
  const handleClearTagTypeForm = () => {
    setTagTypeNameInput("");
    setTagTypeColorInput("#2563EB");
    setTagTypesError("");
  };
  const handleStartEditTagType = (item) => {
    setEditingTagTypeId(item.id);
    setEditingTagTypeName(String(item.name || ""));
    setEditingTagTypeColor(String(item.color || "#2563EB").toUpperCase());
    setTagTypesError("");
  };
  const handleCancelEditTagType = () => {
    setEditingTagTypeId(null);
    setEditingTagTypeName("");
    setEditingTagTypeColor("#2563EB");
    setIsTagTypeUpdating(false);
  };
  const ensureNewTagDraft = (tagTypeId) => {
    setNewTagDraftByTagTypeId((current) => (
      current[tagTypeId]
        ? current
        : { ...current, [tagTypeId]: { name: "", description: "" } }
    ));
  };
  const handleTagTypeCalloutToggle = (tagTypeId, isOpen) => {
    setTagTypeCalloutOpenById((current) => ({ ...current, [tagTypeId]: isOpen }));
    if (!isOpen) {
      setTagSearchQueryByTagTypeId((current) => {
        if (!current[tagTypeId]) {
          return current;
        }

        return {
          ...current,
          [tagTypeId]: ""
        };
      });
      return;
    }

    ensureNewTagDraft(tagTypeId);
    setTagSearchQueryByTagTypeId({ [tagTypeId]: "" });
    void loadTagsForTagType(tagTypeId);
  };
  const restoreTagCalloutStates = () => {
    if (!collapsedTagTypeCallouts) {
      return;
    }

    setTagTypeCalloutOpenById(collapsedTagTypeCallouts);
    setCollapsedTagTypeCallouts(null);
  };
  const handleTagDragStart = (event, sourceTagTypeId, tagItem) => {
    if (!tagItem?.id || isTagMoveInProgress) {
      event.preventDefault();
      return;
    }

    const previousOpenState = { ...tagTypeCalloutOpenById };
    setCollapsedTagTypeCallouts(previousOpenState);
    setTagTypeCalloutOpenById((current) => {
      const next = { ...current };
      tagTypes.forEach((tagType) => {
        next[tagType.id] = false;
      });
      return next;
    });

    setDraggedTag({
      id: tagItem.id,
      sourceTagTypeId,
      name: String(tagItem.name || "")
    });
    setDragTargetTagTypeId(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(tagItem.id));
  };
  const handleTagDragEnd = () => {
    restoreTagCalloutStates();
    setDraggedTag(null);
    setDragTargetTagTypeId(null);
  };
  const handleTagTypeDragOver = (event, targetTagTypeId) => {
    if (!draggedTag || draggedTag.sourceTagTypeId === targetTagTypeId || isTagMoveInProgress) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragTargetTagTypeId !== targetTagTypeId) {
      setDragTargetTagTypeId(targetTagTypeId);
    }
  };
  const handleTagTypeDragLeave = (targetTagTypeId) => {
    if (dragTargetTagTypeId === targetTagTypeId) {
      setDragTargetTagTypeId(null);
    }
  };
  const handleTagTypeDrop = async (event, targetTagTypeId) => {
    if (!draggedTag || draggedTag.sourceTagTypeId === targetTagTypeId || isTagMoveInProgress) {
      return;
    }

    event.preventDefault();
    setIsTagMoveInProgress(true);
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tags/${draggedTag.id}/tag-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagTypeId: targetTagTypeId })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tags API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to move tag.");
      }

      await Promise.all([
        loadTagsForTagType(draggedTag.sourceTagTypeId),
        loadTagsForTagType(targetTagTypeId)
      ]);
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to move tag.");
    } finally {
      setIsTagMoveInProgress(false);
      setDragTargetTagTypeId(null);
      setDraggedTag(null);
      restoreTagCalloutStates();
    }
  };
  const handleNewTagDraftChange = (tagTypeId, patch) => {
    setNewTagDraftByTagTypeId((current) => ({
      ...current,
      [tagTypeId]: {
        name: current[tagTypeId]?.name ?? "",
        description: current[tagTypeId]?.description ?? "",
        ...patch
      }
    }));
  };
  const handleClearNewTagDraft = (tagTypeId) => {
    setNewTagDraftByTagTypeId((current) => ({
      ...current,
      [tagTypeId]: { name: "", description: "" }
    }));
  };
  const refreshMediaTagCatalogForTagType = (tagTypeId, tags) => {
    setMediaTagCatalog((current) => {
      const nextTags = Array.isArray(tags) ? tags : [];
      const withoutType = current.filter((tag) => getTagTypeId(tag?.tagTypeId) !== tagTypeId);
      return [...withoutType, ...nextTags];
    });
  };
  const closeTagManagerPopup = () => {
    if (activeTagManagerTagTypeId !== null && savingTagByTagTypeId[activeTagManagerTagTypeId]) {
      return;
    }

    setActiveTagManagerTagTypeId(null);
  };
  const handleOpenTagManagerPopup = (tagTypeId, triggerElement = null) => {
    tagManagerTriggerButtonRef.current = triggerElement instanceof HTMLElement ? triggerElement : null;
    ensureNewTagDraft(tagTypeId);
    setTagTypesError("");
    setActiveTagManagerTagTypeId(tagTypeId);
    void loadTagsForTagType(tagTypeId);
  };
  const handleCreateTag = async (tagTypeId) => {
    const draft = newTagDraftByTagTypeId[tagTypeId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    const normalizedDescription = String(draft.description || "").trim();
    if (!normalizedName) {
      setTagTypesError("Tag name is required.");
      return;
    }

    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tag-types/${tagTypeId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          description: normalizedDescription || null
        })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tags API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to create tag.");
      }

      handleClearNewTagDraft(tagTypeId);
      const refreshedTags = await loadTagsForTagType(tagTypeId);
      refreshMediaTagCatalogForTagType(tagTypeId, refreshedTags);
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to create tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };
  const handleStartEditTag = (tagTypeId, tagItem) => {
    setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: tagItem.id }));
    setEditingTagDraftById((current) => ({
      ...current,
      [tagItem.id]: {
        name: String(tagItem.name || ""),
        description: String(tagItem.description || "")
      }
    }));
    setTagTypesError("");
  };
  const handleEditTagDraftChange = (tagId, patch) => {
    setEditingTagDraftById((current) => ({
      ...current,
      [tagId]: {
        name: current[tagId]?.name ?? "",
        description: current[tagId]?.description ?? "",
        ...patch
      }
    }));
  };
  const handleCancelEditTag = (tagTypeId) => {
    setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
  };
  const handleSaveTag = async (tagTypeId, tagId) => {
    const draft = editingTagDraftById[tagId] ?? { name: "", description: "" };
    const normalizedName = String(draft.name || "").trim();
    const normalizedDescription = String(draft.description || "").trim();
    if (!normalizedName) {
      setTagTypesError("Tag name is required.");
      return;
    }

    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          description: normalizedDescription || null
        })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tags API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to update tag.");
      }

      setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
      const refreshedTags = await loadTagsForTagType(tagTypeId);
      refreshMediaTagCatalogForTagType(tagTypeId, refreshedTags);
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to update tag.");
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };
  const handleDeleteTag = async (tagTypeId, tagId) => {
    setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: true }));
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "DELETE"
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Tags API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to delete tag.");
      }

      setTagsByTagTypeId((current) => ({
        ...current,
        [tagTypeId]: (current[tagTypeId] ?? []).filter((item) => item.id !== tagId)
      }));
      if (editingTagByTagTypeId[tagTypeId] === tagId) {
        setEditingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: null }));
      }
      refreshMediaTagCatalogForTagType(tagTypeId, (tagsByTagTypeId[tagTypeId] ?? []).filter((item) => item.id !== tagId));
      return true;
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to delete tag.");
      return false;
    } finally {
      setSavingTagByTagTypeId((current) => ({ ...current, [tagTypeId]: false }));
    }
  };
  const handleSaveTagType = async (itemId) => {
    const normalizedName = editingTagTypeName.trim();
    const normalizedColor = String(editingTagTypeColor || "").trim().toUpperCase();
    if (!normalizedName) {
      setTagTypesError("Name is required.");
      return;
    }

    if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
      setTagTypesError("Color must be a valid hex code (#RRGGBB).");
      return;
    }

    setIsTagTypeUpdating(true);
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tag-types/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          color: normalizedColor
        })
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("TagTypes API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to update tag type.");
      }

      setTagTypes((current) => current.map((item) => (
        item.id === itemId
          ? { ...item, name: result.name, color: result.color }
          : item
      )));
      handleCancelEditTagType();
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to update tag type.");
      setIsTagTypeUpdating(false);
    }
  };
  const handleDeleteTagType = async (itemId) => {
    setIsTagTypeUpdating(true);
    setTagTypesError("");
    try {
      const response = await fetch(`/api/tag-types/${itemId}`, {
        method: "DELETE"
      });
      const result = await readResponsePayload(response);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("TagTypes API not found (404). Restart backend to apply latest changes.");
        }
        throw new Error(result?.error || "Failed to delete tag type.");
      }

      setTagTypes((current) => current.filter((item) => item.id !== itemId));
      setTagsByTagTypeId((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setTagTypeCalloutOpenById((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });

      if (editingTagTypeId === itemId) {
        handleCancelEditTagType();
      }
      return true;
    } catch (error) {
      setTagTypesError(error instanceof Error ? error.message : "Failed to delete tag type.");
      return false;
    } finally {
      setIsTagTypeUpdating(false);
    }
  };
  const openTagDeleteConfirm = (payload) => {
    setPendingTagDelete(payload);
    setTagTypesError("");
  };
  const closeTagDeleteConfirm = () => {
    if (isDeletingTagEntity) {
      return;
    }

    setPendingTagDelete(null);
  };
  const handleConfirmTagDelete = async () => {
    if (!pendingTagDelete) {
      return;
    }

    setIsDeletingTagEntity(true);
    let deleted = false;
    if (pendingTagDelete.kind === "tagType") {
      deleted = await handleDeleteTagType(pendingTagDelete.id);
    } else {
      deleted = await handleDeleteTag(pendingTagDelete.tagTypeId, pendingTagDelete.id);
    }

    setIsDeletingTagEntity(false);
    if (deleted) {
      setPendingTagDelete(null);
    }
  };
  const hexToRgba = (hexColor, alpha) => {
    const value = String(hexColor || "").trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return `rgba(100, 116, 139, ${alpha})`;
    }

    const red = Number.parseInt(value.slice(1, 3), 16);
    const green = Number.parseInt(value.slice(3, 5), 16);
    const blue = Number.parseInt(value.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };
  return (
    <main
      className={`app-root${isDragOverPage ? " app-root-dragover" : ""}`}
      onDragEnter={handleRootDragEnter}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
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
          <div className="top-input-wrap">
            <div
              ref={searchHighlightRef}
              className="top-input-highlight"
              aria-hidden="true"
            >
              {inputValue ? (
                activePage === "collections" ? (
                  <span className="top-input-segment">{inputValue}</span>
                ) : (
                  parseSearchSegments(inputValue).map((segment, index) => (
                    <span
                      key={`${index}-${segment.text}`}
                      className={segment.isTag ? "top-input-segment is-tag" : "top-input-segment"}
                      style={segment.isTag && segment.color ? { outlineColor: segment.color } : undefined}
                    >
                      {segment.text}
                    </span>
                  ))
                )
              ) : (
                <span className="top-input-placeholder">
                  {activePage === "collections" ? "collection name" : "title:cat id:42"}
                </span>
              )}
            </div>
            <input
              ref={searchInputRef}
              className="top-input"
              type="text"
              value={inputValue}
              onChange={handleSearchInputChange}
              onFocus={() => setIsSearchInputFocused(true)}
              onBlur={() => setIsSearchInputFocused(false)}
              onClick={updateSearchCaretPosition}
              onKeyUp={updateSearchCaretPosition}
              onKeyDown={handleSearchInputKeyDown}
              onScroll={syncSearchHighlightScroll}
              placeholder={activePage === "collections" ? "collection name" : "title:cat id:42"}
            />
            {hasSearchSuggestions ? (
              <ul className="top-search-suggestions">
                {searchSuggestions.map((suggestion, index) => (
                  <li key={suggestion.key}>
                    <button
                      type="button"
                      className={`top-search-suggestion${index === activeSearchSuggestionIndex ? " is-active" : ""}`}
                      style={suggestion.color ? { outlineColor: suggestion.color } : undefined}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySearchSuggestion(suggestion);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
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
                          onClick={() => handleRetryUploadTask(task.id)}
                          title={task.error || "Click to retry upload"}
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
          accept="image/*,video/*,.gif,.jfif"
          onChange={handleUploadPickerChange}
          style={{ display: "none" }}
        />
      </header>
      {isGalleryPage && isDragOverPage ? (
        <div className="page-drop-overlay">
          <p>Drop files to upload</p>
        </div>
      ) : null}

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
              <button
                type="button"
                className="slide-menu-item"
                onClick={openTagsPage}
              >
                Tags
              </button>
              <button
                type="button"
                className="slide-menu-item"
                onClick={openCollectionsPage}
              >
                Collections
              </button>
            </nav>
          </aside>
        </div>
      ) : null}

      {isGalleryPage ? (
      <section className="media-section">
        {mediaError ? <p className="media-state error">{mediaError}</p> : null}
        {!mediaError && isMediaLoading && visibleMediaFiles.length === 0 ? (
          <p className="media-state">Loading media...</p>
        ) : null}
        {!mediaError && !isMediaLoading && totalFiles === 0 ? (
          <p className="media-state">No files in backend/App_Data/Media.</p>
        ) : null}
        {!mediaError && !isMediaLoading && totalFiles > 0 && visibleMediaFiles.length === 0 ? (
          <p className="media-state">No preview images available for current files.</p>
        ) : null}

        {!mediaError && visibleMediaFiles.length > 0 ? (
          <>
            {renderPagination(true)}
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
            {renderPagination(false)}
          </>
        ) : null}
      </section>
      ) : isFavoritesPage ? (
        <section className="favorites-page">
          {favoritesError ? <p className="media-state error">{favoritesError}</p> : null}
          {!favoritesError && isFavoritesLoading && favoritesTotalFiles === 0 ? (
            <p className="media-state">Loading favorites...</p>
          ) : null}
          {!favoritesError && !isFavoritesLoading && favoritesTotalFiles === 0 ? (
            <p className="media-state">No favorite media yet.</p>
          ) : null}
          {!favoritesError && favoritesTotalFiles > 0 ? (
            <>
              {renderFavoritesPagination(true)}
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
              {renderFavoritesPagination(false)}
            </>
          ) : null}
        </section>
      ) : isCollectionsPage ? (
        <section className="collections-page">
          <div className="collections-toolbar">
            <button
              type="button"
              className="collections-btn collections-btn-primary"
              onClick={openCreateCollectionModal}
            >
              New collection
            </button>
          </div>

          {isCollectionsLoading ? <p className="collections-state">Loading collections...</p> : null}
          {!isCollectionsLoading && collections.length === 0 ? (
            <p className="collections-state">No collections found.</p>
          ) : null}
          {!isCollectionsLoading && collections.length > 0 ? (
            <ul className="collections-list">
              {collections.map((item) => (
                <li
                  key={item.id}
                  className="collections-item collections-item-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleOpenCollection(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void handleOpenCollection(item);
                    }
                  }}
                >
                  <div className="collections-item-cover">
                    {item.coverMedia?.tileUrl ? (
                      <img
                        src={item.coverMedia.tileUrl}
                        alt={String(item.label || "Collection cover")}
                        loading="lazy"
                      />
                    ) : (
                      <div className="collections-item-cover-fallback">No cover</div>
                    )}
                  </div>
                  <div className="collections-item-body">
                    <h3>{item.label}</h3>
                    <p>{item.description || "No description."}</p>
                    <p className="collections-meta">
                      Cover: {item.cover ? `#${item.cover}` : "not set"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <section className="tags-page">
          <div className="tags-callout">
            <form
              className="tags-callout-form"
              onSubmit={handleCreateTagType}
            >
              <input
                type="color"
                className="tags-color-input"
                value={tagTypeColorInput}
                onChange={(event) => setTagTypeColorInput(event.target.value.toUpperCase())}
                aria-label="TagType color"
              />
              <input
                type="text"
                className="tags-name-input"
                value={tagTypeNameInput}
                onChange={(event) => setTagTypeNameInput(event.target.value)}
                placeholder="TagType name"
                aria-label="TagType name"
              />
              <div className="tags-callout-actions">
                <button
                  type="submit"
                  className="tags-action-btn tags-action-create"
                  disabled={!tagTypeNameInput.trim() || isTagTypeSaving}
                  aria-label="Create TagType"
                  title="Create TagType"
                >
                  {"\u2714"}
                </button>
                <button
                  type="button"
                  className="tags-action-btn tags-action-clear"
                  onClick={handleClearTagTypeForm}
                  aria-label="Clear TagType form"
                  title="Clear TagType form"
                >
                  {"\u274C"}
                </button>
              </div>
            </form>
            {tagTypesError ? <p className="tags-error">{tagTypesError}</p> : null}
          </div>
          {isTagTypesLoading ? <p className="tags-state">Loading TagTypes...</p> : null}
          {!isTagTypesLoading && tagTypes.length === 0 ? (
            <p className="tags-state">No TagTypes yet.</p>
          ) : null}
          {!isTagTypesLoading && tagTypes.length > 0 ? (
            <ul className="tag-type-list">
              {tagTypes.map((item) => {
                const color = /^#[0-9A-Fa-f]{6}$/.test(String(item.color || ""))
                  ? String(item.color).toUpperCase()
                  : "#64748B";
                const isEditing = editingTagTypeId === item.id;
                const summaryStyle = {
                  borderColor: hexToRgba(color, 0.45),
                  backgroundColor: hexToRgba(color, 0.2),
                  color
                };
                const bodyStyle = {
                  borderTopColor: hexToRgba(color, 0.24),
                  backgroundColor: hexToRgba(color, 0.08)
                };
                const rawTagSearchQuery = String(tagSearchQueryByTagTypeId[item.id] || "");
                const normalizedTagSearchQuery = rawTagSearchQuery.trim().toLowerCase();
                const filteredTags = (tagsByTagTypeId[item.id] ?? []).filter((tagItem) => {
                  if (!normalizedTagSearchQuery) {
                    return true;
                  }

                  const name = String(tagItem?.name || "").toLowerCase();
                  const description = String(tagItem?.description || "").toLowerCase();
                  return name.includes(normalizedTagSearchQuery) || description.includes(normalizedTagSearchQuery);
                });

                return (
                  <li key={item.id} className="tag-type-item">
                    <details
                      className={`tag-type-callout${dragTargetTagTypeId === item.id ? " tag-type-callout-drop-target" : ""}`}
                      open={!!tagTypeCalloutOpenById[item.id]}
                      onToggle={(event) => handleTagTypeCalloutToggle(item.id, event.currentTarget.open)}
                      onDragOver={(event) => handleTagTypeDragOver(event, item.id)}
                      onDragLeave={() => handleTagTypeDragLeave(item.id)}
                      onDrop={(event) => void handleTagTypeDrop(event, item.id)}
                    >
                      <summary
                        className="tag-type-summary"
                        style={summaryStyle}
                      >
                        {isEditing ? (
                          <div
                            className="tag-type-edit-row"
                            onClick={(event) => event.preventDefault()}
                          >
                            <input
                              type="color"
                              className="tags-color-input tag-type-edit-color"
                              value={editingTagTypeColor}
                              onChange={(event) => setEditingTagTypeColor(event.target.value.toUpperCase())}
                              aria-label="Edit TagType color"
                            />
                            <input
                              type="text"
                              className="tags-name-input tag-type-edit-name"
                              value={editingTagTypeName}
                              onChange={(event) => setEditingTagTypeName(event.target.value)}
                              aria-label="Edit TagType name"
                            />
                          </div>
                        ) : (
                          <span className="tag-type-summary-name">{item.name}</span>
                        )}
                        <div className="tag-type-summary-actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-create"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleSaveTagType(item.id);
                                }}
                                disabled={!editingTagTypeName.trim() || isTagTypeUpdating}
                                aria-label="Update TagType"
                                title="Update TagType"
                              >
                                {"\u2714"}
                              </button>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-clear"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleCancelEditTagType();
                                }}
                                disabled={isTagTypeUpdating}
                                aria-label="Cancel edit TagType"
                                title="Cancel edit TagType"
                              >
                                {"\u274C"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="tags-action-btn tag-type-edit-btn"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleStartEditTagType(item);
                                }}
                                aria-label="Edit TagType"
                                title="Edit TagType"
                              >
                                {"\uD83D\uDEE0"}
                              </button>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-delete"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openTagDeleteConfirm({
                                    kind: "tagType",
                                    id: item.id,
                                    name: item.name
                                  });
                                }}
                                disabled={isTagTypeUpdating}
                                aria-label="Delete TagType"
                                title="Delete TagType"
                              >
                                {"\uD83D\uDDD1"}
                              </button>
                            </>
                          )}
                        </div>
                      </summary>
                      <div className="tag-type-body" style={bodyStyle}>
                        <input
                          type="text"
                          className="tag-callout-search-input"
                          value={rawTagSearchQuery}
                          onChange={(event) => setTagSearchQueryByTagTypeId((current) => ({
                            ...current,
                            [item.id]: event.target.value
                          }))}
                          placeholder="Search tags by name or description"
                        />
                        <table className="tag-table">
                          <tbody>
                            <tr>
                              <td>
                                <input
                                  type="text"
                                  className="tag-table-input"
                                  value={newTagDraftByTagTypeId[item.id]?.name ?? ""}
                                  onChange={(event) => handleNewTagDraftChange(item.id, { name: event.target.value })}
                                  placeholder="New tag name"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="tag-table-input"
                                  value={newTagDraftByTagTypeId[item.id]?.description ?? ""}
                                  onChange={(event) => handleNewTagDraftChange(item.id, { description: event.target.value })}
                                  placeholder="Description"
                                />
                              </td>
                              <td>
                                <div className="tag-table-actions">
                                  <button
                                    type="button"
                                    className="tags-action-btn tags-action-create"
                                    onClick={() => void handleCreateTag(item.id)}
                                    disabled={!String(newTagDraftByTagTypeId[item.id]?.name || "").trim() || !!savingTagByTagTypeId[item.id]}
                                    title="Create tag"
                                  >
                                    {"\u2714"}
                                  </button>
                                  <button
                                    type="button"
                                    className="tags-action-btn tags-action-clear"
                                    onClick={() => handleClearNewTagDraft(item.id)}
                                    disabled={!!savingTagByTagTypeId[item.id]}
                                    title="Clear new tag"
                                  >
                                    {"\u274C"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {filteredTags.map((tagItem) => {
                              const isEditingTag = editingTagByTagTypeId[item.id] === tagItem.id;
                              const editingDraft = editingTagDraftById[tagItem.id] ?? {
                                name: String(tagItem.name || ""),
                                description: String(tagItem.description || "")
                              };

                              return (
                                <tr
                                  key={tagItem.id}
                                  className={`tag-table-row${draggedTag?.id === tagItem.id ? " tag-table-row-dragging" : ""}`}
                                  draggable={!isEditingTag && !isTagMoveInProgress}
                                  onDragStart={(event) => handleTagDragStart(event, item.id, tagItem)}
                                  onDragEnd={handleTagDragEnd}
                                >
                                  <td>
                                    {isEditingTag ? (
                                      <input
                                        type="text"
                                        className="tag-table-input"
                                        value={editingDraft.name}
                                        onChange={(event) => handleEditTagDraftChange(tagItem.id, { name: event.target.value })}
                                      />
                                    ) : (tagItem.name)}
                                  </td>
                                  <td>
                                    {isEditingTag ? (
                                      <input
                                        type="text"
                                        className="tag-table-input"
                                        value={editingDraft.description}
                                        onChange={(event) => handleEditTagDraftChange(tagItem.id, { description: event.target.value })}
                                      />
                                    ) : (tagItem.description || "-")}
                                  </td>
                                  <td>
                                    <div className="tag-table-actions">
                                      {isEditingTag ? (
                                        <>
                                          <button
                                            type="button"
                                            className="tags-action-btn tags-action-create"
                                            onClick={() => void handleSaveTag(item.id, tagItem.id)}
                                            disabled={!String(editingDraft.name || "").trim() || !!savingTagByTagTypeId[item.id]}
                                            title="Save tag"
                                          >
                                            {"\u2714"}
                                          </button>
                                          <button
                                            type="button"
                                            className="tags-action-btn tags-action-clear"
                                            onClick={() => handleCancelEditTag(item.id)}
                                            disabled={!!savingTagByTagTypeId[item.id]}
                                            title="Cancel edit"
                                          >
                                            {"\u274C"}
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            className="tags-action-btn tag-table-edit-btn"
                                            onClick={() => handleStartEditTag(item.id, tagItem)}
                                            title="Edit tag"
                                          >
                                            {"\uD83D\uDEE0"}
                                          </button>
                                          <button
                                            type="button"
                                            className="tags-action-btn tags-action-delete"
                                            onClick={() => openTagDeleteConfirm({
                                              kind: "tag",
                                              id: tagItem.id,
                                              tagTypeId: item.id,
                                              name: tagItem.name
                                            })}
                                            disabled={!!savingTagByTagTypeId[item.id]}
                                            title="Delete tag"
                                          >
                                            {"\uD83D\uDDD1"}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {tagTableStateByTagTypeId[item.id]?.loading ? (
                          <p className="tag-table-state">Loading tags...</p>
                        ) : null}
                        {tagTableStateByTagTypeId[item.id]?.error ? (
                          <p className="tag-table-state tag-table-state-error">{tagTableStateByTagTypeId[item.id].error}</p>
                        ) : null}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      )}

      {activeTagManagerTagTypeId !== null ? (
        <div
          className="media-confirm-overlay"
          onClick={() => {
            if (!savingTagByTagTypeId[activeTagManagerTagTypeId]) {
              closeTagManagerPopup();
            }
          }}
        >
          <div
            className="media-confirm-dialog tag-manager-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Tag manager"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tag-manager-header">
              <strong>
                Manage tags: {tagTypes.find((item) => item.id === activeTagManagerTagTypeId)?.name || `TagType ${activeTagManagerTagTypeId}`}
              </strong>
              <button
                ref={tagManagerCloseButtonRef}
                type="button"
                className="media-action-btn"
                onClick={closeTagManagerPopup}
                disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                aria-label="Close tag manager"
              >
                {"\u274C"}
              </button>
            </div>
            <table className="tag-table">
              <tbody>
                <tr>
                  <td>
                    <input
                      type="text"
                      className="tag-table-input"
                      value={newTagDraftByTagTypeId[activeTagManagerTagTypeId]?.name ?? ""}
                      onChange={(event) => handleNewTagDraftChange(activeTagManagerTagTypeId, { name: event.target.value })}
                      placeholder="New tag name"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="tag-table-input"
                      value={newTagDraftByTagTypeId[activeTagManagerTagTypeId]?.description ?? ""}
                      onChange={(event) => handleNewTagDraftChange(activeTagManagerTagTypeId, { description: event.target.value })}
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <div className="tag-table-actions">
                      <button
                        type="button"
                        className="tags-action-btn tags-action-create"
                        onClick={() => void handleCreateTag(activeTagManagerTagTypeId)}
                        disabled={!String(newTagDraftByTagTypeId[activeTagManagerTagTypeId]?.name || "").trim() || !!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                        title="Create tag"
                      >
                        {"\u2714"}
                      </button>
                      <button
                        type="button"
                        className="tags-action-btn tags-action-clear"
                        onClick={() => handleClearNewTagDraft(activeTagManagerTagTypeId)}
                        disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                        title="Clear new tag"
                      >
                        {"\u274C"}
                      </button>
                    </div>
                  </td>
                </tr>
                {(tagsByTagTypeId[activeTagManagerTagTypeId] ?? []).map((tagItem) => {
                  const isEditingTag = editingTagByTagTypeId[activeTagManagerTagTypeId] === tagItem.id;
                  const editingDraft = editingTagDraftById[tagItem.id] ?? {
                    name: String(tagItem.name || ""),
                    description: String(tagItem.description || "")
                  };

                  return (
                    <tr key={tagItem.id}>
                      <td>
                        {isEditingTag ? (
                          <input
                            type="text"
                            className="tag-table-input"
                            value={editingDraft.name}
                            onChange={(event) => handleEditTagDraftChange(tagItem.id, { name: event.target.value })}
                          />
                        ) : (tagItem.name)}
                      </td>
                      <td>
                        {isEditingTag ? (
                          <input
                            type="text"
                            className="tag-table-input"
                            value={editingDraft.description}
                            onChange={(event) => handleEditTagDraftChange(tagItem.id, { description: event.target.value })}
                          />
                        ) : (tagItem.description || "-")}
                      </td>
                      <td>
                        <div className="tag-table-actions">
                          {isEditingTag ? (
                            <>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-create"
                                onClick={() => void handleSaveTag(activeTagManagerTagTypeId, tagItem.id)}
                                disabled={!String(editingDraft.name || "").trim() || !!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                                title="Save tag"
                              >
                                {"\u2714"}
                              </button>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-clear"
                                onClick={() => handleCancelEditTag(activeTagManagerTagTypeId)}
                                disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                                title="Cancel edit"
                              >
                                {"\u274C"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="tags-action-btn tag-table-edit-btn"
                                onClick={() => handleStartEditTag(activeTagManagerTagTypeId, tagItem)}
                                title="Edit tag"
                              >
                                {"\u2699"}
                              </button>
                              <button
                                type="button"
                                className="tags-action-btn tags-action-delete"
                                onClick={() => openTagDeleteConfirm({
                                  kind: "tag",
                                  id: tagItem.id,
                                  tagTypeId: activeTagManagerTagTypeId,
                                  name: tagItem.name
                                })}
                                disabled={!!savingTagByTagTypeId[activeTagManagerTagTypeId]}
                                title="Delete tag"
                              >
                                {"\uD83D\uDDD1"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tagTableStateByTagTypeId[activeTagManagerTagTypeId]?.loading ? (
              <p className="tag-table-state">Loading tags...</p>
            ) : null}
            {tagTableStateByTagTypeId[activeTagManagerTagTypeId]?.error ? (
              <p className="tag-table-state tag-table-state-error">{tagTableStateByTagTypeId[activeTagManagerTagTypeId].error}</p>
            ) : null}
          </div>
        </div>
      ) : null}

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
            className={`media-modal${uploadStep === "queue" ? " media-modal-editing" : ""}`}
            onClick={(event) => event.stopPropagation()}
            onPaste={uploadStep === "queue" ? handleUploadQueuePaste : undefined}
          >
            <div className="media-modal-header">
              <h2 className="upload-modal-title">
                {uploadStep === "queue"
                  ? `Queue (${uploadItems.length})`
                  : (uploadItems.length === 0 ? "No files remaining" : `Editing: ${activeUploadItem?.file.name || "-"}`)}
              </h2>
              <div className="media-upload-nav">
                <button
                  type="button"
                  className="media-action-btn"
                  onClick={() => setActiveUploadIndex((current) => Math.max(current - 1, 0))}
                  disabled={uploadItems.length === 0 || activeUploadIndex === 0}
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  className="media-action-btn"
                  onClick={() => setActiveUploadIndex((current) => Math.min(current + 1, uploadItems.length - 1))}
                  disabled={uploadItems.length === 0 || activeUploadIndex >= uploadItems.length - 1}
                >
                  Next →
                </button>
              </div>
              <button
                type="button"
                className="media-action-btn"
                onClick={closeUploadModal}
              >
                Close
              </button>
            </div>

            {uploadStep === "queue" ? (
              <div className="upload-queue-step" onPaste={handleUploadQueuePaste}>
                <button
                  type="button"
                  className={`upload-queue-dropzone${isUploadQueueDragOver ? " is-dragover" : ""}`}
                  onClick={openUploadPicker}
                  onDragEnter={(event) => {
                    if (!isFileDragEvent(event)) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setIsUploadQueueDragOver(true);
                  }}
                  onDragOver={(event) => {
                    if (!isFileDragEvent(event)) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = "copy";
                    setIsUploadQueueDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    if (!isFileDragEvent(event)) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setIsUploadQueueDragOver(false);
                  }}
                  onDrop={handleUploadQueueDrop}
                >
                  Click, drop, or paste files here
                </button>

                {uploadItems.length === 0 ? (
                  <p className="upload-queue-empty">No files selected yet.</p>
                ) : (
                  <ul className="upload-queue-list">
                    {uploadItems.map((item, index) => (
                      <li key={item.key} className="upload-queue-item">
                        <span className="upload-queue-file-name">{item.file.name}</span>
                        <div className="upload-queue-item-actions">
                          <button
                            type="button"
                            className="media-action-btn"
                            onClick={() => moveUploadItem(item.key, "up")}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="media-action-btn"
                            onClick={() => moveUploadItem(item.key, "down")}
                            disabled={index === uploadItems.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="media-action-btn media-action-danger"
                            onClick={() => handleRemoveUploadItem(item.key)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {uploadState.message ? (
                  <p className={uploadState.type === "error" ? "media-action-error" : "media-action-success"}>
                    {uploadState.message}
                  </p>
                ) : null}

                <div className="media-action-row media-action-row-spaced">
                  <button
                    type="button"
                    className="media-action-btn media-action-primary"
                    onClick={() => setUploadStep("editor")}
                    disabled={uploadItems.length === 0}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                    showTagsRow: true,
                    extraRows: (
                      <>
                        <tr>
                          <th scope="row">File</th>
                          <td>{activeUploadItem?.file.name || "-"}</td>
                        </tr>
                        <tr>
                          <th scope="row">Collection</th>
                          <td>
                            <div className="media-action-row media-action-row-upload-collection">
                              <button
                                type="button"
                                className="media-action-btn"
                                onClick={() => {
                                  void openUploadCollectionPicker();
                                }}
                                disabled={isUploadCollectionsLoading}
                              >
                                {isUploadCollectionsLoading ? "Loading..." : "Select"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      </>
                    )
                  })}

                  {uploadCollectionsError ? (
                    <p className="media-action-error">{uploadCollectionsError}</p>
                  ) : null}

                  {uploadState.message ? (
                    <p className={uploadState.type === "error" ? "media-action-error" : "media-action-success"}>
                      {uploadState.message}
                    </p>
                  ) : null}

                  <div className="media-action-row media-action-row-spaced">
                    <label className="media-upload-group-toggle">
                      <input
                        type="checkbox"
                        checked={isGroupUploadEnabled}
                        onChange={(event) => {
                          setIsGroupUploadEnabled(event.target.checked);
                        }}
                      />
                      group
                    </label>
                    <button
                      type="button"
                      className="media-action-btn"
                      onClick={() => setUploadStep("queue")}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="media-action-btn media-action-primary"
                      onClick={handleUpload}
                      disabled={uploadItems.length === 0}
                    >
                      Upload
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isUploadOpen && isUploadCollectionPickerOpen ? (
        <div
          className="media-confirm-overlay"
          onClick={closeUploadCollectionPicker}
        >
          <div
            className="collection-picker-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="collection-picker-title">Select collection</p>
            {uploadCollectionsError ? <p className="media-action-error">{uploadCollectionsError}</p> : null}
            {isUploadCollectionsLoading ? (
              <p className="collections-state">Loading collections...</p>
            ) : uploadCollections.length === 0 ? (
              <p className="collections-state">No collections available.</p>
            ) : (
              <ul className="collection-picker-list">
                {uploadCollections.map((item) => {
                  const collectionId = Number(item.id);
                  const isIncluded = Number.isSafeInteger(collectionId) && uploadCollectionIds.includes(collectionId);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`collection-picker-item${isIncluded ? " is-included" : ""}`}
                        onClick={() => toggleUploadCollectionSelection(item.id)}
                      >
                        <span>{item.label}</span>
                        <em>{isIncluded ? "Included" : "Not included"}</em>
                        <small>{item.description || "No description"}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="media-delete-buttons">
              <button
                type="button"
                className="media-action-btn"
                onClick={closeUploadCollectionPicker}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCollectionModalOpen ? (
        <div
          className="media-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeCollectionModal}
        >
          <div
            className="collection-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="media-modal-header">
              <h2 className="upload-modal-title">{editingCollectionId ? "Edit collection" : "Create collection"}</h2>
              <button
                type="button"
                className="media-action-btn"
                onClick={closeCollectionModal}
              >
                Close
              </button>
            </div>

            <div className="collection-modal-body">
              <form className="collections-form" onSubmit={handleSubmitCollection}>
                <input
                  type="text"
                  className="collections-input"
                  value={collectionFormLabel}
                  onChange={(event) => setCollectionFormLabel(event.target.value)}
                  placeholder="Collection name"
                  aria-label="Collection name"
                />
                <input
                  type="text"
                  className="collections-input"
                  value={collectionFormDescription}
                  onChange={(event) => setCollectionFormDescription(event.target.value)}
                  placeholder="Description"
                  aria-label="Collection description"
                />
                <input
                  type="text"
                  className="collections-input"
                  value={collectionFormCover}
                  onChange={(event) => setCollectionFormCover(event.target.value)}
                  placeholder="Cover media id (optional)"
                  aria-label="Collection cover media id"
                />
                {collectionsError ? <p className="collections-error">{collectionsError}</p> : null}
                <div className="collections-form-actions">
                  <button
                    type="submit"
                    className="collections-btn collections-btn-primary"
                    disabled={isCollectionSaving}
                  >
                    {isCollectionSaving ? "Saving..." : editingCollectionId ? "Save" : "Create"}
                  </button>
                  <button
                    type="button"
                    className="collections-btn"
                    onClick={closeCollectionModal}
                    disabled={isCollectionSaving}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <div className="collections-preview">
                <p className="collections-preview-title">Preview</p>
                <div className="collections-item">
                  <div className="collections-item-cover">
                    {isCollectionPreviewLoading ? (
                      <div className="collections-item-cover-fallback">Loading...</div>
                    ) : collectionPreviewTileUrl ? (
                      <img
                        src={collectionPreviewTileUrl}
                        alt="Collection preview cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="collections-item-cover-fallback">No cover</div>
                    )}
                  </div>
                  <div className="collections-item-body">
                    <h3>{collectionFormLabel.trim() || "Untitled collection"}</h3>
                    <p>{collectionFormDescription.trim() || "No description."}</p>
                    <p className="collections-meta">
                      Cover: {collectionFormCover.trim() ? `#${collectionFormCover.trim()}` : "not set"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedCollection ? (
        <div
          className="media-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedCollection(null)}
        >
          <div
            className="collection-view-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="media-modal-header">
              <h2 className="upload-modal-title">{selectedCollection.label}</h2>
              <button
                type="button"
                className="media-action-btn"
                onClick={() => setSelectedCollection(null)}
              >
                Close
              </button>
            </div>

            <div className="collection-view-meta">
              <p>{selectedCollection.description || "No description."}</p>
              <div className="collections-item-actions">
                <button
                  type="button"
                  className="collections-btn"
                  onClick={handleEditSelectedCollection}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="collections-btn collections-btn-danger"
                  onClick={() => handleRequestDeleteCollection(selectedCollection)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="collection-view-content">
              {collectionFilesError ? <p className="collections-error">{collectionFilesError}</p> : null}
              {!collectionFilesError && isCollectionFilesLoading && collectionFilesTotalCount === 0 ? (
                <p className="collections-state">Loading collection files...</p>
              ) : null}
              {!collectionFilesError && !isCollectionFilesLoading && collectionFilesTotalCount === 0 ? (
                <p className="collections-state">Collection is empty.</p>
              ) : null}
              {!collectionFilesError && collectionFilesTotalCount > 0 ? (
                <>
                  {renderCollectionFilesPagination(true)}
                  <div className="media-grid">
                    {visibleCollectionFiles.map((file) => (
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
                  {renderCollectionFilesPagination(false)}
                </>
              ) : null}
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
            className={`media-modal${isEditingMedia ? " media-modal-editing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="media-modal-header media-modal-header-empty" />

            <div className="media-modal-content">
              <button
                type="button"
                className="media-nav-btn media-nav-btn-prev"
                onClick={() => handleNavigateSelectedMedia(-1)}
                disabled={!canNavigateSelectedMedia}
                aria-label="Previous media"
                title="Previous media"
              >
                {"<"}
              </button>
              {isVideoFile(selectedMedia) ? (
                <video
                  src={resolveOriginalMediaUrl(selectedMedia)}
                  controls
                  autoPlay={!isEditingMedia}
                  poster={resolvePreviewMediaUrl(selectedMedia)}
                  preload="metadata"
                />
              ) : (
                <img
                  src={resolveOriginalMediaUrl(selectedMedia)}
                  alt={getDisplayName(selectedMedia.name)}
                />
              )}
              <button
                type="button"
                className="media-nav-btn media-nav-btn-next"
                onClick={() => handleNavigateSelectedMedia(1)}
                disabled={!canNavigateSelectedMedia}
                aria-label="Next media"
                title="Next media"
              >
                {">"}
              </button>
            </div>

            <div className="media-modal-meta">
              <div className="media-favorite-row">
                <button
                  type="button"
                  className="media-icon-btn media-icon-btn-collections"
                  onClick={openCollectionPickerForSelectedMedia}
                  disabled={!selectedMedia?.id || isCollectionPickerLoading || isAddingMediaToCollection}
                  aria-label="Add to collection"
                  title="Add to collection"
                >
                  {"\uD83D\uDCC1"}
                </button>
                <button
                  type="button"
                  className={`media-favorite-btn${isSelectedMediaFavorite ? " is-active" : ""}`}
                  aria-label={isSelectedMediaFavorite ? "Remove from favorites" : "Add to favorites"}
                  title={isSelectedMediaFavorite ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isSelectedMediaFavorite}
                  onClick={toggleSelectedMediaFavorite}
                  disabled={isFavoriteUpdating || !selectedMedia?.id}
                >
                  {"\u2764"}
                </button>
                <button
                  type="button"
                  className="media-icon-btn media-icon-btn-close"
                  onClick={() => setSelectedMedia(null)}
                  aria-label="Close media modal"
                  title="Close media modal"
                >
                  {"\u274C"}
                </button>
              </div>
              <div className={`media-meta-primary${isEditingMedia ? " is-editing" : ""}`}>
                {renderMediaMetaTable({
                  file: selectedMedia,
                  draft: mediaDraft,
                  editable: isEditingMedia,
                  onDraftChange: (patch) => setMediaDraft((current) => ({ ...current, ...patch })),
                  showTagsRow: true
                })}
                {isEditingMedia ? (
                  <div className="media-edit-thumbnail" aria-label="Current media thumbnail">
                    {isVideoFile(selectedMedia) ? (
                      <video
                        src={resolveOriginalMediaUrl(selectedMedia)}
                        poster={resolvePreviewMediaUrl(selectedMedia)}
                        preload="metadata"
                        playsInline
                        muted
                      />
                    ) : (
                      <img
                        src={resolvePreviewMediaUrl(selectedMedia)}
                        alt={getDisplayName(selectedMedia.name)}
                        loading="lazy"
                      />
                    )}
                  </div>
                ) : null}
              </div>

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
                    <tr>
                      <th scope="row">File Size</th>
                      <td>{formatFileSize(selectedMedia.sizeBytes)}</td>
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
          {isCollectionPickerOpen ? (
            <div
              className="media-confirm-overlay"
              onClick={closeCollectionPicker}
            >
              <div
                className="collection-picker-dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="collection-picker-title">Select collection</p>
                {collectionPickerError ? <p className="media-action-error">{collectionPickerError}</p> : null}
                {isCollectionPickerLoading ? (
                  <p className="collections-state">Loading collections...</p>
                ) : collectionPickerItems.length === 0 ? (
                  <p className="collections-state">No collections available.</p>
                ) : (
                  <ul className="collection-picker-list">
                    {collectionPickerItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`collection-picker-item${item.containsMedia ? " is-included" : ""}`}
                          onClick={() => void handleAddSelectedMediaToCollection(item.id)}
                          disabled={isAddingMediaToCollection}
                        >
                          <span>{item.label}</span>
                          <em>{item.containsMedia ? "Included" : "Not included"}</em>
                          <small>{item.description || "No description."}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="media-delete-buttons">
                  <button
                    type="button"
                    className="media-action-btn"
                    onClick={closeCollectionPicker}
                    disabled={isAddingMediaToCollection}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {isMediaRelationPickerOpen && isEditingMedia ? (
            <div
              className="media-confirm-overlay"
              onClick={closeMediaRelationPicker}
            >
              <div
                className="collection-picker-dialog media-relation-picker-dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="collection-picker-title">
                  Select {mediaRelationPickerMode === "child" ? "child" : "parent"} media
                </p>
                <div className="media-relation-picker-controls">
                  <input
                    type="search"
                    className="media-edit-input"
                    value={mediaRelationPickerQuery}
                    onChange={(event) => {
                      setMediaRelationPickerQuery(event.target.value);
                      setMediaRelationPickerPage(1);
                    }}
                    placeholder="Search by id, title, path..."
                  />
                  <button
                    type="button"
                    className="media-action-btn"
                    onClick={() => {
                      setMediaRelationPickerQuery("");
                      setMediaRelationPickerPage(1);
                    }}
                    disabled={!mediaRelationPickerQuery}
                  >
                    Reset
                  </button>
                </div>
                {mediaRelationPickerError ? <p className="media-action-error">{mediaRelationPickerError}</p> : null}
                {isMediaRelationPickerLoading ? (
                  <p className="collections-state">Loading media...</p>
                ) : mediaRelationPickerItems.length === 0 ? (
                  <p className="collections-state">No media found.</p>
                ) : (
                  <ul className="collection-picker-list media-relation-picker-list">
                    {mediaRelationPickerItems.map((item) => (
                      <li key={`relation-picker-${item.id}`}>
                        <button
                          type="button"
                          className="collection-picker-item"
                          onClick={() => handleSelectMediaRelationFromPicker(item)}
                        >
                          <span>#{item.id} · {item.title || item.relativePath || "Untitled media"}</span>
                          <small>{item.relativePath || "No path"}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="media-action-row media-action-row-spaced">
                  <small>
                    Page {mediaRelationPickerPage}
                    {mediaRelationPickerTotalPages > 0 ? ` / ${mediaRelationPickerTotalPages}` : ""}
                    {mediaRelationPickerTotalCount > 0 ? ` · ${mediaRelationPickerTotalCount} total` : ""}
                  </small>
                  <div className="media-action-row">
                    <button
                      type="button"
                      className="media-action-btn"
                      onClick={() => setMediaRelationPickerPage((current) => Math.max(1, current - 1))}
                      disabled={isMediaRelationPickerLoading || mediaRelationPickerPage <= 1}
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="media-action-btn"
                      onClick={() => setMediaRelationPickerPage((current) => current + 1)}
                      disabled={isMediaRelationPickerLoading || (mediaRelationPickerTotalPages > 0 && mediaRelationPickerPage >= mediaRelationPickerTotalPages)}
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      className="media-action-btn"
                      onClick={closeMediaRelationPicker}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {pendingTagDelete ? (
        <div
          className="media-confirm-overlay"
          onClick={closeTagDeleteConfirm}
        >
          <div
            className="media-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <p>
              Are you sure you want to delete {pendingTagDelete.kind === "tagType" ? "TagType" : "Tag"} "{pendingTagDelete.name}"?
            </p>
            <div className="media-delete-buttons">
              <button
                type="button"
                className="media-action-btn media-action-danger"
                onClick={handleConfirmTagDelete}
                disabled={isDeletingTagEntity}
              >
                {isDeletingTagEntity ? "Deleting..." : "Yes"}
              </button>
              <button
                type="button"
                className="media-action-btn"
                onClick={closeTagDeleteConfirm}
                disabled={isDeletingTagEntity}
              >
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingCollectionDelete ? (
        <div
          className="media-confirm-overlay"
          onClick={closeDeleteCollectionConfirm}
        >
          <div
            className="media-confirm-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <p>
              Are you sure you want to delete collection "{pendingCollectionDelete.name}"?
            </p>
            <div className="media-delete-buttons">
              <button
                type="button"
                className="media-action-btn media-action-danger"
                onClick={handleConfirmDeleteCollection}
                disabled={isCollectionDeleting}
              >
                {isCollectionDeleting ? "Deleting..." : "Yes"}
              </button>
              <button
                type="button"
                className="media-action-btn"
                onClick={closeDeleteCollectionConfirm}
                disabled={isCollectionDeleting}
              >
                No
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
