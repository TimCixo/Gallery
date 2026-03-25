import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mediaApi } from "../../../api/mediaApi";
import {
  createMediaReferencePreviewState,
  DEFAULT_MEDIA_REFERENCE_KEYS,
  getMediaReferenceModesSignature,
  getMediaReferenceValueSignature,
  getNormalizedMediaReferenceModes,
  normalizeMediaReferenceMode,
  normalizeMediaReferenceValue
} from "../utils/mediaReferencePicker";

export function useMediaReferencePicker({
  valueByMode,
  onSelectReference,
  localItems = [],
  availableModes = DEFAULT_MEDIA_REFERENCE_KEYS,
  isEnabled = true,
  pageSize = 24
}) {
  const allowedModesSignature = getMediaReferenceModesSignature(availableModes);
  const allowedModes = useMemo(
    () => getNormalizedMediaReferenceModes(availableModes),
    [allowedModesSignature]
  );
  const cacheRef = useRef(new Map());
  const localItemsRef = useRef(Array.isArray(localItems) ? localItems : []);
  const valueByModeRef = useRef(valueByMode || {});
  const [previewByMode, setPreviewByMode] = useState(() => createMediaReferencePreviewState(allowedModes));
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState(() => normalizeMediaReferenceMode(allowedModes[0], allowedModes));
  const [pickerQuery, setPickerQueryState] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerTotalPages, setPickerTotalPages] = useState(0);
  const [pickerTotalCount, setPickerTotalCount] = useState(0);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");

  useEffect(() => {
    setPreviewByMode(createMediaReferencePreviewState(allowedModes));
  }, [allowedModes]);

  useEffect(() => {
    const normalizedLocalItems = Array.isArray(localItems) ? localItems : [];
    localItemsRef.current = normalizedLocalItems;
    normalizedLocalItems.forEach((item) => {
      const normalizedId = Number(item?.id);
      if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
        return;
      }

      cacheRef.current.set(normalizedId, item);
    });
  }, [localItems]);

  const valueByModeSignature = getMediaReferenceValueSignature(valueByMode, allowedModes);

  useEffect(() => {
    valueByModeRef.current = valueByMode || {};
  }, [valueByModeSignature]);

  const findMediaById = useCallback(async (mediaId) => {
    const normalizedId = Number(mediaId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return null;
    }

    const cachedCandidate = cacheRef.current.get(normalizedId) || null;
    if (cachedCandidate) {
      return cachedCandidate;
    }

    const localCandidate = localItemsRef.current.find((item) => Number(item?.id) === normalizedId) || null;
    if (localCandidate) {
      cacheRef.current.set(normalizedId, localCandidate);
      return localCandidate;
    }

    const response = await mediaApi.listMedia({ page: 1, pageSize: 40, search: `id:${normalizedId}` });
    const items = Array.isArray(response?.items) ? response.items : [];
    const remoteCandidate = items.find((item) => Number(item?.id) === normalizedId) || null;
    if (remoteCandidate) {
      const normalizedCandidate = {
        ...remoteCandidate,
        _tileUrl: remoteCandidate.tileUrl || remoteCandidate.previewUrl || remoteCandidate.originalUrl || remoteCandidate.url || ""
      };
      cacheRef.current.set(normalizedId, normalizedCandidate);
      return normalizedCandidate;
    }

    return null;
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setPreviewByMode(createMediaReferencePreviewState(allowedModes));
      return undefined;
    }

    let cancelled = false;
    const resolvePreview = async (mode) => {
      const parsed = normalizeMediaReferenceValue(valueByModeRef.current?.[mode]);
      if (parsed === null) {
        if (!cancelled) {
          setPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: "" }
          }));
        }
        return;
      }

      if (Number.isNaN(parsed)) {
        if (!cancelled) {
          setPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: "Invalid media id." }
          }));
        }
        return;
      }

      const cachedCandidate = cacheRef.current.get(parsed) || null;
      if (cachedCandidate) {
        if (!cancelled) {
          setPreviewByMode((current) => ({
            ...current,
            [mode]: { item: cachedCandidate, isLoading: false, error: "" }
          }));
        }
        return;
      }

      if (!cancelled) {
        setPreviewByMode((current) => ({
          ...current,
          [mode]: { item: null, isLoading: true, error: "" }
        }));
      }

      try {
        const candidate = await findMediaById(parsed);
        if (!cancelled) {
          setPreviewByMode((current) => ({
            ...current,
            [mode]: candidate
              ? { item: candidate, isLoading: false, error: "" }
              : { item: null, isLoading: false, error: "Media not found." }
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewByMode((current) => ({
            ...current,
            [mode]: { item: null, isLoading: false, error: error instanceof Error ? error.message : "Failed to resolve media." }
          }));
        }
      }
    };

    allowedModes.forEach((mode) => {
      void resolvePreview(mode);
    });

    return () => {
      cancelled = true;
    };
  }, [allowedModes, findMediaById, isEnabled, valueByModeSignature]);

  const openPicker = useCallback((mode) => {
    setPickerMode(normalizeMediaReferenceMode(mode, allowedModes));
    setPickerQueryState("");
    setPickerPage(1);
    setPickerError("");
    setIsPickerOpen(true);
  }, [allowedModes]);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPickerError("");
  }, []);

  const setPickerQuery = useCallback((value) => {
    setPickerQueryState(value);
    setPickerPage(1);
  }, []);

  const resetPicker = useCallback(() => {
    setIsPickerOpen(false);
    setPickerMode(normalizeMediaReferenceMode(allowedModes[0], allowedModes));
    setPickerQueryState("");
    setPickerPage(1);
    setPickerItems([]);
    setPickerTotalPages(0);
    setPickerTotalCount(0);
    setIsPickerLoading(false);
    setPickerError("");
    setPreviewByMode(createMediaReferencePreviewState(allowedModes));
  }, [allowedModes]);

  useEffect(() => {
    if (!isPickerOpen) {
      return undefined;
    }

    let cancelled = false;
    const loadItems = async () => {
      setIsPickerLoading(true);
      setPickerError("");
      try {
        const response = await mediaApi.listMedia({
          page: pickerPage,
          pageSize,
          search: pickerQuery.trim() || undefined
        });
        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        setPickerItems(items);
        setPickerTotalPages(Number(response?.totalPages || 0));
        setPickerTotalCount(Number(response?.totalCount || items.length));
      } catch (error) {
        if (!cancelled) {
          setPickerItems([]);
          setPickerTotalPages(0);
          setPickerTotalCount(0);
          setPickerError(error instanceof Error ? error.message : "Failed to load media.");
        }
      } finally {
        if (!cancelled) {
          setIsPickerLoading(false);
        }
      }
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [isPickerOpen, pageSize, pickerPage, pickerQuery]);

  const selectFromPicker = useCallback((item) => {
    const selectedId = Number(item?.id);
    if (!Number.isSafeInteger(selectedId) || selectedId <= 0) {
      return;
    }

    cacheRef.current.set(selectedId, item);
    const nextMode = normalizeMediaReferenceMode(pickerMode, allowedModes);
    onSelectReference?.(nextMode, item);
    setPreviewByMode((current) => ({
      ...current,
      [nextMode]: { item, isLoading: false, error: "" }
    }));
    closePicker();
  }, [allowedModes, closePicker, onSelectReference, pickerMode]);

  return {
    previewByMode,
    isPickerOpen,
    pickerMode,
    pickerQuery,
    pickerPage,
    pickerItems,
    pickerTotalPages,
    pickerTotalCount,
    isPickerLoading,
    pickerError,
    findMediaById,
    openPicker,
    closePicker,
    setPickerQuery,
    setPickerPage,
    selectFromPicker,
    resetPicker
  };
}
