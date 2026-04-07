export function filterMediaItemsByCollectionState(items, excludeCollectionMedia = false) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (!excludeCollectionMedia) {
    return normalizedItems;
  }

  return normalizedItems.filter((item) => item?.hasCollections !== true);
}
