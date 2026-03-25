export function reorderUploadQueueItems(items, draggedKey, targetKey) {
  if (!Array.isArray(items) || items.length < 2 || !draggedKey || !targetKey || draggedKey === targetKey) {
    return Array.isArray(items) ? items : [];
  }

  const sourceIndex = items.findIndex((item) => item?.key === draggedKey);
  const targetIndex = items.findIndex((item) => item?.key === targetKey);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const nextItems = [...items];
  const [draggedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, draggedItem);
  return nextItems;
}

export function getUploadQueueActiveIndex(items, activeItemKey) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  if (!activeItemKey) {
    return 0;
  }

  const nextIndex = items.findIndex((item) => item?.key === activeItemKey);
  return nextIndex >= 0 ? nextIndex : 0;
}
