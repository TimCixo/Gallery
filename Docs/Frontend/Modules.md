# Frontend Modules

## Entry Points

- `src/main.jsx`: mounts the React app
- `src/App.jsx`: minimal app entry and global style import
- `src/app/AppShell.jsx`: top-level shell for search, navigation, upload access, and active page rendering

## `src/app/`

Shell-level orchestration that spans multiple domains.

- `AppShell.jsx` controls active page state, search input state, search suggestion metadata, persisted shell state, slide menu, and gallery-level filter access.
- `components/MediaFilterPopover.jsx` exposes shell-level media filters such as grouped media display.
- `hooks/useMediaCrossDomainOrchestration.js` and `hooks/useUploadCollectionsOrchestration.js` coordinate workflows that touch multiple features.
- `modal/ModalManager.jsx` and `modal/modalKeys.js` define the shared modal system.
- `utils/` keeps persisted shell state, search history, and search navigation helpers.

## `src/features/gallery/`

Primary media browsing flow.

- `GalleryContainer.jsx` owns gallery-level state orchestration, API access, pagination behavior, and integration with media editing and quick-tagging flows.
- `GalleryPage.jsx` renders gallery state into the visible page.
- `GalleryMediaTile.jsx` renders individual media tiles.
- `utils/groupRelatedMediaItems.js` and `utils/groupRelatedMediaPagination.js` support grouped parent/child media display.
- `utils/fetchAllMediaItems.js` supports workflows that require fetching beyond the current page.

Behaviorally this module is responsible for:

- gallery search results
- pagination
- grouped media mode
- opening viewer/editor flows
- quick tagging integration

## `src/features/favorites/`

Favorites-specific browsing flow.

- `FavoritesContainer.jsx` mirrors the gallery container pattern for favorites data.
- `FavoritesPage.jsx` renders the favorites grid and empty states.
- `state/favoritesReducer.js` contains reducer logic for the page state.

This module behaves like a gallery variant backed by `/api/favorites`.

## `src/features/collections/`

Collection management and collection-scoped browsing.

- `CollectionsContainer.jsx` coordinates collection lists, collection media views, and collection mutation flows.
- `CollectionsPage.jsx` renders collection states and media grids.
- Collection picker and delete confirmation modals live under `components/`.
- `state/collectionsReducer.js` keeps collection-specific state transitions.

Main responsibilities:

- list collections
- create/edit/delete collections
- browse media inside a collection
- add/remove media membership

## `src/features/tags/`

Tag type and tag management.

- `TagsContainer.jsx` and `TagsPage.jsx` render and orchestrate the tag manager UI.
- `hooks/useTagTypesManager.js` and `hooks/useTagItemsManager.js` handle tag-type and tag-item workflows.
- `components/TagManagerPopup.jsx` is the main tag-management surface.
- `components/TagDeleteConfirmModal.jsx` handles destructive confirmation.

Main responsibilities:

- manage tag types and their colors
- manage tags within a tag type
- move tags between tag types

## `src/features/media/`

Shared media editor, viewer, and multi-item actions used by other feature modules.

- `MediaViewerModal.jsx` renders the viewer modal and related media UX.
- `MediaEditorModal.jsx` and `MediaEditorPanel.jsx` handle metadata editing.
- `BulkMediaEditorModal.jsx` and `BulkMediaActionBar.jsx` handle multi-select edits.
- `MediaQuickTaggingAction.jsx`, `QuickTaggingModal.jsx`, and `useQuickTagging.js` implement quick-tagging workflow.
- `TagNamesAutocompleteInput.jsx` and `utils/tagListAutocomplete.js` support tag input autocomplete behavior.
- `hooks/useMediaMultiSelect.js` manages selection mode state.
- `utils/relatedMediaChain.js` and relation helpers support parent/child operations.

This module is the shared media workflow layer for gallery, favorites, and collections.

## `src/features/search/`

Search UI and parser-specific frontend behavior.

- `components/SearchInput.jsx` renders the search field with overlay highlighting and suggestions.
- `searchParser.js`, `searchTags.js`, and `searchInputState.js` define client-side parsing, token handling, and tag metadata.

Responsibilities:

- highlight parsed search tokens
- provide autocomplete and history
- support `tag:value` input model used by gallery search

## `src/features/shared/`

Reusable UI and utilities shared across features.

- `components/AppIcon.jsx` renders named icons
- `components/PickerDialog.jsx` and `PickerGridButton.jsx` support shared picker UX
- `utils/iconPaths.js` centralizes icon references
- `utils/pagination.js`, `searchUtils.js`, `tagUtils.js`, `mediaFormatters.js`, and `mediaPredicates.js` provide reusable view logic

## `src/features/upload/`

Upload workflow and post-upload editing.

- `UploadManagerContainer.jsx` exposes upload access in the shell
- `components/UploadModal.jsx` hosts the upload flow
- `UploadQueueStep.jsx` handles pending files
- `UploadEditorStep.jsx` handles post-upload metadata editing
- `UploadCollectionPicker.jsx` ties upload to collections
- `hooks/useUploadQueue.js`, `useUploadSubmission.js`, `useUploadEditorData.js`, and `useUploadCollections.js` orchestrate staged upload behavior

## `src/api/`

Primary frontend-to-backend integration layer.

Expected modules include:

- `httpClient`
- `mediaApi`
- `collectionsApi`
- `tagsApi`
- `uploadApi`

This is the preferred boundary for HTTP access from the UI.

## `src/hooks/`, `src/services/`, `src/utils/`, `src/__tests__/`

- `hooks/`: cross-cutting stateful helpers outside leaf feature folders
- `services/`: legacy or supplemental service-like helpers still present in the codebase
- `utils/`: generic helpers that are not feature-owned
- `__tests__/`: unit tests for parsers, helpers, and UI-state logic

## Reading Suggestions

- For top-level UX: start with `src/app/AppShell.jsx`
- For media browsing: open `gallery/`, then `media/`
- For search behavior: open `search/` and shared search utilities
- For upload workflow: open `upload/` plus related media editor helpers
