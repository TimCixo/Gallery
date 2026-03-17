import test from "node:test";
import assert from "node:assert/strict";
import { createGalleryBrandNavigationState, getSubmittedSearchText } from "../app/utils/searchState.js";

test("getSubmittedSearchText trims user input", () => {
  assert.equal(getSubmittedSearchText("  title:cat id:42  "), "title:cat id:42");
});

test("createGalleryBrandNavigationState clears submitted filter but keeps gallery target", () => {
  assert.deepEqual(createGalleryBrandNavigationState(), {
    activePage: "gallery",
    submittedText: ""
  });
});
