import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTagListAutocompleteSuggestion,
  buildTagListAutocompleteSuggestions,
  getTagListTokenRange
} from "../features/media/utils/tagListAutocomplete.js";

test("getTagListTokenRange resolves the current comma-separated token", () => {
  assert.deepEqual(getTagListTokenRange("one two thr", 9), {
    start: 8,
    end: 11,
    token: "thr",
    tokenBeforeCaret: "t"
  });
});

test("buildTagListAutocompleteSuggestions shows matches and excludes already selected tags", () => {
  assert.deepEqual(buildTagListAutocompleteSuggestions({
    value: "one tw",
    caret: 6,
    tagCatalog: [
      { name: "one", tagTypeName: "base", tagTypeColor: "#112233" },
      { name: "two", tagTypeName: "base", tagTypeColor: "#112233" },
      { name: "three", tagTypeName: "kind", tagTypeColor: "#445566" }
    ],
    selectedNames: ["one"]
  }), [{
    key: "base:two",
    value: "base:two",
    label: "base:two",
    color: "#112233"
  }]);
});

test("buildTagListAutocompleteSuggestions shows default suggestions for an empty token", () => {
  assert.deepEqual(buildTagListAutocompleteSuggestions({
    value: "one ",
    caret: 4,
    tagCatalog: [
      { name: "one", tagTypeName: "base", tagTypeColor: "#112233" },
      { name: "two", tagTypeName: "base", tagTypeColor: "#112233" },
      { name: "three", tagTypeName: "kind", tagTypeColor: "#445566" }
    ],
    selectedNames: ["one"]
  }), [
    {
      key: "base:two",
      value: "base:two",
      label: "base:two",
      color: "#112233"
    },
    {
      key: "kind:three",
      value: "kind:three",
      label: "kind:three",
      color: "#445566"
    }
  ]);
});

test("applyTagListAutocompleteSuggestion replaces the active token and normalizes separators", () => {
  assert.deepEqual(applyTagListAutocompleteSuggestion({
    value: "one tw",
    caret: 6,
    suggestion: "base:two"
  }), {
    value: "one base:two",
    caret: 12
  });
});
