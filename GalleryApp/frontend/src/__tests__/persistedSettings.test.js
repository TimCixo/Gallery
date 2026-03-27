import test from "node:test";
import assert from "node:assert/strict";
import { loadPersistedSettings, persistSettings } from "../app/utils/persistedSettings.js";

const createStorage = () => {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
};

test("persisted settings round-trip recommendation options", () => {
  const storage = createStorage();
  persistSettings({
    rememberLastOpenedPage: false,
    rememberSearchHistory: false,
    searchSuggestionsLimit: 11,
    defaultMediaFitMode: "height",
    mediaGridPageSize: 48,
    duplicatesPageSize: 16,
    defaultQuickTaggingTags: "author:test",
    defaultGroupUploadMode: true,
    groupRelatedMediaByDefault: true,
    showRelatedMediaStrip: false,
    confirmDestructiveActions: false,
    recommendationSettings: {
      enabled: false,
      visibleCount: 8,
      minSimilarityPercent: 73
    }
  }, storage);

  assert.deepEqual(loadPersistedSettings(storage), {
    groupRelatedMediaByDefault: true,
    defaultMediaFitMode: "height",
    rememberLastOpenedPage: false,
    rememberSearchHistory: false,
    searchSuggestionsLimit: 11,
    defaultQuickTaggingTags: "author:test",
    defaultGroupUploadMode: true,
    mediaGridPageSize: 48,
    duplicatesPageSize: 16,
    showRelatedMediaStrip: false,
    confirmDestructiveActions: false,
    recommendationSettings: {
      enabled: false,
      visibleCount: 8,
      minSimilarityPercent: 73
    }
  });
});

test("persisted settings normalize invalid recommendation values", () => {
  const storage = createStorage();
  storage.setItem("gallery.app-settings", JSON.stringify({
    recommendationSettings: {
      visibleCount: "0",
      minSimilarityPercent: "999"
    }
  }));

  assert.deepEqual(loadPersistedSettings(storage), {
    groupRelatedMediaByDefault: false,
    defaultMediaFitMode: "resize",
    rememberLastOpenedPage: true,
    rememberSearchHistory: true,
    searchSuggestionsLimit: 7,
    defaultQuickTaggingTags: "",
    defaultGroupUploadMode: false,
    mediaGridPageSize: 36,
    duplicatesPageSize: 12,
    showRelatedMediaStrip: true,
    confirmDestructiveActions: true,
    recommendationSettings: {
      enabled: true,
      visibleCount: 1,
      minSimilarityPercent: 100
    }
  });
});
