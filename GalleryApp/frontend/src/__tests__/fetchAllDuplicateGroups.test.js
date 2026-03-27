import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllDuplicateGroups } from "../features/duplicates/utils/fetchAllDuplicateGroups.js";

test("fetchAllDuplicateGroups loads every backend page and returns a flat list", async () => {
  const requestedPages = [];
  const items = await fetchAllDuplicateGroups({
    pageSize: 2,
    listDuplicateGroups: async ({ page }) => {
      requestedPages.push(page);
      if (page === 1) {
        return { items: [{ groupKey: "a" }, { groupKey: "b" }], totalPages: 3 };
      }
      if (page === 2) {
        return { items: [{ groupKey: "c" }, { groupKey: "d" }], totalPages: 3 };
      }
      return { items: [{ groupKey: "e" }], totalPages: 3 };
    }
  });

  assert.deepEqual(requestedPages, [1, 2, 3]);
  assert.deepEqual(items.map((item) => item.groupKey), ["a", "b", "c", "d", "e"]);
});
