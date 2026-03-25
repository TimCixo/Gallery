# Backend

Backend of Gallery is an ASP.NET Core Minimal API application that serves media, collections, favorites, tags, upload, preview, and SQLite-backed persistence.

## Stack

- ASP.NET Core Minimal API
- .NET 9
- SQLite
- SixLabors.ImageSharp
- `ffmpeg` for video and GIF preview generation

## Entry Point

- `Program.cs`

## Development

Run from `GalleryApp/backend`.

```bash
dotnet run --urls http://localhost:5000
```

## Key Directories

```text
backend/
|-- Program.cs
|-- Endpoints/
|-- Data/
|-- Services/
|-- Infrastructure/
|-- Models/
|-- Validation/
`-- App_Data/
```

## Related Documentation

- Repository overview: [../../README.md](../../README.md)
- Documentation index: [../../Docs/README.md](../../Docs/README.md)
- Architecture overview: [../../Docs/Architecture.md](../../Docs/Architecture.md)
- Backend API: [../../Docs/Backend/API.md](../../Docs/Backend/API.md)
- Backend modules: [../../Docs/Backend/Modules.md](../../Docs/Backend/Modules.md)
- Backend runtime and storage: [../../Docs/Backend/Runtime-and-Storage.md](../../Docs/Backend/Runtime-and-Storage.md)
- Frontend docs: [../frontend/README.md](../frontend/README.md)
