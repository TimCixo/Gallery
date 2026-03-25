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
const quickTaggingActionSource = readFileSync(path.resolve(__dirname, "../features/media/components/MediaQuickTaggingAction.jsx"), "utf8");
const quickTaggingModalSource = readFileSync(path.resolve(__dirname, "../features/media/components/QuickTaggingModal.jsx"), "utf8");
const tagNamesAutocompleteInputSource = readFileSync(path.resolve(__dirname, "../features/media/components/TagNamesAutocompleteInput.jsx"), "utf8");
const bulkModalSource = readFileSync(path.resolve(__dirname, "../features/media/components/BulkMediaEditorModal.jsx"), "utf8");
const linkOrderConfirmModalSource = readFileSync(path.resolve(__dirname, "../features/media/components/LinkOrderOverwriteConfirmModal.jsx"), "utf8");
const appCss = readFileSync(path.resolve(__dirname, "../App.css"), "utf8");

test("media multi-select is wired into gallery favorites and collections flows", () => {
  assert.match(galleryContainerSource, /useMediaMultiSelect/);
  assert.match(galleryContainerSource, /BulkMediaActionBar/);
  assert.match(galleryContainerSource, /useQuickTagging/);
  assert.match(galleryContainerSource, /MediaQuickTaggingAction/);
  assert.match(galleryContainerSource, /QuickTaggingModal/);
  assert.match(galleryContainerSource, /BulkMediaEditorModal/);
  assert.match(favoritesContainerSource, /useMediaMultiSelect/);
  assert.match(favoritesContainerSource, /BulkMediaActionBar/);
  assert.match(favoritesContainerSource, /useQuickTagging/);
  assert.match(favoritesContainerSource, /MediaQuickTaggingAction/);
  assert.match(favoritesContainerSource, /QuickTaggingModal/);
  assert.match(collectionsContainerSource, /useMediaMultiSelect/);
  assert.match(collectionsContainerSource, /BulkMediaActionBar/);
  assert.match(collectionsContainerSource, /useQuickTagging/);
  assert.match(collectionsContainerSource, /MediaQuickTaggingAction/);
  assert.match(collectionsContainerSource, /QuickTaggingModal/);
  assert.match(collectionsContainerSource, /GalleryMediaTile/);
  assert.match(collectionsContainerSource, /selectionIndex=\{mediaSelection\.getSelectionIndex\(file\)\}/);
});

