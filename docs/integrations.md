# Локальные интеграции

## Telegram Mini App

По умолчанию интерфейс и публичные маршруты API работают без бота. Чтобы включить вход, скопируй `api/.env.example` в `api/.env`, задай `TELEGRAM_BOT_TOKEN` и уникальный `AUTH_TOKEN_SECRET` длиной от 32 символов. Секрет можно сгенерировать командой `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Для запуска внутри Telegram укажи публичный HTTPS-адрес интерфейса в настройках бота.

Клиент передаёт подписанный `Telegram.WebApp.initData` телом запроса в `POST /api/auth/telegram`. Сервер проверяет подпись и допустимый возраст данных (5 минут), затем выдаёт Bearer-токен на 15 минут. Клиент хранит токен в памяти приложения и добавляет его к защищённым запросам. При истечении токена или ответе `401` от защищённого маршрута сессия очищается. При повторном входе сервер проверяет `initData` по своему времени. Если сервер отклоняет эти данные, интерфейс предлагает открыть Mini App заново из Telegram. Cookies и постоянное хранилище браузера не используются. Бизнес-права добавляй через политики `@Can()`, а публичные маршруты явно помечай `@Public()`. [Telegram Mini Apps](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

Клиентский адаптер `web/src/telegram.ts` использует стабильный `@tma.js/sdk-react` v3. В Telegram он подключает тему, безопасные отступы и нативную кнопку «Назад». Браузерный режим использует нейтральное оформление. Playwright проверяет имитацию Telegram, повторный вход после `401` и доступность обычных экранов через axe.

## Notion MCP

Claude Code читает `.mcp.json`, а Codex берёт проектную настройку из `.codex/config.toml` в доверенном проекте. Оба клиента используют официальный сервер `https://mcp.notion.com/mcp`.

- В Claude Code открой `/mcp`, подтверди сервер `notion` и пройди OAuth. В CLI можно проверить сервер командой `claude mcp get notion`.
- В Codex сначала открой доверенный проект. Для OAuth попробуй `codex mcp login notion`. Если CLI не видит сервер из проектного файла, передай адрес только для команды входа, как показано ниже, затем открой новую сессию в корне проекта.
- Для первой проверки открой через MCP известную страницу нужного рабочего пространства. Ссылка на корневую страницу проекта и ссылки на базы задач, документов и отчётов помогают выбирать записи однозначно.

```powershell
codex -c 'mcp_servers.notion.url="https://mcp.notion.com/mcp"' mcp login notion
```

[Когда читать и обновлять Notion](notion.md) · [Notion MCP](https://developers.notion.com/guides/mcp/get-started-with-mcp) · [Claude Code MCP](https://code.claude.com/docs/en/mcp) · [Codex MCP](https://developers.openai.com/codex/mcp)

## PostgreSQL и файлы

Для локальной БД запусти `docker compose up -d --wait postgres` и укажи в `api/.env`:

```dotenv
DATABASE_URL=postgresql://starter:starter-local@127.0.0.1:5434/starter
```

Затем выполни `npm run db:migrate`. Когда база подключена, вход создаёт запись Telegram-пользователя в PostgreSQL. Для новой миграции используй `npm run db:generate -w api`. Без `DATABASE_URL` вход работает в режиме без сохранения пользователя. Для продукта с пользовательскими данными настрой PostgreSQL до запуска.

`@nestjs/storage` использует локальный диск `api/.storage` по умолчанию. Путь настраивается через `STORAGE_PATH`. Приложение обращается к файлам через `Storage` из Nest DI.

## Redis

Запусти Redis командой `docker compose up -d --wait redis` и задай в `api/.env`:

```dotenv
REDIS_URL=redis://127.0.0.1:6380
```

API подключает Redis только при наличии `REDIS_URL`. Локальный контейнер доступен с loopback на порту `6380` и хранит данные в памяти. В production используй управляемое подключение с TLS (`rediss://`) и храни URL с учётными данными в секретах окружения. Фичи получают клиент из Nest DI через `RedisModule`.

## Проверки состояния API

- `/api/health` проверяет, что процесс отвечает, и возвращает `200` с `{"status":"ok"}`.
- `/api/health/ready` возвращает отчёт Terminus с полями `status`, `info`, `error` и `details`. При заданном `DATABASE_URL` индикатор `postgres` проверяет пул через `select 1`. При заданном `REDIS_URL` индикатор `redis` отправляет `PING`. Если настроенная зависимость недоступна, readiness возвращает `503` с её статусом. Liveness проверяет только процесс.
- Для нового сервиса добавляй индикатор в readiness, если API зависит от него для обработки трафика. Используй короткий таймаут и передавай в публичный отчёт статус зависимости. Логируй чувствительные детали только в защищённом канале с редактированием секретов.

## OpenAPI, локализация и наблюдаемость

- Swagger UI доступен по `/api/docs`, JSON — по `/api/openapi.json` в среде разработки. После изменения API выполни `npm run api:types`, чтобы обновить JSON и типы клиента.
- `GET /api/greeting` демонстрирует локализацию `en` и `ru` по заголовку `Accept-Language`.
- Для отправки трасс и Nest-логов в Observe задай обе переменные `OBSERVE_APP_KEY` и `OBSERVE_APP_SECRET`. Без ключей работают локальные логи Nest. [NestJS Observe](https://docs.nestjs.com/observability/sdk)

## Проверки

`npm run check` запускает линтер, форматирование, проверку типов, тесты API и React, затем сборку. Для браузерных проверок установи Chromium командой `npm exec -w web -- playwright install chromium` и запусти `npm run test:e2e`. Playwright стартует web и API сам. Для проверки в локальном Edge можно задать `PLAYWRIGHT_CHANNEL=msedge`.
