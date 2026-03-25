# Frontend Navigation And Search

## Primary Navigation

The application is centered around `src/app/AppShell.jsx`.

Main page states:

- `gallery`
- `favorites`
- `collections`
- `tags`

Upload is not a separate page. It is exposed through `UploadManagerContainer` in the top header.

## Header Responsibilities

The top header combines several cross-domain controls:

- brand navigation back to gallery
- search input and submit action
- media filter popover
- upload entrypoint
- slide menu for favorites, tags, and collections

Because this logic lives in `AppShell`, changes to navigation or global search UX usually belong there first.

## Search Model

Gallery search uses a `tag:value` syntax.

Examples:

- `title:cat`
- `id:42`
- `filetype:image`

Base search fields include:

- `title`
- `path`
- `description`
- `id`
- `source`
- `filetype`

Dynamic search fields are built from tag types and tag catalog data loaded from the backend.

## Search UX

Search input behavior includes:

- highlighted token overlay
- caret-aware suggestion building
- search history
- suggestions sourced from base search tags and backend tag metadata

Collections page is a special case:

- placeholder and help text change
- search suggestions are disabled
- search behaves as collection-name filtering instead of media-tag search

## Search Metadata Loading

`AppShell` loads:

- tag types through `tagsApi.listTagTypes()`
- tags through `tagsApi.listTags()`

This metadata is used to:

- build search tag options
- color-highlight tag tokens
- build autocomplete suggestions

## Media Filters

Global media filters are exposed from the header through `MediaFilterPopover`.

Documented current shell-level filter:

- `group related media`

When enabled, gallery can present parent/child linked media as grouped tiles with grouped pagination behavior.

## Gallery Behavior

Gallery is the main destination for submitted search text.

Important gallery-facing UX patterns:

- submitting search moves the shell back to `gallery`
- opening a media item from an external event also routes back to `gallery`
- grouped media changes tile composition without turning into a separate backend route
- viewer and editor flows are layered on top of gallery/favorites/collections rather than implemented as separate pages

## Quick Tagging

Quick tagging is part of shared media workflows and is surfaced from media action controls.

Behavior summary:

- opens a dedicated modal for quick tagging settings
- lets the user define tags to add
- lets the user define tags to exclude from the visible grid while tagging
- uses autocomplete-style tag entry similar to the search field
- tagging mode stays configurable through the same modal instead of replacing the toolbar button

This behavior is shared through media components and reused by gallery-like pages.

## Favorites And Collections

Favorites reuses a gallery-like browsing pattern against a different backend source.

Collections differs in two major ways:

- page search is collection-name driven
- collection detail pages combine collection metadata flows with gallery-like media browsing

## Related Files

- `GalleryApp/frontend/src/app/AppShell.jsx`
- `GalleryApp/frontend/src/features/search/components/SearchInput.jsx`
- `GalleryApp/frontend/src/features/search/searchTags.js`
- `GalleryApp/frontend/src/features/shared/utils/searchUtils.js`
- `GalleryApp/frontend/src/features/shared/utils/tagUtils.js`
- `GalleryApp/frontend/src/features/gallery/**`
- `GalleryApp/frontend/src/features/media/components/QuickTaggingModal.jsx`
