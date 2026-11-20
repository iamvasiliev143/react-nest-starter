---
name: nestjs-practices
description: 'Применяй правила репозитория при изменении или ревью модулей, провайдеров, DI, запуска и остановки NestJS в api/src.'
paths:
  - 'api/src/**'
---

## Структура API

- Размещай контроллеры, провайдеры и внутренние типы в `api/src/modules/<feature>/`. Соседние фичи обращаются к модулю-владельцу через явно экспортируемые провайдеры. Слои `api/src/database/` и `api/src/common/` свободны от зависимостей на фичи.
- Храни HTTP-контракты в `dto/` с именами `*.request.dto.ts`, `*.query.dto.ts` и `*.response.dto.ts`. При необходимости группируй DTO по типу контракта в подпапках. Схема валидации лежит рядом с входным DTO, внутренние типы — в `interfaces/<name>.interface.ts`.
- Храни тексты для пользователя в `api/src/i18n/<locale>/<feature>.json`. Получай их через `I18nService` по ключу `<feature>.<key>`.
- В `api/src/database/<engine>/` размещай `<engine>.service.ts` и `<engine>.module.ts`. Для PostgreSQL храни схемы в `schema/<entity>.schema.ts` с реэкспортом в `schema/index.ts`, запросы — в `repositories/<entity>.repository.ts`, миграции — в `migrations/`. Используй единственное число в именах файлов и идентификаторах схем и репозиториев. Указывай SQL-имена явно в Drizzle. Фичи работают с PostgreSQL через репозитории, которые регистрирует и экспортирует `PostgresModule`.
- Для readiness добавляй `modules/health/indicators/<engine>.health-indicator.ts` с методом `check(key)` и регистрируй индикатор в `HealthModule`.
- Если нужен `forwardRef`, укажи, какой цикл он обслуживает и что подтверждает тест.

## Запуск и проверки

- Создавай Nest-приложение в `api/src/create-app.ts`, настраивай HTTP в `api/src/app-setup.ts`, запускай сервер в `api/src/main.ts`. Используй ту же фабрику для HTTP-тестов и генерации OpenAPI. Храни настройку Swagger и описания тегов в `swagger.ts` и `swagger-tags.ts`.
- Сохраняй `NodeAdapter` и ESM. Используй расширение `.js` в локальных серверных импортах. Передавай параметры Nest третьим аргументом `NestFactory.create` при явном адаптере. Расширяй конфигурацию через существующую Zod-схему и `ConfigService`.
- Используй действующие Nest Authentication и Authorization для политик доступа, а для HTTP-тестов — `node:test` и `fetch` к локальному API. При изменении HTTP-контракта применяй `api-contract`, при изменении входа Telegram или прав — `telegram-auth-change`. Для неизвестной межмодульной зависимости используй `engram-context` и сверяй выводы с исходниками.
