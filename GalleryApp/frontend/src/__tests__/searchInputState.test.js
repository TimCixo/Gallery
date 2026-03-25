import test from "node:test";
import assert from "node:assert/strict";
import {
  getAutocompleteNextState,
  shouldAutocompleteCommit,
  shouldAutocompleteClose
} from "../features/shared/utils/autocompleteState.js";

test("ArrowDown activates the first suggestion when none is selected", () => {
  assert.deepEqual(
    getAutocompleteNextState({
      direction: "next",
      activeIndex: 0,
      optionCount: 3,
      isOptionActive: false
    }),
    {
      activeIndex: 0,
      isOptionActive: true
    }
  );
});

test("ArrowUp activates the last suggestion when none is selected", () => {
  assert.deepEqual(
    getAutocompleteNextState({
      direction: "previous",
      activeIndex: 0,
      optionCount: 3,
      isOptionActive: false
    }),
    {
      activeIndex: 2,
      isOptionActive: true
    }
  );
});

test("Arrow navigation wraps around the suggestion list", () => {
  assert.deepEqual(
    getAutocompleteNextState({
      direction: "next",
      activeIndex: 2,
      optionCount: 3,
      isOptionActive: true
    }),
    {
      activeIndex: 0,
      isOptionActive: true
    }
  );

  assert.deepEqual(
    getAutocompleteNextState({
      direction: "previous",
      activeIndex: 0,
      optionCount: 3,
      isOptionActive: true
    }),
    {
      activeIndex: 2,
      isOptionActive: true
    }
  );
});

test("Tab applies the current suggestion only when the list is open", () => {
  assert.equal(shouldAutocompleteCommit({ isOpen: true, optionCount: 2, key: "Tab" }), true);
  assert.equal(shouldAutocompleteCommit({ isOpen: false, optionCount: 2, key: "Tab" }), false);
  assert.equal(shouldAutocompleteCommit({ isOpen: true, optionCount: 2, key: "Enter", commitKeys: ["Enter", "Tab"] }), true);
});

test("Escape closes the suggestion list only when it is open", () => {
  assert.equal(shouldAutocompleteClose({ isOpen: true, key: "Escape" }), true);
  assert.equal(shouldAutocompleteClose({ isOpen: false, key: "Escape" }), false);
});
