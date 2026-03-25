# Frontend

Frontend of Gallery is a React/Vite client responsible for gallery, favorites, collections, tags, upload flows, and search UX.

## Stack

- React 18
- Vite 5
- Node test runner for `src/__tests__/*.test.js`

## Entry Points

- `src/main.jsx`
- `src/App.jsx`
- `src/app/AppShell.jsx`

## Development

Run from `GalleryApp/frontend`.

### Dev server

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview build

```bash
npm run preview
```

### Tests

```bash
npm test
```

## Key Directories

```text
src/
|-- app/
|-- features/
|-- api/
|-- hooks/
|-- services/
|-- utils/
`-- __tests__/
```

## Related Documentation

- Repository overview: [../../README.md](../../README.md)
- Documentation index: [../../Docs/README.md](../../Docs/README.md)
- Architecture overview: [../../Docs/Architecture.md](../../Docs/Architecture.md)
- Frontend module map: [../../Docs/Frontend/Modules.md](../../Docs/Frontend/Modules.md)
- Frontend navigation and search: [../../Docs/Frontend/Navigation-and-Search.md](../../Docs/Frontend/Navigation-and-Search.md)
- Backend docs: [../backend/README.md](../backend/README.md)
