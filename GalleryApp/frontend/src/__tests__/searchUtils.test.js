import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchSuggestions,
  formatSearchTagValue,
  getSearchTokenRange,
  parseSearchSegments
} from "../features/shared/utils/searchUtils.js";
import { BASE_SEARCH_TAG_NAMES, BASE_SEARCH_TAG_OPTIONS } from "../features/search/searchTags.js";

test("buildSearchSuggestions suggests tag names by prefix", () => {
  const suggestions = buildSearchSuggestions({
    searchTokenRange: getSearchTokenRange("tit", 3),
    searchTagOptions: ["title", "path", "artist"],
    searchTagTypeMap: new Map([["artist", { color: "#112233" }]]),
    baseSearchTagNames: new Set(["path", "title", "description", "id", "source"]),
    mediaTagCatalog: []
  });

  assert.equal(suggestions.length > 0, true);
  assert.equal(suggestions[0].label, "title:");
  assert.equal(suggestions[0].kind, "tagName");
});

test("base search tags include filetype", () => {
  assert.equal(BASE_SEARCH_TAG_OPTIONS.includes("filetype"), true);
  assert.equal(BASE_SEARCH_TAG_NAMES.has("filetype"), true);
});

test("buildSearchSuggestions stays empty for an empty token and limits autocomplete results", () => {
  const suggestions = buildSearchSuggestions({
    searchTokenRange: getSearchTokenRange("", 0),
    searchTagOptions: ["title", "path", "artist", "author", "album", "age"],
    searchTagTypeMap: new Map(),
    baseSearchTagNames: new Set(["path", "title", "description", "id", "source"]),
    mediaTagCatalog: []
  });

  assert.deepEqual(suggestions, []);

  const limitedSuggestions = buildSearchSuggestions({
    searchTokenRange: getSearchTokenRange("a", 1),
    searchTagOptions: ["artist", "author", "album", "age", "area", "arc"],
    searchTagTypeMap: new Map(),
    baseSearchTagNames: new Set(["path", "title", "description", "id", "source"]),
    mediaTagCatalog: []
  });

  assert.equal(limitedSuggestions.length, 5);
});

test("buildSearchSuggestions suggests values for typed tag", () => {
  const suggestions = buildSearchSuggestions({
    searchTokenRange: getSearchTokenRange("artist:bl", 9),
    searchTagOptions: ["title", "path", "artist"],
    searchTagTypeMap: new Map([["artist", { color: "#112233" }]]),
    baseSearchTagNames: new Set(["path", "title", "description", "id", "source"]),
    mediaTagCatalog: [
      { tagTypeName: "artist", name: "Blue Sky" },
      { tagTypeName: "artist", name: "Black Cat" },
      { tagTypeName: "series", name: "Other" }
    ]
  });

  assert.deepEqual(
    suggestions.map((item) => item.label),
    ["Black Cat", "Blue Sky"]
  );
  assert.equal(formatSearchTagValue("Blue Sky"), '"Blue Sky"');
});

test("buildSearchSuggestions ignores leading minus while keeping it in labels", () => {
  const suggestions = buildSearchSuggestions({
    searchTokenRange: getSearchTokenRange("-cat", 4),
    searchTagOptions: ["title", "path", "animal"],
    searchTagTypeMap: new Map([["animal", { color: "#112233" }]]),
    baseSearchTagNames: new Set(["path", "title", "description", "id", "source"]),
    mediaTagCatalog: [
      { tagTypeName: "animal", name: "cat" },
      { tagTypeName: "animal", name: "dog" }
    ]
  });

  assert.deepEqual(suggestions.map((item) => item.label), ["-animal:cat"]);
});

test("buildSearchSuggestions excludes non-prefix free-form matches", () => {
  const suggestions = buildSearchSuggestions({
    searchTokenRange: getSearchTokenRange("at", 2),
    searchTagOptions: ["title", "path", "artist"],
    searchTagTypeMap: new Map([["artist", { color: "#112233" }]]),
    baseSearchTagNames: new Set(["path", "title", "description", "id", "source"]),
    mediaTagCatalog: [
      { tagTypeName: "artist", name: "Black Cat" },
      { tagTypeName: "artist", name: "Cathedral" }
    ]
  });

  assert.deepEqual(suggestions, []);
});

test("parseSearchSegments includes color for known tag type", () => {
  const segments = parseSearchSegments({
    value: "-artist:alpha plain",
    baseSearchTagNames: new Set(["title", "path"]),
    searchTagTypeMap: new Map([["artist", { color: "#112233" }]]),
    searchTagOptions: ["title", "path", "artist"]
  });

  assert.equal(segments[0].isTag, true);
  assert.equal(segments[0].color, "#112233");
});

test("formatSearchTagValue strips inner quotes and wraps spaces", () => {
  assert.equal(formatSearchTagValue('"quoted value"'), '"quoted value"');
  assert.equal(formatSearchTagValue("single"), "single");
});
