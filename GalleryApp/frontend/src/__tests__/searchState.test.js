import test from "node:test";
import assert from "node:assert/strict";
import {
  createGalleryBrandNavigationState,
  getSearchSuggestionSelection,
  getSubmittedSearchText
} from "../app/utils/searchState.js";

test("getSubmittedSearchText trims user input", () => {
  assert.equal(getSubmittedSearchText("  title:cat id:42  "), "title:cat id:42");
});

test("createGalleryBrandNavigationState clears submitted filter but keeps gallery target", () => {
  assert.deepEqual(createGalleryBrandNavigationState(), {
    activePage: "gallery",
    submittedText: ""
  });
});

test("getSearchSuggestionSelection returns first suggestion by default", () => {
  const suggestions = [{ key: "first" }, { key: "second" }];
  assert.deepEqual(getSearchSuggestionSelection(suggestions, 0), { key: "first" });
});

test("getSearchSuggestionSelection clamps out of range indexes", () => {
  const suggestions = [{ key: "first" }, { key: "second" }];
  assert.deepEqual(getSearchSuggestionSelection(suggestions, 99), { key: "second" });
  assert.equal(getSearchSuggestionSelection([], 0), null);
});
