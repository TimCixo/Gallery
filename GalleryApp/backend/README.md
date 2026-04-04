# Backend

## Recommendations Update

- Backend stores image embeddings in SQLite table `MediaEmbeddings`.
- `GET /api/media/{id}/similar` now returns embedding-based recommendations.
- Embeddings are backfilled for existing image media and generated for new uploads.

Backend Gallery - це ASP.NET Core Minimal API застосунок, який обслуговує медіа, колекції, favorites, tags, upload, preview generation і SQLite-персистентність, включно з grouped exact duplicates.

## Стек

- ASP.NET Core Minimal API
- .NET 9
- SQLite
- SixLabors.ImageSharp
- `ffmpeg` для генерації прев'ю відео й GIF

## Точка входу

- `Program.cs`

## Розробка

Запускати з `GalleryApp/backend`.

```bash
dotnet run --urls http://localhost:5000
```

## Ключові директорії

```text
backend/
|-- Program.cs
|-- Endpoints/       # HTTP endpoint-и
|-- Data/            # SQLite, repositories, schema init
|-- Services/        # бізнес-логіка
|-- Infrastructure/  # runtime-інфраструктура
|-- Models/          # domain, DTO, request/response моделі
|-- Validation/      # перевірка запитів
`-- App_Data/        # база, медіа, прев'ю та інші runtime-дані
```

## Duplicate Groups API

Групування дублікатів більше не віддається плоским списком. Backend повертає duplicate groups, побудовані за exact `ImageHash`.

- `GET /api/media/duplicates` повертає paged список duplicate groups.
- `PUT /api/media/duplicates/{groupKey}/exclude` виключає media з active group.
- `DELETE /api/media/duplicates/{groupKey}/exclude/{mediaId}` повертає media назад у group.
- `POST /api/media/duplicates/{groupKey}/merge` об'єднує active duplicates у вибраний parent.
- `POST /api/media/duplicates/{groupKey}/delete` видаляє selected active duplicates без видалення parent.

## Duplicate Groups Service

Основна логіка grouped duplicates винесена в `Services/DuplicateMediaService.cs`.

- Group key базується на exact duplicate hash.
- False-positive exclusions зберігаються в БД і не губляться після reload.
- Parent для merge має належати до active non-excluded items поточної групи.
- Source items для merge - це active non-parent duplicates.
- Для `Title`, `Description` і `Source` застосовується правило `parent wins`: значення копіюється тільки якщо поле parent порожнє.
- Tags і collection memberships об'єднуються на parent.
- Якщо будь-який source був favorite, parent теж стає favorite.
- `Parent/Child` links навмисно не переносяться автоматично.
- Після успішного merge source media видаляються.
- Merge і delete виконуються транзакційно, щоб уникнути частково застосованих змін.

## Персистентність Exclude/Restore

- Таблиця `DuplicateGroupExclusions` створюється в `Data/DatabaseInitializer.cs`.
- Exclusion прив'язаний до `groupKey + mediaId`.
- При видаленні media exclusion-рядки прибираються каскадно.

## Пов'язані моделі

- `Models/Domain/DuplicateMediaGroupListItem.cs`
- `Models/Requests/DuplicateGroupMembershipRequest.cs`
- `Models/Requests/DuplicateGroupMergeRequest.cs`
- `Models/Requests/DuplicateGroupDeleteRequest.cs`

## Пов'язана документація

- Root overview: [../../README.md](../../README.md)
- Індекс документації: [../../Docs/README.md](../../Docs/README.md)
- Огляд архітектури: [../../Docs/Architecture.md](../../Docs/Architecture.md)
- Backend API: [../../Docs/Backend/API.md](../../Docs/Backend/API.md)
- Backend-модулі: [../../Docs/Backend/Modules.md](../../Docs/Backend/Modules.md)
- Runtime і storage backend: [../../Docs/Backend/Runtime-and-Storage.md](../../Docs/Backend/Runtime-and-Storage.md)
- Frontend: [../frontend/README.md](../frontend/README.md)
## Collection Media Ordering

- `GET /api/collections/{id}/media` keeps the existing base collection order between unrelated items (`m.Id DESC`).
- When linked media from the same collection already have `Parent/Child` relations, backend returns them as one contiguous chain: `parent -> child -> child...`.
- This ordering is display-only and does not rewrite or repair `Parent/Child` relations in the database.
