import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const collectionsPagePath = path.resolve(__dirname, "../features/collections/CollectionsPage.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");

const collectionsPageSource = readFileSync(collectionsPagePath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("collections page renders create tile before collection items", () => {
  assert.match(collectionsPageSource, /className="collections-list"/);
  assert.match(collectionsPageSource, /className="collections-item collections-item-create"/);
  assert.match(collectionsPageSource, /AppIcon name="create"/);
  assert.match(collectionsPageSource, /\{collections\.map\(\(item\) => \(/);
});

test("collections page styles collections as a responsive grid", () => {
  assert.match(appCss, /\.collections-list\s*\{/);
  assert.match(appCss, /grid-template-columns: repeat\(auto-fill, minmax\(160px, 1fr\)\)/);
  assert.match(appCss, /\.collections-item-cover-create\s*\{/);
  assert.match(appCss, /\.collections-item-title\s*\{/);
});
