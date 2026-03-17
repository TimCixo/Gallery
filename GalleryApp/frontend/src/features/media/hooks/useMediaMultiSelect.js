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
  const selectedMediaItems = useMemo(
    () => (Array.isArray(items) ? items.filter((item) => selectedMediaIdSet.has(Number(item?.id))) : []),
    [items, selectedMediaIdSet]
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

  return {
    selectedMediaIds,
    selectedMediaItems,
    selectedCount: selectedMediaIds.length,
    isSelectionMode: selectedMediaIds.length > 0,
    isSelected,
    clearSelection,
    startSelection,
    toggleSelection
  };
}
