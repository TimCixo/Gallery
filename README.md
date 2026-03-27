# Gallery

## Recommendations Update

- Image recommendations use ONNX Runtime embeddings stored in SQLite.
- Media viewer metadata now includes a `Recommended media` block rendered from backend similarity results.

Gallery - локальний full-stack застосунок для керування медіаархівом: зображеннями, відео, колекціями, тегами, вибраним, завантаженням і групами точних дублікатів.

## Стек

- Backend: ASP.NET Core Minimal API, .NET 9, SQLite
- Frontend: React 18, Vite
- Зберігання медіа: `GalleryApp/backend/App_Data/Media`
- Генерація прев'ю: `ffmpeg`
- Локальний запуск: `run-app.py`

## Структура репозиторію

```text
Gallery/
|-- Docs/               # детальна документація проєкту
|-- GalleryApp/
|   |-- backend/        # API, SQLite, медіафайли та runtime-дані
|   |-- frontend/       # React/Vite-клієнт
|   `-- native/         # локальні native-артефакти
|-- App_Data/           # опціональні runtime-дані в корені
|-- tmp/                # тимчасові локальні артефакти
|-- Gallery.sln         # .NET solution для backend
|-- run-app.py          # запуск frontend + backend
`-- README.md           # короткий огляд репозиторію
```

## Швидкий старт

Запускати з кореня репозиторію.

### Локально на цій машині

```bash
python3 run-app.py --mode machine
```

### У локальній мережі

```bash
python3 run-app.py --mode network
```

### Без автоматичного відкриття браузера

```bash
python3 run-app.py --mode machine --open-url false
```

## Вимоги

- .NET SDK 9
- Node.js 18+ і npm
- Python 3
- `ffmpeg` для генерації прев'ю відео й GIF

## Базові URL

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Медіафайли: `http://localhost:5000/media/...`

## Ключовий функціонал

- Галерея з переглядом медіа, метаданих і навігацією.
- Collections, Favorites, Tags і upload workflow.
- Окрема вкладка `Duplicates` у slide menu.
- Групування exact duplicates за хешем.
- Вибір parent media всередині duplicate group.
- Exclude/Restore для false-positive елементів у duplicate group.
- Merge duplicates з правилом `parent wins`: конфліктні значення не перезаписуються, а відсутні поля, теги, колекції та favorite переносяться на parent.

## Документація

- Карта репозиторію: [Docs/README.md](Docs/README.md)
- Огляд архітектури: [Docs/Architecture.md](Docs/Architecture.md)
- Frontend: [GalleryApp/frontend/README.md](GalleryApp/frontend/README.md)
- Карта frontend-модулів: [Docs/Frontend/Modules.md](Docs/Frontend/Modules.md)
- Навігація та пошук у frontend: [Docs/Frontend/Navigation-and-Search.md](Docs/Frontend/Navigation-and-Search.md)
- Backend: [GalleryApp/backend/README.md](GalleryApp/backend/README.md)
- Backend API: [Docs/Backend/API.md](Docs/Backend/API.md)
- Backend-модулі: [Docs/Backend/Modules.md](Docs/Backend/Modules.md)
- Runtime і storage backend: [Docs/Backend/Runtime-and-Storage.md](Docs/Backend/Runtime-and-Storage.md)

## Нотатки

- SQLite-база лежить у `GalleryApp/backend/App_Data/gallery.db`.
- Медіафайли лежать у `GalleryApp/backend/App_Data/Media`.
- Для `network` mode потрібно відкрити порти `5000` і `5173` у firewall.
