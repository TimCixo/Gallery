import test from "node:test";
import assert from "node:assert/strict";
import { getUploadQueueActiveIndex, reorderUploadQueueItems } from "../features/upload/utils/uploadQueueOrdering.js";

const createItems = () => [
  { key: "a", file: { name: "a.jpg" } },
  { key: "b", file: { name: "b.jpg" } },
  { key: "c", file: { name: "c.jpg" } }
];

test("reorderUploadQueueItems moves dragged item before the drop target", () => {
  const items = createItems();
  const next = reorderUploadQueueItems(items, "c", "a");
  assert.deepEqual(next.map((item) => item.key), ["c", "a", "b"]);
});

test("reorderUploadQueueItems keeps original array when keys are invalid or unchanged", () => {
  const items = createItems();
  assert.equal(reorderUploadQueueItems(items, "a", "a"), items);
  assert.equal(reorderUploadQueueItems(items, "x", "a"), items);
  assert.equal(reorderUploadQueueItems(items, "a", "x"), items);
});

test("getUploadQueueActiveIndex preserves the active item after reorder", () => {
  const nextItems = reorderUploadQueueItems(createItems(), "c", "a");
  assert.equal(getUploadQueueActiveIndex(nextItems, "b"), 2);
  assert.equal(getUploadQueueActiveIndex(nextItems, "missing"), 0);
});
