import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMediaDraftToItem,
  buildMediaUpdatePayloadFromDraft,
  createBulkEditorItems,
  createMediaDraftFromItem
} from "../features/media/utils/bulkMediaEdit.js";

test("createMediaDraftFromItem copies editable media fields", () => {
  assert.deepEqual(
    createMediaDraftFromItem({
      title: "Shared",
      description: "Same",
      source: "https://a.test",
      parent: 11,
      child: 12,
      tags: [{ id: 1 }, { id: 2 }]
    }),
    {
      title: "Shared",
      description: "Same",
      source: "https://a.test",
      parent: "11",
      child: "12",
      tagIds: [1, 2]
    }
  );
});

test("createBulkEditorItems wraps selected media with drafts", () => {
  const items = createBulkEditorItems([{ id: 7, title: "Aurora", tags: [{ id: 4 }] }]);

  assert.equal(items.length, 1);
  assert.equal(items[0].id, 7);
  assert.deepEqual(items[0].draft, {
    title: "Aurora",
    description: "",
    source: "",
    parent: "",
    child: "",
    tagIds: [4]
  });
});

test("buildMediaUpdatePayloadFromDraft normalizes media editor draft", () => {
  const item = {
    title: "Original",
    description: "Keep",
    source: null,
    parent: 11,
    child: 12,
    tags: [{ id: 4 }]
  };
  assert.deepEqual(buildMediaUpdatePayloadFromDraft(item, {
    title: " Updated ",
    description: "",
    source: "",
    parent: "21",
    child: "",
    tagIds: [9]
  }), {
    title: "Updated",
    description: null,
    source: null,
    parent: 21,
    child: null,
    tagIds: [9]
  });
});

test("applyMediaDraftToItem replaces media fields with normalized draft values", () => {
  const item = {
    id: 7,
    title: "Old",
    description: null,
    source: null,
    parent: null,
    child: null,
    tags: [{ id: 4, name: "OldTag" }]
  };
  assert.deepEqual(
    applyMediaDraftToItem(item, {
      title: "",
      description: "",
      source: "",
      parent: "",
      child: "",
      tagIds: [2]
    }, [{ id: 2, name: "NewTag" }]),
    {
      ...item,
      title: null,
      description: null,
      source: null,
      parent: null,
      child: null,
      tags: [{ id: 2, name: "NewTag" }]
    }
  );
});
