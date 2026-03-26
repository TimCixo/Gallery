# Frontend

Frontend Gallery - це React/Vite-клієнт для галереї, favorites, collections, tags, upload workflow, пошуку та керування exact duplicates.

## Стек

- React 18
- Vite 5
- Вбудований Node test runner для `src/__tests__/*.test.js`

## Точки входу

- `src/main.jsx`
- `src/App.jsx`
- `src/app/AppShell.jsx`

## Розробка

Запускати з `GalleryApp/frontend`.

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

### Тести

```bash
npm test
```

## Ключові директорії

```text
src/
|-- app/         # shell, routing-like composition, global UI frame
|-- features/    # feature-модулі галереї, duplicates, collections тощо
|-- api/         # допоміжний API-код
|-- hooks/       # загальні hooks
|-- services/    # клієнти для backend API
|-- utils/       # утиліти
`-- __tests__/   # layout і поведінкові unit/static тести
```

## Duplicate Groups

Grouped duplicates винесені в окремий feature, а не в reuse favorites-flow.

- Вкладка `Duplicates` додається в slide menu через `src/app/AppShell.jsx`.
- Основний orchestration живе в `src/features/duplicates/DuplicatesContainer.jsx`.
- Відображення сторінки з групами дублікатів живе в `src/features/duplicates/DuplicatesPage.jsx`.
- UI окремої duplicate group живе в `src/features/duplicates/components/DuplicateGroupCard.jsx`.
- API-клієнт для grouped duplicates живе в `src/services/duplicatesApi.js`.

## Поведінка Duplicates UI

- На сторінці показуються групи exact duplicates, згруповані за хешем.
- Для кожної групи є active items і окремий блок excluded items.
- Parent media обирається тільки серед active items.
- `Exclude` і `Restore` доступні прямо поверх preview-картинки через overlay-іконки.
- `Merge` використовує вже наявний confirm modal для видалення медіа, а не окреме кастомне вікно.
- Viewer і editor перевикористовують стандартний media flow, але навігація обмежена контекстом поточної duplicate group.
- Стрілки в modal і клавіатурні `ArrowLeft` / `ArrowRight` переміщують лише в межах поточного bucket:
  - active media навігується тільки серед active items групи;
  - excluded media навігується тільки серед excluded items групи.

## Іконки та UI деталі

- Пункт меню `Duplicates` використовує `duplicate.png`.
- Overlay-дії на картці duplicates використовують `minus.png` і `plus.png`.
- Preview у duplicate tile квадратний і вирівняний під основну gallery-сітку.

## Пов'язані файли

- Root overview: [../../README.md](../../README.md)
- Індекс документації: [../../Docs/README.md](../../Docs/README.md)
- Огляд архітектури: [../../Docs/Architecture.md](../../Docs/Architecture.md)
- Карта frontend-модулів: [../../Docs/Frontend/Modules.md](../../Docs/Frontend/Modules.md)
- Навігація та пошук у frontend: [../../Docs/Frontend/Navigation-and-Search.md](../../Docs/Frontend/Navigation-and-Search.md)
- Backend: [../backend/README.md](../backend/README.md)
