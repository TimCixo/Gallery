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
const bulkActionBarSource = readFileSync(path.resolve(__dirname, "../features/media/components/BulkMediaActionBar.jsx"), "utf8");
const bulkModalSource = readFileSync(path.resolve(__dirname, "../features/media/components/BulkMediaEditorModal.jsx"), "utf8");
const appCss = readFileSync(path.resolve(__dirname, "../App.css"), "utf8");

test("media multi-select is wired into gallery favorites and collections flows", () => {
  assert.match(galleryContainerSource, /useMediaMultiSelect/);
  assert.match(galleryContainerSource, /BulkMediaActionBar/);
  assert.match(galleryContainerSource, /BulkMediaEditorModal/);
  assert.match(favoritesContainerSource, /useMediaMultiSelect/);
  assert.match(favoritesContainerSource, /BulkMediaActionBar/);
  assert.match(collectionsContainerSource, /useMediaMultiSelect/);
  assert.match(collectionsContainerSource, /BulkMediaActionBar/);
  assert.match(collectionsContainerSource, /GalleryMediaTile/);
});

test("top pagination and bulk actions share the same toolbar row", () => {
  assert.match(galleryContainerSource, /bulkActionBar=\{\(/);
  assert.match(favoritesContainerSource, /bulkActionBar=\{\(/);
  assert.match(readFileSync(path.resolve(__dirname, "../features/gallery/GalleryPage.jsx"), "utf8"), /<div className="media-pagination-toolbar">[\s\S]*renderPagination\(\)[\s\S]*bulkActionBar[\s\S]*<\/div>/);
  assert.match(readFileSync(path.resolve(__dirname, "../features/favorites/FavoritesPage.jsx"), "utf8"), /<div className="media-pagination-toolbar">[\s\S]*renderFavoritesPagination\(\)[\s\S]*bulkActionBar[\s\S]*<\/div>/);
  assert.match(collectionsContainerSource, /<div className="media-pagination-toolbar">[\s\S]*renderCollectionFilesPagination\(\)[\s\S]*<BulkMediaActionBar/);
});

test("bulk media action bar exposes cancel delete and edit actions", () => {
  assert.match(bulkActionBarSource, /media-pagination-wrap/);
  assert.match(bulkActionBarSource, /aria-label="Cancel selection"/);
  assert.match(bulkActionBarSource, /aria-label="Delete selected media"/);
  assert.match(bulkActionBarSource, /aria-label="Edit selected media"/);
  assert.match(bulkActionBarSource, /<AppIcon name="edit" alt="" aria-hidden="true" \/>/);
  assert.match(bulkModalSource, /media-modal-header-bulk/);
  assert.match(bulkModalSource, /media-modal-bulk-header-start/);
  assert.match(bulkModalSource, /media-upload-group-toggle/);
  assert.match(bulkModalSource, /primaryIconName="confirm"/);
  assert.match(bulkModalSource, /previewTitle=\{`Editing: \$\{modalTitle\}`\}/);
  assert.match(bulkModalSource, /Add selected media to collections/);
});

test("bulk media editor resolves and updates parent child media relations", () => {
  assert.match(bulkModalSource, /const \[relationPreviewByMode, setRelationPreviewByMode\] = useState\(DEFAULT_RELATION_PREVIEW\)/);
  assert.match(bulkModalSource, /const mediaCacheRef = useRef\(new Map\(\)\)/);
  assert.match(bulkModalSource, /const findMediaById = async \(mediaId\) =>/);
  assert.match(bulkModalSource, /const cachedCandidate = mediaCacheRef\.current\.get\(normalizedId\) \|\| null/);
  assert.match(bulkModalSource, /const localCandidate = selectedItems\.find\(\(item\) => Number\(item\?\.id\) === normalizedId\) \|\| null/);
  assert.match(bulkModalSource, /mediaApi\.listMedia\(\{ page: 1, pageSize: 40, search: `id:\$\{normalizedId\}` \}\)/);
  assert.match(bulkModalSource, /const preloadRelationMedia = async \(\) =>/);
  assert.match(bulkModalSource, /await Promise\.all\(relationIds\.map\(async \(relationId\) =>/);
  assert.match(bulkModalSource, /void resolveMode\("parent"\)/);
  assert.match(bulkModalSource, /void resolveMode\("child"\)/);
  assert.match(bulkModalSource, /const cachedCandidate = mediaCacheRef\.current\.get\(parsed\) \|\| null/);
  assert.match(bulkModalSource, /const openMediaRelationPicker = \(mode\) =>/);
  assert.match(bulkModalSource, /setIsMediaRelationPickerOpen\(true\)/);
  assert.match(bulkModalSource, /const handleSelectMediaRelationFromPicker = \(item\) =>/);
  assert.match(bulkModalSource, /updateDraft\(\{ \[key\]: String\(selectedId\) \}\)/);
  assert.match(bulkModalSource, /relationPreviewByMode=\{relationPreviewByMode\}/);
  assert.match(bulkModalSource, /onOpenRelationPicker=\{openMediaRelationPicker\}/);
  assert.match(bulkModalSource, /onSelectMediaRelationFromPicker=\{handleSelectMediaRelationFromPicker\}/);
});

test("multi-select styles highlight selected media and bulk actions", () => {
  assert.match(appCss, /\.media-tile\.is-selected/);
  assert.match(appCss, /\.media-selection-indicator/);
  assert.match(appCss, /\.media-bulk-actionbar/);
  assert.match(appCss, /\.media-bulk-actionbar \.media-action-primary/);
  assert.match(appCss, /background-color:\s*#0f172a/);
  assert.match(appCss, /\.media-pagination-toolbar/);
  assert.match(appCss, /min-height:\s*3\.9rem/);
  assert.match(appCss, /\.media-modal-header-bulk/);
  assert.match(appCss, /\.media-bulk-preview-wrap/);
});
