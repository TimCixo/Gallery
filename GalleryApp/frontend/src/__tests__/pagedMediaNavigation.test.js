import test from "node:test";
import assert from "node:assert/strict";

import { resolvePagedMediaNavigation } from "../features/media/utils/pagedMediaNavigation.js";

test("resolvePagedMediaNavigation moves within the current page when the next item exists", () => {
  assert.deepEqual(
    resolvePagedMediaNavigation({ currentIndex: 1, itemCount: 4, currentPage: 2, totalPages: 5, offset: 1 }),
    { type: "item", index: 2 }
  );
});

test("resolvePagedMediaNavigation moves to the first item of the next page at the page end", () => {
  assert.deepEqual(
    resolvePagedMediaNavigation({ currentIndex: 3, itemCount: 4, currentPage: 2, totalPages: 5, offset: 1 }),
    { type: "page", page: 3, select: "first" }
  );
});

test("resolvePagedMediaNavigation moves to the last item of the previous page at the page start", () => {
  assert.deepEqual(
    resolvePagedMediaNavigation({ currentIndex: 0, itemCount: 4, currentPage: 3, totalPages: 5, offset: -1 }),
    { type: "page", page: 2, select: "last" }
  );
});

test("resolvePagedMediaNavigation wraps within the current page when already on the last page", () => {
  assert.deepEqual(
    resolvePagedMediaNavigation({ currentIndex: 2, itemCount: 3, currentPage: 5, totalPages: 5, offset: 1 }),
    { type: "item", index: 0 }
  );
});

test("resolvePagedMediaNavigation wraps within the current page when already on the first page", () => {
  assert.deepEqual(
    resolvePagedMediaNavigation({ currentIndex: 0, itemCount: 3, currentPage: 1, totalPages: 5, offset: -1 }),
    { type: "item", index: 2 }
  );
});
