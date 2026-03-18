const normalizeOptionalText = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
};

const normalizeOptionalId = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeTagIds = (tagIds) => (
  Array.isArray(tagIds)
    ? Array.from(new Set(tagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)))
    : []
);

const areTagIdsEqual = (left, right) => {
  const leftSorted = normalizeTagIds(left).sort((a, b) => a - b);
  const rightSorted = normalizeTagIds(right).sort((a, b) => a - b);

  if (leftSorted.length !== rightSorted.length) {
    return false;
  }

  return leftSorted.every((value, index) => value === rightSorted[index]);
};

const getNormalizedItemPayload = (item) => ({
  title: normalizeOptionalText(item?.title),
  description: normalizeOptionalText(item?.description),
  source: normalizeOptionalText(item?.source),
  parent: normalizeOptionalId(item?.parent),
  child: normalizeOptionalId(item?.child),
  tagIds: normalizeTagIds(item?.tags?.map((tag) => tag?.id))
});

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

export function createEmptyMediaDraft() {
  return {
    title: "",
    description: "",
    source: "",
    parent: "",
    child: "",
    tagIds: []
  };
}

export function createBulkEditorItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    draft: createMediaDraftFromItem(item)
  }));
}

export function buildMediaUpdatePayloadFromDraft(item, draft) {
  return {
    title: normalizeOptionalText(draft?.title),
    description: normalizeOptionalText(draft?.description),
    source: normalizeOptionalText(draft?.source),
    parent: normalizeOptionalId(draft?.parent),
    child: normalizeOptionalId(draft?.child),
    tagIds: normalizeTagIds(draft?.tagIds)
  };
}

export function buildChangedMediaUpdatePayloadFromDraft(item, draft) {
  const current = getNormalizedItemPayload(item);
  const next = buildMediaUpdatePayloadFromDraft(item, draft);
  const payload = {};

  if (current.title !== next.title) {
    payload.title = next.title;
  }
  if (current.description !== next.description) {
    payload.description = next.description;
  }
  if (current.source !== next.source) {
    payload.source = next.source;
  }
  if (current.parent !== next.parent) {
    payload.parent = next.parent;
  }
  if (current.child !== next.child) {
    payload.child = next.child;
  }
  if (!areTagIdsEqual(current.tagIds, next.tagIds)) {
    payload.tagIds = next.tagIds;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export function applyMediaUpdatePayloadToItem(item, payload, tagCatalog) {
  if (!payload || typeof payload !== "object") {
    return item;
  }

  return {
    ...item,
    ...(Object.prototype.hasOwnProperty.call(payload, "title") ? { title: payload.title } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "description") ? { description: payload.description } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "source") ? { source: payload.source } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "parent") ? { parent: payload.parent } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "child") ? { child: payload.child } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "tagIds") ? {
      tags: Array.isArray(tagCatalog)
        ? tagCatalog.filter((tag) => payload.tagIds.includes(Number(tag?.id)))
        : []
    } : {})
  };
}

export function applyMediaDraftToItem(item, draft, tagCatalog) {
  return applyMediaUpdatePayloadToItem(item, buildMediaUpdatePayloadFromDraft(item, draft), tagCatalog);
}
