import test from "node:test";
import assert from "node:assert/strict";
import { getCommonTagIds, getGroupSelectedTagIds } from "../features/media/utils/groupTagSelection.js";

test("getCommonTagIds returns only tags shared by every grouped item", () => {
  const items = [
    { draft: { tagIds: [1, 2, 3] } },
    { draft: { tagIds: [2, 3, 4] } },
    { draft: { tagIds: [3, 2, 5] } }
  ];

  assert.deepEqual(getCommonTagIds(items), [2, 3]);
});

test("getGroupSelectedTagIds overlays pending add and remove actions on shared tags", () => {
  const items = [
    { draft: { tagIds: [1, 2, 3] } },
    { draft: { tagIds: [2, 3, 4] } }
  ];

  assert.deepEqual(getGroupSelectedTagIds(items, { 2: "remove", 5: "add" }), [3, 5]);
});

test("getGroupSelectedTagIds ignores invalid tag edits", () => {
  const items = [
    { draft: { tagIds: [2, 3] } },
    { draft: { tagIds: [2, 3] } }
  ];

  assert.deepEqual(getGroupSelectedTagIds(items, { bad: "add", 0: "remove", 3: "noop" }), [2, 3]);
});
