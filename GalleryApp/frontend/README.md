# Frontend dependency map

`src/App.jsx` now acts as an app-shell orchestrator and delegates domain state to reducer-based hooks.

## App shell (`src/App.jsx`)
- Keeps shared cross-domain state (`health`, search input/query state, media/favorites pagination, preview-failure set, refs).
- Orchestrates page switching (`gallery`, `favorites`, `collections`, `tags`) and modal lifecycles.
- Wires API calls from `src/api/*` to domain reducers via generated field setters.

## Domain reducers/hooks
- `src/hooks/useUploadManager.js`
  - Upload queue/editor state, background upload progress, upload collection picker state.
- `src/hooks/useTagsManager.js`
  - Tag type CRUD form state, per-tag-type table/search maps, DnD states.
- `src/hooks/useCollectionsManager.js`
  - Collections list/search, collection modal form, selected collection + files pagination.
- `src/hooks/useMediaEditor.js`
  - Media editor modal draft, favorite/update/delete flows, relation picker state, media tag catalog state.
- `src/hooks/useFieldReducer.js`
  - Shared factory for domain reducers with generated `setX` field setters.

## Feature modules
- `src/features/gallery/GalleryPage.jsx`
- `src/features/favorites/FavoritesPage.jsx`
- `src/features/collections/CollectionsPage.jsx`
- `src/features/tags/TagsPage.jsx`
- `src/features/upload/components/UploadModal.jsx`
- `src/features/media/components/MediaEditorModal.jsx`
- `src/features/media/components/MediaRelationPickerModal.jsx`

Feature modules are presentational containers; `App.jsx` supplies handlers and reducer-backed state.

## API modules
- `src/api/httpClient.js`
- `src/api/mediaApi.js`
- `src/api/uploadApi.js`
- `src/api/collectionsApi.js`
- `src/api/tagsApi.js`

No direct raw `fetch` calls should remain in feature components; all HTTP integration is routed through `src/api/*`.
