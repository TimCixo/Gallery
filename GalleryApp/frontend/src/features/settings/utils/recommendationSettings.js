export const DEFAULT_RECOMMENDATION_SETTINGS = Object.freeze({
  enabled: true,
  visibleCount: 12,
  minSimilarityPercent: 60
});

export function normalizeRecommendationSettings(settings) {
  const enabled = typeof settings?.enabled === "boolean" ? settings.enabled : DEFAULT_RECOMMENDATION_SETTINGS.enabled;
  const parsedVisibleCount = Number.parseInt(settings?.visibleCount, 10);
  const parsedMinSimilarityPercent = Number.parseInt(settings?.minSimilarityPercent, 10);
  const visibleCount = Math.max(
    1,
    Math.min(50, Number.isNaN(parsedVisibleCount) ? DEFAULT_RECOMMENDATION_SETTINGS.visibleCount : parsedVisibleCount)
  );
  const minSimilarityPercent = Math.max(
    0,
    Math.min(100, Number.isNaN(parsedMinSimilarityPercent) ? DEFAULT_RECOMMENDATION_SETTINGS.minSimilarityPercent : parsedMinSimilarityPercent)
  );

  return {
    enabled,
    visibleCount,
    minSimilarityPercent
  };
}

export function applyRecommendationSettings(items, settings) {
  const normalized = normalizeRecommendationSettings(settings);
  const minSimilarityScore = normalized.minSimilarityPercent / 100;

  return (Array.isArray(items) ? items : [])
    .filter((item) => Number(item?.recommendationScore || 0) >= minSimilarityScore)
    .slice(0, normalized.visibleCount);
}
