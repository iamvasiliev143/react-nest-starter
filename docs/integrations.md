# Локальные интеграции

## Telegram Mini App

### Локальная разработка в Telegram

1. Запусти `npm run dev` из корня и проверь, что приложение открывается на `http://127.0.0.1:5173`.
2. Установи `cloudflared`, если его нет, и во втором терминале запусти `npm run dev:tunnel`. Команда напечатает временный HTTPS-адрес `trycloudflare.com`.
3. В `@BotFather` укажи этот адрес для кнопки меню (`/setmenubutton`) или Main Mini App тестового бота. Открой приложение через эту кнопку в обычном клиенте Telegram. Для входа в `api/.env` должен быть токен того же бота и `AUTH_TOKEN_SECRET`.

Туннель направляет запросы на Vite, а Vite проксирует `/api` на локальный NestJS. `cloudflared` передаёт Vite локальный заголовок `Host`, поэтому дополнительный список разрешённых доменов не нужен. При новом запуске Quick Tunnel адрес меняется. Пока туннель работает, dev-сервер доступен всем, у кого есть ссылка. Используй тестового бота и локальные данные. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) · [Запуск Mini App через меню бота](https://core.telegram.org/bots/webapps#launching-mini-apps-from-the-menu-button)

#### Запуск через ngrok

1. В `web/.env` укажи `NGROK_AUTHTOKEN` и `NGROK_DOMAIN`. Домен запиши без `https://` и пути, например `your-host.ngrok-free.app`. Vite разрешит запросы с этого хоста при следующем запуске.
2. Запусти или перезапусти `npm run dev`. Во втором терминале выполни `npm run dev:tunnel:ngrok`. Команда использует SDK из npm, отдельная установка CLI не нужна.
3. Выполни `npm run setup`, затем перезапусти `npm run dev`, чтобы API применил кнопку меню тестового бота. Если адрес был задан ранее, обнови его в `api/.env` перед перезапуском. Если ngrok покажет промежуточную страницу в Telegram, нажми **Visit Site**.

Публичный адрес ngrok также открывает `/api` через Vite. Используй тестового бота и локальные данные. `NGROK_AUTHTOKEN` используется только командой туннеля и не попадает в клиентскую сборку. [Настройка ngrok](https://ngrok.com/docs/getting-started/javascript) · [Разрешённые хосты Vite](https://vite.dev/config/server-options.html#server-allowedhosts)

### Кнопка меню и размер Mini App

Для кнопки **Open** открой настройки нужного бота в `@BotFather`, включи **Main Mini App** и укажи публичный HTTPS-адрес приложения. Проверь кнопку в профиле бота и в списке чатов в своём клиенте Telegram. Размещение в списке зависит от клиента. [Настройка Main Mini App](https://core.telegram.org/api/bots/webapps#main-mini-apps)

В `api/.env` задай `TELEGRAM_BOT_TOKEN` и публичный `TELEGRAM_MINI_APP_URL`. При пустом URL `npm run setup` может подставить `https://` и домен из `NGROK_DOMAIN` в `web/.env`. `TELEGRAM_MINI_APP_BUTTON_TEXT` задаёт подпись кнопки, по умолчанию «Открыть приложение». После запуска HTTP-сервера API через grammY обновляет стандартную кнопку бота в личных чатах. Если Telegram недоступен, API продолжает работать и записывает предупреждение. Для разных окружений используй разные токены ботов, а для реплик одного окружения задавай одинаковые URL, подпись и размер. Main Mini App в профиле бота настраивается в BotFather. [Bot API](https://core.telegram.org/bots/api#setchatmenubutton) · [grammY](https://grammy.dev/ref/core/api#setchatmenubutton)

`TELEGRAM_MINI_APP_SIZE` принимает `default` (стандартный размер Telegram), `expanded` (максимальная высота WebView) или `fullscreen` (полноэкранный режим, если клиент поддерживает его). Если полноэкранный режим недоступен, приложение пробует `expanded`. Режим передаётся через URL кнопки. Для отдельных прямых ссылок Telegram поддерживает `mode=compact`. [Режимы открытия](https://core.telegram.org/bots/webapps#launching-mini-apps-from-direct-links)

Нативный **Launch Screen** настраивается в BotFather в разделе **Configure Mini App**. Там задаются иконка и цвета фона и заголовка для обеих тем. Telegram показывает этот экран до запуска веб-приложения. [Настройка экрана загрузки](https://core.telegram.org/bots/webapps)

### Авторизация

Публичные маршруты API работают без бота. Если Telegram не передал initData, интерфейс показывает экран ошибки входа и не загружает приложение, не запускает аналитику и не отправляет запросы в API. Чтобы включить вход, скопируй `api/.env.example` в `api/.env`, задай `TELEGRAM_BOT_TOKEN` и уникальный `AUTH_TOKEN_SECRET` длиной от 32 символов. Секрет можно сгенерировать командой `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Для запуска внутри Telegram укажи публичный HTTPS-адрес интерфейса в настройках бота.

При открытии Mini App клиент автоматически передаёт подписанный `Telegram.WebApp.initData` телом запроса в `POST /api/v1/auth/telegram`. Сервер проверяет подпись и допустимый возраст данных (5 минут), затем выдаёт Bearer-токен на 15 минут. Клиент хранит токен в памяти приложения и добавляет его к защищённым запросам. При истечении токена или ответе `401` от защищённого маршрута сессия очищается. При повторном входе сервер проверяет `initData` по своему времени. Если сервер отклоняет эти данные, интерфейс предлагает открыть Mini App заново из Telegram. Cookies и постоянное хранилище браузера не используются. Бизнес-права добавляй через политики `@Can()`, а публичные маршруты явно помечай `@Public()`. [Telegram Mini Apps](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

Клиентский адаптер `web/src/common/telegram/telegram.ts` использует стабильный `@tma.js/sdk-react` v3. В Telegram он подключает тему, безопасные отступы и нативную кнопку «Назад». Обычный браузер без данных запуска показывает экран ошибки входа. Playwright проверяет имитацию Telegram, повторный вход после `401` и доступность обычных экранов через axe.

### Регистрация и реферальные ссылки

Пользователь появляется в PostgreSQL после `/start` в личном чате или первого успешного входа в Mini App. Поля профиля обновляются при повторных обращениях. Сервер сохраняет Telegram ID, имя, фамилию, username, язык, Premium и URL фото, если Telegram его передал. Обновление без URL фото сохраняет ранее полученное значение. [Поля профиля Mini App](https://core.telegram.org/bots/webapps#webappuser)

Для обработки `/start` включи `TELEGRAM_BOT_POLLING_ENABLED=true` на одном экземпляре API для каждого токена. Если у бота уже есть webhook, приложение оставит его подключённым и не запустит polling. При регистрации PostgreSQL выдаёт пользователю постоянный уникальный код `referralCode`. Миграция заполняет код у существующих пользователей. `GET /api/v1/auth/me` возвращает код и, при заданном `TELEGRAM_BOT_USERNAME` без `@`, две ссылки в поле `referralLinks`:

- `https://t.me/<bot>?start=ref_<код>` открывает чат с ботом и передаёт параметр вместе с командой `/start`.
- `https://t.me/<bot>?startapp=ref_<код>` открывает Main Mini App и передаёт параметр внутри подписанного `initData`. Чтобы направить ссылку в отдельный Direct Link, создай его в BotFather и запиши последний сегмент `t.me/<bot>/<short_name>` в `TELEGRAM_MINI_APP_SHORT_NAME`.

Пригласивший должен уже существовать в базе. При первой регистрации сервер находит его по коду и сохраняет связь `users.referrer_id → users.id`. Повторные входы только обновляют профиль. Самореферал, неизвестный код и старый параметр с Telegram ID игнорируются. [Deep links бота](https://core.telegram.org/bots/features#deep-linking) · [Main Mini App и Direct Links](https://core.telegram.org/api/links#main-mini-app-links)

## Режим технических работ

На новой базе `npm run db:migrate` создаёт запись `app_status` в активном режиме. При поэтапном обновлении существующего окружения примени миграцию `0005` после обновления всех экземпляров API. Старые экземпляры читают удаляемые колонки.

Для перехода с булева `maintenance` на `mode` останови экземпляры API, которые читают старую схему, примени миграции `0006` и `0007` и запусти новую версию. Миграции сохраняют текущий режим и время его изменения.

Mini App запрашивает `GET /api/health/app` перед входом, каждые 5 секунд в активном окне и при возврате в приложение. Ответ содержит только `mode`. Во время работ Mini App показывает системную страницу на языке интерфейса и продолжает опрос. После работ он снова показывает текущий маршрут. Маршруты `/api/health` и `/api/health/ready` сохраняют инфраструктурное назначение.

До появления админки оператор с доступом к PostgreSQL может включить режим:

```sql
UPDATE app_status
SET mode = 'maintenance', updated_at = now()
WHERE singleton = true;
```

Для возвращения в активный режим:

```sql
UPDATE app_status
SET mode = 'active', updated_at = now()
WHERE singleton = true;
```

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

Для настроек MCP используется корневой `.env`, шаблон лежит в `.env.example`. `npm run setup` создаёт его при первом запуске. Заполни `GITHUB_PERSONAL_ACCESS_TOKEN` для GitHub и `MCP_DATABASE_URI` для локального PostgreSQL. URI использует `host.docker.internal`, потому что MCP-сервер работает в Docker. Настройки API находятся в `api/.env`.

Запускай Claude командой `npm run ai:claude -- --agent tech-lead`. Launcher читает корневой `.env` и передаёт переменные дочернему процессу Claude. Переменные, уже заданные в терминале, имеют приоритет. Аргументы после `--` передаются Claude. Для проверки конфигурации выполни `npm run ai:claude -- mcp list`. Подстановка `${VAR}` выполняется самим Claude Code в `.mcp.json`, включая поля `env` и `headers`. PostgreSQL получает URI через окружение процесса Docker. [Подстановка переменных Claude Code](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcpjson)

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

Затем выполни `npm run db:migrate`. `DATABASE_URL` обязателен: без него API не запустится. Вход создаёт или обновляет запись в `users` по Telegram ID. Профиль берётся из проверенных данных Telegram.

Код базы лежит в `api/src/database/postgres/`: таблицы Drizzle в `schema/`, запросы в `repositories/`, миграции в `migrations/`. Для новой миграции измени схему и выполни `npm run db:generate -w api`.

## Redis

Запусти Redis командой `docker compose up -d --wait redis` и задай в `api/.env`:

```dotenv
REDIS_URL=redis://127.0.0.1:6380
```

`REDIS_URL` обязателен: без него API не запустится. Redis хранит общие для всех экземпляров API счётчики лимитов запросов. Если Redis недоступен во время работы, лимиты временно считаются в памяти процесса. Локальный контейнер доступен с loopback на порту `6380` и хранит данные в памяти. В production используй управляемое подключение с TLS (`rediss://`) и храни URL с учётными данными в секретах окружения. Фичи получают клиент из Nest DI через `RedisModule`.

## Очереди BullMQ

`api/src/common/queues/queues.module.ts` задаёт соединение для очередей Nest. Владелец задачи регистрирует именованную очередь через `BullModule.registerQueue({ name })`, добавляет задания через `@InjectQueue(name)` и обрабатывает их в `@Processor(name)` с `WorkerHost`. По умолчанию действуют три попытки с экспоненциальной задержкой и ограниченная история завершённых и неудачных заданий. Для операций с побочными эффектами проектируй обработчик под повторное выполнение.

В локальном примере `QUEUE_REDIS_URL=redis://127.0.0.1:6380/5` выделяет очередям Redis DB 5. При пустом `QUEUE_REDIS_URL` используется `REDIS_URL`. На деплое укажи `QUEUE_REDIS_URL` для Redis с персистентностью и политикой `noeviction`, когда задания должны переживать рестарт. Тестовые счётчики HTTP имеют собственный TTL и префикс, поэтому прогон не очищает базу Redis.

## WebSocket

Socket.IO доступен через транспортный путь `/api/socket.io` и namespace `/realtime`. Клиент передаёт access token в `auth.token` при WebSocket-подключении. Прокси Vite уже проксирует upgrade. При деплое прокси должен передавать WebSocket upgrade на тот же API. На всех репликах одного окружения установи один `REALTIME_CHANNEL`. Для разных окружений с общим Redis используй разные имена канала.

## Файловое хранилище

Файлы хранятся в S3-совместимом хранилище, это обязательная зависимость API. Локально `docker compose up -d --wait s3` поднимает [RustFS](https://github.com/rustfs/rustfs) на порту `9010` (консоль: http://127.0.0.1:9011, логин `starter`, пароль `starter-local-secret`), а команда `docker compose run --rm --no-deps s3-buckets` создаёт бакеты `starter` и `starter-test`. Образы MinIO больше не публикуются на Docker Hub, поэтому используется RustFS с тем же S3 API.

Настройки задаются переменными `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` и `S3_SECRET_ACCESS_KEY`. Для AWS S3 оставь `S3_ENDPOINT` пустым; для Cloudflare R2 и самостоятельно размещённых хранилищ укажи адрес сервиса, и бакет будет адресоваться в пути. Код лежит в `api/src/database/s3/`, а фичи получают диск через `Storage` из Nest DI. Readiness проверяет доступ к бакету индикатором `s3`.

## Проверки состояния API

- `/api/health` проверяет, что процесс отвечает, и возвращает `200` с `{"status":"ok"}`.
- `/api/health/ready` возвращает отчёт Terminus с полями `status`, `info`, `error` и `details`. Индикатор `postgres` проверяет пул через `select 1`, индикатор `redis` отправляет `PING`, индикатор `s3` запрашивает список ключей бакета. Если зависимость недоступна, readiness возвращает `503` с её статусом. Liveness проверяет только процесс.
- Для нового сервиса добавляй индикатор в readiness, если API зависит от него для обработки трафика. Используй короткий таймаут и передавай в публичный отчёт статус зависимости. Логируй чувствительные детали только в защищённом канале с редактированием секретов.

## OpenAPI, локализация и наблюдаемость

- API использует URI-версионирование. Новые HTTP-ручки по умолчанию идут под `/api/v1/`. Авторизация и приветствие доступны по единственному версионированному адресу. Health и Swagger сохраняют адреса без версии. Клиент использует `/api/v1/auth/*`.
- Swagger UI доступен по `/api/docs`, JSON — по `/api/openapi.json` в среде разработки. HTTP-настройки собраны в `api/src/app-setup.ts`. Swagger и описания разделов находятся в `api/src/swagger.ts` и `api/src/swagger-tags.ts`. Генерация и тесты используют ту же фабрику `createApp()`. После изменения API выполни `npm run api:types`, чтобы обновить JSON и типы клиента.
- `GET /api/v1/greeting` демонстрирует локализацию `en` и `ru` по заголовку `Accept-Language`. Переводы лежат в `api/src/i18n/<locale>/<namespace>.json`: файл `greeting.json` даёт ключи `greeting.*`. Добавляй файл фичи во все локали; сборка копирует каталоги в `dist/i18n`.
- Переводы интерфейса лежат в `web/src/i18n/<locale>/<namespace>.json` и загружаются через `react-i18next`. Добавляй одинаковые ключи и параметры интерполяции во все поддерживаемые языки. В Telegram язык выбирается по языку пользователя из SDK, а русский используется как fallback.
- Для отправки трасс и Nest-логов в Observe задай обе переменные `OBSERVE_APP_KEY` и `OBSERVE_APP_SECRET`. Без ключей работают локальные логи Nest. Запросы к liveness и readiness исключены из трассировки. Для явной привязки событий к сборке задай `OBSERVE_SERVICE_VERSION` в окружении деплоя. [NestJS Observe](https://docs.nestjs.com/observability/sdk)

## Проверки

`npm run check` запускает линтер, форматирование, проверку типов, тесты API и React, затем сборку. Для браузерных проверок установи Chromium командой `npm exec -w web -- playwright install chromium` и запусти `npm run test:e2e`. Playwright стартует web и API сам. Для проверки в локальном Edge можно задать `PLAYWRIGHT_CHANNEL=msedge`.

## Восстановление интерфейса и отчёты об ошибках

Корневой Error Boundary показывает локализованный экран с перезагрузкой при ошибке рендера. Ошибка запуска Telegram SDK или инициализации переводов выводит тот же экран, даже если i18next ещё не готов.

Клиент отправляет в `POST /api/v1/client-errors` только фиксированные категории `source`, `kind` и `page`, максимум пять событий за загрузку страницы. Текст ошибки, stack trace, адрес страницы, query/hash, токены и Telegram initData в отчёт не входят. Сервер проверяет категории, ограничивает частоту и записывает событие в журнал. При настроенном Observe журнал передаётся через существующий `forwardLogs`. Неудачная отправка отчёта завершается без повторов.

Ошибки HTTP читаются по стабильному `code`. `ClientError` сохраняет `requestId` и `fieldErrors` для диагностики и форм, а пользовательский текст выбирается из локальных каталогов. Ответ прокси с HTML или пустым телом обрабатывается общим сообщением.

Серверные HTTP-ошибки имеют поля `statusCode`, `code`, `message`, `requestId` и, только для валидации при `400`, необязательный массив `fieldErrors` с `path` и `message`. UUID запроса создаётся сервером и возвращается также в заголовке `X-Request-Id`. Для Zod-валидации возвращаются пути полей и безопасный текст ошибки. Ответ readiness при отказе сохраняет поля Terminus. HTTP-статусы и заголовки авторизации сохраняются.

Глобальные DTO ошибок расположены в `api/src/common/errors/dto/`. Для `400`, `401`, `403`, `404`, `429`, `500` и `503` описаны отдельные классы с фиксированными статусами и кодами. Общий реестр `HTTP_ERROR_DTOS` связывает ответы фильтра со схемами OpenAPI для всех HTTP-операций. Для нового статуса добавляй DTO и запись в реестр.
