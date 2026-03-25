import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const galleryContainerPath = path.resolve(__dirname, "../features/gallery/GalleryContainer.jsx");
const galleryContainerSource = readFileSync(galleryContainerPath, "utf8");

test("gallery container caches media items and related chains for cross-page navigation", () => {
  assert.match(galleryContainerSource, /useMediaReferencePicker/);
  assert.match(galleryContainerSource, /const relatedMediaChainCacheRef = useRef\(new Map\(\)\);/);
  assert.match(galleryContainerSource, /localItems: mediaFiles/);
  assert.match(galleryContainerSource, /mediaReferencePicker\.findMediaById\(selectedMediaId\)/);
  assert.match(galleryContainerSource, /const cachedChain = relatedMediaChainCacheRef\.current\.get\(selectedMediaId\);/);
  assert.match(galleryContainerSource, /relatedMediaChainCacheRef\.current\.set\(selectedMediaId, items\);/);
});
