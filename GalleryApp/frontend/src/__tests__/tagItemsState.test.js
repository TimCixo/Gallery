import test from "node:test";
import assert from "node:assert/strict";
import {
  createTagItemsState,
  moveTagItem,
  prependTagItem,
  removeTagItem,
  removeTagTypeEntry,
  replaceTagItem,
  shouldLoadTagItems
} from "../features/tags/state/tagItemsState.js";

test("shouldLoadTagItems only requests data for unopened states", () => {
  assert.equal(shouldLoadTagItems(createTagItemsState()), true);
  assert.equal(shouldLoadTagItems(createTagItemsState({ loading: true })), false);
  assert.equal(shouldLoadTagItems(createTagItemsState({ hasLoaded: true })), false);
});

test("tag item helpers update one tag type without rebuilding all data", () => {
  const initial = {
    1: [{ id: 10, name: "cat" }],
    2: [{ id: 20, name: "dog" }]
  };

  const created = prependTagItem(initial, 1, { id: 11, name: "bird" });
  assert.deepEqual(created[1].map((item) => item.id), [11, 10]);
  assert.equal(created[2], initial[2]);

  const updated = replaceTagItem(created, 1, 10, { id: 10, name: "cat-updated" });
  assert.equal(updated[1][1].name, "cat-updated");
  assert.equal(updated[2], initial[2]);

  const deleted = removeTagItem(updated, 1, 11);
  assert.deepEqual(deleted[1].map((item) => item.id), [10]);
  assert.equal(deleted[2], initial[2]);
});

test("moveTagItem moves a dragged tag between tag types", () => {
  const initial = {
    1: [{ id: 10, name: "cat" }],
    2: [{ id: 20, name: "dog" }]
  };

  const moved = moveTagItem(initial, {
    sourceTagTypeId: 1,
    targetTagTypeId: 2,
    tagId: 10,
    nextTagItem: { id: 10, name: "cat", tagTypeId: 2 }
  });

  assert.deepEqual(moved[1], []);
  assert.deepEqual(moved[2].map((item) => item.id), [10, 20]);
});

test("removeTagTypeEntry drops data for a deleted tag type", () => {
  const initial = { 1: ["a"], 2: ["b"] };
  assert.deepEqual(removeTagTypeEntry(initial, 1), { 2: ["b"] });
});
