import test from "node:test";
import assert from "node:assert/strict";
import { filterMediaItemsByCollectionState } from "../features/gallery/utils/filterMediaItemsByCollectionState.js";
import { paginateMediaItems } from "../features/gallery/utils/paginateMediaItems.js";

test("filterMediaItemsByCollectionState excludes media assigned to collections", () => {
  const items = [
    { id: 1, hasCollections: false },
    { id: 2, hasCollections: true },
    { id: 3 }
  ];

  assert.deepEqual(
    filterMediaItemsByCollectionState(items, true).map((item) => item.id),
    [1, 3]
  );
});

test("paginateMediaItems recalculates totals after client-side filtering", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

  assert.deepEqual(paginateMediaItems(items, 2, 2), {
    items: [{ id: 3 }],
    totalCount: 3,
    totalPages: 2,
    page: 2
  });
});