test("top pagination and bulk actions share the same toolbar row", () => {
  assert.match(galleryContainerSource, /bulkActionBar=\{\(/);
  assert.match(favoritesContainerSource, /bulkActionBar=\{\(/);
  assert.doesNotMatch(galleryContainerSource, /if \(totalPages <= 1\) \{\s*return null;\s*\}/);
  assert.doesNotMatch(favoritesContainerSource, /if \(favoritesTotalPages <= 1\) \{\s*return null;\s*\}/);
  assert.doesNotMatch(collectionsContainerSource, /if \(collectionFilesTotalPages <= 1\) \{\s*return null;\s*\}/);
  assert.match(readFileSync(path.resolve(__dirname, "../features/gallery/GalleryPage.jsx"), "utf8"), /<div className="media-pagination-toolbar">[\s\S]*renderPagination\(\)[\s\S]*bulkActionBar[\s\S]*<\/div>/);
  assert.match(readFileSync(path.resolve(__dirname, "../features/favorites/FavoritesPage.jsx"), "utf8"), /<div className="media-pagination-toolbar">[\s\S]*renderFavoritesPagination\(\)[\s\S]*bulkActionBar[\s\S]*<\/div>/);
  assert.match(collectionsContainerSource, /<div className="media-pagination-toolbar">[\s\S]*renderCollectionFilesPagination\(\)[\s\S]*<MediaQuickTaggingAction[\s\S]*<BulkMediaActionBar/);
  assert.match(readFileSync(path.resolve(__dirname, "../features/gallery/GalleryPage.jsx"), "utf8"), /totalFiles > 0 \? \(\s*<div className="media-pagination-toolbar">/);
  assert.match(readFileSync(path.resolve(__dirname, "../features/favorites/FavoritesPage.jsx"), "utf8"), /favoritesTotalFiles > 0 \? \(\s*<div className="media-pagination-toolbar">/);
  assert.match(collectionsContainerSource, /collectionFilesTotalCount > 0 \? \(\s*<div className="media-pagination-toolbar">/);
});

test("bulk media action bar exposes cancel delete and edit actions", () => {
  assert.match(bulkActionBarSource, /media-pagination-wrap/);
  assert.match(bulkActionBarSource, /aria-label="Cancel selection"/);
  assert.match(bulkActionBarSource, /aria-label="Delete selected media"/);
  assert.match(bulkActionBarSource, /aria-label="Edit selected media"/);
  assert.match(bulkActionBarSource, /<AppIcon name="edit" alt="" aria-hidden="true" \/>/);
  assert.match(quickTaggingActionSource, /if \(isSelectionMode\) \{\s*return null;\s*\}/);
  assert.match(quickTaggingActionSource, /aria-label="Open quick tagging"/);
  assert.match(quickTaggingModalSource, /Tags to add/);
  assert.match(quickTaggingModalSource, /Tags to exclude from grid/);
  assert.match(quickTaggingModalSource, /Enable quick tagging/);
  assert.match(quickTaggingModalSource, /Update quick tagging/);
  assert.doesNotMatch(quickTaggingModalSource, /Configure tags to add and tags that should be hidden from the grid while tagging is active\./);
  assert.match(quickTaggingModalSource, /<TagNamesAutocompleteInput/);
  assert.match(quickTaggingModalSource, /placeholder="author:artist3 character:some_character"/);
  assert.match(quickTaggingModalSource, /placeholder="status:done status:archived"/);
  assert.match(tagNamesAutocompleteInputSource, /aria-autocomplete="list"/);
  assert.match(tagNamesAutocompleteInputSource, /className="media-tag-dropdown"/);
  assert.match(tagNamesAutocompleteInputSource, /parseSearchSegments/);
  assert.match(tagNamesAutocompleteInputSource, /buildSearchTagTypeOptions/);
  assert.match(tagNamesAutocompleteInputSource, /className=\{segment\.isTag \? "media-quick-tagging-input-segment is-tag" : "media-quick-tagging-input-segment"\}/);
  assert.match(tagNamesAutocompleteInputSource, /suggestion\.label/);
  assert.match(tagNamesAutocompleteInputSource, /outlineColor: suggestion\.color/);
  assert.match(quickTaggingModalSource, /<div className="media-modal-footer">[\s\S]*<MediaEditActions/);
  assert.match(quickTaggingModalSource, /onSecondary=\{onDisable\}/);
  assert.match(bulkModalSource, /media-modal-header-bulk/);
  assert.match(bulkModalSource, /media-modal-bulk-header-start/);
  assert.match(bulkModalSource, /media-upload-group-toggle/);
  assert.match(bulkModalSource, /media-bulk-group-options/);
  assert.match(bulkModalSource, /primaryIconName="confirm"/);
  assert.match(bulkModalSource, /previewTitle=\{previewTitle\}/);
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

test("bulk media editor group mode locks navigation and shows selection count preview", () => {
  assert.match(bulkModalSource, /if \(isGroupEditEnabled\) \{\s*return <div className="media-bulk-preview">\{editorItems\.length\}<\/div>/);
  assert.match(bulkModalSource, /const visibleDraft = isGroupEditEnabled \? groupDraft : activeDraft/);
  assert.match(bulkModalSource, /const selectedTagIds = isGroupEditEnabled\s*\? getGroupSelectedTagIds\(editorItems, groupTagEdits\)/);
  assert.match(bulkModalSource, /const previewTitle = isGroupEditEnabled \? `\$\{editorItems\.length\} selected media` : `Editing: \$\{modalTitle\}`/);
  assert.match(bulkModalSource, /if \(event\.key !== "ArrowLeft" && event\.key !== "ArrowRight"\) \{/);
  assert.match(bulkModalSource, /if \(isGroupEditEnabled \|\| isSaving\) \{/);
  assert.match(bulkModalSource, /if \(event\.key === "ArrowLeft" && !canNavigatePrev\) \{/);
  assert.match(bulkModalSource, /if \(event\.key === "ArrowRight" && !canNavigateNext\) \{/);
  assert.match(bulkModalSource, /window\.addEventListener\("keydown", handleKeyDown\)/);
  assert.match(bulkModalSource, /disabled=\{isGroupEditEnabled \|\| !canNavigatePrev \|\| isSaving\}/);
  assert.match(bulkModalSource, /disabled=\{isGroupEditEnabled \|\| !canNavigateNext \|\| isSaving\}/);
  assert.match(bulkModalSource, /const nextEditorItems = createBulkEditorItems\(selectedItems\);/);
  assert.match(bulkModalSource, /setGroupDraft\(createEmptyMediaDraft\(\)\);/);
  assert.match(bulkModalSource, /setIsGroupSelectionChainEnabled\(hasLinkedSelectionInOrder\(nextEditorItems\)\);/);
  assert.match(bulkModalSource, /onChange=\{\(event\) => setIsGroupEditEnabled\(event\.target\.checked\)\}/);
  assert.match(bulkModalSource, /showRelations=\{!isGroupEditEnabled\}/);
  assert.match(bulkModalSource, /selectedTagIds=\{selectedTagIds\}/);
  assert.match(bulkModalSource, /link order/);
});

test("bulk media editor confirms before overwriting existing link order relations", () => {
  assert.match(bulkModalSource, /const \[isLinkOrderOverwriteConfirmOpen, setIsLinkOrderOverwriteConfirmOpen\] = useState\(false\)/);
  assert.match(bulkModalSource, /const shouldConfirmLinkOrderOverwrite = isGroupEditEnabled\s*&& isGroupSelectionChainEnabled\s*&& hasLinkOrderOverwrite\(editorItems\)/);
  assert.match(bulkModalSource, /if \(shouldConfirmLinkOrderOverwrite\) \{\s*setIsLinkOrderOverwriteConfirmOpen\(true\);/);
  assert.match(bulkModalSource, /<LinkOrderOverwriteConfirmModal/);
  assert.match(linkOrderConfirmModalSource, /Current parent and child links will be overwritten by the new link order\. Continue\?/);
  assert.match(linkOrderConfirmModalSource, /Confirm link order overwrite/);
});

test("bulk media editor disconnects only relations inside the selected chain when link order is disabled", () => {
  assert.match(bulkModalSource, /const isInitiallyLinkedSelection = useMemo\(\(\) => hasLinkedSelectionInOrder\(editorItems\), \[editorItems\]\)/);
  assert.match(bulkModalSource, /return isInitiallyLinkedSelection \? disconnectSelectedLinkOrder\(draftAppliedItems\) : draftAppliedItems;/);
});

test("bulk media editor group tags add missing tags to all targeted media", () => {
  assert.match(bulkModalSource, /const effectiveHasTagEverywhere = targetedItems\.every\(\(item\) => \{/);
  assert.match(bulkModalSource, /const nextAction = effectiveHasTagEverywhere \? "remove" : "add"/);
  assert.match(bulkModalSource, /setGroupTagEdits\(\(current\) => \(\{ \.\.\.current, \[tagId\]: nextAction \}\)\)/);
});

test("bulk save updates only changed fields across media domains", () => {
  assert.match(galleryContainerSource, /saveBulkSelectedMedia/);
  assert.match(favoritesContainerSource, /saveBulkSelectedMedia/);
  assert.match(collectionsContainerSource, /saveBulkSelectedMedia/);
  assert.match(galleryContainerSource, /await saveBulkSelectedMedia\(\{/);
  assert.match(favoritesContainerSource, /await saveBulkSelectedMedia\(\{/);
  assert.match(collectionsContainerSource, /await saveBulkSelectedMedia\(\{/);
  assert.match(galleryContainerSource, /relationStrategy,/);
  assert.match(favoritesContainerSource, /relationStrategy,/);
  assert.match(collectionsContainerSource, /relationStrategy,/);
  assert.match(galleryContainerSource, /mediaApi,/);
  assert.match(favoritesContainerSource, /mediaApi,/);
  assert.match(collectionsContainerSource, /mediaApi,/);
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
  assert.match(appCss, /\.media-bulk-group-options/);
  assert.match(appCss, /\.media-bulk-group-options\s*\{[\s\S]*justify-content:\s*flex-start/);
  assert.match(appCss, /\.media-bulk-group-options \.media-upload-group-toggle\s*\{[\s\S]*margin-right:\s*0/);
  assert.match(appCss, /\.media-bulk-preview-wrap/);
  assert.match(appCss, /\.media-quick-tagging-modal/);
  assert.match(appCss, /\.media-quick-tagging-body/);
  assert.match(appCss, /\.media-quick-tagging-modal\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(appCss, /\.media-quick-tagging-body\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(appCss, /\.media-quick-tagging-field/);
  assert.match(appCss, /\.media-quick-tagging-field \.collections-input/);
  assert.match(appCss, /\.media-quick-tagging-input-highlight/);
  assert.match(appCss, /\.media-quick-tagging-input-highlight\s*\{[\s\S]*box-sizing:\s*border-box/);
  assert.match(appCss, /\.media-quick-tagging-input-segment\.is-tag/);
  assert.match(appCss, /\.media-quick-tagging-input\s*\{[\s\S]*box-sizing:\s*border-box/);
  assert.match(appCss, /\.media-quick-tagging-input-wrap:focus-within \.media-quick-tagging-input-highlight/);
  assert.match(appCss, /\.media-tag-dropdown-item:hover\s*\{[\s\S]*outline:\s*1px solid #bfdbfe/);
  assert.match(appCss, /\.media-tag-dropdown-item\.is-active\s*\{[\s\S]*outline:\s*1px solid #bfdbfe/);
});
