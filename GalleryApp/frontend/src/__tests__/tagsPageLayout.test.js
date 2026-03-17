import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tagsPagePath = path.resolve(__dirname, "../features/tags/TagsPage.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");

const tagsPageSource = readFileSync(tagsPagePath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("tags page renders create callout before the tag type card list", () => {
  assert.match(tagsPageSource, /className="tags-callout"/);
  assert.match(tagsPageSource, /Create a tag group, then open it to manage its tags\./);
  assert.match(tagsPageSource, /className="tag-type-card-list"/);
  assert.match(tagsPageSource, /"tag-type-card"/);
  assert.match(tagsPageSource, /className=\{cardClassName\}/);
});

test("tags page exposes explicit loading and empty states", () => {
  assert.match(tagsPageSource, /Loading TagTypes\.\.\./);
  assert.match(tagsPageSource, /No TagTypes yet\./);
  assert.match(tagsPageSource, /Loading tags\.\.\./);
  assert.match(tagsPageSource, /No tags found\./);
});

test("tags page styles tag types as cards", () => {
  assert.match(appCss, /\.tag-type-card-list\s*\{/);
  assert.match(appCss, /grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\)/);
  assert.match(appCss, /\.tag-type-card\s*\{/);
  assert.match(appCss, /\.tag-type-card-item\.is-expanded\s*\{/);
  assert.match(appCss, /\.tag-type-card-header\s*\{/);
  assert.match(appCss, /\.tag-type-card-body\s*\{/);
});

test("tags page keeps create form and card actions on one row on mobile", () => {
  assert.match(appCss, /@media \(max-width: 760px\)[\s\S]*\.tags-callout-form\s*\{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) auto/);
  assert.match(appCss, /@media \(max-width: 760px\)[\s\S]*\.tag-type-card-header\s*\{[\s\S]*flex-direction: row/);
  assert.match(appCss, /@media \(max-width: 760px\)[\s\S]*\.tag-type-card-actions\s*\{[\s\S]*width: auto/);
});
