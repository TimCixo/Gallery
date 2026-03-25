import { useCallback, useMemo, useState } from "react";
import { applyQuickTagToItem, createQuickTaggingConfig, filterMediaItemsByExcludedTags, getMediaTagIds } from "../utils/quickTagging";

export function useQuickTagging({
  items,
  tagCatalog,
  ensureTagCatalog,
  updateMedia,
  onItemsChange,
  onModeEnabled
}) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState(() => createQuickTaggingConfig());
  const [activeMediaId, setActiveMediaId] = useState(null);

  const visibleItems = useMemo(
    () => (config.enabled ? filterMediaItemsByExcludedTags(items, config.excludedTagIds) : (Array.isArray(items) ? items : [])),
    [config.enabled, config.excludedTagIds, items]
  );

  const openConfig = useCallback(async () => {
    await ensureTagCatalog?.();
    setIsConfigOpen(true);
  }, [ensureTagCatalog]);

  const closeConfig = useCallback(() => {
    if (activeMediaId !== null) {
      return;
    }
    setIsConfigOpen(false);
  }, [activeMediaId]);

  const disable = useCallback(() => {
    if (activeMediaId !== null) {
      return;
    }
    setConfig((current) => ({ ...current, enabled: false }));
    setIsConfigOpen(false);
  }, [activeMediaId]);

  const confirmConfig = useCallback((nextConfig) => {
    const normalizedConfig = createQuickTaggingConfig(nextConfig);
    if (normalizedConfig.addTagIds.length === 0) {
      return false;
    }

    setConfig({ ...normalizedConfig, enabled: true });
    setIsConfigOpen(false);
    onModeEnabled?.();
    return true;
  }, [onModeEnabled]);

  const applyTagToMedia = useCallback(async (item) => {
    const mediaId = Number(item?.id);
    if (!config.enabled || activeMediaId !== null || !Number.isInteger(mediaId) || mediaId <= 0 || config.addTagIds.length === 0) {
      return;
    }

    const currentTagIds = getMediaTagIds(item);
    const nextTagIds = Array.from(new Set([...currentTagIds, ...config.addTagIds]));
    if (nextTagIds.length === currentTagIds.length) {
      return;
    }

    setActiveMediaId(mediaId);
    try {
      await updateMedia?.(mediaId, { tagIds: nextTagIds });
      onItemsChange?.((current) => (Array.isArray(current) ? current.map((entry) => (
        Number(entry?.id) === mediaId ? applyQuickTagToItem(entry, config.addTagIds, tagCatalog) : entry
      )) : current));
      window.dispatchEvent(new CustomEvent("gallery:media-updated"));
    } finally {
      setActiveMediaId(null);
    }
  }, [activeMediaId, config.addTagIds, config.enabled, onItemsChange, tagCatalog, updateMedia]);

  return {
    isConfigOpen,
    isEnabled: config.enabled,
    activeMediaId,
    config,
    visibleItems,
    openConfig,
    closeConfig,
    confirmConfig,
    disable,
    applyTagToMedia
  };
}
