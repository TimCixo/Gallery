import test from "node:test";
import assert from "node:assert/strict";
import { applyRecommendationSettings, normalizeRecommendationSettings } from "../features/settings/utils/recommendationSettings.js";

test("normalizeRecommendationSettings clamps count and similarity percent", () => {
  assert.deepEqual(normalizeRecommendationSettings({
    enabled: false,
    visibleCount: "0",
    minSimilarityPercent: "101"
  }), {
    enabled: false,
    visibleCount: 1,
    minSimilarityPercent: 100
  });
});

test("applyRecommendationSettings filters low-score items and limits the result size", () => {
  const items = [
    { id: 1, recommendationScore: 0.93 },
    { id: 2, recommendationScore: 0.61 },
    { id: 3, recommendationScore: 0.6 },
    { id: 4, recommendationScore: 0.42 }
  ];

  assert.deepEqual(applyRecommendationSettings(items, {
    visibleCount: 2,
    minSimilarityPercent: 60
  }), [
    { id: 1, recommendationScore: 0.93 },
    { id: 2, recommendationScore: 0.61 }
  ]);
});
