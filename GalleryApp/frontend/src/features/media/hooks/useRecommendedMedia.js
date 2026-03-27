import { useEffect, useState } from "react";
import { applyRecommendationSettings } from "../../settings/utils/recommendationSettings.js";

const toRecommendedItems = (response) => {
  const rawItems = Array.isArray(response?.items) ? response.items : [];
  return rawItems
    .map((entry) => {
      const item = entry?.item;
      const itemId = Number(item?.id);
      if (!item || !Number.isSafeInteger(itemId) || itemId <= 0) {
        return null;
      }

      return {
        ...item,
        recommendationScore: Number(entry?.score || 0)
      };
    })
    .filter(Boolean);
};

export function useRecommendedMedia({ selectedMedia, listRecommendedMedia, settings }) {
  const [recommendedMediaItems, setRecommendedMediaItems] = useState([]);
  const [isRecommendedMediaLoading, setIsRecommendedMediaLoading] = useState(false);
  const [recommendedMediaError, setRecommendedMediaError] = useState("");

  useEffect(() => {
    const selectedMediaId = Number(selectedMedia?.id);
    if (
      settings?.enabled === false
      || !Number.isSafeInteger(selectedMediaId)
      || selectedMediaId <= 0
      || typeof listRecommendedMedia !== "function"
    ) {
      setRecommendedMediaItems([]);
      setIsRecommendedMediaLoading(false);
      setRecommendedMediaError("");
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();

    setIsRecommendedMediaLoading(true);
    setRecommendedMediaError("");

    const loadRecommendations = async () => {
      try {
        const response = await listRecommendedMedia(selectedMediaId, { signal: abortController.signal });
        if (!cancelled) {
          setRecommendedMediaItems(applyRecommendationSettings(toRecommendedItems(response), settings));
        }
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          setRecommendedMediaItems([]);
          setRecommendedMediaError(error instanceof Error ? error.message : "Failed to load recommended media.");
        }
      } finally {
        if (!cancelled) {
          setIsRecommendedMediaLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [listRecommendedMedia, selectedMedia, settings]);

  return {
    recommendedMediaItems,
    isRecommendedMediaLoading,
    recommendedMediaError
  };
}
