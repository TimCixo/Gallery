import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchSuggestions,
  formatSearchTagValue,
  getSearchTokenRange,
  parseSearchSegments
} from "../features/shared/utils/searchUtils.js";

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

test("parseSearchSegments includes color for known tag type", () => {
  const segments = parseSearchSegments({
    value: "artist:alpha plain",
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
