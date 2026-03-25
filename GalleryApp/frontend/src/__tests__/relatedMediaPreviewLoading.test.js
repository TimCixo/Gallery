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
  assert.match(galleryContainerSource, /valueByMode:\s*\{/);
  assert.match(galleryContainerSource, /parent: isEditingMedia \? mediaDraft\.parent : selectedMedia\?\.parent/);
  assert.match(galleryContainerSource, /child: isEditingMedia \? mediaDraft\.child : selectedMedia\?\.child/);
  assert.match(galleryContainerSource, /useMediaReferencePicker/);
});
