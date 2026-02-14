# Frontend Refactor Plan: Split App Shell

## Goal
Incrementally decompose `GalleryApp/frontend/src/App.jsx` into isolated feature modules with safe, reviewable pull requests.

## Current baseline
- `App.jsx` is monolithic (~5869 lines).
- API calls, selectors, upload logic, tags, collections, and modal UI logic are mixed in one file.

---

## PR1 — Extract `api/` without UI changes

### Scope (what is moved)
- Create `src/api/` folder.
- Move all HTTP request logic from `App.jsx` into dedicated API modules (e.g. media, tags, collections, health).
- Keep response shaping and error handling behavior unchanged.
- Replace direct `fetch` usage in `App.jsx` with API functions.

### Risks
- Silent behavior drift in request query params or payloads.
- Error messages/HTTP status handling could change accidentally.
- Pagination defaults may break if mapping is altered.

### Manual UI checks
- Gallery page loads media list and pagination still works.
- Favorites tab loads and updates counts correctly.
- Tags page CRUD works (create, edit, delete, reorder/move where available).
- Collections page CRUD works and collection detail opens.
- Upload flow still submits files and shows statuses.

---

## PR2 — Extract `utils/selectors`

### Scope (what is moved)
- Create `src/utils/selectors/` folder.
- Move derived-data helpers (filters, computed counts, mapped display lists, sorting/grouping helpers) out of `App.jsx`.
- Keep function signatures deterministic and side-effect free.
- Replace inline logic with selector imports.

### Risks
- Memoization regressions leading to extra renders.
- Subtle differences in sorting/filtering order.
- Null/undefined edge cases in derived structures.

### Manual UI checks
- Search/filter results match previous behavior.
- Tag/collection dropdowns show same options and order.
- Pagination totals and counters remain correct.
- No visible lag regression while typing search.

---

## PR3 — Upload hook + component

### Scope (what is moved)
- Create feature folder `src/features/upload/`.
- Extract upload state machine/business logic to `useUpload` hook.
- Extract upload modal/UI into `UploadPanel` (or equivalent) component.
- Keep integration points in `App.jsx` minimal via props/callbacks.

### Risks
- Async queue state desynchronization.
- Drag-and-drop edge cases may break.
- Background upload progress indicators may become stale.

### Manual UI checks
- Open/close upload modal from all entry points.
- Add files via picker and drag-and-drop.
- Run single and group uploads; verify progress and final statuses.
- Verify upload-to-collection assignment still works.

---

## PR4 — `tags` module

### Scope (what is moved)
- Create feature folder `src/features/tags/`.
- Move tag type + tag CRUD UI and local state logic into tags module components/hooks.
- Isolate tags-specific modals/callouts into tags feature.
- Keep existing behavior and visual output unchanged.

### Risks
- Drag-and-drop/move interactions can regress.
- Editing state can be lost on re-render if keys/state shape differ.
- Tag type color/name validation mismatches.

### Manual UI checks
- Create/edit/delete tag types.
- Create/edit/delete tags in each tag type.
- Move tags between tag types and confirm persisted result.
- Confirm search/filter in tags view still works.

---

## PR5 — `collections` module

### Scope (what is moved)
- Create feature folder `src/features/collections/`.
- Move collections list/detail/pagination logic and UI out of `App.jsx`.
- Isolate collection modal(s), preview logic, and picker state.
- Keep current API contracts and page-level interactions.

### Risks
- Pagination/page jump state mismatches.
- Modal open/close race conditions with async loading.
- Collection-media assignment/removal regressions.

### Manual UI checks
- Create/edit/delete collection.
- Open collection detail and paginate through media.
- Add/remove media from collection via picker.
- Validate collection cover preview behavior.

---

## PR6 — Final thin `App` shell

### Scope (what is moved)
- Convert `App.jsx` into orchestration shell only.
- Keep only top-level routing/page switching, global layout, and shared providers/state wiring.
- Move remaining feature-specific logic/modals into feature folders.
- Normalize imports and file boundaries.

### Risks
- Broken prop contracts between shell and features.
- Cross-feature event wiring regressions.
- Duplicate state sources during final merge.

### Manual UI checks
- End-to-end smoke test across all tabs/pages.
- Open/close every modal and ensure focus/escape behavior.
- Cross-feature flows: upload → tags → collections linkage.
- Verify no console errors during common user flows.

---

## Definition of Done (Ready Criteria)
- `GalleryApp/frontend/src/App.jsx` is **<= 1200 lines**.
- Each feature has its own folder (at minimum: upload, tags, collections).
- API layer is isolated under `src/api/` with no direct feature-level raw `fetch` in `App.jsx`.
- Modals are isolated into feature modules/components instead of inline monolith blocks.
- No UI behavior regressions in manual smoke checks above.
