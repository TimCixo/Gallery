# Gallery

Gallery is a local full-stack application for managing a media archive: images, video, collections, favorites, tags, and upload workflows.

## Stack

- Backend: ASP.NET Core Minimal API, .NET 9, SQLite
- Frontend: React 18, Vite
- Media storage: `GalleryApp/backend/App_Data/Media`
- Preview pipeline: `ffmpeg`
- Unified local launcher: `run-app.py`

## Repository Structure

```text
Gallery/
|-- Docs/               # detailed project documentation
|-- GalleryApp/
|   |-- backend/        # API, SQLite, media storage, runtime data
|   |-- frontend/       # React/Vite client
|   `-- native/         # local native artifacts
|-- App_Data/           # optional root-level runtime data
|-- tmp/                # temporary local artifacts
|-- Gallery.sln         # .NET solution for backend
|-- run-app.py          # launcher for backend + frontend
`-- README.md           # repository overview
```

## Quick Start

Run from the repository root.

### Local machine

```bash
python3 run-app.py --mode machine
```

### Local network

```bash
python3 run-app.py --mode network
```

### Without opening the browser

```bash
python3 run-app.py --mode machine --open-url false
```

## Requirements

- .NET SDK 9
- Node.js 18+ and npm
- Python 3
- `ffmpeg` for video/GIF preview generation

## Default URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Media files: `http://localhost:5000/media/...`

## Documentation

- Repository map: [Docs/README.md](Docs/README.md)
- Architecture overview: [Docs/Architecture.md](Docs/Architecture.md)
- Frontend docs: [GalleryApp/frontend/README.md](GalleryApp/frontend/README.md)
- Frontend module map: [Docs/Frontend/Modules.md](Docs/Frontend/Modules.md)
- Frontend navigation and search: [Docs/Frontend/Navigation-and-Search.md](Docs/Frontend/Navigation-and-Search.md)
- Backend docs: [GalleryApp/backend/README.md](GalleryApp/backend/README.md)
- Backend API: [Docs/Backend/API.md](Docs/Backend/API.md)
- Backend modules: [Docs/Backend/Modules.md](Docs/Backend/Modules.md)
- Backend runtime and storage: [Docs/Backend/Runtime-and-Storage.md](Docs/Backend/Runtime-and-Storage.md)

## Notes

- SQLite database lives in `GalleryApp/backend/App_Data/gallery.db`.
- Media files live in `GalleryApp/backend/App_Data/Media`.
- In `network` mode you need to allow ports `5000` and `5173` in the firewall.
