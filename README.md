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
      Media/
        YYYY-MM-DD/
  frontend/
    src/
    package.json
    vite.config.js
run-app.ps1
```

## Функціонал на зараз

- Головна сторінка з верхньою панеллю:
  - `Gallery` (перехід на `/`)
  - поле вводу + кнопка `Send`
  - кнопка `Upload`
- Модальне вікно upload:
  - drag-and-drop або вибір файлів по кліку
  - можливість виключати окремі файли зі списку
  - підсвітка проблемних (непідтримуваних) файлів
- Backend endpoint `POST /api/upload`:
  - приймає `multipart/form-data` (поле `files`)
  - зберігає медіа у `GalleryApp/backend/App_Data/Media/<yyyy-MM-dd>/`
  - база даних для upload не використовується

## Вимоги

- `.NET SDK 9`
- `Node.js + npm`

## Запуск

Запускати з кореня репозиторію.

### 1) Локально на цій машині

```powershell
.\run-app.ps1 -Mode machine
```

### 2) Локально в мережі (LAN)

```powershell
.\run-app.ps1 -Mode network
```

У цьому режимі застосунок слухає мережеві інтерфейси (`0.0.0.0`), а в терміналі показується LAN-адреса для підключення з інших пристроїв.

Під час запуску скрипт виводить:
- поточний режим (`Local Machine` або `Local Network`)
- URL frontend та backend
- для LAN-режиму: коротку інструкцію підключення

## Зупинка

`Ctrl+C` у тому ж терміналі.

## Підтримувані типи медіа для upload

Зображення: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`  
Відео: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.m4v`
