export async function refreshMediaTagCatalog({ tagsApi, setTagCatalog, setTagTypesCatalog, setIsTagCatalogLoading }) {
  setIsTagCatalogLoading(true);
  try {
    const [tagsResponse, tagTypesResponse] = await Promise.all([
      tagsApi.listTags(),
      tagsApi.listTagTypes()
    ]);
    setTagCatalog(Array.isArray(tagsResponse?.items) ? tagsResponse.items : []);
    setTagTypesCatalog(Array.isArray(tagTypesResponse?.items) ? tagTypesResponse.items : []);
  } catch {
    setTagCatalog([]);
    setTagTypesCatalog([]);
  } finally {
    setIsTagCatalogLoading(false);
  }
}

export async function openMediaCollectionPicker({
  selectedMedia,
  isCollectionPickerLoading,
  isAddingMediaToCollection,
  collectionsApi,
  setIsCollectionPickerOpen,
  setCollectionPickerError,
  setIsCollectionPickerLoading,
  setCollectionPickerItems
}) {
  if (!selectedMedia?.id || isCollectionPickerLoading || isAddingMediaToCollection) {
    return;
  }

  setIsCollectionPickerOpen(true);
  setCollectionPickerError("");
  setIsCollectionPickerLoading(true);
  try {
    const response = await collectionsApi.listCollections({ mediaId: selectedMedia.id });
    setCollectionPickerItems(Array.isArray(response?.items) ? response.items : []);
  } catch (error) {
    setCollectionPickerItems([]);
    setCollectionPickerError(error instanceof Error ? error.message : "Failed to fetch collections.");
  } finally {
    setIsCollectionPickerLoading(false);
  }
}

export async function addSelectedMediaToCollection({
  selectedMedia,
  collectionId,
  isAddingMediaToCollection,
  collectionsApi,
  setIsAddingMediaToCollection,
  setCollectionPickerError,
  setCollectionPickerItems,
  onSuccess
}) {
  if (!selectedMedia?.id || !Number.isInteger(collectionId) || collectionId <= 0 || isAddingMediaToCollection) {
    return false;
  }

  setIsAddingMediaToCollection(true);
  setCollectionPickerError("");
  try {
    await collectionsApi.addMediaToCollection(collectionId, selectedMedia.id);
    setCollectionPickerItems((current) => current.map((item) => (
      item.id === collectionId ? { ...item, containsMedia: true } : item
    )));
    onSuccess?.();
    return true;
  } catch (error) {
    setCollectionPickerError(error instanceof Error ? error.message : "Failed to add media to collection.");
    return false;
  } finally {
    setIsAddingMediaToCollection(false);
  }
}

export async function toggleSelectedMediaFavorite({
  selectedMedia,
  isFavoriteUpdating,
  mediaApi,
  setIsFavoriteUpdating,
  setMediaModalError,
  applyLocalFavoriteState,
  onSuccess
}) {
  if (!selectedMedia?.id || isFavoriteUpdating) {
    return false;
  }

  const mediaId = selectedMedia.id;
  const nextIsFavorite = !Boolean(selectedMedia.isFavorite);
  setIsFavoriteUpdating(true);
  setMediaModalError("");
  try {
    await mediaApi.setFavorite(mediaId, nextIsFavorite);
    applyLocalFavoriteState(nextIsFavorite, mediaId);
    await onSuccess?.(nextIsFavorite, mediaId);
    return true;
  } catch (error) {
    setMediaModalError(error instanceof Error ? error.message : "Failed to update favorites.");
    return false;
  } finally {
    setIsFavoriteUpdating(false);
  }
}

export function buildMediaUpdatePayload(mediaDraft, toNullableId) {
  return {
    title: String(mediaDraft.title || "").trim() || null,
    description: String(mediaDraft.description || "").trim() || null,
    source: String(mediaDraft.source || "").trim() || null,
    parent: toNullableId(mediaDraft.parent),
    child: toNullableId(mediaDraft.child),
    tagIds: Array.isArray(mediaDraft.tagIds) ? mediaDraft.tagIds : []
  };
}

export function buildMediaUpdatePatch(payload, tagCatalog) {
  return {
    title: payload.title,
    description: payload.description,
    source: payload.source,
    parent: payload.parent,
    child: payload.child,
    tags: tagCatalog.filter((tag) => payload.tagIds.includes(Number(tag.id)))
  };
}

