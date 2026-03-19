import test from "node:test";
import assert from "node:assert/strict";
import { syncSelectedMediaMap } from "../features/media/utils/mediaMultiSelectState.js";

test("syncSelectedMediaMap preserves selected items that are not on the current page", () => {
  const selectedMediaIds = [11, 22];
  const currentMap = new Map([
    [11, { id: 11, title: "Page 1 item" }],
    [22, { id: 22, title: "Page 1 item 2" }]
  ]);

  const nextMap = syncSelectedMediaMap(currentMap, selectedMediaIds, [{ id: 33, title: "Page 2 item" }]);

  assert.equal(nextMap.size, 2);
  assert.deepEqual(nextMap.get(11), { id: 11, title: "Page 1 item" });
  assert.deepEqual(nextMap.get(22), { id: 22, title: "Page 1 item 2" });
});

test("syncSelectedMediaMap refreshes selected item data from the current page", () => {
  const selectedMediaIds = [11];
  const currentMap = new Map([
    [11, { id: 11, title: "Old title" }]
  ]);

  const nextMap = syncSelectedMediaMap(currentMap, selectedMediaIds, [{ id: 11, title: "Updated title" }]);

  assert.equal(nextMap.size, 1);
  assert.deepEqual(nextMap.get(11), { id: 11, title: "Updated title" });
});

test("syncSelectedMediaMap drops items that are no longer selected", () => {
  const currentMap = new Map([
    [11, { id: 11, title: "Selected" }],
    [22, { id: 22, title: "Removed" }]
  ]);

  const nextMap = syncSelectedMediaMap(currentMap, [11], []);

  assert.equal(nextMap.size, 1);
  assert.equal(nextMap.has(11), true);
  assert.equal(nextMap.has(22), false);
});
