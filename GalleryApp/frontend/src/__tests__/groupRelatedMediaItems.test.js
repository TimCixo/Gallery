import test from "node:test";
import assert from "node:assert/strict";

import { groupRelatedMediaItems } from "../features/gallery/utils/groupRelatedMediaItems.js";

test("groupRelatedMediaItems collapses linked visible media into one tile entry", () => {
  const items = [
    { id: 10, child: 11, relativePath: "10.jpg" },
    { id: 11, parent: 10, child: 12, relativePath: "11.jpg" },
    { id: 12, parent: 11, relativePath: "12.jpg" },
    { id: 40, relativePath: "40.jpg" }
  ];

  assert.deepEqual(groupRelatedMediaItems(items).map((item) => ({
    id: item.id,
    count: item._groupCount
  })), [
    { id: 10, count: 3 },
    { id: 40, count: 1 }
  ]);
});

test("groupRelatedMediaItems keeps unrelated entries and invalid ids intact", () => {
  const items = [
    { id: 1, relativePath: "1.jpg" },
    { id: null, relativePath: "missing-id.jpg" },
    { id: 2, parent: 999, relativePath: "2.jpg" }
  ];

  assert.equal(groupRelatedMediaItems(items).length, 3);
});
