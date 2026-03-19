import test from "node:test";
import assert from "node:assert/strict";
import { saveBulkMediaItems } from "../features/media/utils/bulkMediaSave.js";

test("saveBulkMediaItems clears old relations before applying a new link order", async () => {
  const calls = [];
  const items = [
    {
      id: 10,
      parent: 1,
      child: 11,
      draft: { title: "", description: "", source: "", parent: "", child: "11", tagIds: [] },
      tags: []
    },
    {
      id: 11,
      parent: 10,
      child: 12,
      draft: { title: "", description: "", source: "", parent: "10", child: "12", tagIds: [] },
      tags: []
    },
    {
      id: 12,
      parent: 11,
      child: 99,
      draft: { title: "", description: "", source: "", parent: "11", child: "", tagIds: [] },
      tags: []
    }
  ];

  await saveBulkMediaItems({
    items,
    relationStrategy: "relink",
    collectionIds: [],
    tagCatalog: [],
    updateMedia: async (mediaId, payload) => {
      calls.push({ mediaId, payload });
    },
    addMediaToCollection: async () => {}
  });

  assert.deepEqual(calls, [
    { mediaId: 10, payload: { parent: null } },
    { mediaId: 12, payload: { child: null } }
  ]);
});

test("saveBulkMediaItems keeps outer relatives while linking previously disconnected items", async () => {
  const calls = [];
  const items = [
    {
      id: 2,
      parent: 1,
      child: null,
      draft: { title: "", description: "", source: "", parent: "1", child: "3", tagIds: [] },
      tags: []
    },
    {
      id: 3,
      parent: null,
      child: 4,
      draft: { title: "", description: "", source: "", parent: "2", child: "4", tagIds: [] },
      tags: []
    }
  ];

  await saveBulkMediaItems({
    items,
    relationStrategy: "relink",
    collectionIds: [],
    tagCatalog: [],
    updateMedia: async (mediaId, payload) => {
      calls.push({ mediaId, payload });
    },
    addMediaToCollection: async () => {}
  });

  assert.deepEqual(calls, [
    { mediaId: 2, payload: { title: null, description: null, source: null, parent: 1, child: 3, tagIds: [] } },
    { mediaId: 3, payload: { title: null, description: null, source: null, parent: 2, child: 4, tagIds: [] } }
  ]);
});

test("saveBulkMediaItems preserves unchanged external relations when disconnecting a selected segment", async () => {
  const calls = [];
  const items = [
    {
      id: 2,
      parent: 1,
      child: 3,
      draft: { title: "", description: "", source: "", parent: "1", child: "", tagIds: [] },
      tags: []
    },
    {
      id: 3,
      parent: 2,
      child: 4,
      draft: { title: "", description: "", source: "", parent: "", child: "4", tagIds: [] },
      tags: []
    }
  ];

  await saveBulkMediaItems({
    items,
    relationStrategy: "disconnect",
    collectionIds: [],
    tagCatalog: [],
    updateMedia: async (mediaId, payload) => {
      calls.push({ mediaId, payload });
    },
    addMediaToCollection: async () => {}
  });

  assert.deepEqual(calls, [
    { mediaId: 2, payload: { title: null, description: null, source: null, parent: 1, child: null, tagIds: [] } },
    { mediaId: 3, payload: { title: null, description: null, source: null, parent: null, child: 4, tagIds: [] } }
  ]);
});
