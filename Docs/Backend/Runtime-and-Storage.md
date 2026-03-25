# Backend Runtime And Storage

## Runtime Paths

All key runtime paths are created relative to `GalleryApp/backend`.

- SQLite database: `App_Data/gallery.db`
- media root: `App_Data/Media`
- preview cache: `App_Data/PreviewCache`

`Program.cs` creates these directories on startup if they do not exist.

## Static File Serving

Media files are exposed with:

- request path: `/media`
- file provider root: `App_Data/Media`

This is separate from the preview endpoint, which serves preview-specific files and transformations.

## CORS

The backend currently allows frontend origin:

- `http://localhost:5173`

This is configured through the named `Frontend` CORS policy.

## Upload Pipeline

Upload endpoint accepts multipart form-data and allows large bodies.

Per-file behavior:

1. Create pending media record.
2. Create dated target directory under `App_Data/Media/<yyyy-MM-dd>/`.
3. Convert or store the file depending on input type.
4. Update stored media path in SQLite.
5. Compute image hash when the stored result is an image.
6. Warm preview cache for the saved media.

## Media Conversion Rules

- image inputs are converted to `.webp`
- video inputs are converted to `.mp4`
- GIF inputs are stored separately and handled as GIF media

Unsupported file types return `400`.

## Preview Cache

Preview behavior is split between generation and consumption.

Generation:

- warm preview after upload
- warm preview for list pages returned by media queries
- warm preview for similar-media responses

Consumption:

- `GET /api/media/preview`
- ETag support
- immutable caching headers for preview responses

## Browser-Safe View Mode

`GET /api/media/view` serves media for direct viewing.

Behavior:

- returns original file directly for non-image formats and GIFs
- may transcode large or browser-unsafe images to JPEG on the fly
- uses shorter caching than preview endpoint

## Image Hashing And Similarity

Backend stores a perceptual hash (`dHash`) for supported images.

Behavior:

- new uploaded images are hashed immediately
- missing hashes for existing images are backfilled on startup
- similarity API depends on this prepared data

## Deletion Semantics

Deleting media performs both file-system and database cleanup.

It:

- resolves the stored path safely under media root
- deletes the underlying file when present
- clears parent/child links from related rows
- removes collection membership
- deletes the media record

## Environment Assumptions

- backend local URL is `http://localhost:5000`
- frontend local URL is `http://localhost:5173`
- `ffmpeg` must be available for video and GIF preview workflows

## Operational Notes

- In local network mode you need firewall access for ports `5000` and `5173`.
- Preview generation and browser-safe view logic are separate concerns.
- Media metadata and physical files are intentionally split between SQLite and file storage.
