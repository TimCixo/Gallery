import test from "node:test";
import assert from "node:assert/strict";
import { buildRelatedMediaChain } from "../features/media/utils/relatedMediaChain.js";

test("buildRelatedMediaChain returns descendants current item and ancestors in display order", async () => {
  const items = new Map([
    [1, { id: 1, parent: null, child: 2, relativePath: "1.webp" }],
    [2, { id: 2, parent: 1, child: 3, relativePath: "2.webp" }],
    [3, { id: 3, parent: 2, child: 4, relativePath: "3.webp" }],
    [4, { id: 4, parent: 3, child: null, relativePath: "4.webp" }]
  ]);

  const chain = await buildRelatedMediaChain({
    media: items.get(3),
    findMediaById: async (id) => items.get(id) || null
  });

  assert.deepEqual(chain.map((item) => item.id), [4, 3, 2, 1]);
  assert.equal(chain[1].isCurrent, true);
});

test("buildRelatedMediaChain stops when it detects a cycle", async () => {
  const items = new Map([
    [10, { id: 10, parent: 11, child: 11, relativePath: "10.webp" }],
    [11, { id: 11, parent: 10, child: 10, relativePath: "11.webp" }]
  ]);

  const chain = await buildRelatedMediaChain({
    media: items.get(10),
    findMediaById: async (id) => items.get(id) || null
  });

  assert.deepEqual(chain.map((item) => item.id), [11, 10]);
});
