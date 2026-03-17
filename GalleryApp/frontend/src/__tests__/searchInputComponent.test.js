import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(__dirname, "../features/search/components/SearchInput.jsx");
const source = readFileSync(componentPath, "utf8");

test("SearchInput exposes combobox semantics and listbox wiring", () => {
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-autocomplete="list"/);
  assert.match(source, /aria-controls=\{suggestionsEnabled \? listboxId : undefined\}/);
  assert.match(source, /aria-activedescendant=\{activeDescendant\}/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
});

test("SearchInput keeps the accessibility hint off-screen", () => {
  assert.match(source, /className="sr-only"/);
  assert.doesNotMatch(source, /top-search-suggestion-empty/);
});

test("SearchInput includes recent history UI and clear action", () => {
  assert.match(source, /top-search-suggestions-toolbar/);
  assert.match(source, /top-search-history-clear/);
  assert.match(source, /Recent/);
  assert.match(source, /Suggestions/);
  assert.match(source, /\[\.\.\.suggestions, \.\.\.historyOptions\]/);
});
