import {
  applyMediaUpdatePayloadToItem,
  buildChangedMediaUpdatePayloadFromDraft,
  buildMediaUpdatePayloadFromDraft
} from "./bulkMediaEdit.js";

const normalizeRelationId = (value) => {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
};

export async function saveBulkMediaItems({
  items,
  relationStrategy = "preserve",
  collectionIds,
  tagCatalog,
  updateMedia,
  addMediaToCollection
}) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedCollectionIds = Array.isArray(collectionIds) ? collectionIds : [];
  const updatedItemsById = new Map();

  for (const item of normalizedItems) {
    let currentItem = item;
    const targetPayload = buildMediaUpdatePayloadFromDraft(currentItem, item.draft);

    if (relationStrategy === "relink") {
      const clearPayload = {};
      if (normalizeRelationId(item?.parent) !== null && normalizeRelationId(item?.parent) !== targetPayload.parent) {
        clearPayload.parent = null;
      }
      if (normalizeRelationId(item?.child) !== null && normalizeRelationId(item?.child) !== targetPayload.child) {
        clearPayload.child = null;
      }

      if (Object.keys(clearPayload).length > 0) {
        await updateMedia(item.id, clearPayload);
        currentItem = applyMediaUpdatePayloadToItem(currentItem, clearPayload, tagCatalog);
      }
    }

    const changedPayload = buildChangedMediaUpdatePayloadFromDraft(currentItem, item.draft);
    if (changedPayload) {
      const payload = buildMediaUpdatePayloadFromDraft(currentItem, item.draft);
      await updateMedia(item.id, payload);
      currentItem = applyMediaUpdatePayloadToItem(currentItem, payload, tagCatalog);
    }

    for (const collectionId of normalizedCollectionIds) {
      await addMediaToCollection(collectionId, item.id);
    }

    if (currentItem !== item) {
      updatedItemsById.set(item.id, currentItem);
    }
  }

  return updatedItemsById;
}
