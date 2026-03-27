import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAppSettings } from "../features/settings/utils/appSettings.js";

test("normalizeAppSettings applies defaults and clamps numeric values", () => {
  assert.deepEqual(normalizeAppSettings({
    defaultMediaFitMode: "unknown",
    mediaGridPageSize: "999",
    duplicatesPageSize: "0",
    recommendationSettings: {
      visibleCount: "0",
      minSimilarityPercent: "999"
    }
  }), {
    groupRelatedMediaByDefault: false,
    defaultMediaFitMode: "resize",
    rememberLastOpenedPage: true,
    rememberSearchHistory: true,
    defaultQuickTaggingTags: "",
    defaultGroupUploadMode: false,
    mediaGridPageSize: 120,
    duplicatesPageSize: 6,
    showRelatedMediaStrip: true,
    confirmDestructiveActions: true,
    recommendationSettings: {
      enabled: true,
      visibleCount: 1,
      minSimilarityPercent: 100
    }
  });
});
