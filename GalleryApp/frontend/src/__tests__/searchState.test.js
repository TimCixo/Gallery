import test from "node:test";
import assert from "node:assert/strict";
import {
  applySearchSuggestionToValue,
  createGalleryBrandNavigationState,
  getSearchSuggestionSelection,
  getSubmittedSearchText
} from "../app/utils/searchState.js";

test("getSubmittedSearchText trims user input", () => {
  assert.equal(getSubmittedSearchText("  title:cat id:42  "), "title:cat id:42");
});

test("createGalleryBrandNavigationState keeps current search state and targets gallery", () => {
  assert.deepEqual(createGalleryBrandNavigationState({
    inputValue: "title:cat",
    submittedText: "title:cat"
  }), {
    activePage: "gallery",
    inputValue: "title:cat",
    submittedText: "title:cat"
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

test("applySearchSuggestionToValue inserts tag names and values at the current token", () => {
  assert.deepEqual(
    applySearchSuggestionToValue({
      inputValue: "tit",
      suggestion: {
        kind: "tagName",
        tagName: "title"
      },
      searchTokenRange: {
        start: 0,
        end: 3
      }
    }),
    {
      nextValue: "title:",
      nextCaret: 6
    }
  );

  assert.deepEqual(
    applySearchSuggestionToValue({
      inputValue: "artist:bl",
      suggestion: {
        kind: "tagValue",
        tagName: "artist",
        tagValue: "Blue Sky"
      },
      searchTokenRange: {
        start: 0,
        end: 9
      }
    }),
    {
      nextValue: 'artist:"Blue Sky" ',
      nextCaret: 18
    }
  );

  assert.deepEqual(
    applySearchSuggestionToValue({
      inputValue: "-cat",
      suggestion: {
        kind: "tagValue",
        tagName: "animal",
        tagValue: "cat"
      },
      searchTokenRange: {
        start: 0,
        end: 4
      }
    }),
    {
      nextValue: "-animal:cat ",
      nextCaret: 12
    }
  );
});
