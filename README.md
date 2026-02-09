# Gallery

Базовий шаблон застосунку:
- backend: `.NET (C#)` + `SQLite`
- frontend: `React (Vite)`

## Структура

```text
GalleryApp/
  backend/
    Program.cs
    GalleryApp.Api.csproj
    appsettings.json
    App_Data/
  frontend/
    src/
    package.json
    vite.config.js
run-app.ps1
```

## Запуск

1. Переконайся, що встановлені:
   - `.NET SDK 9`
   - `Node.js + npm`
2. Запусти з кореня репозиторію:

```powershell
.\run-app.ps1
```

Скрипт автоматично:
- запускає backend на `http://localhost:5000`
- запускає frontend на `http://localhost:5173`
- відкриває браузер з фронтендом

Зупинка: `Ctrl+C` у тому ж терміналі.
