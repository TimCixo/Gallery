const normalizeTagId = (value) => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

const getDraftTagIds = (item) => (
  Array.isArray(item?.draft?.tagIds)
    ? item.draft.tagIds
        .map(normalizeTagId)
        .filter((value) => value !== null)
    : []
);

export function getCommonTagIds(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length === 0) {
    return [];
  }

  return normalizedItems.reduce((commonIds, item, index) => {
    const currentIds = new Set(getDraftTagIds(item));
    if (index === 0) {
      return Array.from(currentIds);
    }

    return commonIds.filter((tagId) => currentIds.has(tagId));
  }, []);
}

export function getGroupSelectedTagIds(items, groupTagEdits) {
  let selectedTagIds = getCommonTagIds(items);

  Object.entries(groupTagEdits || {}).forEach(([tagId, action]) => {
    const normalizedTagId = normalizeTagId(tagId);
    if (normalizedTagId === null) {
      return;
    }

    if (action === "add" && !selectedTagIds.includes(normalizedTagId)) {
      selectedTagIds = [...selectedTagIds, normalizedTagId];
    }

    if (action === "remove") {
      selectedTagIds = selectedTagIds.filter((value) => value !== normalizedTagId);
    }
  });

  return selectedTagIds;
}
