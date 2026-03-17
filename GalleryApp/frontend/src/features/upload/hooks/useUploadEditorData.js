import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "../../../api/mediaApi";
import { tagsApi } from "../../../api/tagsApi";

export function useUploadEditorData({ isEditorOpen, activeDraft, onDraftChange }) {
  const [tagCatalog, setTagCatalog] = useState([]);
  const [tagTypesCatalog, setTagTypesCatalog] = useState([]);
  const [isTagCatalogLoading, setIsTagCatalogLoading] = useState(false);
  const [tagCatalogError, setTagCatalogError] = useState("");

  const [relationPreviewByMode, setRelationPreviewByMode] = useState({
    parent: { item: null, isLoading: false, error: "" },
    child: { item: null, isLoading: false, error: "" }
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

  const refreshTagCatalog = useCallback(async () => {
    setIsTagCatalogLoading(true);
    setTagCatalogError("");
    try {
      const [tagsResponse, tagTypesResponse] = await Promise.all([
        tagsApi.listTags(),
        tagsApi.listTagTypes()
      ]);
      setTagCatalog(Array.isArray(tagsResponse?.items) ? tagsResponse.items : []);
      setTagTypesCatalog(Array.isArray(tagTypesResponse?.items) ? tagTypesResponse.items : []);
    } catch (error) {
      setTagCatalog([]);
      setTagTypesCatalog([]);
      setTagCatalogError(error instanceof Error ? error.message : "Failed to fetch tags.");
    } finally {
      setIsTagCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    void refreshTagCatalog();
  }, [isEditorOpen, refreshTagCatalog]);

  const findMediaById = useCallback(async (mediaId) => {
    const normalizedId = Number(mediaId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    return items.find((item) => Number(item?.id) === normalizedId) || null;
  }, []);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    const resolveMode = async (mode) => {
      const rawValue = String(mode === "parent" ? activeDraft?.parent : activeDraft?.child || "").trim();
      if (!rawValue) {
        setRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: "" }
        }));
        return;
      }

      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        setRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: "Invalid media id." }
        }));
        return;
      }

      setRelationPreviewByMode((current) => ({
        ...current,
        [mode]: { item: null, isLoading: true, error: "" }
      }));

      try {
        const candidate = await findMediaById(parsed);
        setRelationPreviewByMode((current) => ({
          ...current,
          [mode]: candidate
            ? { item: candidate, isLoading: false, error: "" }
            : { item: null, isLoading: false, error: "Media not found." }
        }));
      } catch (error) {
        setRelationPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: false, error: error instanceof Error ? error.message : "Failed to resolve media." }
        }));
      }
    };

    void resolveMode("parent");
    void resolveMode("child");
  }, [isEditorOpen, activeDraft?.parent, activeDraft?.child, findMediaById]);

  const openMediaRelationPicker = useCallback((mode) => {
    setMediaRelationPickerMode(mode === "child" ? "child" : "parent");
    setMediaRelationPickerQuery("");
    setMediaRelationPickerPage(1);
    setIsMediaRelationPickerOpen(true);
  }, []);

  const closeMediaRelationPicker = useCallback(() => {
    setIsMediaRelationPickerOpen(false);
    setMediaRelationPickerError("");
  }, []);

  useEffect(() => {
    if (!isMediaRelationPickerOpen) {
      return;
    }

    let cancelled = false;
    const loadItems = async () => {
      setIsMediaRelationPickerLoading(true);
      setMediaRelationPickerError("");
      try {
        const response = await mediaApi.listMedia({
          page: mediaRelationPickerPage,
          pageSize: 24,
          search: mediaRelationPickerQuery.trim() || undefined
        });
        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        setMediaRelationPickerItems(items);
        setMediaRelationPickerTotalPages(Number(response?.totalPages || 0));
        setMediaRelationPickerTotalCount(Number(response?.totalCount || items.length));
      } catch (error) {
        if (!cancelled) {
          setMediaRelationPickerItems([]);
          setMediaRelationPickerTotalPages(0);
          setMediaRelationPickerTotalCount(0);
          setMediaRelationPickerError(error instanceof Error ? error.message : "Failed to load media.");
        }
      } finally {
        if (!cancelled) {
          setIsMediaRelationPickerLoading(false);
        }
      }
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [isMediaRelationPickerOpen, mediaRelationPickerPage, mediaRelationPickerQuery]);

  const handleSelectMediaRelationFromPicker = useCallback((item) => {
    const selectedId = Number(item?.id);
    if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
      return;
    }

    const key = mediaRelationPickerMode === "child" ? "child" : "parent";
    onDraftChange?.({ [key]: String(selectedId) });
    closeMediaRelationPicker();
  }, [mediaRelationPickerMode, onDraftChange, closeMediaRelationPicker]);

  const toggleTag = useCallback((tagId) => {
    const normalizedTagId = Number(tagId);
    if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
      return;
    }

    const currentIds = Array.isArray(activeDraft?.tagIds) ? activeDraft.tagIds : [];
    const hasTag = currentIds.includes(normalizedTagId);
    onDraftChange?.({ tagIds: hasTag ? currentIds.filter((id) => id !== normalizedTagId) : [...currentIds, normalizedTagId] });
  }, [activeDraft?.tagIds, onDraftChange]);

  return {
    tagCatalog,
    tagTypesCatalog,
    isTagCatalogLoading,
    tagCatalogError,
    refreshTagCatalog,
    toggleTag,
    relationPreviewByMode,
    openMediaRelationPicker,
    closeMediaRelationPicker,
    isMediaRelationPickerOpen,
    mediaRelationPickerMode,
    mediaRelationPickerQuery,
    setMediaRelationPickerQuery,
    mediaRelationPickerItems,
    mediaRelationPickerPage,
    setMediaRelationPickerPage,
    mediaRelationPickerTotalPages,
    mediaRelationPickerTotalCount,
    isMediaRelationPickerLoading,
    mediaRelationPickerError,
    handleSelectMediaRelationFromPicker
  };
}
