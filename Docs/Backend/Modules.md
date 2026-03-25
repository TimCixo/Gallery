# Backend Modules

## Entry Point

### `Program.cs`

Responsible for:

- configuring request-size limits
- creating runtime directories
- building SQLite connection string
- registering services
- configuring CORS for `http://localhost:5173`
- exposing media files as static files under `/media`
- initializing the database
- backfilling missing image hashes
- mapping endpoint groups

## `Endpoints/`

HTTP boundary of the backend.

Current endpoint modules:

- `HealthEndpoints.cs`
- `MediaEndpoints.cs`
- `CollectionsEndpoints.cs`
- `TagsEndpoints.cs`

Responsibilities:

- request validation
- HTTP status codes and error payloads
- calling services and query layers
- shaping response payloads

## `Data/`

Persistence and search support.

Used for:

- database initialization
- repositories
- media search parsing and data access helpers

This layer is where SQLite-facing access patterns and search criteria translation live.

## `Services/`

Core backend behavior outside raw endpoint plumbing.

Current service files include:

- `CollectionService.cs`
- `ImageHashService.cs`
- `MediaQueryService.cs`
- `MediaSimilarityService.cs`
- `PreviewCacheService.cs`
- `MediaListItemBuilder.cs`
- `MediaFileHelper.cs`
- `BrowserSafeImageHelper.cs`
- `LegacyHelpers.cs`

Behaviorally this layer handles:

- media list query composition
- collection-specific operations
- preview cache generation and reuse
- browser-safe image view transformations
- image hashing for similarity
- similarity lookup
- shared helper logic for file and media operations

## `Infrastructure/`

Support types that are not domain features by themselves.

Examples:

- pagination support
- `MediaStorageOptions`

## `Models/`

Transport and domain-facing request/response support models.

Includes:

- request DTOs
- pagination models
- other API-facing shapes

## `Validation/`

Reusable validation helpers.

Notable behavior:

- hex color validation for tag types

## Module Interaction Pattern

Typical request path:

1. Endpoint validates route and request payload.
2. Endpoint calls a query or service layer.
3. Query/service reads or mutates SQLite and storage-backed state.
4. Endpoint returns a shaped payload for frontend consumption.

## Favorites Special Case

Favorites is not documented as a fully separate bounded context on the backend.

Observed behavior:

- favorite state is implemented through a special `Favorites` collection
- `/api/favorites` is exposed as a dedicated read route
- `/api/media/{id}/favorite` toggles membership in that collection

## Relations And Similarity

Media has additional backend concerns beyond raw CRUD:

- parent/child linking
- grouped/related browsing support
- image hash backfill
- similar media lookup

These concerns are spread between media endpoints and media-related services rather than isolated in a standalone subsystem folder.
