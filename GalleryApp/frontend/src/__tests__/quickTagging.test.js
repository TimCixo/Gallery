import test from "node:test";
import assert from "node:assert/strict";
import {
  applyQuickTagToItem,
  createQuickTaggingConfig,
  filterMediaItemsByExcludedTags,
  getMediaTagIds,
  resolveTagIdsToTokens,
  resolveTagIdsToNames,
  resolveTagTokensToIds,
  resolveTagNamesToIds
} from "../features/media/utils/quickTagging.js";

test("createQuickTaggingConfig normalizes add and excluded tag ids", () => {
  assert.deepEqual(createQuickTaggingConfig({
    addTagIds: ["7", 8, 8, 0],
    excludedTagIds: [1, "2", 2, 0, "bad"]
  }), {
    enabled: false,
    addTagIds: [7, 8],
    excludedTagIds: [1, 2]
  });
});

test("filterMediaItemsByExcludedTags hides media with any excluded tag", () => {
  const items = [
    { id: 1, tags: [{ id: 1 }, { id: 4 }] },
    { id: 2, tags: [{ id: 5 }] },
    { id: 3, tags: [] }
  ];

  assert.deepEqual(filterMediaItemsByExcludedTags(items, [4, 9]).map((item) => item.id), [2, 3]);
});

test("getMediaTagIds returns normalized tag ids", () => {
  assert.deepEqual(getMediaTagIds({ tags: [{ id: 3 }, { id: "4" }, { id: 0 }] }), [3, 4]);
});

test("resolveTagNamesToIds matches catalog tags by name", () => {
  const tagCatalog = [
    { id: 1, name: "old", tagTypeName: "status" },
    { id: 7, name: "new", tagTypeName: "author" }
  ];

  assert.deepEqual(resolveTagNamesToIds(["new", "old", "missing"], tagCatalog), [1, 7]);
  assert.deepEqual(resolveTagIdsToNames([7, 1], tagCatalog), ["old", "new"]);
  assert.deepEqual(resolveTagNamesToIds(["author:new", "status:old"], tagCatalog), [1, 7]);
});

test("resolveTagTokensToIds matches catalog tags by full token and formats ids back to tokens", () => {
  const tagCatalog = [
    { id: 1, name: "artist3", tagTypeName: "author" },
    { id: 7, name: "some_character", tagTypeName: "character" }
  ];

  assert.deepEqual(resolveTagTokensToIds(["character:some_character", "author:artist3"], tagCatalog), [1, 7]);
  assert.deepEqual(resolveTagIdsToTokens([7, 1], tagCatalog), ["author:artist3", "character:some_character"]);
});

test("applyQuickTagToItem appends selected tags to media tags", () => {
  const item = {
    id: 5,
    title: "Sample",
    tags: [{ id: 1, name: "old", tagTypeId: 10, tagTypeName: "type", tagTypeColor: "#112233" }]
  };
  const tagCatalog = [
    { id: 1, name: "old", tagTypeId: 10, tagTypeName: "type", tagTypeColor: "#112233" },
    { id: 7, name: "new", tagTypeId: 11, tagTypeName: "genre", tagTypeColor: "#334455" },
    { id: 8, name: "extra", tagTypeId: 11, tagTypeName: "genre", tagTypeColor: "#334455" }
  ];

  const updated = applyQuickTagToItem(item, [7, 8], tagCatalog);
  assert.deepEqual(updated.tags.map((tag) => tag.id), [1, 7, 8]);
});
