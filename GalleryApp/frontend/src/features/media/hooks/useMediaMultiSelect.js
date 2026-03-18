import { useCallback, useEffect, useMemo, useState } from "react";

const normalizeMediaId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export function useMediaMultiSelect(items) {
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);

  const selectableIds = useMemo(() => {
    const ids = new Set();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const id = normalizeMediaId(item?.id);
      if (id !== null) {
        ids.add(id);
      }
    });
    return ids;
  }, [items]);

  useEffect(() => {
    setSelectedMediaIds((current) => current.filter((id) => selectableIds.has(id)));
  }, [selectableIds]);

  const selectedMediaIdSet = useMemo(() => new Set(selectedMediaIds), [selectedMediaIds]);
  const itemsById = useMemo(() => {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const id = normalizeMediaId(item?.id);
      if (id !== null) {
        map.set(id, item);
      }
    });
    return map;
  }, [items]);
  const selectedMediaItems = useMemo(
    () => selectedMediaIds.map((id) => itemsById.get(id)).filter(Boolean),
    [itemsById, selectedMediaIds]
  );

  const clearSelection = useCallback(() => {
    setSelectedMediaIds([]);
  }, []);

  const startSelection = useCallback((item) => {
    const id = normalizeMediaId(item?.id);
    if (id === null) {
      return;
    }

    setSelectedMediaIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const toggleSelection = useCallback((item) => {
    const id = normalizeMediaId(item?.id);
    if (id === null) {
      return;
    }

    setSelectedMediaIds((current) => (
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    ));
  }, []);

  const isSelected = useCallback((itemOrId) => {
    const id = normalizeMediaId(typeof itemOrId === "object" ? itemOrId?.id : itemOrId);
    return id !== null && selectedMediaIdSet.has(id);
  }, [selectedMediaIdSet]);

  const getSelectionIndex = useCallback((itemOrId) => {
    const id = normalizeMediaId(typeof itemOrId === "object" ? itemOrId?.id : itemOrId);
    if (id === null) {
      return null;
    }

    const index = selectedMediaIds.indexOf(id);
    return index >= 0 ? index + 1 : null;
  }, [selectedMediaIds]);

  return {
    selectedMediaIds,
    selectedMediaItems,
    selectedCount: selectedMediaIds.length,
    isSelectionMode: selectedMediaIds.length > 0,
    isSelected,
    getSelectionIndex,
    clearSelection,
    startSelection,
    toggleSelection
  };
}
