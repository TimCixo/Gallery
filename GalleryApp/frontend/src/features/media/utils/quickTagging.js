import { applyMediaUpdatePayloadToItem } from "./bulkMediaEdit.js";

export function getMediaTagIds(item) {
  return Array.isArray(item?.tags)
    ? item.tags
      .map((tag) => Number(tag?.id))
      .filter((value) => Number.isInteger(value) && value > 0)
    : [];
}

export function filterMediaItemsByExcludedTags(items, excludedTagIds) {
  const excludedIds = new Set(
    Array.isArray(excludedTagIds)
      ? excludedTagIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
      : []
  );

  if (excludedIds.size === 0) {
    return Array.isArray(items) ? items : [];
  }

  return (Array.isArray(items) ? items : []).filter((item) => (
    !getMediaTagIds(item).some((tagId) => excludedIds.has(tagId))
  ));
}

export function createQuickTaggingConfig(config) {
  return {
    enabled: Boolean(config?.enabled),
    addTagIds: Array.isArray(config?.addTagIds)
      ? Array.from(new Set(config.addTagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)))
      : [],
    excludedTagIds: Array.isArray(config?.excludedTagIds)
      ? Array.from(new Set(config.excludedTagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)))
      : []
  };
}

export function resolveTagNamesToIds(tagNames, tagCatalog) {
  const normalizedNames = Array.isArray(tagNames)
    ? tagNames.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
    : [];

  if (normalizedNames.length === 0) {
    return [];
  }

  const namesSet = new Set(normalizedNames);
  return Array.from(new Set(
    (Array.isArray(tagCatalog) ? tagCatalog : [])
      .filter((tag) => {
        const tagName = String(tag?.name || "").trim().toLowerCase();
        const tagToken = `${String(tag?.tagTypeName || "").trim().toLowerCase()}:${tagName}`;
        return namesSet.has(tagName) || namesSet.has(tagToken);
      })
      .map((tag) => Number(tag?.id))
      .filter((value) => Number.isInteger(value) && value > 0)
  ));
}

export function resolveTagIdsToNames(tagIds, tagCatalog) {
  const idsSet = new Set(
    Array.isArray(tagIds)
      ? tagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      : []
  );

  return (Array.isArray(tagCatalog) ? tagCatalog : [])
    .filter((tag) => idsSet.has(Number(tag?.id)))
    .map((tag) => String(tag?.name || "").trim())
    .filter(Boolean);
}

export function resolveTagTokensToIds(tagTokens, tagCatalog) {
  const normalizedTokens = Array.isArray(tagTokens)
    ? tagTokens.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
    : [];

  if (normalizedTokens.length === 0) {
    return [];
  }

  const tokensSet = new Set(normalizedTokens);
  return Array.from(new Set(
    (Array.isArray(tagCatalog) ? tagCatalog : [])
      .filter((tag) => {
        const tagName = String(tag?.name || "").trim().toLowerCase();
        const tagToken = `${String(tag?.tagTypeName || "").trim().toLowerCase()}:${tagName}`;
        return tokensSet.has(tagToken);
      })
      .map((tag) => Number(tag?.id))
      .filter((value) => Number.isInteger(value) && value > 0)
  ));
}

export function resolveTagIdsToTokens(tagIds, tagCatalog) {
  const idsSet = new Set(
    Array.isArray(tagIds)
      ? tagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      : []
  );

  return (Array.isArray(tagCatalog) ? tagCatalog : [])
    .filter((tag) => idsSet.has(Number(tag?.id)))
    .map((tag) => {
      const tagName = String(tag?.name || "").trim();
      const typeName = String(tag?.tagTypeName || "").trim();
      if (!tagName) {
        return "";
      }
      return typeName ? `${typeName}:${tagName}` : tagName;
    })
    .filter(Boolean);
}

export function applyQuickTagToItem(item, addTagIds, tagCatalog) {
  const normalizedTagIds = Array.isArray(addTagIds)
    ? addTagIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
    : [];

  if (normalizedTagIds.length === 0) {
    return item;
  }

  const nextTagIds = Array.from(new Set([...getMediaTagIds(item), ...normalizedTagIds]));
  return applyMediaUpdatePayloadToItem(item, { tagIds: nextTagIds }, tagCatalog);
}
