# Gallery

Gallery — це локальний full-stack застосунок для керування медіа-архівом (зображення та відео) з можливістю:
- завантаження файлів;
- перегляду галереї та обраного;
- редагування метаданих (title/description/source/зв'язки parent-child);
- керування колекціями;
- керування типами тегів і тегами;
- пошуку по метаданих і тегах.

## Технологічний стек

- **Backend:** .NET 9, Minimal API, SQLite.  
- **Frontend:** React + Vite.  
- **Зберігання медіа:** файлова система (`GalleryApp/backend/App_Data/Media`).  
- **Превʼю відео/GIF:** `ffmpeg` (автоматичний пошук у `run-app.ps1`).

## Структура проєкту

```text
Gallery/
├─ GalleryApp/
│  ├─ backend/
│  │  ├─ Endpoints/             # HTTP endpoints (media, collections, tags, health)
│  │  ├─ Data/                  # Ініціалізація БД, репозиторії, search parser/sql builder
│  │  ├─ Services/              # Бізнес-логіка, обробка медіа
│  │  ├─ Models/                # DTO та моделі
│  │  ├─ Validation/            # Валідація запитів
│  │  ├─ App_Data/              # SQLite + файли медіа
│  │  └─ Program.cs
│  └─ frontend/
│     ├─ src/App.jsx            # Основний UI (галерея, upload, модалки, теги, колекції)
│     └─ src/App.css
├─ run-app.ps1                  # Скрипт запуску backend + frontend
└─ README.md
```

## Вимоги

- **.NET SDK 9**
- **Node.js 18+** і **npm**
- **Windows PowerShell** (для запуску `run-app.ps1`)
- **ffmpeg** (опційно, але потрібен для превʼю відео/GIF)

## Швидкий запуск

Запускати з кореня репозиторію.

### 1) Локально на цій машині

```powershell
.\run-app.ps1 -Mode machine
```

### 2) У локальній мережі (LAN)

```powershell
.\run-app.ps1 -Mode network
```

У режимі `network` застосунок біндиться на `0.0.0.0`, а скрипт показує IP для доступу з інших пристроїв у мережі.

### Зупинка

Натисніть `Ctrl+C` в тому самому терміналі — скрипт завершить і backend, і frontend процеси.

---

## Як працює upload

- Endpoint: `POST /api/upload`
- Формат: `multipart/form-data`, поле: `files`
- Підтримувані формати:
  - **Зображення:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`
  - **Відео:** `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.m4v`
- Файли зберігаються в:
  - `GalleryApp/backend/App_Data/Media/<yyyy-MM-dd>/`

## Доступ до медіа-файлів

Backend публікує статичні файли через `/media/*`.

Приклад:

```text
http://localhost:5000/media/2026-01-15/example.jpg
```

---

## API (коротка карта endpoint'ів)

### Health
- `GET /api/health`

### Media
- `GET /api/media?page=1&pageSize=36&search=...`
- `GET /api/favorites?page=1&pageSize=36`
- `GET /api/media/preview?path=...`
- `PUT /api/media/{id}`
- `PUT /api/media/{id}/favorite`
- `DELETE /api/media/{id}`
- `POST /api/upload`

### Collections
- `GET /api/collections?search=...&mediaId=...`
- `POST /api/collections`
- `PUT /api/collections/{id}`
- `GET /api/collections/{id}/media?page=1&pageSize=36`
- `POST /api/collections/{id}/media`
- `DELETE /api/collections/{id}`

### Tags / Tag Types
- `GET /api/tag-types`
- `POST /api/tag-types`
- `PUT /api/tag-types/{id}`
- `DELETE /api/tag-types/{id}`
- `GET /api/tag-types/{id}/tags`
- `GET /api/tags`
- `POST /api/tag-types/{id}/tags`
- `PUT /api/tags/{id}`
- `DELETE /api/tags/{id}`

---

## Приклади payload'ів

### Оновити медіа

`PUT /api/media/{id}`

```json
{
  "title": "Sunset",
  "description": "Taken in 2026",
  "source": "https://example.com/source",
  "parent": 12,
  "child": 18,
  "tagIds": [1, 3, 9]
}
```

### Додати/прибрати з обраного

`PUT /api/media/{id}/favorite`

```json
{
  "isFavorite": true
}
```

### Створити колекцію

`POST /api/collections`

```json
{
  "label": "Trips",
  "description": "Travel shots",
  "cover": 101
}
```

### Додати медіа в колекцію

`POST /api/collections/{id}/media`

```json
{
  "mediaId": 101
}
```

### Створити тип тегів

`POST /api/tag-types`

```json
{
  "name": "Genre",
  "color": "#2563EB"
}
```

### Створити тег

`POST /api/tag-types/{id}/tags`

```json
{
  "name": "Landscape",
  "description": "Landscape content"
}
```

---

## Пошук (`search`) у `/api/media`

Пошук підтримує формат `tag:value`.

Базові теги:
- `path:value`
- `title:value`
- `description:value`
- `source:value`
- `id:value`

Також підтримуються динамічні теги за назвою `TagType`, наприклад:
- `genre:landscape`
- `person:"john doe"`

Можна використовувати префікс `@`:
- `@title:sunset`

Підтримуються значення в лапках:
- `description:"golden hour beach"`

---

## Дані та БД

При старті backend автоматично:
- створює SQLite БД у `GalleryApp/backend/App_Data/gallery.db`;
- ініціалізує таблиці `Media`, `Collections`, `CollectionsMedia`, `TagTypes`, `Tags`, `MediaTags`, `AppInfo`;
- додає системну колекцію `Favorites`, якщо її ще немає.

## CORS і URL за замовчуванням

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- CORS policy дозволяє frontend-джерело `http://localhost:5173`.

## Корисні команди для розробки

Backend:

```bash
cd GalleryApp/backend
dotnet run --urls http://localhost:5000
```

Frontend:

```bash
cd GalleryApp/frontend
npm install
npm run dev -- --host localhost --port 5173
```

## Відомі нюанси

- Без `ffmpeg` превʼю відео/GIF не працюватиме.
- У `network` режимі переконайтеся, що firewall дозволяє порти `5000` і `5173`.

