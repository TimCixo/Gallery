import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const collectionPickerPath = path.resolve(__dirname, "../features/collections/components/CollectionPickerDialogContent.jsx");
const uploadPickerPath = path.resolve(__dirname, "../features/upload/components/UploadCollectionPicker.jsx");
const galleryContainerPath = path.resolve(__dirname, "../features/gallery/GalleryContainer.jsx");
const favoritesContainerPath = path.resolve(__dirname, "../features/favorites/FavoritesContainer.jsx");
const collectionsContainerPath = path.resolve(__dirname, "../features/collections/CollectionsContainer.jsx");
const appCssPath = path.resolve(__dirname, "../App.css");

const collectionPickerSource = readFileSync(collectionPickerPath, "utf8");
const uploadPickerSource = readFileSync(uploadPickerPath, "utf8");
const galleryContainerSource = readFileSync(galleryContainerPath, "utf8");
const favoritesContainerSource = readFileSync(favoritesContainerPath, "utf8");
const collectionsContainerSource = readFileSync(collectionsContainerPath, "utf8");
const appCss = readFileSync(appCssPath, "utf8");

test("collection picker dialog content is reused across media and upload flows", () => {
  assert.match(collectionPickerSource, /PickerDialog/);
  assert.match(collectionPickerSource, /PickerGridButton/);
  assert.match(uploadPickerSource, /CollectionPickerDialogContent/);
  assert.match(galleryContainerSource, /CollectionPickerDialogContent/);
  assert.match(favoritesContainerSource, /CollectionPickerDialogContent/);
  assert.match(collectionsContainerSource, /CollectionPickerDialogContent/);
});

test("collection picker styles use shared picker grid card layout", () => {
  assert.match(appCss, /\.picker-grid\s*\{/);
  assert.match(appCss, /grid-template-columns: repeat\(auto-fill, minmax\(180px, 1fr\)\)/);
  assert.match(appCss, /\.collection-picker-dialog\s*\{/);
  assert.match(appCss, /width: min\(920px, 100%\)/);
});
