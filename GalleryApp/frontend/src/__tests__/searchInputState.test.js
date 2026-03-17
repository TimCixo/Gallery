import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextSuggestionState,
  shouldApplySuggestionOnTab,
  shouldCloseSuggestionListOnEscape
} from "../features/search/searchInputState.js";

test("ArrowDown activates the first suggestion when none is selected", () => {
  assert.deepEqual(
    getNextSuggestionState({
      direction: "next",
      activeIndex: 0,
      suggestionCount: 3,
      isSuggestionActive: false
    }),
    {
      activeIndex: 0,
      isSuggestionActive: true
    }
  );
});

test("ArrowUp activates the last suggestion when none is selected", () => {
  assert.deepEqual(
    getNextSuggestionState({
      direction: "previous",
      activeIndex: 0,
      suggestionCount: 3,
      isSuggestionActive: false
    }),
    {
      activeIndex: 2,
      isSuggestionActive: true
    }
  );
});

test("Arrow navigation wraps around the suggestion list", () => {
  assert.deepEqual(
    getNextSuggestionState({
      direction: "next",
      activeIndex: 2,
      suggestionCount: 3,
      isSuggestionActive: true
    }),
    {
      activeIndex: 0,
      isSuggestionActive: true
    }
  );

  assert.deepEqual(
    getNextSuggestionState({
      direction: "previous",
      activeIndex: 0,
      suggestionCount: 3,
      isSuggestionActive: true
    }),
    {
      activeIndex: 2,
      isSuggestionActive: true
    }
  );
});

test("Tab applies the current suggestion only when the list is open", () => {
  assert.equal(shouldApplySuggestionOnTab({ isSuggestionListOpen: true, suggestionCount: 2 }), true);
  assert.equal(shouldApplySuggestionOnTab({ isSuggestionListOpen: false, suggestionCount: 2 }), false);
});

test("Escape closes the suggestion list only when it is open", () => {
  assert.equal(shouldCloseSuggestionListOnEscape({ isSuggestionListOpen: true }), true);
  assert.equal(shouldCloseSuggestionListOnEscape({ isSuggestionListOpen: false }), false);
});
