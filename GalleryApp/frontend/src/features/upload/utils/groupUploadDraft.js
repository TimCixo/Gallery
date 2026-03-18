export function applyGroupDraftToUploadItems(items, groupDraft, groupTouchedFields, groupTagEdits) {
  const normalizedItems = Array.isArray(items) ? items : [];

  return normalizedItems.map((item) => {
    const nextDraft = { ...(item?.draft || {}) };

    Object.entries(groupTouchedFields || {}).forEach(([fieldKey, isTouched]) => {
      if (!isTouched) {
        return;
      }

      nextDraft[fieldKey] = groupDraft?.[fieldKey] ?? "";
    });

    let nextTagIds = Array.isArray(item?.draft?.tagIds) ? [...item.draft.tagIds] : [];
    Object.entries(groupTagEdits || {}).forEach(([tagId, action]) => {
      const normalizedTagId = Number(tagId);
      if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
        return;
      }

      if (action === "add") {
        nextTagIds = [...new Set([...nextTagIds, normalizedTagId])];
      }

      if (action === "remove") {
        nextTagIds = nextTagIds.filter((id) => id !== normalizedTagId);
      }
    });
    nextDraft.tagIds = nextTagIds;

    return { ...item, draft: nextDraft };
  });
}
