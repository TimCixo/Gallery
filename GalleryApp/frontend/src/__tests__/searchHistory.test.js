import test from "node:test";
import assert from "node:assert/strict";
import { addSearchHistoryItem, normalizeSearchHistory } from "../app/utils/searchHistory.js";

test("addSearchHistoryItem prepends new unique values and trims duplicates", () => {
  assert.deepEqual(
    addSearchHistoryItem(["id:42", "title:cat"], "title:cat"),
    ["title:cat", "id:42"]
  );
});

test("normalizeSearchHistory removes empty values and enforces the max length", () => {
  assert.deepEqual(
    normalizeSearchHistory(["", "a", "b", "c", "d", "e", "f", "g", "h", "i"]),
    ["a", "b", "c", "d", "e"]
  );
});
