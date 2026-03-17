# Backend

Backend частина Gallery - це ASP.NET Core Minimal API застосунок, який обслуговує медіа, колекції, обране, теги, upload і preview, а також зберігає дані в SQLite.

## Стек

- ASP.NET Core Minimal API
- .NET 9
- SQLite
- SixLabors.ImageSharp
- `ffmpeg` для preview і конверсії відео/GIF

## Точка входу

- `Program.cs` конфігурує web application, SQLite connection string, media storage, CORS, static files і реєструє endpoint-групи.

## Структура backend-проєкту

```text
backend/
|-- Program.cs         # entrypoint і конфігурація застосунку
|-- Endpoints/         # HTTP endpoint-групи
|-- Data/              # ініціалізація БД, репозиторії, search/data logic
|-- Services/          # бізнес-логіка, media processing, query helpers
|-- Infrastructure/    # інфраструктурні типи, pagination, storage options
|-- Models/            # доменні моделі, pagination, request DTO
|-- Validation/        # helper-валидація і API validation results
`-- App_Data/          # SQLite база та media storage
```

## Ролі основних директорій

- `Endpoints/` містить окремі групи API для `health`, `media`, `collections`, `tags`.
- `Data/` містить ініціалізацію бази, доступ до даних і пошукову логіку.
- `Services/` містить media processing, collection/media query logic і пов'язані helper-сценарії.
- `Infrastructure/` містить технічні типи на кшталт pagination helpers і `MediaStorageOptions`.
- `Models/` містить domain/request/pagination моделі.
- `Validation/` містить перевірку вхідних значень і helper-класи для API-відповідей.
- `App_Data/` містить runtime дані: базу `gallery.db` і медіафайли.

## Конфігурація і локальний запуск

Запускати з `GalleryApp/backend`.

```bash
dotnet run --urls http://localhost:5000
```

### Що налаштовує backend

- SQLite база: `App_Data/gallery.db`
- Медіафайли: `App_Data/Media`
- Preview cache: `App_Data/PreviewCache`
- Static files для медіа: `/media/*`
- CORS policy для frontend: `http://localhost:5173`
- Default локальний backend URL: `http://localhost:5000`

## Runtime behavior

- Під час старту застосунок створює `App_Data`, якщо директорії ще не існують.
- Під час старту виконується ініціалізація SQLite бази.
- Upload зберігає файли в піддиректорії `App_Data/Media/<yyyy-MM-dd>/`.
- Зображення конвертуються у WebP, відео - у MP4, GIF обробляється окремо.
- Preview cache зберігається в `App_Data/PreviewCache`; нові прев'ю створюються під час upload, а при завантаженні списків media/favorites кеш догрівається фоново.
- Preview для відео та GIF віддається через окремий API endpoint і залежить від доступності `ffmpeg`.
- Спискові media endpoint-и повертають `tileUrl` для стисненого preview; повний файл лишається доступним через `originalUrl` і завантажується окремо під час відкриття.

## Основні API-групи

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

### Tags

- `GET /api/tag-types`
- `POST /api/tag-types`
- `PUT /api/tag-types/{id}`
- `DELETE /api/tag-types/{id}`
- `GET /api/tag-types/{id}/tags`
- `GET /api/tags`
- `POST /api/tag-types/{id}/tags`
- `PUT /api/tags/{id}`
- `PATCH /api/tags/{id}/tag-type`
- `DELETE /api/tags/{id}`

## Пошук і медіа-сценарії

- `/api/media` підтримує пошук у форматі `tag:value`.
- Базові теги пошуку: `path`, `title`, `description`, `id`, `source`.
- Також підтримуються динамічні теги за назвами tag type.
- Media endpoint-и обробляють favorite state, parent/child зв'язки й прив'язку тегів до медіа.

## Пов'язана документація

- Репозиторій загалом: [../../README.md](../../README.md)
- Frontend: [../frontend/README.md](../frontend/README.md)
