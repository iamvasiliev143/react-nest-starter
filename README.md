# React + NestJS Starter

Шаблон одного репозитория с React и Vite в `web/` и NestJS с `NodeAdapter` в `api/`. Включает проверки, интеграцию Telegram Mini App и рабочий процесс для Claude Code, Codex и Notion.

## Запуск

Нужны Node.js 22.13+, npm и Docker. Для запуска API нужны настройки PostgreSQL, Redis и S3. Доступность всех трёх сервисов проверяют readiness и тесты.

```sh
npm ci
cp api/.env.example api/.env
docker compose up -d --wait postgres redis s3
docker compose run --rm --no-deps s3-buckets
npm run db:migrate
npm run dev
```

Тесты API используют те же контейнеры, но отдельные хранилища: базу `starter_test` в PostgreSQL, уникальный префикс ключей в Redis DB 1 и бакет `starter-test`.

Открой [интерфейс](http://127.0.0.1:5173). Vite проксирует `/api/*` на NestJS по адресу `127.0.0.1:3000`. Для запуска одного приложения используй `npm run dev -w web` или `npm run dev -w api`.

## Структура API

- `api/src/modules/` содержит фичи NestJS. Модуль владеет своими контроллерами, сервисами, DTO (`dto/`) и внутренними типами (`interfaces/`). Индикаторы readiness лежат в `modules/health/indicators/`.
- `api/src/database/` содержит по папке на хранилище. В `postgres/` лежат сервис подключения, таблицы Drizzle (`schema/<table>.schema.ts`), запросы (`repositories/<table>.repository.ts`) и миграции (`migrations/`). В `redis/` лежит клиент Redis, в `s3/` — диск файлового хранилища.
- `api/src/common/` содержит общую инфраструктуру: конфигурацию, Observe, лимиты запросов в Redis (`throttler/`) и i18n.

Для правил размещения контрактов и зависимостей между фичами смотри [nestjs-practices](.claude/skills/nestjs-practices/SKILL.md).

## Проверки

| Команда                | Назначение                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run check`        | Линтер, форматирование, типы, тесты и сборка. Эту команду выполняет CI.                |
| `npm run test:e2e`     | Браузерные сценарии с Playwright. [Подготовка браузера](docs/integrations.md#проверки) |
| `npm run api:types`    | Генерация OpenAPI и типов клиента после изменения HTTP-контракта.                      |
| `npm run graph:update` | Обновление локального графа Engram.                                                    |

В локальном клоне выполни `npm run hooks:install`. Lefthook проверяет staged diff, формат и линтер перед коммитом, Conventional Commits при коммите и полный набор проверок перед push. После коммита обновляется Engram. GitHub Actions дополнительно проверяет PR и запускает Playwright.

## Git и релизы

Постоянные ветки проекта — `main`, `develop` и `staging`. Начинай обычную задачу от `develop` и открывай PR в неё. Релиз-кандидат проходит из `release/*` через `staging` в `main`. [Порядок работы с ветками, ревью и релизами](docs/git-workflow.md)

## Работа с агентами

1. Зафиксируй цель, критерии готовности и ограничения. Для задачи из Notion приложи ссылку на карточку.
2. Из корня запусти `claude --agent tech-lead` или открой проект в Codex. Роли и выбор скилов описаны в [справочнике команды](docs/team.md), общие правила лежат в [AGENTS.md](AGENTS.md).
3. Если поток между модулями неизвестен, используй `/engram-context` в Claude Code или `$engram-context` в Codex. Граф хранится в `.engram/`. Сводка доступна через `npm run graph:summary`.
4. Перед сдачей запусти проверки и передай актуальный diff на независимое ревью. Для веток и PR используй `/git-workflow` в Claude Code или `$git-workflow` в Codex. Добавляй ссылку на карточку в PR.

## Интеграции

- [Notion](docs/notion.md) хранит задачи, проектную документацию, решения и отчётность. Настройку доступа смотри в разделе [Подключение MCP](docs/integrations.md#notion-mcp).
- [Telegram Mini App, PostgreSQL, Redis, Observe и OpenAPI](docs/integrations.md) описаны в руководстве по интеграциям.

## Деплой

Docker Compose используется для локальных PostgreSQL, Redis и S3. В разработке запускай Vite и NestJS через `npm run dev`.

После сборки раздавай `web/dist` как статические файлы и направляй навигацию SPA на `index.html`. Проксируй запросы `/api/*` с того же домена на NestJS, сохраняя префикс `/api`. Запусти собранный API через `npm run start -w api`. Адрес и порт задаются переменными `HOST` и `PORT`.
