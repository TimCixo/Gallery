# Frontend

## Static Icons

- PNG icons live in `public/icons/`.
- UI icon references are centralized in `src/features/shared/utils/iconPaths.js` and rendered through `src/features/shared/components/AppIcon.jsx`.

Frontend частина Gallery - це React/Vite клієнт, який відповідає за UI галереї, обраного, колекцій, тегів, upload manager і пошук медіа.

## Стек

- React 18
- Vite 5
- Node test runner для `src/__tests__/*.test.js`

## Точки входу

- `src/main.jsx` монтує React-застосунок у DOM.
- `src/App.jsx` є мінімальним app entrypoint і підключає глобальні стилі.
- `src/app/AppShell.jsx` містить основну UI-оркестрацію: навігацію між розділами, форму пошуку, інтеграцію контейнерів і верхньорівневий layout.

## Структура `src`

```text
src/
|-- app/         # app shell, orchestration hooks, modal manager
|-- features/    # доменні модулі: gallery, favorites, collections, tags, media, upload, search, shared
|-- api/         # HTTP-клієнти для backend API
|-- hooks/       # повторно використовувані state/hooks для доменних сценаріїв
|-- services/    # додатковий сервісний шар і legacy API helpers
|-- utils/       # загальні утиліти форматування та ідентифікації медіа
`-- __tests__/   # unit-тести для утиліт і search helpers
```

## Основні UI-модулі та шари

### `src/app/`

- `AppShell.jsx` керує верхньорівневою навігацією між `gallery`, `favorites`, `collections`, `tags`, `upload`.
- `app/hooks/` містить orchestration hooks для сценаріїв, які охоплюють кілька доменів.
- `app/modal/` містить modal manager і ключі модалок.

### `src/features/`

- `gallery/` відповідає за список медіа, пагінацію, пошук і інтеграцію редактора.
- `favorites/` відповідає за список обраного.
- `collections/` відповідає за список колекцій, форму редагування і медіа всередині колекцій.
- `tags/` відповідає за типи тегів, теги й пов'язані CRUD-сценарії.
- `media/` містить media-related компоненти, контексти і state.
- `upload/` містить upload manager, upload UI, контексти, hooks і допоміжні утиліти.
- `search/` і `shared/` містять parser/helpers для пошуку та спільні утиліти.

### `src/api/`

- Основний шар HTTP-доступу до backend.
- Містить модулі `mediaApi`, `collectionsApi`, `tagsApi`, `uploadApi`, `httpClient`.
- Саме цей шар слід вважати актуальною точкою інтеграції frontend з API.

### `src/hooks/`

- Містить stateful hooks для великих доменних сценаріїв, наприклад gallery, favorites, collections, tags, upload і media editor.
- Використовується для локальної організації reducer/state logic поза presentational components.

### `src/services/`

- Додатковий сервісний шар і сумісні helper-модулі, які лишилися в кодовій базі.
- Це не root entrypoint і не головна карта архітектури, але цей шар все ще присутній у проєкті, тому його варто враховувати під час рефакторингу.

### `src/utils/` і `src/__tests__/`

- `utils/` містить загальні helper-функції для форматування й роботи з медіа.
- `__tests__/` містить unit-тести для форматування, parser/search logic, tag helpers та інших утиліт.

## Команди розробки

Запускати з `GalleryApp/frontend`.

### Dev server

```bash
npm run dev
```

Піднімає Vite dev server для локальної розробки.

### Production build

```bash
npm run build
```

Збирає production bundle у `dist/`.

### Preview build

```bash
npm run preview
```

Локально віддає вже зібраний production build.

### Tests

```bash
npm test
```

Запускає unit-тести з `src/__tests__/*.test.js`.

## Інтеграція з backend

- За замовчуванням frontend працює з backend на `http://localhost:5000`.
- Основні API-групи: media, favorites, collections, tag types, tags, upload.
- Пошук у gallery підтримує формат `tag:value`, включно з базовими полями (`title`, `path`, `description`, `id`, `source`, `filetype`), де `filetype` підтримує значення `image`, `video`, `gif`.
- `AppShell.jsx` керує полем пошуку і suggestions, а feature/container-рівень виконує конкретні API-виклики.
- У верхній панелі gallery доступний popover-фільтр з опцією `Групувати медіа`, яка групує зв'язані parent/child media в один tile з клієнтською пагінацією груп.

## Пов'язана документація

- Репозиторій загалом: [../../README.md](../../README.md)
- Backend: [../backend/README.md](../backend/README.md)
