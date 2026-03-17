export const createTagItemsState = (overrides = {}) => ({
  loading: false,
  error: "",
  hasLoaded: false,
  ...overrides
});

export const shouldLoadTagItems = (state) => !state?.hasLoaded && !state?.loading;

export const prependTagItem = (itemsByType, tagTypeId, tagItem) => ({
  ...itemsByType,
  [tagTypeId]: [tagItem, ...(itemsByType[tagTypeId] || [])]
});

export const replaceTagItem = (itemsByType, tagTypeId, tagId, nextTagItem) => ({
  ...itemsByType,
  [tagTypeId]: (itemsByType[tagTypeId] || []).map((item) => (item.id === tagId ? nextTagItem : item))
});

export const removeTagItem = (itemsByType, tagTypeId, tagId) => ({
  ...itemsByType,
  [tagTypeId]: (itemsByType[tagTypeId] || []).filter((item) => item.id !== tagId)
});

export const moveTagItem = (itemsByType, { sourceTagTypeId, targetTagTypeId, tagId, nextTagItem = null }) => {
  const sourceItems = itemsByType[sourceTagTypeId] || [];
  const movedItem = nextTagItem || sourceItems.find((item) => item.id === tagId);
  if (!movedItem) {
    return itemsByType;
  }

  return {
    ...itemsByType,
    [sourceTagTypeId]: sourceItems.filter((item) => item.id !== tagId),
    [targetTagTypeId]: [movedItem, ...(itemsByType[targetTagTypeId] || []).filter((item) => item.id !== tagId)]
  };
};

export const removeTagTypeEntry = (record, tagTypeId) => {
  const next = { ...record };
  delete next[tagTypeId];
  return next;
};
