import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeMediaId, syncSelectedMediaMap } from "../utils/mediaMultiSelectState";

function areMediaMapsEqual(left, right) {
  if (left === right) {
    return true;
  }

  if (!(left instanceof Map) || !(right instanceof Map) || left.size !== right.size) {
    return false;
  }

  for (const [key, value] of left.entries()) {
    if (!right.has(key) || right.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function useMediaMultiSelect(items) {
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const [selectedMediaMap, setSelectedMediaMap] = useState(() => new Map());

  useEffect(() => {
    setSelectedMediaMap((current) => {
      const next = syncSelectedMediaMap(current, selectedMediaIds, items);
      return areMediaMapsEqual(current, next) ? current : next;
    });
  }, [items, selectedMediaIds]);

  const selectedMediaIdSet = useMemo(() => new Set(selectedMediaIds), [selectedMediaIds]);
  const selectedMediaItems = useMemo(
    () => selectedMediaIds.map((id) => selectedMediaMap.get(id)).filter(Boolean),
    [selectedMediaIds, selectedMediaMap]
  );

  const clearSelection = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectedMediaMap(new Map());
  }, []);

  const startSelection = useCallback((item) => {
    const id = normalizeMediaId(item?.id);
    if (id === null) {
      return;
    }

    setSelectedMediaIds((current) => (current.includes(id) ? current : [...current, id]));
    setSelectedMediaMap((current) => {
      const next = new Map(current);
      next.set(id, item);
      return next;
    });
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
    setSelectedMediaMap((current) => {
      const next = new Map(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, item);
      }
      return next;
    });
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
