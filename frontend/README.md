# BaGdar frontend

Интерфейс голосовой туристической стеллы по контракту `docs/api/` и `docs/flows/`.

## Запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`. По умолчанию используется локальный контрактный mock-слой из `src/mocks/`, поэтому backend не нужен.

Для подключения backend:

```bash
VITE_USE_MOCKS=false npm run dev
```

Vite проксирует `/api` и `/static` на `http://localhost:8000`.

## Голосовой сценарий

- звук −42…−30 dBFS или сигнал присутствия будит стеллу;
- речь выше −30 dBFS запускает Web Speech API;
- тишина 1.2 секунды завершает реплику;
- `POST /api/dialog/turn` возвращает `actions[]`, которые исполняются по порядку;
- никаких кнопок или кликабельных точек на карте нет.

Для проверки экранов в mock-режиме доступны служебные URL:

- `/?screen=route`
- `/?screen=scene`
- `/?screen=qr`
- `/?screen=sleep`

Это только маршруты визуальной проверки, в интерфейсе туриста ссылки на них не показываются.

## Проверка

```bash
npm run check
npm run build
```
