# Architecture Overview

## Purpose

Gallery is a local media-management application. The system stores media files on disk, metadata in SQLite, serves them through a Minimal API backend, and exposes management workflows through a React/Vite frontend.

## Main Parts

### Frontend

- Lives in `GalleryApp/frontend`
- Built with React and Vite
- `src/app/AppShell.jsx` is the top-level shell for navigation, search, toolbar controls, and container composition
- Feature modules in `src/features/**` own most user-facing workflows

### Backend

- Lives in `GalleryApp/backend`
- Built as ASP.NET Core Minimal API
- `Program.cs` wires storage, CORS, endpoint groups, database initialization, and media services
- SQLite stores metadata, collections, favorites, tags, and media relations

### Runtime Data

- SQLite database: `GalleryApp/backend/App_Data/gallery.db`
- Original/converted media files: `GalleryApp/backend/App_Data/Media`
- Preview cache: `GalleryApp/backend/App_Data/PreviewCache`

## High-Level Flow

1. Frontend triggers user actions from `AppShell` and feature containers.
2. `src/api/**` modules call backend endpoints under `/api/**`.
3. Backend endpoints delegate query and processing work to `Data/**` and `Services/**`.
4. Backend persists metadata in SQLite and serves media files from `App_Data`.
5. Frontend renders paged lists, editors, pickers, and modal flows from the returned payloads.

## Frontend Boundaries

- `app/`: shell-level orchestration, modal manager, cross-domain helpers
- `features/`: domain-driven UI slices such as gallery, favorites, collections, tags, media, upload, search
- `api/`: HTTP access layer
- `hooks/`: cross-feature stateful workflows that do not belong to a single leaf component
- `shared/` and `utils/`: reusable presentation and helper code

## Backend Boundaries

- `Endpoints/`: HTTP route groups and request validation
- `Data/`: database initialization, repositories, search helpers
- `Services/`: media processing, query composition, similarity, preview cache, collection logic
- `Infrastructure/`: storage options and pagination support
- `Models/`: request and domain-facing transport models
- `Validation/`: reusable validation helpers

## Cross-Cutting Behaviors

### Search

- Frontend builds search suggestions and highlighted tokens
- Backend parses `tag:value` search syntax for media endpoints
- Base search tags include fields like `title`, `path`, `description`, `id`, `source`, `filetype`
- Dynamic search tags come from tag types and tags loaded from the backend

### Media Preview

- Upload and list flows warm preview cache on the backend
- Video and GIF preview generation depends on `ffmpeg`
- Frontend consumes compact list payloads with preview-oriented fields instead of always loading full files

### Relations and Grouping

- Media items can have parent/child links
- Gallery can group related media into one tile with client-side grouped pagination
- Similar media is exposed by a dedicated backend endpoint and shown through viewer/editor flows

## Documentation Pointers

- Frontend modules: [Frontend/Modules.md](Frontend/Modules.md)
- Frontend navigation and search: [Frontend/Navigation-and-Search.md](Frontend/Navigation-and-Search.md)
- Backend modules: [Backend/Modules.md](Backend/Modules.md)
- Backend API: [Backend/API.md](Backend/API.md)
- Backend runtime and storage: [Backend/Runtime-and-Storage.md](Backend/Runtime-and-Storage.md)
