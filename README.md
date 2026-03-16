# Gallery

Gallery - локальний full-stack застосунок для керування медіаархівом: зображеннями, відео, колекціями, обраним і тегами. Репозиторій організований так, щоб root README був картою всього проєкту, а підREADME пояснювали frontend і backend окремо.

## Технологічний стек

- Backend: ASP.NET Core Minimal API, .NET 9, SQLite
- Frontend: React 18, Vite
- Зберігання медіа: файлова система в `GalleryApp/backend/App_Data/Media`
- Обробка preview для відео/GIF: `ffmpeg`
- Уніфікований локальний запуск: `run-app.py`

## Структура проєкту

```text
Gallery/
|-- GalleryApp/
|   |-- backend/         # API, SQLite, media storage, runtime data
|   |-- frontend/        # React/Vite клієнт
|   `-- native/          # допоміжна директорія для локальних native-артефактів
|-- App_Data/            # коренева runtime-директорія, якщо використовується локальними сценаріями
|-- tmp/                 # тимчасові локальні артефакти
|-- Gallery.sln          # .NET solution для backend
|-- run-app.py           # спільний launcher для backend + frontend
`-- README.md            # огляд усього репозиторію
```

### Ключові вузли

- `GalleryApp/backend` містить API, доступ до SQLite, обробку upload/preview і файлове сховище медіа.
- `GalleryApp/frontend` містить UI на React/Vite, сторінки галереї, обраного, колекцій, тегів і upload manager.
- `run-app.py` запускає backend і frontend разом, налаштовує режим `machine` або `network` і намагається знайти `ffmpeg`.
- `Gallery.sln` потрібен для роботи з backend через Visual Studio або стандартний .NET tooling.
- `App_Data` і `tmp` не є частиною логічної архітектури, але можуть містити локальні runtime або тимчасові файли.

## Швидкий запуск усього застосунку

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

### Коли використовувати root launcher

- Використовуйте `run-app.py`, коли потрібно швидко підняти весь застосунок цілком.
- Запускайте frontend і backend окремо, коли дебажите лише одну підсистему або працюєте з IDE/tooling напряму.

## Вимоги

- .NET SDK 9
- Node.js 18+ і npm
- Python 3
- `ffmpeg` опційно, але потрібен для preview відео та GIF

## Окремий запуск підсистем

### Backend

```bash
cd GalleryApp/backend
dotnet run --urls http://localhost:5000
```

### Frontend

```bash
cd GalleryApp/frontend
npm install
npm run dev -- --host localhost --port 5173
```

## Де шукати деталі

- Frontend: [GalleryApp/frontend/README.md](GalleryApp/frontend/README.md)
- Backend: [GalleryApp/backend/README.md](GalleryApp/backend/README.md)

## Основні URL за замовчуванням

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Media files: `http://localhost:5000/media/...`

## Примітки

- Backend зберігає SQLite базу в `GalleryApp/backend/App_Data/gallery.db`.
- Медіафайли зберігаються в `GalleryApp/backend/App_Data/Media`.
- У режимі `network` потрібно дозволити порти `5000` і `5173` у firewall.
