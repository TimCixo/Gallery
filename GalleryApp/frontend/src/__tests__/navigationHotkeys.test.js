import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const galleryContainerSource = readFileSync(path.resolve(__dirname, "../features/gallery/GalleryContainer.jsx"), "utf8");
const favoritesContainerSource = readFileSync(path.resolve(__dirname, "../features/favorites/FavoritesContainer.jsx"), "utf8");
const collectionsContainerSource = readFileSync(path.resolve(__dirname, "../features/collections/CollectionsContainer.jsx"), "utf8");
const uploadModalSource = readFileSync(path.resolve(__dirname, "../features/upload/components/UploadModal.jsx"), "utf8");

test("media viewer flows support keyboard navigation with arrow keys", () => {
  assert.match(galleryContainerSource, /if \(event\.key === "ArrowLeft"\) \{/);
  assert.match(galleryContainerSource, /handleNavigateSelectedMedia\(-1\)/);
  assert.match(galleryContainerSource, /if \(event\.key === "ArrowRight"\) \{/);
  assert.match(galleryContainerSource, /handleNavigateSelectedMedia\(1\)/);
  assert.match(favoritesContainerSource, /if \(event\.key === "ArrowLeft"\) \{/);
  assert.match(favoritesContainerSource, /handleNavigateSelectedMedia\(-1\)/);
  assert.match(favoritesContainerSource, /if \(event\.key === "ArrowRight"\) \{/);
  assert.match(favoritesContainerSource, /handleNavigateSelectedMedia\(1\)/);
  assert.match(collectionsContainerSource, /if \(event\.key === "ArrowLeft"\) \{/);
  assert.match(collectionsContainerSource, /handleNavigateSelectedMedia\(-1\)/);
  assert.match(collectionsContainerSource, /if \(event\.key === "ArrowRight"\) \{/);
  assert.match(collectionsContainerSource, /handleNavigateSelectedMedia\(1\)/);
});

test("gallery and favorites support page navigation hotkeys only when dialogs are closed", () => {
  assert.match(galleryContainerSource, /const hasBlockingDialogOpen = Boolean\(/);
  assert.match(galleryContainerSource, /selectedMedia/);
  assert.match(galleryContainerSource, /isBulkEditing/);
  assert.match(galleryContainerSource, /isCollectionPickerOpen/);
  assert.match(galleryContainerSource, /isMediaRelationPickerOpen/);
  assert.match(galleryContainerSource, /if \(hasBlockingDialogOpen \|\| totalPages <= 1\) \{/);
  assert.match(galleryContainerSource, /handlePageChange\(event\.key === "ArrowRight" \? currentPage \+ 1 : currentPage - 1\)/);
  assert.match(favoritesContainerSource, /const hasBlockingDialogOpen = Boolean\(/);
  assert.match(favoritesContainerSource, /selectedMedia/);
  assert.match(favoritesContainerSource, /isBulkEditing/);
  assert.match(favoritesContainerSource, /isCollectionPickerOpen/);
  assert.match(favoritesContainerSource, /isMediaRelationPickerOpen/);
  assert.match(favoritesContainerSource, /if \(hasBlockingDialogOpen \|\| favoritesTotalPages <= 1\) \{/);
  assert.match(favoritesContainerSource, /handleFavoritesPageChange\(event\.key === "ArrowRight" \? favoritesPage \+ 1 : favoritesPage - 1\)/);
});

test("upload modal supports keyboard navigation when multiple items are available", () => {
  assert.match(uploadModalSource, /const prevHandler = context\?\.onPrev \?\? initialData\?\.onPrev/);
  assert.match(uploadModalSource, /const nextHandler = context\?\.onNext \?\? initialData\?\.onNext/);
  assert.match(uploadModalSource, /if \(event\.key === "ArrowLeft"\) \{/);
  assert.match(uploadModalSource, /prevHandler\?\.\(\)/);
  assert.match(uploadModalSource, /if \(event\.key === "ArrowRight"\) \{/);
  assert.match(uploadModalSource, /nextHandler\?\.\(\)/);
  assert.match(uploadModalSource, /window\.addEventListener\("keydown", handleKeyDown\)/);
});
