import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modalPath = path.resolve(__dirname, "../features/media/components/MediaViewerModal.jsx");
const galleryContainerPath = path.resolve(__dirname, "../features/gallery/GalleryContainer.jsx");
const mediaApiPath = path.resolve(__dirname, "../services/mediaApi.js");
const appCssPath = path.resolve(__dirname, "../App.css");
const modalSource = readFileSync(modalPath, "utf8");
const galleryContainerSource = readFileSync(galleryContainerPath, "utf8");
const mediaApiSource = readFileSync(mediaApiPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("gallery loads similar media for selected item and passes it to the viewer", () => {
  assert.match(mediaApiSource, /listSimilarMedia: async \(mediaId, \{ signal, timeoutMs \} = \{\}\) =>/);
  assert.match(mediaApiSource, /requestJson\(`\/api\/media\/\$\{mediaId\}\/similar`/);
  assert.match(galleryContainerSource, /const \[similarMediaItems, setSimilarMediaItems\] = useState\(\[\]\);/);
  assert.match(galleryContainerSource, /const \[isSimilarMediaLoading, setIsSimilarMediaLoading\] = useState\(false\);/);
  assert.match(galleryContainerSource, /const \[similarMediaError, setSimilarMediaError\] = useState\(""\);/);
  assert.match(galleryContainerSource, /await mediaApi\.listSimilarMedia\(selectedMedia\.id\)/);
  assert.match(galleryContainerSource, /setSimilarMediaItems\(normalizedItems\);/);
  assert.match(galleryContainerSource, /similarMediaItems=\{similarMediaItems\}/);
  assert.match(galleryContainerSource, /isSimilarMediaLoading=\{isSimilarMediaLoading\}/);
  assert.match(galleryContainerSource, /similarMediaError=\{similarMediaError\}/);
});

test("media viewer renders similar image thumbnails below actions", () => {
  assert.match(modalSource, /similarMediaItems,/);
  assert.match(modalSource, /isSimilarMediaLoading,/);
  assert.match(modalSource, /similarMediaError,/);
  assert.match(modalSource, /const visibleSimilarMediaItems = Array\.isArray\(similarMediaItems\) \? similarMediaItems : \[\];/);
  assert.match(modalSource, /<section className="media-similar-section" aria-label="Similar images">[\s\S]*<h3 className="media-similar-title">Similar images<\/h3>/);
  assert.match(modalSource, /Loading similar images\.\.\./);
  assert.match(modalSource, /No similar images found\./);
  assert.match(modalSource, /className="media-similar-strip"/);
  assert.match(modalSource, /className="media-similar-card"/);
  assert.match(modalSource, /className="media-similar-card-thumb"/);
  assert.match(modalSource, /onOpenRelatedMediaById\?\.\(mediaId, "similar"\)/);
  assert.doesNotMatch(modalSource, /Hamming distance:/);
});

test("similar image section has dedicated styles", () => {
  assert.match(appCss, /\.media-similar-section/);
  assert.match(appCss, /\.media-similar-strip/);
  assert.match(appCss, /\.media-similar-card/);
  assert.match(appCss, /\.media-similar-card-thumb-wrap/);
  assert.doesNotMatch(appCss, /\.media-similar-card-distance/);
});
