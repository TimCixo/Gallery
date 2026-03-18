import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOrderedRelationChainToItems,
  applyMediaDraftToItem,
  applyMediaUpdatePayloadToItem,
  buildChangedMediaUpdatePayloadFromDraft,
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

test("buildChangedMediaUpdatePayloadFromDraft returns only changed fields", () => {
  const item = {
    id: 8,
    title: "Old",
    description: "Keep",
    source: "https://a.test",
    parent: 4,
    child: null,
    tags: [{ id: 2 }, { id: 5 }]
  };

  assert.deepEqual(buildChangedMediaUpdatePayloadFromDraft(item, {
    title: " Old ",
    description: "Changed",
    source: "https://a.test",
    parent: "4",
    child: "",
    tagIds: [5, 2]
  }), {
    description: "Changed"
  });
});

test("buildChangedMediaUpdatePayloadFromDraft returns null when nothing changed", () => {
  const item = {
    title: "Old",
    description: null,
    source: null,
    parent: null,
    child: 12,
    tags: [{ id: 2 }, { id: 5 }]
  };

  assert.equal(buildChangedMediaUpdatePayloadFromDraft(item, {
    title: "Old",
    description: "",
    source: "",
    parent: "",
    child: "12",
    tagIds: [2, 5]
  }), null);
});

test("applyMediaUpdatePayloadToItem preserves untouched fields", () => {
  const item = {
    id: 7,
    title: "Old",
    description: "Same",
    source: "https://a.test",
    parent: 3,
    child: 9,
    tags: [{ id: 4, name: "OldTag" }]
  };

  assert.deepEqual(
    applyMediaUpdatePayloadToItem(item, {
      child: null,
      tagIds: [2]
    }, [{ id: 2, name: "NewTag" }]),
    {
      ...item,
      child: null,
      tags: [{ id: 2, name: "NewTag" }]
    }
  );
});

test("applyOrderedRelationChainToItems links selected media in order", () => {
  assert.deepEqual(
    applyOrderedRelationChainToItems([
      { id: 10, draft: { title: "A", parent: "", child: "" } },
      { id: 11, draft: { title: "B", parent: "", child: "" } },
      { id: 12, draft: { title: "C", parent: "", child: "" } }
    ]).map((item) => ({ id: item.id, parent: item.draft.parent, child: item.draft.child })),
    [
      { id: 10, parent: "", child: "11" },
      { id: 11, parent: "10", child: "12" },
      { id: 12, parent: "11", child: "" }
    ]
  );
});
