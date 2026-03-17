import { useCallback, useMemo } from "react";
import { collectionsApi } from "../../../api/collectionsApi";

export function useUploadCollections({ collections, settings, setCollectionsState, setSettings }) {
  const loadUploadCollections = useCallback(async () => {
    setCollectionsState({ loading: true, error: "" });
    try {
      const response = await collectionsApi.listCollections();
      setCollectionsState({
        entities: Array.isArray(response?.items) ? response.items : [],
        loading: false,
        error: ""
      });
    } catch (error) {
      setCollectionsState({
        entities: [],
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch collections."
      });
    }
  }, [setCollectionsState]);

  const openUploadCollectionPicker = useCallback(async () => {
    if (collections.loading) {
      return;
    }

    setCollectionsState({ isPickerOpen: true });
    if (collections.entities.length === 0 && !collections.error) {
      await loadUploadCollections();
    }
  }, [collections.loading, collections.entities.length, collections.error, loadUploadCollections, setCollectionsState]);

  const closeUploadCollectionPicker = useCallback(() => {
    setCollectionsState({ isPickerOpen: false });
  }, [setCollectionsState]);

  const toggleUploadCollectionSelection = useCallback((collectionId) => {
    const normalizedId = Number(collectionId);
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
      return;
    }

    const nextIds = settings.uploadCollectionIds.includes(normalizedId)
      ? settings.uploadCollectionIds.filter((id) => id !== normalizedId)
      : [...settings.uploadCollectionIds, normalizedId];

    setSettings({ uploadCollectionIds: nextIds });
  }, [settings.uploadCollectionIds, setSettings]);

  const selectedUploadCollections = useMemo(
    () => collections.entities.filter((item) => settings.uploadCollectionIds.includes(Number(item.id))),
    [collections.entities, settings.uploadCollectionIds]
  );

  return {
    loadUploadCollections,
    openUploadCollectionPicker,
    closeUploadCollectionPicker,
    toggleUploadCollectionSelection,
    selectedUploadCollections
  };
}
