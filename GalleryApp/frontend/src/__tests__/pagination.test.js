import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePageJumpDisplayValue, normalizePageJumpInput } from "../features/shared/utils/pagination.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const galleryContainerSource = readFileSync(path.resolve(__dirname, "../features/gallery/GalleryContainer.jsx"), "utf8");
const favoritesContainerSource = readFileSync(path.resolve(__dirname, "../features/favorites/FavoritesContainer.jsx"), "utf8");
const collectionsContainerSource = readFileSync(path.resolve(__dirname, "../features/collections/CollectionsContainer.jsx"), "utf8");
const relationPickerSource = readFileSync(path.resolve(__dirname, "../features/media/components/MediaRelationPickerDialogContent.jsx"), "utf8");

test("normalizePageJumpInput rejects invalid values", () => {
  assert.deepEqual(normalizePageJumpInput("abc", 3, 10), {
    isValid: false,
    targetPage: 3
  });
});

test("normalizePageJumpInput clamps lower and upper bounds", () => {
  assert.deepEqual(normalizePageJumpInput("-5", 3, 10), {
    isValid: true,
    targetPage: 1
  });
  assert.deepEqual(normalizePageJumpInput("99", 3, 10), {
    isValid: true,
    targetPage: 10
  });
});

test("normalizePageJumpInput keeps valid in-range value", () => {
  assert.deepEqual(normalizePageJumpInput("4", 1, 10), {
    isValid: true,
    targetPage: 4
  });
});

test("normalizePageJumpDisplayValue clamps out-of-range values for the input field", () => {
  assert.equal(normalizePageJumpDisplayValue("-5", 3, 10), "1");
  assert.equal(normalizePageJumpDisplayValue("99", 3, 10), "10");
});

test("pagination jump inputs clamp values on blur across pagination views", () => {
  assert.match(galleryContainerSource, /onBlur=\{\(event\) => setPageJumpInput\(normalizePageJumpDisplayValue\(event\.target\.value, currentPage, totalPages\)\)\}/);
  assert.match(favoritesContainerSource, /onBlur=\{\(event\) => setFavoritesPageJumpInput\(normalizePageJumpDisplayValue\(event\.target\.value, favoritesPage, favoritesTotalPages\)\)\}/);
  assert.match(collectionsContainerSource, /onBlur=\{\(event\) => setCollectionFilesPageJumpInput\(normalizePageJumpDisplayValue\(event\.target\.value, collectionFilesPage, collectionFilesTotalPages\)\)\}/);
  assert.match(relationPickerSource, /onBlur=\{\(event\) => setPageJumpInput\(normalizePageJumpDisplayValue\(event\.target\.value, page, totalPages\)\)\}/);
});

test("pagination jump forms disable native validation so Enter uses the shared submit handler", () => {
  assert.match(galleryContainerSource, /<form className="media-pagination-jump" onSubmit=\{handlePageJumpSubmit\} noValidate>/);
  assert.match(favoritesContainerSource, /<form className="media-pagination-jump" onSubmit=\{handleFavoritesPageJumpSubmit\} noValidate>/);
  assert.match(collectionsContainerSource, /<form className="media-pagination-jump" onSubmit=\{handleCollectionFilesPageJumpSubmit\} noValidate>/);
  assert.match(relationPickerSource, /<form className="media-pagination-jump" onSubmit=\{handlePageJumpSubmit\} noValidate>/);
});
