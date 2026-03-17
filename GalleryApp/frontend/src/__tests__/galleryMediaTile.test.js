import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagePath = path.resolve(__dirname, "../features/gallery/GalleryPage.jsx");
const tilePath = path.resolve(__dirname, "../features/gallery/GalleryMediaTile.jsx");
const pageSource = readFileSync(pagePath, "utf8");
const tileSource = readFileSync(tilePath, "utf8");

test("gallery page renders tiles through memoized media tile component", () => {
  assert.match(pageSource, /import GalleryMediaTile from "\.\/GalleryMediaTile";/);
  assert.match(pageSource, /<GalleryMediaTile/);
  assert.match(tileSource, /import \{ memo \} from "react";/);
  assert.match(tileSource, /export default memo\(GalleryMediaTile\);/);
  assert.match(tileSource, /onPreviewError\(file\.relativePath\)/);
});
