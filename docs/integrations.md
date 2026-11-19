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

## Другие MCP-серверы

`.mcp.json` подключает ещё четыре сервера. При первом запуске Claude Code попросит подтвердить каждый в `/mcp`.

| Сервер       | Зачем                                                                | Что нужно                                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github`     | PR, статус CI, ревью-комментарии                                     | Fine-grained token с доступом к репозиторию в переменной окружения `GITHUB_PERSONAL_ACCESS_TOKEN`. Токен не попадает в Git.                                                              |
| `context7`   | Документация библиотек под установленные версии (Nest, Drizzle, Zod) | Ничего. Без ключа действует общий лимит запросов.                                                                                                                                        |
| `playwright` | Headless-браузер для проверки `web/` против локального API           | `npm install` в корне; сервер закреплён в `devDependencies`. Артефакты пишутся в `test-results/mcp/`.                                                                                    |
| `postgres`   | Чтение схемы и данных локальной БД, `EXPLAIN`, проверка индексов     | Docker и запущенный `docker compose up -d --wait postgres`. Образ `crystaldba/postgres-mcp:0.3.0` работает в режиме `restricted` (только чтение) и подключается только к локальной базе. |

Сервер `postgres` не подключай к staging или production: у проекта `crystaldba/postgres-mcp` нет релизов с мая 2025 года.

## PostgreSQL

Для локальной БД запусти `docker compose up -d --wait postgres` и укажи в `api/.env`:

```dotenv
DATABASE_URL=postgresql://starter:starter-local@127.0.0.1:5434/starter
```

Затем выполни `npm run db:migrate`. `DATABASE_URL` обязателен: без него API не запустится. Вход создаёт или обновляет запись в `users` по Telegram ID. В базовой схеме хранятся имя, фамилия, username, язык и даты создания и обновления. Профиль берётся из проверенных данных Telegram.

Код базы лежит в `api/src/database/postgres/`: таблицы Drizzle в `schema/`, запросы в `repositories/`, миграции в `migrations/`. Для новой миграции измени схему и выполни `npm run db:generate -w api`.

## Redis

Запусти Redis командой `docker compose up -d --wait redis` и задай в `api/.env`:

```dotenv
REDIS_URL=redis://127.0.0.1:6380
```

`REDIS_URL` обязателен: без него API не запустится. Redis хранит общие для всех экземпляров API счётчики лимитов запросов. Если Redis недоступен во время работы, лимиты временно считаются в памяти процесса. Локальный контейнер доступен с loopback на порту `6380` и хранит данные в памяти. В production используй управляемое подключение с TLS (`rediss://`) и храни URL с учётными данными в секретах окружения. Фичи получают клиент из Nest DI через `RedisModule`.

## Файловое хранилище

Файлы хранятся в S3-совместимом хранилище, это обязательная зависимость API. Локально `docker compose up -d --wait s3` поднимает [RustFS](https://github.com/rustfs/rustfs) на порту `9010` (консоль: http://127.0.0.1:9011, логин `starter`, пароль `starter-local-secret`), а команда `docker compose run --rm --no-deps s3-buckets` создаёт бакеты `starter` и `starter-test`. Образы MinIO больше не публикуются на Docker Hub, поэтому используется RustFS с тем же S3 API.

Настройки задаются переменными `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` и `S3_SECRET_ACCESS_KEY`. Для AWS S3 оставь `S3_ENDPOINT` пустым; для Cloudflare R2 и самостоятельно размещённых хранилищ укажи адрес сервиса, и бакет будет адресоваться в пути. Код лежит в `api/src/database/s3/`, а фичи получают диск через `Storage` из Nest DI. Readiness проверяет доступ к бакету индикатором `s3`.

## Проверки состояния API

- `/api/health` проверяет, что процесс отвечает, и возвращает `200` с `{"status":"ok"}`.
- `/api/health/ready` возвращает отчёт Terminus с полями `status`, `info`, `error` и `details`. Индикатор `postgres` проверяет пул через `select 1`, индикатор `redis` отправляет `PING`, индикатор `s3` запрашивает список ключей бакета. Если зависимость недоступна, readiness возвращает `503` с её статусом. Liveness проверяет только процесс.
- Для нового сервиса добавляй индикатор в readiness, если API зависит от него для обработки трафика. Используй короткий таймаут и передавай в публичный отчёт статус зависимости. Логируй чувствительные детали только в защищённом канале с редактированием секретов.

## OpenAPI, локализация и наблюдаемость

- Swagger UI доступен по `/api/docs`, JSON — по `/api/openapi.json` в среде разработки. После изменения API выполни `npm run api:types`, чтобы обновить JSON и типы клиента.
- `GET /api/greeting` демонстрирует локализацию `en` и `ru` по заголовку `Accept-Language`. Переводы лежат в `api/src/i18n/<locale>/<namespace>.json`: файл `greeting.json` даёт ключи `greeting.*`. Добавляй файл фичи во все локали; сборка копирует каталоги в `dist/i18n`.
- Для отправки трасс и Nest-логов в Observe задай обе переменные `OBSERVE_APP_KEY` и `OBSERVE_APP_SECRET`. Без ключей работают локальные логи Nest. [NestJS Observe](https://docs.nestjs.com/observability/sdk)

## Проверки

`npm run check` запускает линтер, форматирование, проверку типов, тесты API и React, затем сборку. Для браузерных проверок установи Chromium командой `npm exec -w web -- playwright install chromium` и запусти `npm run test:e2e`. Playwright стартует web и API сам. Для проверки в локальном Edge можно задать `PLAYWRIGHT_CHANNEL=msedge`.
