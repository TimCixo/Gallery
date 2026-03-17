const normalizeOptionalText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const normalizeTagIds = (tagIds) => (
  Array.isArray(tagIds)
    ? Array.from(new Set(tagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)))
    : []
);

export function createMediaDraftFromItem(item) {
  return {
    title: String(item?.title || ""),
    description: String(item?.description || ""),
    source: String(item?.source || ""),
    parent: item?.parent ? String(item.parent) : "",
    child: item?.child ? String(item.child) : "",
    tagIds: normalizeTagIds(item?.tags?.map((tag) => tag?.id))
  };
}

export function createBulkEditorItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    draft: createMediaDraftFromItem(item)
  }));
}

export function buildMediaUpdatePayloadFromDraft(item, draft) {
  const normalizedParent = String(draft?.parent || "").trim();
  const normalizedChild = String(draft?.child || "").trim();

  return {
    title: normalizeOptionalText(draft?.title),
    description: normalizeOptionalText(draft?.description),
    source: normalizeOptionalText(draft?.source),
    parent: normalizedParent ? Number.parseInt(normalizedParent, 10) : null,
    child: normalizedChild ? Number.parseInt(normalizedChild, 10) : null,
    tagIds: normalizeTagIds(draft?.tagIds)
  };
}

export function applyMediaDraftToItem(item, draft, tagCatalog) {
  const payload = buildMediaUpdatePayloadFromDraft(item, draft);
  return {
    ...item,
    title: payload.title,
    description: payload.description,
    source: payload.source,
    parent: payload.parent,
    child: payload.child,
    tags: Array.isArray(tagCatalog)
      ? tagCatalog.filter((tag) => payload.tagIds.includes(Number(tag?.id)))
      : []
  };
}
