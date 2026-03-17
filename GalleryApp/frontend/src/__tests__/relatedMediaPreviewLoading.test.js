import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const galleryContainerSource = readFileSync(
  path.resolve(__dirname, "../features/gallery/GalleryContainer.jsx"),
  "utf8"
);

test("gallery related media previews load for viewer mode, not only edit mode", () => {
  assert.match(galleryContainerSource, /\? \(mode === "parent" \? mediaDraft\.parent : mediaDraft\.child\)/);
  assert.match(galleryContainerSource, /: \(mode === "parent" \? selectedMedia\.parent : selectedMedia\.child\)/);
});
