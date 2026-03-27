import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(__dirname, "../features/search/components/SearchInput.jsx");
const autocompletePath = path.resolve(__dirname, "../features/shared/components/AutocompleteTextField.jsx");
const source = readFileSync(componentPath, "utf8");
const autocompleteSource = readFileSync(autocompletePath, "utf8");

test("SearchInput exposes combobox semantics and listbox wiring", () => {
  assert.match(source, /AutocompleteTextField/);
  assert.match(autocompleteSource, /role="combobox"/);
  assert.match(autocompleteSource, /aria-autocomplete="list"/);
  assert.match(autocompleteSource, /aria-controls=\{suggestionsEnabled \? field\.listboxId : undefined\}/);
  assert.match(autocompleteSource, /aria-activedescendant=\{activeDescendant\}/);
  assert.match(autocompleteSource, /role="listbox"/);
  assert.match(autocompleteSource, /role="option"/);
});

test("SearchInput keeps the accessibility hint off-screen", () => {
  assert.match(autocompleteSource, /className="sr-only"/);
  assert.doesNotMatch(source, /top-search-suggestion-empty/);
});

test("SearchInput includes recent history UI and clear action", () => {
  assert.match(source, /top-search-suggestions-toolbar/);
  assert.match(source, /top-search-history-clear/);
  assert.match(source, /Recent/);
  assert.match(source, /Suggestions/);
  assert.match(source, /items: historyOptions/);
  assert.match(source, /items: visibleSuggestions/);
  assert.doesNotMatch(source, /hasTypedValue && visibleSuggestions\.length > 0/);
});
