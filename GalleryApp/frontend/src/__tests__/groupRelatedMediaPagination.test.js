import test from "node:test";
import assert from "node:assert/strict";

import { buildGroupedMediaPagination } from "../features/gallery/utils/groupRelatedMediaPagination.js";

test("buildGroupedMediaPagination keeps a full page of grouped tiles when linked items collapse", () => {
  const items = Array.from({ length: 37 }, (_, index) => ({
    id: index + 1,
    relativePath: `${index + 1}.jpg`,
    parent: index === 1 ? 1 : null,
    child: index === 0 ? 2 : null
  }));

  const result = buildGroupedMediaPagination(items, 1, 36);

  assert.equal(result.items.length, 36);
  assert.equal(result.totalCount, 36);
  assert.equal(result.totalPages, 1);
});

test("buildGroupedMediaPagination groups linked items even when they originated from different raw pages", () => {
  const items = Array.from({ length: 40 }, (_, index) => ({
    id: index + 1,
    relativePath: `${index + 1}.jpg`,
    parent: null,
    child: null
  }));

  items[35] = { ...items[35], child: 37 };
  items[36] = { ...items[36], parent: 36 };

  const result = buildGroupedMediaPagination(items, 1, 36);

  assert.equal(result.totalCount, 39);
  assert.equal(result.totalPages, 2);
  assert.equal(result.items[35].id, 36);
  assert.equal(result.items[35]._groupCount, 2);
});
