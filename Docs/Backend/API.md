# Backend API

## Base Notes

- Base local URL: `http://localhost:5000`
- Static media files are served from `/media/*`
- API routes live under `/api/*`
- Backend is wired in `Program.cs`

## Route Groups

- health
- media
- favorites
- collections
- tag types
- tags
- upload

## Health

### `GET /api/health`

Basic health endpoint used to check backend availability.

## Media

### `GET /api/media?page=1&pageSize=36&search=...`

Returns paged media list.

Behavior:

- parses `search` using media search parser
- supports tag-based search syntax
- warms preview cache for the returned page

### `GET /api/media/{id}/similar`

Returns media items considered similar to the requested media id.

Behavior:

- validates positive id
- uses `MediaSimilarityService`
- warms previews for returned results

### `GET /api/favorites?page=1&pageSize=36`

Returns paged favorite media list.

Behavior:

- backed by the same media query layer
- hardcodes `favoritesOnly: true`

### `GET /api/media/preview?path=...`

Returns cached preview representation for a media file.

Behavior:

- resolves path safely under media root
- uses preview cache service
- supports ETag-based caching
- may return `304 Not Modified`
- returns a conversion error as `400`

### `GET /api/media/view?path=...`

Returns browser-safe view content for a media file.

Behavior:

- resolves path safely under media root
- for non-image or GIF returns file directly
- for large or browser-unsafe images can transcode to JPEG on the fly
- supports ETag-based caching

### `PUT /api/media/{id}`

Updates media metadata and relations.

Request semantics:

- title, description, source
- parent and child media ids
- full replacement of media tags through `TagIds`

Behavior:

- validates id and linked media ids
- validates source URL when provided
- validates tag ids when provided
- keeps parent/child reverse links in sync
- replaces media tags when `TagIds` is provided

### `PUT /api/media/{id}/favorite`

Toggles favorite state via the special `Favorites` collection.

Behavior:

- ensures media exists
- creates or reuses the favorites collection
- inserts or deletes membership in `CollectionsMedia`

### `DELETE /api/media/{id}`

Deletes a media item and removes its references.

Behavior:

- validates id
- resolves and deletes underlying file when it exists
- clears parent/child references from linked records
- removes collection membership
- deletes the media database row

## Upload

### `POST /api/upload`

Multipart upload endpoint for media files.

Behavior:

- allows large multipart payloads
- rejects non-form uploads
- rejects unsupported file types
- creates a dated folder `App_Data/Media/<yyyy-MM-dd>/`
- creates pending media records before conversion
- converts:
  - images to WebP
  - videos to MP4
  - GIFs are stored separately
- updates media path after conversion
- computes image hash for supported image outputs
- warms preview cache after save

## Collections

### `GET /api/collections?search=...&mediaId=...`

Returns collection list excluding the special `Favorites` collection.

Behavior:

- optional case-insensitive name search
- optional `mediaId` check to mark `containsMedia`
- returns cover payload built from cover media when available

### `POST /api/collections`

Creates a collection.

Behavior:

- requires label
- optionally validates cover media id
- rejects duplicate collection names case-insensitively

### `PUT /api/collections/{id}`

Updates collection metadata.

Behavior:

- validates id
- forbids modifying the special `Favorites` collection
- rejects duplicate names

### `GET /api/collections/{id}/media?page=1&pageSize=36`

Returns paged media inside a collection.

### `POST /api/collections/{id}/media`

Toggles media membership in a collection.

Behavior:

- validates collection and media existence
- inserts membership if absent
- removes membership if already present

### `DELETE /api/collections/{id}`

Deletes a collection other than `Favorites`.

## Tag Types

### `GET /api/tag-types`

Returns tag types ordered by descending id.

### `POST /api/tag-types`

Creates a tag type.

Behavior:

- requires name
- requires valid `#RRGGBB` color

### `PUT /api/tag-types/{id}`

Updates tag type name and color.

### `DELETE /api/tag-types/{id}`

Deletes a tag type and cascades through:

- `MediaTags` for tags under that type
- `Tags`
- `TagTypes`

## Tags

### `GET /api/tag-types/{id}/tags`

Returns tags inside a single tag type.

### `GET /api/tags`

Returns the flattened tag catalog with tag type metadata:

- `tagTypeId`
- `tagTypeName`
- `tagTypeColor`

### `POST /api/tag-types/{id}/tags`

Creates a tag inside a tag type.

Behavior:

- validates tag type existence
- rejects duplicate tag names inside the same tag type

### `PUT /api/tags/{id}`

Updates tag name and description.

Behavior:

- rejects duplicate names inside the current tag type

### `PATCH /api/tags/{id}/tag-type`

Moves a tag to another tag type.

Behavior:

- validates target tag type
- rejects duplicates in target tag type
- no-op success when target equals current type

### `DELETE /api/tags/{id}`

Deletes a single tag.

## Search Semantics

Media search supports `tag:value` syntax.

Documented base fields:

- `path`
- `title`
- `description`
- `id`
- `source`
- `filetype`

Documented `filetype` values:

- `image`
- `video`
- `gif`

Dynamic tag types also participate in search.
