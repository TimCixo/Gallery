---
name: project-documentation
description: Використовуй цю навичку для написання або оновлення документації Gallery repo. Застосовуй її, коли потрібно синхронізувати `README.md`, `GalleryApp/frontend/README.md` або `GalleryApp/backend/README.md` з реальним станом репозиторію, описати структуру, запуск, workflow, архітектурні межі, API-поведінку або правила роботи з кодом.
---

Пиши документацію саме під цей репозиторій, а не під абстрактний веб-проєкт і не під Unity. У Gallery документація побудована навколо трьох README:

- `README.md` для карти всього репозиторію
- `GalleryApp/frontend/README.md` для React/Vite frontend
- `GalleryApp/backend/README.md` для ASP.NET Core backend

Якщо зміни локальні, оновлюй лише відповідний README. Якщо зміна змінює зв'язок між частинами системи, оновлюй і root README теж.

Не створюй нові документи або папку `Docs/`, якщо користувач прямо цього не просив і якщо поточні README ще можуть вмістити потрібний контекст.

## Source Of Truth

Перед написанням документації спирайся на код, а не на стару документацію. Основні джерела правди в цьому repo:

- root структура репозиторію і `run-app.py`
- `GalleryApp/frontend/src/app/AppShell.jsx`
- `GalleryApp/frontend/src/features/**`
- `GalleryApp/frontend/src/api/**`
- `GalleryApp/frontend/src/hooks/**`
- `GalleryApp/frontend/src/__tests__/**`
- `GalleryApp/backend/Program.cs`
- `GalleryApp/backend/Endpoints/**`
- `GalleryApp/backend/Data/**`
- `GalleryApp/backend/Services/**`
- `GalleryApp/backend/Models/**`
- `GalleryApp/backend/Infrastructure/**`

Якщо документація не збігається з кодом, довіряй коду.

## Documentation Map

### `README.md`

Використовуй як коротку навігаційну карту репозиторію. Тут мають жити:

- що це за застосунок і яку задачу вирішує
- стек на високому рівні
- структура репозиторію
- як швидко підняти весь застосунок
- де лежать frontend і backend
- базові runtime notes: порти, `ffmpeg`, media storage, launcher
- посилання на детальні frontend/backend README

Не перетворюй root README на дамп усіх деталей frontend або backend.

### `GalleryApp/frontend/README.md`

Використовуй для практичної карти frontend-коду. Тут доречно документувати:

- стек і dev-команди
- entrypoints: `src/main.jsx`, `src/App.jsx`, `src/app/AppShell.jsx`
- структуру `src/`
- межі між `app`, `features`, `api`, `hooks`, `services`, `utils`, `__tests__`
- основні UI-модулі: gallery, favorites, collections, tags, media, upload, search, shared
- інтеграцію з backend API
- домовленості пошуку, pagination, toolbar/filter behavior, якщо це справді частина поточного UX
- важливі shared patterns: icon registry, modal manager, search suggestions, common CSS patterns

### `GalleryApp/backend/README.md`

Використовуй для backend-архітектури і runtime behavior. Тут доречно документувати:

- стек і dev-команди
- entrypoint `Program.cs`
- ролі `Endpoints`, `Data`, `Services`, `Infrastructure`, `Models`, `Validation`
- зберігання SQLite і media files в `App_Data`
- preview generation, cache behavior, залежність від `ffmpeg`
- endpoint groups і ключові маршрути
- search behavior і media-related API semantics
- конфігурацію локального запуску, CORS, базові URL

## Workflow

1. Визнач, який README є власником цієї інформації.
2. Прочитай релевантний код, а не лише вже існуючу документацію.
3. Зістав факти з коду з поточним README і випиши, що саме застаріло:
   - назви директорій;
   - entrypoints;
   - команди запуску;
   - API-маршрути;
   - поведінка пошуку, upload, preview, pagination, filters;
   - зовнішні залежності;
   - розташування runtime-даних.
4. Онови лише ті секції, які реально змінилися, але якщо документ уже став внутрішньо суперечливим, вирівняй його цілісно.
5. Після редагування перевір:
   - чи всі шляхи існують;
   - чи команди запускаються з правильних директорій;
   - чи назви модулів збігаються з реальними;
   - чи немає вигаданих planned-функцій, описаних як готові.

## When Documentation Must Be Updated

Оновлюй документацію, якщо зміни зачіпають хоча б один із цих пунктів:

- змінилася структура директорій або відповідальність модулів
- з'явився новий entrypoint, container, feature-модуль або endpoint group
- змінився спосіб запуску або локального налаштування
- змінилися порти, URL, environment assumptions або `run-app.py`
- змінилася поведінка пошуку, pagination, фільтрів, upload, preview, tagging, collections або favorites
- змінився API contract, важливий для frontend/backend інтеграції
- змінилися ключові зовнішні залежності на кшталт `ffmpeg`, .NET SDK або Node/Vite workflow

Не чіпай README лише тому, що ти торкнувся коду. Оновлюй його, коли змінилася інформація, яку README має пояснювати.

## Writing Rules

- Пиши українською, але технічні терміни, назви файлів, API і команд лишай у звичній технічній формі.
- Тримай текст практичним: користувач має швидко зрозуміти, де що шукати і як це запустити.
- Перевага за списками, короткими секціями і маршрутами читання, а не за довгими абзацами.
- Якщо секція стала занадто великою, скорочуй її до карти і перенось деталі в більш доречний README, але не в новий документ без потреби.
- Якщо функціональність лише планується, явно познач це як `planned`, `TODO` або `next step`.

## Project-Specific Heuristics

- Для frontend спочатку дивись на `AppShell.jsx`, бо він задає верхньорівневу навігацію, пошук і композицію контейнерів.
- Якщо зміни відбуваються всередині `src/features/media/**`, перевір, чи треба відобразити це у секціях про gallery UI, modal/editor flows або search/tagging behavior.
- Якщо змінюються `src/api/**` або backend endpoints, звір одразу обидва README: frontend і backend.
- Якщо змінюється `run-app.py`, майже напевно треба оновити root README.
- Якщо змінюються `App_Data`, media storage, preview cache або обробка `ffmpeg`, це знання належить backend README і частково root README.

## Do Not

- Не описуй Unity, gameplay, prefabs, scenes або inspector-патерни, якщо їх немає в цьому repo.
- Не копіюй припущення замість перевірених фактів.
- Не дублюй великий однаковий текст між root/frontend/backend README без причини.
- Не захаращуй root README backend/frontend деталями, які краще живуть у підREADME.
- Не лишай документацію в напівактуальному стані, якщо вже редагуєш область, де видно внутрішню суперечність.
